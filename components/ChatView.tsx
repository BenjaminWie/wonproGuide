
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { MicIcon, ArrowRightIcon, DocIcon } from './Icons';

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onEnterVoice: () => void;
  onViewDocument: (sourceName: string, highlightText?: string) => void;
  isLoading: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage, onEnterVoice, onViewDocument, isLoading }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-4 sm:px-6">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-10 space-y-8 scroll-smooth no-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-black/20 ring-4 ring-black/5 ring-offset-4 ring-offset-white">
              <ChatIcon className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight mb-4 text-gray-900">Wie kann ich heute helfen?</h1>
            <p className="text-gray-400 max-w-sm mx-auto leading-relaxed text-lg">
              Frag mich alles zur Hausordnung, deinen Verträgen oder den letzten Beschlüssen.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group`}
          >
            <div className={`max-w-[85%] px-7 py-5 rounded-[2.2rem] shadow-sm transition-all duration-500 animate-in fade-in zoom-in-95 ${
              msg.role === 'user' 
              ? 'bg-black text-white rounded-tr-none slide-in-from-right-4' 
              : 'bg-white border border-gray-100 rounded-tl-none text-gray-800 slide-in-from-left-4'
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap text-base sm:text-lg font-medium">{msg.text}</p>
            </div>
            
            {msg.role === 'model' && msg.citations && msg.citations.length > 0 && (
              <div className="mt-6 w-full max-w-[90%] space-y-3 animate-in fade-in slide-in-from-top-4 duration-700 delay-300 fill-mode-both">
                <div className="flex items-center gap-2 ml-4 mb-3">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Verifizierte Belege</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {msg.citations.map((citation, i) => (
                    <button 
                      key={i} 
                      onClick={() => onViewDocument(citation.source, citation.text)}
                      className="group relative text-left bg-white border border-gray-100 rounded-[2rem] p-5 pr-14 flex gap-5 hover:border-black hover:shadow-xl transition-all duration-500 active:scale-[0.98] overflow-hidden animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${(i + 1) * 150}ms` }}
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-12 bg-gray-50 flex items-center justify-center border-l border-gray-100 group-hover:bg-black group-hover:border-black transition-all">
                        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-xl shrink-0 group-hover:bg-green-50 transition-colors">
                        <DocIcon className="w-6 h-6 text-gray-400 group-hover:text-green-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-gray-900 truncate max-w-[150px]">{citation.source}</span>
                          {citation.section && (
                             <span className="text-[8px] font-black text-white bg-black px-2 py-0.5 rounded-full uppercase tracking-widest">{citation.section}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed italic line-clamp-2">
                          "{citation.text}"
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-white border border-gray-100 px-7 py-5 rounded-[2.2rem] rounded-tl-none shadow-sm flex items-center gap-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-duration:1s]" />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
              </div>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] animate-pulse">Guide schreibt...</span>
            </div>
          </div>
        )}
      </div>

      <div className="pb-10 pt-4 safe-bottom">
        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-black/5 blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition-all duration-1000" />
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Frag etwas über euer Wohnprojekt..."
                className="w-full bg-white border border-gray-100 rounded-[2.5rem] px-8 py-6 pr-40 shadow-2xl focus:outline-none focus:ring-4 focus:ring-black/5 transition-all text-lg placeholder:text-gray-300"
                disabled={isLoading}
              />
              <div className="absolute right-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onEnterVoice}
                  className="p-3.5 text-gray-400 hover:text-green-600 transition-all rounded-full hover:bg-gray-50 active:scale-90"
                  title="Spracheingabe"
                >
                  <MicIcon className="w-7 h-7" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`p-4 rounded-full transition-all active:scale-90 ${
                    input.trim() && !isLoading 
                    ? 'bg-black text-white shadow-xl shadow-black/20 hover:bg-gray-900' 
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <ArrowRightIcon className="w-7 h-7" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ChatIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default ChatView;
