
import React, { useState, useEffect, useRef } from 'react';
import { FAQItem, Persona, Category } from '../types';
import { HelpIcon, ChevronDownIcon, DocIcon, InfoIcon, ShieldIcon, ThumbsUpIcon, ThumbsDownIcon, DownloadIcon, MessageIcon, SparklesIcon, SearchIcon } from './Icons';

interface FAQViewProps {
  faqs: FAQItem[];
  personas: Persona[];
  categories: Category[];
  onViewSource: (docName: string) => void;
  onUpdateFaq: (id: string, updates: Partial<FAQItem>) => void;
  onExport: () => void;
  onRegenerate: () => void;
  isLoading?: boolean;
}

const FAQView: React.FC<FAQViewProps> = ({ 
  faqs, 
  personas,
  categories,
  onViewSource, 
  onUpdateFaq, 
  onExport,
  onRegenerate,
  isLoading = false
}) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string>(personas[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((!activePersonaId || !personas.find(p => p.id === activePersonaId)) && personas.length > 0) {
      setActivePersonaId(personas[0].id);
    }
  }, [personas, activePersonaId]);

  const filteredFaqs = faqs.filter(f => {
    const matchesPersona = f.personaId === activePersonaId;
    const matchesSearch = f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? f.category === selectedCategory : true;
    return matchesPersona && matchesSearch && matchesCategory;
  });

  const activePersona = personas.find(p => p.id === activePersonaId);

  // Sort categories alphabetically for consistent display
  const sortedCategories = [...categories].sort((a, b) => a.localeCompare(b));

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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700 h-full">
        <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center mb-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50 animate-pulse">
           <SparklesIcon className="w-16 h-16 text-blue-400 animate-spin-slow" />
        </div>
        <h2 className="text-3xl font-black mb-4">Generiere neues Wissen...</h2>
        <p className="text-gray-400 max-w-sm leading-relaxed font-medium">
          Der Wohnpro Guide analysiert alle Dokumente neu für deine Zielgruppen.
        </p>
      </div>
    );
  }

  if (faqs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700 h-full">
        <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center mb-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50">
           <HelpIcon className="w-16 h-16 text-gray-200" />
        </div>
        <h2 className="text-3xl font-black mb-4">Das Hausgedächtnis füllt sich noch...</h2>
        <p className="text-gray-400 max-w-sm leading-relaxed font-medium">
          Sobald Admins Dokumente hochladen, erstellt der Wohnpro Guide automatisch FAQs für dich.
        </p>
        <button 
          onClick={onRegenerate}
          className="mt-8 bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10"
        >
           <SparklesIcon className="w-4 h-4" />
           FAQs generieren
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        <header className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <InfoIcon className="w-3 h-3" />
                  Wohnpro FAQ
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[0.95]">Haus-Wissen <br /><span className="text-gray-300">zentral verwaltet.</span></h1>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={onRegenerate}
                  className="bg-white text-black border border-gray-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                >
                   <SparklesIcon className="w-4 h-4" />
                   Neu generieren
                </button>
                <button 
                  onClick={onExport}
                  className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10 whitespace-nowrap"
                >
                   <DownloadIcon className="w-4 h-4" />
                   Export CSV
                </button>
              </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Persona Selection */}
            <div className="flex flex-wrap gap-3">
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

            {/* Search and Filter */}
            <div className="space-y-4">
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Suche nach Fragen oder Antworten..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/5 shadow-sm"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${!selectedCategory ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900'}`}
                >
                  Alle
                </button>
                {sortedCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {activePersona && (
             <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Perspektive: {activePersona.name}</p>
                <p className="text-gray-600 text-sm italic leading-relaxed">"{activePersona.description}"</p>
             </div>
          )}
        </header>

        {filteredFaqs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 font-medium">Keine FAQ-Einträge gefunden.</p>
          </div>
        ) : (
          sortedCategories.map(cat => {
             const categoryFaqs = filteredFaqs.filter(f => f.category === cat);
             if (categoryFaqs.length === 0) return null;

             return (
              <div key={cat} className="space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-300 flex items-center gap-4">
                  {cat}
                  <div className="h-px bg-gray-100 flex-1" />
                </h3>
                <div className="grid gap-6">
                  {categoryFaqs.map(faq => (
                    <div 
                      key={faq.id}
                      ref={openId === faq.id ? activeItemRef : null}
                      className={`group relative bg-white border border-gray-100 rounded-[2.5rem] transition-all duration-500 overflow-hidden ${openId === faq.id ? 'shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] -translate-y-1 ring-1 ring-black/5' : 'hover:shadow-xl hover:border-gray-200'}`}
                    >
                      <button 
                        onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                        className="w-full text-left p-8 flex items-center justify-between gap-6"
                      >
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-gray-900 group-hover:text-black transition-colors leading-tight">{faq.question}</h4>
                        </div>
                        <div className={`p-3 rounded-full transition-all duration-500 ${openId === faq.id ? 'bg-black text-white rotate-180' : 'bg-gray-50 text-gray-300'}`}>
                          <ChevronDownIcon className="w-5 h-5" />
                        </div>
                      </button>
                      
                      {openId === faq.id && (
                        <div className="px-8 pb-8 animate-in slide-in-from-top-4 fade-in duration-500">
                          <div className="bg-gray-50 rounded-3xl p-8 mb-6 border border-gray-100/50">
                            <p className="text-gray-700 leading-relaxed font-medium">
                              {faq.answer}
                            </p>
                          </div>
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                             <button 
                               onClick={() => onViewSource(faq.sourceDocName)}
                               className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                             >
                               <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                                  <DocIcon className="w-3 h-3" />
                               </div>
                               Quelle: {faq.sourceDocName}
                             </button>

                             <div className="flex items-center gap-3">
                               <button 
                                 onClick={() => onUpdateFaq(faq.id, { feedback: 'like' })}
                                 className={`p-2.5 rounded-xl border transition-all ${faq.feedback === 'like' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-100 text-gray-300 hover:border-black/10 hover:text-black'}`}
                                 title="Hilfreich"
                               >
                                 <ThumbsUpIcon className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => onUpdateFaq(faq.id, { feedback: 'dislike' })}
                                 className={`p-2.5 rounded-xl border transition-all ${faq.feedback === 'dislike' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-100 text-gray-300 hover:border-black/10 hover:text-black'}`}
                                 title="Nicht hilfreich"
                               >
                                 <ThumbsDownIcon className="w-4 h-4" />
                               </button>
                             </div>
                          </div>

                          {/* Comment Section */}
                          <div className="mt-6 pt-6 border-t border-gray-100">
                             <div className="relative">
                               <MessageIcon className="absolute top-4 left-4 w-4 h-4 text-gray-300" />
                               <input 
                                  type="text" 
                                  placeholder="Dein Kommentar oder Verbesserungsvorschlag..." 
                                  className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/5"
                                  value={faq.userComment || ''}
                                  onChange={(e) => onUpdateFaq(faq.id, { userComment: e.target.value })}
                               />
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
             );
          })
        )}
      </div>
    </div>
  );
};

export default FAQView;
