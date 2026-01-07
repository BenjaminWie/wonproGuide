
import React, { useState, useEffect } from 'react';
import { View, ChatSession, Document, User, Message, Role, UserStatus } from './types';
import { INITIAL_DOCUMENTS, INITIAL_USERS } from './constants';
import LoginView from './components/LoginView';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import VoiceMode from './components/VoiceMode';
import AdminPanel from './components/AdminPanel';
import DocumentDetail from './components/DocumentDetail';
import { gemini } from './services/geminiService';
import { DocIcon } from './components/Icons';

const STORAGE_KEY = 'wohnprojekt_docs_cache';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });
  
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [highlightText, setHighlightText] = useState<string>('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const handleLogin = (email: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.status === 'aktiv');
    if (user) {
      setCurrentUser(user);
    } else {
      alert("Zugang verweigert. Nur verifizierte Wohnpro-Bewohner können sich im Wohnpro Guide anmelden.");
    }
  };

  const sendMessage = async (text: string) => {
    let sessionId = currentSessionId;
    let currentSessions = [...sessions];
    
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      const newSession: ChatSession = {
        id: sessionId,
        title: text.length > 30 ? text.substring(0, 30) + '...' : text,
        messages: [],
        createdAt: new Date().toISOString()
      };
      currentSessions = [newSession, ...currentSessions];
      setSessions(currentSessions);
      setCurrentSessionId(sessionId);
    }

    const updatedSessions = currentSessions.map(s => {
      if (s.id === sessionId) {
        return { ...s, messages: [...s.messages, { role: 'user' as const, text }] };
      }
      return s;
    });
    setSessions(updatedSessions);
    setIsLoading(true);

    const history = updatedSessions.find(s => s.id === sessionId)?.messages.map(m => ({ 
      role: m.role, 
      text: m.text 
    })) || [];

    const response = await gemini.askQuestion(text, documents, history.slice(0, -1));
    
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { 
          ...s, 
          messages: [...s.messages, { 
            role: 'model' as const, 
            text: response.text, 
            citations: response.citations 
          }] 
        };
      }
      return s;
    }));
    setIsLoading(false);
  };

  const handleInviteUser = (email: string, role: Role, content: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      role,
      status: 'eingeladen',
      invitedAt: new Date().toISOString(),
      inviteEmailContent: content
    };
    setUsers(prev => [...prev, newUser]);
    
    setTimeout(() => {
      setUsers(prev => prev.map(u => u.id === newUser.id ? { ...u, status: 'aktiv' } : u));
    }, 5000);
  };

  const handleViewDocument = (sourceName: string, textToHighlight?: string) => {
    const doc = documents.find(d => d.name === sourceName);
    if (doc) {
      setSelectedDocId(doc.id);
      setHighlightText(textToHighlight || '');
      setCurrentView('doc-detail');
    }
  };

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  const selectedDocument = documents.find(d => d.id === selectedDocId);
  const activeSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentView={currentView}
        setView={setCurrentView}
        onSelectSession={(id) => {
          setCurrentSessionId(id);
          setCurrentView('chat');
        }}
      />
      
      <main className="flex-1 h-full relative overflow-hidden flex flex-col pt-4 lg:pt-0">
        <header className="flex items-center justify-between px-6 py-4 lg:hidden border-b border-gray-100">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-50 rounded-full">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900">Wohnpro Guide</span>
          <div className="w-10" />
        </header>

        {currentView === 'chat' && (
          <ChatView 
            messages={activeSession?.messages || []}
            onSendMessage={sendMessage}
            onEnterVoice={() => setCurrentView('voice')}
            onViewDocument={handleViewDocument}
            isLoading={isLoading}
          />
        )}

        {currentView === 'voice' && (
          <VoiceMode 
            onClose={() => setCurrentView('chat')}
            onViewDocument={handleViewDocument}
            documents={documents}
          />
        )}

        {(currentView === 'admin-docs' || currentView === 'admin-users') && (
          <AdminPanel 
            documents={documents}
            users={users}
            activeTab={currentView.split('-')[1] as any}
            setActiveTab={(tab) => setCurrentView(`admin-${tab}` as View)}
            onAddDoc={(doc) => setDocuments(prev => [...prev, doc])}
            onRemoveDoc={(id) => setDocuments(prev => prev.filter(d => d.id !== id))}
            onInviteUser={handleInviteUser}
            onRemoveUser={(id) => {
              const target = users.find(u => u.id === id);
              const admins = users.filter(u => u.role === Role.ADMIN);
              if (target?.role === Role.ADMIN && admins.length <= 1) {
                alert("Sicherheitsabbruch: Das Wohnpro benötigt mindestens einen Administrator.");
                return;
              }
              setUsers(users.filter(u => u.id !== id));
            }}
          />
        )}

        {currentView === 'docs-view' && (
          <div className="max-w-4xl mx-auto py-10 px-6 w-full overflow-y-auto">
            <h1 className="text-4xl font-black mb-8">Wohnpro Wissen</h1>
            {documents.length === 0 ? (
              <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <DocIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Der Wohnpro Guide hat noch kein Wissen. Admins müssen Dokumente hochladen.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documents.map(doc => (
                  <button key={doc.id} onClick={() => handleViewDocument(doc.name)} className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm hover:shadow-xl transition-all text-left group">
                    <div className="flex items-center justify-between mb-6">
                      <DocIcon className="w-8 h-8 text-gray-300 group-hover:text-black transition-colors" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{doc.category}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{doc.name}</h3>
                    <p className="text-xs text-gray-400">Hinzugefügt am {doc.uploadDate}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'doc-detail' && selectedDocument && (
          <DocumentDetail 
            document={selectedDocument}
            onClose={() => setCurrentView('docs-view')}
            highlightText={highlightText}
          />
        )}
      </main>
    </div>
  );
};

export default App;
