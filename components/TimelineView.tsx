
import React, { useState } from 'react';
import { Milestone } from '../types';
import { InfoIcon, CalendarIcon, CheckCircleIcon, ClockIcon, AlertIcon } from './Icons';

interface TimelineViewProps {
  milestones: Milestone[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ milestones }) => {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  // Group by Quarters logic
  const months = [
    { name: 'Jan', q: 'Q1' }, { name: 'Feb', q: 'Q1' }, { name: 'Mär', q: 'Q1' },
    { name: 'Apr', q: 'Q2' }, { name: 'Mai', q: 'Q2' }, { name: 'Jun', q: 'Q2' },
    { name: 'Jul', q: 'Q3' }, { name: 'Aug', q: 'Q3' }, { name: 'Sep', q: 'Q3' },
    { name: 'Okt', q: 'Q4' }, { name: 'Nov', q: 'Q4' }, { name: 'Dez', q: 'Q4' },
  ];

  // Helper to calculate position based on date within the current year
  // Assuming 2024 for simplicity, or we can make it dynamic based on the first milestone year
  const currentYear = new Date().getFullYear();
  
  const getPosition = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    
    // Simple normalization: if outside current year, clamp it
    if (year < currentYear) return 0;
    if (year > currentYear) return 100;

    // Calculate % of year passed
    const startOfYear = new Date(currentYear, 0, 1).getTime();
    const endOfYear = new Date(currentYear, 11, 31).getTime();
    const duration = endOfYear - startOfYear;
    const current = d.getTime() - startOfYear;
    
    return Math.max(0, Math.min(100, (current / duration) * 100));
  };

  const getWidth = (start: string, end: string) => {
    const s = getPosition(start);
    const e = getPosition(end);
    return Math.max(1, e - s); // Min width 1%
  };

  const getStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'done': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'delayed': return 'bg-red-400';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: Milestone['status']) => {
    switch (status) {
        case 'done': return 'Abgeschlossen';
        case 'active': return 'In Arbeit';
        case 'delayed': return 'Verzögert';
        default: return 'Geplant';
      }
  };

  // Filter out milestones not in current year roughly for the view? 
  // For now, let's just show all, clamping visual range.
  
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar py-12 px-6">
        <div className="max-w-6xl mx-auto pb-20">
          
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-black text-white rounded-2xl shadow-lg shadow-black/20">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tight">Zeitplan {currentYear}</h1>
            </div>
            <p className="text-gray-500 max-w-xl text-lg font-medium leading-relaxed">
              Übersicht über Meilensteine, Verantwortlichkeiten und Projektfortschritt.
              Transparenz schafft Vertrauen.
            </p>
          </header>

          <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden relative">
            {/* Scrollable Container for the Gantt Chart */}
            <div className="overflow-x-auto">
              <div className="min-w-[1000px] p-10">
                
                {/* Timeline Header (Quarters & Months) */}
                <div className="grid grid-cols-4 gap-0 mb-4 border-b border-gray-100 pb-4">
                   {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
                     <div key={q} className={`text-center font-black text-gray-300 text-xl uppercase tracking-widest ${i < 3 ? 'border-r border-gray-50' : ''}`}>
                       {q}
                     </div>
                   ))}
                </div>
                <div className="grid grid-cols-12 gap-0 mb-8 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
                   {months.map(m => <div key={m.name}>{m.name}</div>)}
                </div>

                {/* Grid Lines (Background) */}
                <div className="absolute top-32 bottom-10 left-10 right-10 pointer-events-none flex">
                    {/* 4 Quarters, 3 months each = 12 columns */}
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="flex-1 border-r border-dashed border-gray-100 last:border-0" />
                    ))}
                </div>

                {/* Milestones Rows */}
                <div className="space-y-6 relative z-10">
                  {milestones.map((m) => {
                    const left = getPosition(m.startDate);
                    const width = getWidth(m.startDate, m.endDate);
                    
                    return (
                      <div key={m.id} className="relative h-16 group">
                         {/* The Bar */}
                         <button
                            onClick={() => setSelectedMilestone(m)}
                            className="absolute h-12 top-2 rounded-2xl shadow-md hover:shadow-xl transition-all hover:-translate-y-1 flex items-center overflow-hidden cursor-pointer group-hover:ring-2 ring-black/5 bg-white border border-gray-100"
                            style={{ left: `${left}%`, width: `${width}%` }}
                         >
                            {/* Progress Fill */}
                            <div 
                                className={`absolute inset-y-0 left-0 opacity-20 ${getStatusColor(m.status)}`} 
                                style={{ width: `${m.progress}%` }} 
                            />
                            
                            {/* Status Indicator Line */}
                            <div className={`absolute left-0 inset-y-0 w-1.5 ${getStatusColor(m.status)}`} />

                            <div className="px-4 relative z-10 flex items-center gap-3 w-full overflow-hidden">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${getStatusColor(m.status)}`}>
                                   {m.owner.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-sm font-bold text-gray-800 truncate">{m.title}</span>
                            </div>
                         </button>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-8 flex gap-6 justify-center flex-wrap">
              {[
                  { label: 'Geplant', color: 'bg-gray-300' },
                  { label: 'In Arbeit', color: 'bg-blue-500' },
                  { label: 'Abgeschlossen', color: 'bg-green-500' },
                  { label: 'Verzögert', color: 'bg-red-400' }
              ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${s.color}`} />
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{s.label}</span>
                  </div>
              ))}
          </div>

        </div>
      </div>

      {/* Popup / Modal */}
      {selectedMilestone && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative">
                <button 
                    onClick={() => setSelectedMilestone(null)}
                    className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-black hover:text-white transition-colors"
                >
                    <span className="sr-only">Schließen</span>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div className="mb-6">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-4 ${getStatusColor(selectedMilestone.status)}`}>
                        {getStatusLabel(selectedMilestone.status)}
                    </span>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight mb-1">{selectedMilestone.title}</h2>
                    <p className="text-gray-400 font-bold text-sm">Verantwortlich: {selectedMilestone.owner}</p>
                </div>

                <div className="space-y-6">
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-gray-600 leading-relaxed font-medium text-sm">
                            {selectedMilestone.description || "Keine Beschreibung verfügbar."}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border border-gray-100 rounded-2xl">
                            <span className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Start</span>
                            <span className="font-bold text-gray-900">{new Date(selectedMilestone.startDate).toLocaleDateString('de-DE')}</span>
                        </div>
                        <div className="p-4 border border-gray-100 rounded-2xl">
                            <span className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Ende</span>
                            <span className="font-bold text-gray-900">{new Date(selectedMilestone.endDate).toLocaleDateString('de-DE')}</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                             <span className="text-xs font-black uppercase tracking-widest text-gray-400">Fortschritt</span>
                             <span className="font-bold text-gray-900">{selectedMilestone.progress}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${getStatusColor(selectedMilestone.status)} transition-all duration-1000`} 
                                style={{ width: `${selectedMilestone.progress}%` }} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TimelineView;
