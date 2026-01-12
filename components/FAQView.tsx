
import React, { useState, useEffect, useRef } from 'react';
import { FAQItem, Persona } from '../types';
import { HelpIcon, ChevronDownIcon, DocIcon, InfoIcon, ShieldIcon, ThumbsUpIcon, ThumbsDownIcon, DownloadIcon } from './Icons';

interface FAQViewProps {
  faqs: FAQItem[];
  personas: Persona[];
  onViewSource: (docName: string) => void;
  onUpdateFaq: (id: string, updates: Partial<FAQItem>) => void;
  onExport: () => void;
}

const FAQView: React.FC<FAQViewProps> = ({ faqs, personas, onViewSource, onUpdateFaq, onExport }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string>(personas[0]?.id || '');
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Set default active persona if not set or if current selection is invalid
  useEffect(() => {
    if ((!activePersonaId || !personas.find(p => p.id === activePersonaId)) && personas.length > 0) {
      setActivePersonaId(personas[0].id);
    }
  }, [personas, activePersonaId]);

  const filteredFaqs = faqs.filter(f => f.personaId === activePersonaId);
  const categories = Array.from(new Set(filteredFaqs.map(f => f.category)));
  const activePersona = personas.find(p => p.id === activePersonaId);

  // Scroll the expanded item into view on mobile
  useEffect(() => {
    if (openId && activeItemRef.current) {
      const timer = setTimeout(() => {
        activeItemRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [openId]);

  if (faqs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
        <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center mb-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50">
           <HelpIcon className="w-16 h-16 text-gray-200" />
        </div>
        <h2 className="text-3xl font-black mb-4">Das Hausgedächtnis füllt sich noch...</h2>
        <p className="text-gray-400 max-w-sm leading-relaxed font-medium">
          Sobald Admins Dokumente hochladen, erstellt der Wohnpro Guide automatisch die wichtigsten FAQs für dich.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <InfoIcon className="w-3 h-3" />
                  Wohnpro FAQ
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[0.95]">Häufige Fragen <br /><span className="text-gray-300">aus euren Dokumenten.</span></h1>
              </div>
              <button 
                onClick={onExport}
                className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10 whitespace-nowrap"
              >
                 <DownloadIcon className="w-4 h-4" />
                 Export CSV
              </button>
          </div>

          {/* Persona Selection Tabs */}
          <div className="flex flex-wrap gap-3 pb-2">
            {personas.map(persona => (
              <button
                key={persona.id}
                onClick={() => setActivePersonaId(persona.id)}
                className={`px-6 py-3 rounded-2xl transition-all duration-300 font-bold text-sm flex items-center gap-2 ${
                  activePersonaId === persona.id 
                  ? 'bg-black text-white shadow-xl shadow-black/10 scale-105' 
                  : 'bg-white border border-gray-100 text-gray-400 hover:border-black/20 hover:text-black'
                }`}
              >
                {persona.role === 'expert' ? <ShieldIcon className="w-4 h-4" /> : <HelpIcon className="w-4 h-4" />}
                {persona.name}
              </button>
            ))}
          </div>
          
          {/* Persona Description Context */}
          {activePersona && (
             <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Perspektive: {activePersona.name}</p>
                <p className="text-gray-600 text-sm italic leading-relaxed">"{activePersona.description}"</p>
             </div>
          )}
        </header>

        {filteredFaqs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 font-medium">Noch keine Fragen für diese Zielgruppe generiert.</p>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat} className="space-y-8">
              <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-300 flex items-center gap-4">
                {cat}
                <div className="h-px bg-gray-100 flex-1" />
              </h3>
              <div className="grid gap-6">
                {filteredFaqs.filter(f => f.category === cat).map(faq => (
                  <div 
                    key={faq.id}
                    ref={openId === faq.id ? activeItemRef : null}
                    className={`group relative bg-white border border-gray-100 rounded-[2.5rem] transition-all duration-500 overflow-hidden ${openId === faq.id ? 'shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] -translate-y-1 ring-1 ring-black/5' : 'hover:shadow-xl hover:border-gray-200'}`}
                  >
                    <button 
                      onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                      className="w-full text-left p-8 flex items-center justify-between gap-6"
                    >
                      <span className="text-xl md:text-2xl font-black text-gray-900 leading-tight tracking-tight">{faq.question}</span>
                      <div className={`p-4 rounded-full bg-gray-50 group-hover:bg-black group-hover:text-white transition-all duration-500 ${openId === faq.id ? 'rotate-180 bg-black text-white' : ''}`}>
                        <ChevronDownIcon className="w-5 h-5" />
                      </div>
                    </button>
                    
                    {openId === faq.id && (
                      <div className="px-8 pb-8 animate-in slide-in-from-top-4 duration-500">
                        <div className="p-10 bg-gray-50/50 rounded-[2.5rem] space-y-8 border border-gray-100/50">
                          <p className="text-xl text-gray-700 leading-relaxed font-medium italic">
                            "{faq.answer}"
                          </p>
                          
                          {/* Feedback Section */}
                          <div className="p-6 bg-white rounded-[2rem] border border-gray-100 flex flex-col sm:flex-row gap-6">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => onUpdateFaq(faq.id, { feedback: 'like' })}
                                    className={`p-3 rounded-xl transition-all ${faq.feedback === 'like' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-50 text-gray-400'}`}
                                >
                                    <ThumbsUpIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => onUpdateFaq(faq.id, { feedback: 'dislike' })}
                                    className={`p-3 rounded-xl transition-all ${faq.feedback === 'dislike' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-50 text-gray-400'}`}
                                >
                                    <ThumbsDownIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1">
                                <input 
                                    type="text" 
                                    placeholder="Kommentar für KI-Training..." 
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                                    value={faq.userComment || ''}
                                    onChange={(e) => onUpdateFaq(faq.id, { userComment: e.target.value })}
                                />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50">
                                <DocIcon className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Quelle</span>
                                  <span className="text-xs font-bold text-gray-900">{faq.sourceDocName}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => onViewSource(faq.sourceDocName)}
                              className="px-6 py-3 bg-white border border-gray-100 rounded-full text-[10px] font-black text-gray-900 uppercase tracking-widest hover:bg-black hover:text-white hover:border-black transition-all"
                            >
                              Dokument öffnen
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FAQView;
