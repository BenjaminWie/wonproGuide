
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { CloseIcon, MicIcon, DocIcon } from './Icons';
import { Document, Message } from '../types';

interface VoiceModeProps {
  onClose: (transcript?: Message[]) => void;
  onViewDocument: (name: string) => void;
  documents: Document[];
}

const VoiceMode: React.FC<VoiceModeProps> = ({ onClose, onViewDocument, documents }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error' | 'idle'>('connecting');
  const [activeCitation, setActiveCitation] = useState<{ doc: Document; text: string } | null>(null);
  
  // Track transcript for conversation history (stored but not displayed)
  const sessionTranscriptRef = useRef<Message[]>([]);
  const currentModelTurnText = useRef('');
  const currentUserTurnText = useRef('');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{
    input: AudioContext;
    output: AudioContext;
  } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Helper: Decode Base64
  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper: Encode to Base64
  const encodeBase64 = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper: Decode Raw PCM to AudioBuffer
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  useEffect(() => {
    let isMounted = true;

    const startSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = { input: inputCtx, output: outputCtx };

        // Fix: Ensure standard initialization with direct process.env usage
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const contextString = documents.map(d => `${d.name}: ${d.content}`).join(' | ');

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: `Du bist der WohnprojektGuide. Antworte kurz, menschlich und präzise. 
            Wenn du Informationen aus Dokumenten nennst, füge IMMER am Ende deiner Aussage [Quelle: Dokumentname] hinzu.
            Wissen: ${contextString}`,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              if (!isMounted) return;
              setStatus('active');
              
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  int16[i] = inputData[i] * 32768;
                }
                const pcmBlob = {
                  data: encodeBase64(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!isMounted) return;

              // Track User Input for History
              if (message.serverContent?.inputTranscription) {
                currentUserTurnText.current += message.serverContent.inputTranscription.text;
              }

              // Track Model Output and Citations
              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentModelTurnText.current += text;

                // Simple regex to find citation pattern [Quelle: XYZ]
                const match = currentModelTurnText.current.match(/\[Quelle:\s*([^\]]+)\]/i);
                if (match) {
                  const sourceName = match[1].trim().toLowerCase();
                  const doc = documents.find(d => d.name.toLowerCase().includes(sourceName));
                  if (doc) {
                    // Get the text just before the citation for context
                    const parts = currentModelTurnText.current.split(/\[Quelle:/i);
                    const relevantSentence = parts[parts.length - 2]?.split(/[.!?]/).pop()?.trim() || "Information gefunden";
                    setActiveCitation({ doc, text: relevantSentence });
                  }
                }
              }

              // Finalize turn into history
              if (message.serverContent?.turnComplete) {
                if (currentUserTurnText.current.trim()) {
                  sessionTranscriptRef.current.push({ role: 'user', text: currentUserTurnText.current.trim() });
                }
                if (currentModelTurnText.current.trim()) {
                  sessionTranscriptRef.current.push({ 
                    role: 'model', 
                    text: currentModelTurnText.current.replace(/\[Quelle:[^\]]+\]/gi, '').trim() 
                  });
                }
                currentUserTurnText.current = '';
                currentModelTurnText.current = '';
              }

              const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioData) {
                const buffer = await decodeAudioData(decodeBase64(audioData), outputCtx, 24000);
                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputCtx.destination);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => {
                  try { s.stop(); } catch(e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setActiveCitation(null);
                currentModelTurnText.current = '';
              }
            },
            onerror: () => setStatus('error'),
            onclose: () => isMounted && setStatus('idle')
          }
        });

        sessionRef.current = await sessionPromise;
      } catch (err) {
        setStatus('error');
      }
    };

    startSession();

    return () => {
      isMounted = false;
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) {
        audioContextRef.current.input.close();
        audioContextRef.current.output.close();
      }
    };
  }, [documents]);

  const handleCitationClick = () => {
    if (activeCitation) {
      onViewDocument(activeCitation.doc.name);
      onClose(sessionTranscriptRef.current);
    }
  };

  const handleManualClose = () => {
    onClose(sessionTranscriptRef.current);
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-start py-16 px-8 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Header Info */}
      <div className="w-full flex flex-col items-center relative mb-12">
        <div className={`mb-6 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-700 ${activeCitation ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-300'}`}>
          {activeCitation ? 'Beleg gefunden' : 'Zuhören aktiv'}
        </div>

        {/* Actionable Citation Card */}
        <div className="h-32 flex items-center justify-center w-full max-w-sm">
          {activeCitation && (
            <button 
              onClick={handleCitationClick}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-6 pr-12 flex items-center gap-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] animate-in slide-in-from-top-4 duration-500 hover:border-green-600 group active:scale-95 transition-all text-left"
            >
              <div className="p-4 bg-green-50 rounded-2xl group-hover:bg-green-600 transition-colors shrink-0">
                <DocIcon className="w-6 h-6 text-green-600 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 truncate mb-1">{activeCitation.doc.name}</p>
                <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed italic">
                  "{activeCitation.text}..."
                </p>
              </div>
            </button>
          )}
        </div>

        <button 
          onClick={handleManualClose}
          className="absolute top-0 right-0 p-3 hover:bg-gray-50 rounded-full transition-all text-gray-300 hover:text-black"
        >
          <CloseIcon className="w-8 h-8" />
        </button>
      </div>

      {/* Main Sphere Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg space-y-16">
        <div className="relative">
          <div className={`absolute inset-0 bg-green-50/50 rounded-full blur-[100px] scale-[2.5] transition-opacity duration-1000 ${status === 'active' ? 'opacity-100' : 'opacity-0'}`} />
          
          <div className={`relative w-64 h-64 rounded-full border border-gray-50 bg-white shadow-[0_48px_96px_-24px_rgba(0,0,0,0.1)] flex items-center justify-center transition-all duration-1000 ${status === 'active' ? 'scale-110 shadow-2xl' : 'scale-100'}`}>
            <div className={`w-52 h-52 rounded-full flex items-center justify-center transition-all duration-700 ${status === 'active' ? 'bg-black' : 'bg-gray-50'}`}>
              <MicIcon className={`w-24 h-24 transition-all duration-700 ${status === 'active' ? 'text-white' : 'text-gray-200'}`} />
            </div>
            {status === 'active' && (
              <div className="absolute inset-0 rounded-full border border-black/5 animate-[ping_4s_infinite]" />
            )}
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="h-16 flex items-center justify-center gap-3">
          {status === 'active' ? (
            [...Array(10)].map((_, i) => (
              <div 
                key={i}
                className="w-2 bg-black rounded-full animate-waveform shadow-sm"
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  height: `${20 + Math.random() * 80}%`
                }}
              />
            ))
          ) : (
             <div className="flex gap-2">
               <div className="w-2 h-2 bg-gray-100 rounded-full animate-pulse" />
               <div className="w-2 h-2 bg-gray-100 rounded-full animate-pulse [animation-delay:0.2s]" />
               <div className="w-2 h-2 bg-gray-100 rounded-full animate-pulse [animation-delay:0.4s]" />
             </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pb-10 flex flex-col items-center gap-8">
        <p className="text-[10px] text-gray-300 uppercase tracking-[0.5em] font-black">Wohnprojekt Intelligence</p>
        <div className="flex gap-4">
          <div className={`w-3 h-3 rounded-full transition-all duration-1000 ${status === 'active' ? 'bg-black scale-125' : 'bg-gray-100'}`} />
          <div className="w-3 h-3 rounded-full bg-gray-100" />
          <div className="w-3 h-3 rounded-full bg-gray-100" />
        </div>
      </div>

      <style>{`
        @keyframes waveform {
          0%, 100% { height: 25%; transform: scaleY(1); opacity: 0.8; }
          50% { height: 100%; transform: scaleY(1.5); opacity: 0.4; }
        }
        .animate-waveform {
          animation: waveform 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default VoiceMode;
