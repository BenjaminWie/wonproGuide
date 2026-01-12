
import React, { useState } from 'react';
import { ArrowRightIcon, ChatIcon, DocIcon, MicIcon, ShieldIcon, CheckCircleIcon, UserPlusIcon } from './Icons';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [activePersona, setActivePersona] = useState<'hans' | 'schmidts'>('hans');

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden text-gray-900 selection:bg-green-100 selection:text-green-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
              <ShieldIcon className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight">Wohnpro <span className="text-green-600">Guide</span></span>
          </div>
          <button 
            onClick={onStart}
            className="px-6 py-2.5 bg-black text-white rounded-full font-bold text-sm hover:scale-105 transition-all active:scale-95 shadow-xl shadow-black/10"
          >
            Jetzt starten
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Die Zukunft des Co-Livings
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter">
              Wissen, das <span className="text-transparent bg-clip-text bg-gradient-to-br from-green-500 to-green-700">verbindet.</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-lg leading-relaxed font-medium">
              Verwandle staubige Ordner, komplexe Satzungen und endlose Protokolle in einen lebendigen, digitalen Guide für alle Bewohner.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onStart}
                className="group px-8 py-5 bg-black text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-black/20 hover:bg-gray-900 transition-all hover:-translate-y-1"
              >
                Zum Wohnpro Guide
                <ArrowRightIcon className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-4 px-6 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${i+10}`} alt="User" />
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-400">+42 Bewohner aktiv</span>
              </div>
            </div>
          </div>

          {/* 3D Visual Element */}
          <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <div className="absolute inset-0 bg-gradient-to-tr from-green-100/50 to-blue-100/50 blur-3xl -z-10 rounded-full scale-110" />
            <div className="relative bg-white border border-gray-100 p-8 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] transform rotate-3 hover:rotate-0 transition-transform duration-700">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center">
                  <ChatIcon className="text-white" />
                </div>
                <div>
                  <div className="h-2 w-24 bg-gray-100 rounded-full mb-2" />
                  <div className="h-2 w-16 bg-gray-50 rounded-full" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-gray-50 rounded-2xl rounded-tl-none mr-12 text-sm font-medium">
                  "Wie funktioniert die Gartenpflege bei uns?"
                </div>
                <div className="p-5 bg-green-600 text-white rounded-2xl rounded-tr-none ml-12 text-sm leading-relaxed shadow-lg shadow-green-200">
                  "Laut dem Protokoll vom 12. Mai teilen wir uns die Pflege in 3 AGs auf. Du bist in AG Grün!"
                </div>
              </div>
              <div className="mt-8 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-300">
                <span>AI-Powered Insights</span>
                <span className="text-green-600">Active Session</span>
              </div>
            </div>
            
            {/* Floating 3D Cards */}
            <div className="absolute -top-12 -right-8 w-32 h-32 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center animate-bounce [animation-duration:4s]">
              <DocIcon className="w-10 h-10 text-green-500 mb-2" />
              <span className="text-[8px] font-bold text-gray-400">SATZUNG.PDF</span>
            </div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black rounded-full shadow-2xl flex flex-col items-center justify-center p-6 text-center text-white border-8 border-white group hover:scale-110 transition-transform duration-500">
               <MicIcon className="w-8 h-8 mb-2 group-hover:animate-pulse" />
               <span className="text-[10px] font-black uppercase">Voice Guide</span>
            </div>
          </div>
        </div>
      </section>

      {/* Storyline Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Antworten für <span className="text-green-600">jeden</span> im Haus.</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">Ein Tool, das Generationen verbindet und bürokratische Hürden abbaut.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Persona: Hans */}
            <div 
              onClick={() => setActivePersona('hans')}
              className={`cursor-pointer group relative overflow-hidden rounded-[3.5rem] p-12 transition-all duration-700 ${activePersona === 'hans' ? 'bg-black text-white scale-105 shadow-2xl' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-xl">
                  <img src="https://images.unsplash.com/photo-1559526324-593bc81418d9?q=80&w=200&auto=format&fit=crop" alt="Hans" className="w-full h-full object-cover" />
                </div>
                <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${activePersona === 'hans' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  Best-Ager (72)
                </div>
              </div>
              <h3 className="text-3xl font-black mb-4">"Hans sucht Sicherheit."</h3>
              <p className={`text-lg leading-relaxed mb-8 ${activePersona === 'hans' ? 'text-gray-400' : 'text-gray-500'}`}>
                Hans liebt die Gemeinschaft, ist aber bei neuen digitalen Prozessen oft unsicher. Er braucht jemanden, der ihm in Ruhe erklärt, was in der Satzung steht.
              </p>
              
              <div className={`p-6 rounded-3xl ${activePersona === 'hans' ? 'bg-white/10 backdrop-blur-md' : 'bg-white shadow-sm'} transition-colors`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Typische Frage</span>
                </div>
                <p className="font-bold italic">"Gibt es eine Regelung für den Aufzug, wenn ich schwere Kisten transportiere?"</p>
                {activePersona === 'hans' && (
                  <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-green-400 font-bold mb-1 text-sm italic">Wohnpro Guide antwortet:</p>
                    <p className="text-sm">"Hallo Hans, ja! Laut Hausordnung (S. 12) bitten wir darum, bei Umzügen eine Schutzmatte auszulegen. Diese findest du im Kellerraum 01."</p>
                  </div>
                )}
              </div>
            </div>

            {/* Persona: The Schmidts */}
            <div 
              onClick={() => setActivePersona('schmidts')}
              className={`cursor-pointer group relative overflow-hidden rounded-[3.5rem] p-12 transition-all duration-700 ${activePersona === 'schmidts' ? 'bg-black text-white scale-105 shadow-2xl' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-xl">
                  <img src="https://i.pravatar.cc/150?u=family" alt="The Schmidts" className="w-full h-full object-cover" />
                </div>
                <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${activePersona === 'schmidts' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  Junge Familie
                </div>
              </div>
              <h3 className="text-3xl font-black mb-4">"Die Schmidts wollen feiern."</h3>
              <p className={`text-lg leading-relaxed mb-8 ${activePersona === 'schmidts' ? 'text-gray-400' : 'text-gray-500'}`}>
                Zwischen Windeln und Home-Office bleibt wenig Zeit für Plenarsitzungen. Sie brauchen schnellen Zugriff auf Fakten, wenn sie ein Kinderfest planen.
              </p>
              
              <div className={`p-6 rounded-3xl ${activePersona === 'schmidts' ? 'bg-white/10 backdrop-blur-md' : 'bg-white shadow-sm'} transition-colors`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Typische Frage</span>
                </div>
                <p className="font-bold italic">"Können wir den Gemeinschaftsgarten für einen Geburtstag reservieren?"</p>
                {activePersona === 'schmidts' && (
                  <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-green-400 font-bold mb-1 text-sm italic">Wohnpro Guide antwortet:</p>
                    <p className="text-sm">"Hi Schmidts! Ja, das geht. Schaut kurz in den digitalen Kalender. Ab 20 Personen müssen wir es 48h vorher im Chat ankündigen."</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid with 3D effects */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldIcon className="w-8 h-8" />
               </div>
               <h4 className="text-xl font-black mb-4 tracking-tight">Rechtlich abgesichert</h4>
               <p className="text-gray-400 leading-relaxed font-medium">Basiert exklusiv auf euren Satzungen und Verträgen. Keine Halluzinationen, nur Fakten.</p>
            </div>
            <div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl hover:-translate-y-2 transition-all duration-500">
               <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-6">
                  <MicIcon className="w-8 h-8" />
               </div>
               <h4 className="text-xl font-black mb-4 tracking-tight">Sprach-Interface</h4>
               <p className="text-gray-400 leading-relaxed font-medium">Sprich mit dem Haus. Perfekt für Bewohner, die lieber reden als tippen.</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
               <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <CheckCircleIcon className="w-8 h-8" />
               </div>
               <h4 className="text-xl font-black mb-4 tracking-tight">Beleg-Zitate</h4>
               <p className="text-gray-400 leading-relaxed font-medium">Jede Antwort verweist direkt auf das Quelldokument. Vertrauen durch Transparenz.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-green-600 rounded-[4rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-10">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
              Bist du bereit für <br /> ein smarteres Miteinander?
            </h2>
            <div className="flex flex-col items-center gap-6">
              <button 
                onClick={onStart}
                className="px-12 py-6 bg-white text-green-700 rounded-3xl font-black text-xl hover:scale-105 transition-all shadow-2xl active:scale-95"
              >
                Jetzt den Guide testen
              </button>
              <p className="text-green-100/60 font-medium">Kostenlos für Bewohner registrierter Wohnprojekte.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
           <div className="flex items-center gap-3 grayscale opacity-50">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <ShieldIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg">Wohnpro Guide</span>
          </div>
          <div className="flex gap-10 text-sm font-bold text-gray-400">
            <a href="#" className="hover:text-black transition-colors">Impressum</a>
            <a href="#" className="hover:text-black transition-colors">Datenschutz</a>
            <a href="#" className="hover:text-black transition-colors">Kontakt</a>
          </div>
          <p className="text-gray-300 text-xs font-medium">© 2024 Wohnpro Guide. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
