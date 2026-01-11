
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { CloseIcon, DocIcon, ArrowRightIcon, PlusIcon, InfoIcon } from './Icons';
import { Document, Message } from '../types';
import { VOICE_SYSTEM_INSTRUCTION } from '../constants';

interface VoiceModeProps {
  onClose: (transcript?: Message[]) => void;
  onViewDocument: (name: string) => void;
  documents: Document[];
}

interface ActiveCitation {
  doc: Document;
  snippet: string;
  timestamp: number;
}

const VoiceMode: React.FC<VoiceModeProps> = ({ onClose, onViewDocument, documents }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error' | 'idle'>('connecting');
  
  const [activeCitations, setActiveCitations] = useState<ActiveCitation[]>([]);
  const [showCitationList, setShowCitationList] = useState(false);
  const [lastTranscriptFragment, setLastTranscriptFragment] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const sessionTranscriptRef = useRef<Message[]>([]);
  const currentModelTurnText = useRef('');
  const currentUserTurnText = useRef('');

  // Ref for smooth volume interpolation to make the wave organic
  const currentVolumeRef = useRef(0);

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
        inputAnalyser.fftSize = 256;
        outputAnalyser.fftSize = 256;
        inputAnalyser.smoothingTimeConstant = 0.8;
        outputAnalyser.smoothingTimeConstant = 0.8;
        
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
                if (currentUserTurnText.current === '') {
                   setActiveCitations([]); 
                   setShowCitationList(false);
                   setLastTranscriptFragment('');
                }
                currentUserTurnText.current += message.serverContent.inputTranscription.text;
                setLastTranscriptFragment(currentUserTurnText.current);
              }

              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentModelTurnText.current += text;
                setLastTranscriptFragment(currentModelTurnText.current);

                // Regex to find [Quelle: Document Name] in the streaming text
                const matches = [...currentModelTurnText.current.matchAll(/\[Quelle:\s*([^\]]+)\]/gi)];
                
                if (matches.length > 0) {
                  matches.forEach(match => {
                     const sourceName = match[1].trim().toLowerCase();
                     // Robust matching against document names
                     const doc = documents.find(d => 
                       d.name.toLowerCase().includes(sourceName) || 
                       sourceName.includes(d.name.toLowerCase().replace(/\.(pdf|docx)$/i, ''))
                     );
                     
                     if (doc) {
                        const fullTextBefore = currentModelTurnText.current.substring(0, match.index);
                        const sentences = fullTextBefore.split(/[.!?]/);
                        const relevantSentence = sentences[sentences.length - 1]?.trim() || "Information gefunden";

                        setActiveCitations(prev => {
                          // Prevent duplicate citations for the same document in a single turn
                          if (prev.some(p => p.doc.id === doc.id)) return prev;
                          return [...prev, { doc, snippet: relevantSentence, timestamp: Date.now() }];
                        });
                     }
                  });
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
                // Keep the last text fragment visible for a moment
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
                currentModelTurnText.current = '';
                setLastTranscriptFragment('');
              }
            },
            onerror: () => setStatus('error'),
            onclose: () => isMounted && setStatus('idle')
          }
        });

        const renderFrame = () => {
          if (!isMounted) return;
          if (!audioContextRef.current || !canvasRef.current) {
            rafIdRef.current = requestAnimationFrame(renderFrame);
            return;
          }

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const { inputAnalyser, outputAnalyser } = audioContextRef.current;
          const dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
          }
          
          const width = rect.width;
          const height = rect.height;
          const centerY = height / 2;

          const inputData = new Uint8Array(inputAnalyser.frequencyBinCount);
          const outputData = new Uint8Array(outputAnalyser.frequencyBinCount);
          inputAnalyser.getByteFrequencyData(inputData);
          outputAnalyser.getByteFrequencyData(outputData);

          const getAvg = (arr: Uint8Array) => arr.reduce((a, b) => a + b, 0) / arr.length;
          const inVol = (getAvg(inputData) / 255) * 1.5;
          const outVol = getAvg(outputData) / 255;
          const targetVol = Math.max(inVol, outVol);

          currentVolumeRef.current += (targetVol - currentVolumeRef.current) * 0.1;
          const vol = currentVolumeRef.current;

          ctx.clearRect(0, 0, width, height);
          const time = Date.now() / 1000;
          
          const lines = [
             { color: 'rgba(34, 197, 94, 0.15)', speed: 0.5, phase: 0, frequency: 0.5, amplitude: 0.5 },
             { color: 'rgba(34, 197, 94, 0.3)', speed: 0.8, phase: 2, frequency: 0.8, amplitude: 0.7 }, 
             { color: 'rgba(0, 0, 0, 0.05)', speed: 1.1, phase: 1, frequency: 1.2, amplitude: 0.6 },
             { color: 'rgba(0, 0, 0, 0.8)', speed: 1.2, phase: 4, frequency: 1.0, amplitude: 1.0 } 
          ];

          lines.forEach((line) => {
             ctx.beginPath();
             ctx.strokeStyle = line.color;
             ctx.lineWidth = line.color.includes('0.8') ? 2.5 : 1.5;
             ctx.lineCap = 'round';
             ctx.lineJoin = 'round';
             
             for (let x = 0; x <= width; x += 2) {
                 const nx = (x / width) * 2 - 1;
                 const attenuation = Math.pow(1 - Math.pow(nx, 2), 2.5);
                 const sine = Math.sin(x * 0.005 * line.frequency + time * line.speed + line.phase);
                 const currentAmp = (20 + vol * 140) * line.amplitude * attenuation;
                 const y = centerY + sine * currentAmp;
                 if (x === 0) ctx.moveTo(x, y);
                 else ctx.lineTo(x, y);
             }
             ctx.stroke();
          });

          rafIdRef.current = requestAnimationFrame(renderFrame);
        };
        renderFrame();

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

  const handleCitationClick = (doc: Document) => {
    onViewDocument(doc.name);
    onClose(sessionTranscriptRef.current);
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-start py-8 px-6 animate-in fade-in duration-700 overflow-hidden">
      
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between z-50 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg">
             <DocIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Live Voice Mode</span>
        </div>
        <button 
          onClick={() => onClose(sessionTranscriptRef.current)}
          className="p-3 bg-gray-50 hover:bg-black hover:text-white rounded-full transition-all text-gray-400 group"
        >
          <CloseIcon className="w-6 h-6 group-active:scale-90" />
        </button>
      </div>

      {/* Real-time Status and Citations Area */}
      <div className="w-full max-w-xl flex flex-col items-center relative z-20 min-h-[220px]">
        {/* Status Bubble */}
        <div className={`mb-8 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-700 shadow-sm border ${
          activeCitations.length > 0 
          ? 'bg-green-600 text-white border-green-600 animate-pulse' 
          : 'bg-white text-gray-400 border-gray-100'
        }`}>
          {activeCitations.length > 0 ? `${activeCitations.length} Quellen gefunden` : 'Guide hört zu...'}
        </div>

        {/* Dynamic Citation Component */}
        <div className="w-full">
          {activeCitations.length === 1 && (
            <button 
              onClick={() => handleCitationClick(activeCitations[0].doc)}
              className="bg-white border-2 border-green-500 rounded-[2.5rem] p-6 pr-12 flex items-center gap-6 shadow-[0_30px_60px_-15px_rgba(22,163,74,0.2)] animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 hover:scale-[1.02] active:scale-98 transition-all text-left relative overflow-hidden group w-full"
            >
              <div className="absolute top-0 right-0 p-4">
                <ArrowRightIcon className="w-4 h-4 text-green-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="p-4 bg-green-50 rounded-2xl group-hover:bg-green-600 transition-colors shrink-0">
                <DocIcon className="w-6 h-6 text-green-600 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-1 block">Wohnpro Beleg</span>
                <p className="text-lg font-black text-gray-900 truncate mb-0.5 tracking-tight">{activeCitations[0].doc.name.replace(/\.(pdf|docx)$/i, '')}</p>
                <p className="text-[11px] text-gray-500 line-clamp-1 italic">
                  "{activeCitations[0].snippet}..."
                </p>
              </div>
            </button>
          )}

          {activeCitations.length > 1 && (
            <div className="relative w-full">
              {/* Collapsed Overview Button */}
              <button 
                onClick={() => setShowCitationList(!showCitationList)}
                className={`bg-white border-2 rounded-[2.5rem] p-4 w-full flex items-center justify-between shadow-[0_30px_60px_-15px_rgba(22,163,74,0.2)] animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 hover:bg-gray-50 transition-all z-30 relative ${showCitationList ? 'border-black' : 'border-green-500'}`}
              >
                 <div className="flex items-center gap-4">
                    <div className="bg-green-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm">
                      {activeCitations.length}
                    </div>
                    <div className="text-left">
                       <p className="font-black text-gray-900 leading-tight">Gefundene Belege</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Antippen für Details</p>
                    </div>
                 </div>
                 <div className={`p-3 rounded-full transition-all duration-300 ${showCitationList ? 'rotate-45 bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <PlusIcon className="w-5 h-5" />
                 </div>
              </button>

              {/* Collapsible List of Multiple Sources */}
              {showCitationList && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2rem] p-3 shadow-2xl z-40 animate-in slide-in-from-top-4 fade-in duration-300 flex flex-col gap-2 max-h-64 overflow-y-auto no-scrollbar">
                  {activeCitations.map((citation, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleCitationClick(citation.doc)}
                      className="flex items-center gap-4 p-4 hover:bg-white rounded-2xl transition-all hover:shadow-lg border border-transparent hover:border-gray-100 text-left group"
                    >
                      <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-colors">
                        <DocIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate tracking-tight">{citation.doc.name.replace(/\.(pdf|docx)$/i, '')}</p>
                        <p className="text-[10px] text-gray-400 truncate italic">"{citation.snippet}..."</p>
                      </div>
                      <ArrowRightIcon className="w-3 h-3 text-gray-300 group-hover:text-black transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time Subtitles / Live Transcript fragment */}
        {lastTranscriptFragment && (
          <div className="mt-8 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md">
            <p className="text-sm md:text-base font-medium text-gray-400 italic leading-relaxed line-clamp-2">
              "{lastTranscriptFragment.replace(/\[Quelle:[^\]]+\]/gi, '').trim()}"
            </p>
          </div>
        )}
      </div>

      {/* Centered Wave Visualizer Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 -mt-10">
         <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-64 h-64 bg-green-100 rounded-full blur-3xl animate-pulse" />
         </div>
         <canvas ref={canvasRef} className="w-full h-full max-h-[400px] pointer-events-none" />
      </div>

      {/* Footer / Interaction Hint */}
      <div className="mt-auto pb-6 w-full max-w-md flex flex-col items-center gap-4 z-10">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
           <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Mikrofon ist aktiv</span>
        </div>
        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.6em]">Wohnpro Guide Voice</p>
      </div>
    </div>
  );
};

export default VoiceMode;
