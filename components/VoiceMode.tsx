
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { CloseIcon, MicIcon, DocIcon, ArrowRightIcon } from './Icons';
import { Document, Message } from '../types';
import { VOICE_SYSTEM_INSTRUCTION } from '../constants';

interface VoiceModeProps {
  onClose: (transcript?: Message[]) => void;
  onViewDocument: (name: string) => void;
  documents: Document[];
}

const VoiceMode: React.FC<VoiceModeProps> = ({ onClose, onViewDocument, documents }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error' | 'idle'>('connecting');
  const [activeCitation, setActiveCitation] = useState<{ doc: Document; text: string } | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(5));
  
  const sessionTranscriptRef = useRef<Message[]>([]);
  const currentModelTurnText = useRef('');
  const currentUserTurnText = useRef('');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{
    input: AudioContext;
    output: AudioContext;
    outputAnalyser: AnalyserNode;
    inputAnalyser: AnalyserNode;
  } | null>(null);
  
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const rafIdRef = useRef<number | null>(null);

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encodeBase64 = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

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
        
        const inputAnalyser = inputCtx.createAnalyser();
        const outputAnalyser = outputCtx.createAnalyser();
        inputAnalyser.fftSize = 128;
        outputAnalyser.fftSize = 128;
        inputAnalyser.smoothingTimeConstant = 0.4;
        outputAnalyser.smoothingTimeConstant = 0.4;
        
        audioContextRef.current = { 
          input: inputCtx, 
          output: outputCtx, 
          inputAnalyser, 
          outputAnalyser 
        };

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const contextString = documents.map(d => `[DOKUMENT ${d.name}]: ${d.content}`).join('\n');

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
            },
            systemInstruction: `${VOICE_SYSTEM_INSTRUCTION}\n\nWissen aus Dokumenten:\n${contextString}`,
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

              source.connect(inputAnalyser);
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!isMounted) return;

              if (message.serverContent?.inputTranscription) {
                currentUserTurnText.current += message.serverContent.inputTranscription.text;
              }

              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentModelTurnText.current += text;

                const match = currentModelTurnText.current.match(/\[Quelle:\s*([^\]]+)\]/i);
                if (match) {
                  const sourceName = match[1].trim().toLowerCase();
                  const doc = documents.find(d => d.name.toLowerCase().includes(sourceName));
                  if (doc) {
                    const parts = currentModelTurnText.current.split(/\[Quelle:/i);
                    const relevantSentence = parts[parts.length - 2]?.split(/[.!?]/).pop()?.trim() || "Wichtiges Detail";
                    setActiveCitation({ doc, text: relevantSentence });
                  }
                }
              }

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
                source.connect(outputAnalyser);
                outputAnalyser.connect(outputCtx.destination);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
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

        const updateWaveform = () => {
          if (!audioContextRef.current) return;
          const { inputAnalyser, outputAnalyser } = audioContextRef.current;
          
          const inputData = new Uint8Array(inputAnalyser.frequencyBinCount);
          const outputData = new Uint8Array(outputAnalyser.frequencyBinCount);
          inputAnalyser.getByteFrequencyData(inputData);
          outputAnalyser.getByteFrequencyData(outputData);
          
          const levels = [];
          const numBars = 16;
          for (let i = 0; i < numBars; i++) {
            const idx = Math.floor(i * (inputData.length / numBars));
            const val = Math.max(inputData[idx], outputData[idx]);
            levels.push(5 + (val / 255) * 95);
          }
          setAudioLevels(levels);
          rafIdRef.current = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();

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
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [documents]);

  const handleCitationClick = () => {
    if (activeCitation) {
      onViewDocument(activeCitation.doc.name);
      onClose(sessionTranscriptRef.current);
    }
  };

  const avgLevel = audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length;

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-start py-12 px-8 animate-in fade-in duration-700 overflow-hidden">
      
      {/* Dynamic Background Glow */}
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-1000 opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${activeCitation ? '#22c55e' : '#000000'} 0%, transparent 70%)`,
          transform: `scale(${1 + (avgLevel / 100) * 0.5})`
        }}
      />

      {/* Header Info */}
      <div className="w-full flex flex-col items-center relative z-10 mb-8">
        <div className={`mb-6 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-700 shadow-sm ${activeCitation ? 'bg-green-600 text-white animate-pulse' : 'bg-gray-50 text-gray-300'}`}>
          {activeCitation ? 'Wohnpro Quelle Aktiv' : 'Guide spricht mit tiefer Stimme'}
        </div>

        {/* Actionable Citation Card - More prominent */}
        <div className="h-44 flex items-center justify-center w-full max-w-sm">
          {activeCitation ? (
            <button 
              onClick={handleCitationClick}
              className="bg-white border-4 border-green-500 rounded-[3rem] p-7 pr-14 flex items-center gap-7 shadow-[0_40px_80px_-20px_rgba(22,163,74,0.3)] animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 hover:scale-105 active:scale-95 transition-all text-left relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4">
                <ArrowRightIcon className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="p-5 bg-green-50 rounded-2xl group-hover:bg-green-600 transition-colors shrink-0">
                <DocIcon className="w-7 h-7 text-green-600 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-1.5 block">Beleg verifiziert</span>
                <p className="text-base font-black text-gray-900 truncate mb-1">{activeCitation.doc.name}</p>
                <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed italic">
                  "{activeCitation.text}..."
                </p>
              </div>
            </button>
          ) : (
            <div className="text-center opacity-20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Suche nach Belegen...</p>
            </div>
          )}
        </div>

        <button 
          onClick={() => onClose(sessionTranscriptRef.current)}
          className="absolute top-0 right-0 p-4 hover:bg-gray-50 rounded-full transition-all text-gray-300 hover:text-black"
        >
          <CloseIcon className="w-8 h-8" />
        </button>
      </div>

      {/* Main Sphere Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg space-y-20 z-10">
        <div className="relative">
          {/* Reactive Rings */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-black/5 transition-transform duration-75"
            style={{ transform: `scale(${2.5 + (avgLevel / 100) * 1.5})`, opacity: avgLevel / 100 }}
          />
          <div 
            className="absolute inset-0 rounded-full border border-black/10 transition-transform duration-150"
            style={{ transform: `scale(${1.8 + (avgLevel / 100) * 0.8})`, opacity: (avgLevel / 100) * 0.5 }}
          />
          
          <div className={`relative w-64 h-64 rounded-full bg-white shadow-[0_64px_128px_-32px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all duration-700 border border-gray-100 ${status === 'active' ? 'scale-110' : 'scale-100'}`}>
            <div 
              className={`w-52 h-52 rounded-full flex items-center justify-center transition-all duration-300 ${status === 'active' ? 'bg-black' : 'bg-gray-50'}`}
              style={{ 
                transform: `scale(${1 + (avgLevel / 100) * 0.15})`,
                boxShadow: status === 'active' ? `0 0 ${avgLevel}px rgba(0,0,0,0.4)` : 'none'
              }}
            >
              <MicIcon className={`w-28 h-28 transition-all duration-500 ${status === 'active' ? 'text-white' : 'text-gray-200'}`} />
            </div>
          </div>
        </div>

        {/* Dynamic Responsive Waveform */}
        <div className="h-28 flex items-center justify-center gap-2 px-8 w-full max-w-md">
          {audioLevels.map((level, i) => (
            <div 
              key={i}
              className={`w-2.5 rounded-full transition-all duration-100 shadow-sm ${status === 'active' ? (activeCitation ? 'bg-green-500' : 'bg-black') : 'bg-gray-100'}`}
              style={{ 
                height: `${level}%`,
                opacity: 0.1 + (level / 100) * 0.9,
                transform: `translateY(${(Math.sin(Date.now() / 200 + i) * (level / 10))}px)`
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pb-8 flex flex-col items-center gap-6 z-10">
        <div className="flex flex-col items-center">
          <p className="text-[10px] text-gray-300 uppercase tracking-[0.6em] font-black mb-2">Wohnpro Guide</p>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest italic">Die Seele deines Wohnprojekts</p>
        </div>
        <div className="flex gap-5">
          {[0, 1, 2].map(i => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-all duration-1000 ${status === 'active' && i === 0 ? 'bg-black scale-150' : 'bg-gray-100'}`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceMode;
