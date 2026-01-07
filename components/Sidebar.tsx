
import React from 'react';
import { ChatSession, View } from '../types';
import { ChatIcon, DocIcon, SettingsIcon, ClockIcon, InfoIcon, CloseIcon } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentView: View;
  setView: (view: View) => void;
  onSelectSession: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, sessions, currentView, setView, onSelectSession }) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 w-80 bg-white border-r border-gray-100 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <span className="font-semibold text-xl tracking-tight">Wohnpro Guide</span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1 mb-10">
            <button 
              onClick={() => { setView('chat'); onClose(); }}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${currentView === 'chat' ? 'bg-gray-50 text-black font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}
            >
              <ChatIcon className="w-5 h-5" />
              <span>Neuer Wohnpro Chat</span>
            </button>
            <button 
              onClick={() => { setView('docs-view'); onClose(); }}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${currentView === 'docs-view' ? 'bg-gray-50 text-black font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}
            >
              <DocIcon className="w-5 h-5" />
              <span>Wohnpro Dokumente</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3 flex items-center gap-2">
              <ClockIcon className="w-3 h-3" />
              Verlauf
            </h3>
            <div className="space-y-1">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => { onSelectSession(session.id); onClose(); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-gray-50 text-sm text-gray-600 truncate transition-all"
                >
                  {session.title}
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="px-3 text-sm text-gray-400 italic">Noch keine Gespräche.</p>
              )}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-gray-100 space-y-1">
            <button 
              className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-all"
              onClick={() => { setView('admin-docs'); onClose(); }}
            >
              <SettingsIcon className="w-5 h-5" />
              <span>Adminbereich</span>
            </button>
            <button className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-all">
              <InfoIcon className="w-5 h-5" />
              <span>Über Wohnpro Guide</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
