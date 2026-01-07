
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { CloseIcon, MicIcon, DocIcon, ArrowRightIcon, PlusIcon, CloseIcon as XIcon } from './Icons';
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
  
  // Changed to an array to hold multiple citations found in one turn
  const [activeCitations, setActiveCitations] = useState<ActiveCitation[]>([]);
  const [showCitationList, setShowCitationList] = useState(false);
  
  // Increased resolution for smoother waveform
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(32).fill(2));
  
  const sessionTranscriptRef = useRef<Message[]>([]);
  const currentModelTurnText = useRef('');
  const currentUserTurnText = useRef('');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{
    input: AudioContext;
    output: AudioContext;
    outputAnalyser: AnalyserNode;
    inputAnalyser: AnalyserNode;
    ambientNode?: AudioNode;
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

  // Ambient Blues Atmosphere
  const startBluesAtmosphere = (ctx: AudioContext, destination: AudioNode) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.03; 
    masterGain.connect(destination);

    const freqs = [82.41, 164.81, 196.00, 246.94, 293.66]; 
    
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = Math.random() * 8 - 4;

      const oscGain = ctx.createGain();
      oscGain.gain.value = 1.0 / freqs.length;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + (Math.random() * 0.15);
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.3;
      
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      
      osc.start();
      lfo.start();
    });
    
    return masterGain;
  };

  useEffect(() => {
    let isMounted = true;

    const startSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const ambientNode = startBluesAtmosphere(outputCtx, outputCtx.destination);
        
        const inputAnalyser = inputCtx.createAnalyser();
        const outputAnalyser = outputCtx.createAnalyser();
        // Higher FFT size for better resolution
        inputAnalyser.fftSize = 256; 
        outputAnalyser.fftSize = 256;
        inputAnalyser.smoothingTimeConstant = 0.7;
        outputAnalyser.smoothingTimeConstant = 0.7;
        
        audioContextRef.current = { 
          input: inputCtx, 
          output: outputCtx, 
          inputAnalyser, 
          outputAnalyser,
          ambientNode
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
                // User started speaking, clear previous model citations to clean up UI
                if (currentUserTurnText.current === '') {
                   setActiveCitations([]); 
                   setShowCitationList(false);
                }
                currentUserTurnText.current += message.serverContent.inputTranscription.text;
              }

              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentModelTurnText.current += text;

                // Continuous citation scanning
                const matches = [...currentModelTurnText.current.matchAll(/\[Quelle:\s*([^\]]+)\]/gi)];
                
                if (matches.length > 0) {
                  // Check matches we haven't processed yet? 
                  // Simplification: Re-evaluate matches and add if new
                  matches.forEach(match => {
                     const sourceName = match[1].trim().toLowerCase();
                     const doc = documents.find(d => d.name.toLowerCase().includes(sourceName));
                     
                     if (doc) {
                        // Extract snippet context
                        const fullTextBefore = currentModelTurnText.current.substring(0, match.index);
                        const sentences = fullTextBefore.split(/[.!?]/);
                        const relevantSentence = sentences[sentences.length - 1]?.trim() || "Information gefunden";

                        setActiveCitations(prev => {
                          // Prevent duplicates
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
                // Interrupt clears context but maybe we want to keep citations visible for a moment?
                // For now, let's keep them until new user input starts
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
          const numBars = 32; // Increased resolution
          
          // Enhanced Visualization Logic
          for (let i = 0; i < numBars; i++) {
            // Logarithmic distribution approx
            const idx = Math.floor(Math.pow(i / numBars, 1.5) * (inputData.length / 2));
            
            const inVal = inputData[idx] || 0;
            const outVal = outputData[idx] || 0;
            
            // Output takes precedence for visual feedback when AI speaks
            let val = Math.max(inVal * 0.8, outVal); 
            
            // Dampen noise floor
            if (val < 10) val = 2; 
            
            // Normalize 0-100
            levels.push((val / 255) * 100);
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

  const handleCitationClick = (doc: Document) => {
    onViewDocument(doc.name);
    onClose(sessionTranscriptRef.current);
  };

  const avgLevel = audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length;
  const isSpeaking = avgLevel > 10;

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-start py-12 px-8 animate-in fade-in duration-700 overflow-hidden">
      
      {/* Dynamic Background Atmosphere */}
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-1000 opacity-40"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${activeCitations.length > 0 ? '#22c55e' : '#000000'} 0%, transparent 70%)`,
          transform: `scale(${1 + (avgLevel / 100) * 0.8})`
        }}
      />

      {/* Close Button */}
      <button 
        onClick={() => onClose(sessionTranscriptRef.current)}
        className="absolute top-8 right-8 p-4 hover:bg-gray-50 rounded-full transition-all text-gray-300 hover:text-black z-50"
      >
        <CloseIcon className="w-8 h-8" />
      </button>

      {/* Header / Citation Area */}
      <div className="w-full flex flex-col items-center relative z-20 mb-8 min-h-[200px]">
        <div className={`mb-6 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-700 shadow-sm ${activeCitations.length > 0 ? 'bg-green-600 text-white animate-pulse' : 'bg-gray-50 text-gray-300'}`}>
          {activeCitations.length > 0 ? `${activeCitations.length} Quellen gefunden` : 'Guide hört zu...'}
        </div>

        {/* Dynamic Citation UI */}
        <div className="w-full max-w-sm flex flex-col items-center">
          {activeCitations.length === 1 && (
            <button 
              onClick={() => handleCitationClick(activeCitations[0].doc)}
              className="bg-white border-4 border-green-500 rounded-[3rem] p-7 pr-14 flex items-center gap-7 shadow-[0_40px_80px_-20px_rgba(22,163,74,0.3)] animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 hover:scale-105 active:scale-95 transition-all text-left relative overflow-hidden group w-full"
            >
              <div className="absolute top-0 right-0 p-4">
                <ArrowRightIcon className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="p-5 bg-green-50 rounded-2xl group-hover:bg-green-600 transition-colors shrink-0">
                <DocIcon className="w-7 h-7 text-green-600 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-1.5 block">Verifizierte Quelle</span>
                <p className="text-base font-black text-gray-900 truncate mb-1">{activeCitations[0].doc.name.replace(/\.(pdf|docx)$/i, '')}</p>
                <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed italic">
                  "{activeCitations[0].snippet}..."
                </p>
              </div>
            </button>
          )}

          {activeCitations.length > 1 && (
            <div className="relative w-full">
              <button 
                onClick={() => setShowCitationList(!showCitationList)}
                className="bg-white border-4 border-green-500 rounded-[3rem] p-4 w-full flex items-center justify-between shadow-[0_40px_80px_-20px_rgba(22,163,74,0.3)] animate-in zoom-in-95 slide-in-from-bottom-12 duration-500 hover:bg-gray-50 transition-colors z-30 relative"
              >
                 <div className="flex items-center gap-4">
                    <div className="bg-green-100 text-green-700 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg">
                      {activeCitations.length}
                    </div>
                    <div className="text-left">
                       <p className="font-bold text-gray-900">Quellen gefunden</p>
                       <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Antippen zum Anzeigen</p>
                    </div>
                 </div>
                 <div className={`p-3 rounded-full transition-transform duration-300 ${showCitationList ? 'rotate-45 bg-gray-100' : 'bg-green-500 text-white'}`}>
                    <PlusIcon className="w-5 h-5" />
                 </div>
              </button>

              {/* Collapsible List Overlay */}
              {showCitationList && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-[2rem] p-4 shadow-2xl z-40 animate-in slide-in-from-top-4 fade-in duration-300 flex flex-col gap-3 max-h-60 overflow-y-auto no-scrollbar">
                  {activeCitations.map((citation, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleCitationClick(citation.doc)}
                      className="flex items-center gap-4 p-3 hover:bg-white rounded-2xl transition-all hover:shadow-md border border-transparent hover:border-gray-100 text-left group"
                    >
                      <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-colors">
                        <DocIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{citation.doc.name.replace(/\.(pdf|docx)$/i, '')}</p>
                        <p className="text-[10px] text-gray-400 truncate">"{citation.snippet}"</p>
                      </div>
                      <ArrowRightIcon className="w-3 h-3 text-gray-300 group-hover:text-black" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCitations.length === 0 && (
             <div className="text-center opacity-40 transition-opacity duration-1000 mt-8">
               <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Atmo läuft...</p>
             </div>
          )}
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg space-y-16 z-10">
        <div className="relative">
          {/* Dynamic Reactive Rings */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-black/5 transition-transform duration-[50ms]"
            style={{ transform: `scale(${2.5 + (avgLevel / 100) * 2.5})`, opacity: Math.min(avgLevel / 80, 0.5) }}
          />
           <div 
            className="absolute inset-0 rounded-full border border-black/10 transition-transform duration-[100ms]"
            style={{ transform: `scale(${1.8 + (avgLevel / 100) * 1.5})`, opacity: Math.min(avgLevel / 100, 0.3) }}
          />
          
          <div className={`relative w-64 h-64 rounded-full bg-white shadow-[0_64px_128px_-32px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all duration-700 border border-gray-100 ${status === 'active' ? 'scale-110' : 'scale-100'}`}>
            <div 
              className={`w-52 h-52 rounded-full flex items-center justify-center transition-all duration-[50ms] ${status === 'active' ? 'bg-black' : 'bg-gray-50'}`}
              style={{ 
                transform: `scale(${1 + (avgLevel / 100) * 0.3})`,
                boxShadow: status === 'active' ? `0 0 ${avgLevel * 2}px rgba(0,0,0,${0.2 + (avgLevel/200)})` : 'none'
              }}
            >
              <MicIcon className={`w-28 h-28 transition-all duration-500 ${status === 'active' ? 'text-white' : 'text-gray-200'}`} />
            </div>
          </div>
        </div>

        {/* Enhanced Bar Visualizer */}
        <div className="h-32 flex items-center justify-center gap-1.5 px-8 w-full max-w-lg">
          {audioLevels.map((level, i) => {
            // Calculate symmetry for a centered look
            const centerIdx = audioLevels.length / 2;
            const dist = Math.abs(i - centerIdx);
            const heightMod = 1 - (dist / centerIdx) * 0.5; // Taper towards edges
            
            return (
              <div 
                key={i}
                className={`w-1.5 rounded-full transition-all duration-[30ms] ${status === 'active' ? (activeCitations.length > 0 ? 'bg-green-500' : 'bg-black') : 'bg-gray-100'}`}
                style={{ 
                  height: `${Math.max(5, level * heightMod)}%`,
                  opacity: 0.2 + (level / 120) * 0.8,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pb-8 flex flex-col items-center gap-6 z-10">
        <div className="flex flex-col items-center">
          <p className="text-[10px] text-gray-300 uppercase tracking-[0.6em] font-black mb-2">Wohnpro Guide</p>
        </div>
        <div className="flex gap-4">
          {[0, 1, 2].map(i => (
            <div 
              key={i} 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-1000 ${status === 'active' && i === 0 ? 'bg-black scale-125' : 'bg-gray-200'}`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceMode;
