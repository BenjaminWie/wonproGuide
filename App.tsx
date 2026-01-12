
import React, { useState, useEffect } from 'react';
import { View, ChatSession, Document, User, Message, Role, UserStatus, FAQItem, Persona } from './types';
import { INITIAL_DOCUMENTS, INITIAL_USERS, INITIAL_PERSONAS } from './constants';
import LoginView from './components/LoginView';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import VoiceMode from './components/VoiceMode';
import AdminPanel from './components/AdminPanel';
import DocumentDetail from './components/DocumentDetail';
import LandingPage from './components/LandingPage';
import FAQView from './components/FAQView';
import { gemini } from './services/geminiService';
import { DocIcon } from './components/Icons';
import { isNextcloudConfigured, fetchNextcloudDocuments, fetchNextcloudUsers } from './services/nextcloudService';

const STORAGE_KEY = 'wohnprojekt_docs_cache';
const FAQ_STORAGE_KEY = 'wohnprojekt_faq_cache';
const PERSONA_STORAGE_KEY = 'wohnprojekt_persona_cache';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  const [faqs, setFaqs] = useState<FAQItem[]>(() => {
    const saved = localStorage.getItem(FAQ_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [personas, setPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem(PERSONA_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_PERSONAS;
  });
  
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFaqGenerating, setIsFaqGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [highlightText, setHighlightText] = useState<string>('');

  // Initial Sync with Nextcloud (Runs once on mount)
  useEffect(() => {
    const syncWithNextcloud = async () => {
      if (isNextcloudConfigured()) {
        console.log("Starting Nextcloud Sync...");
        setIsSyncing(true);
        try {
          // 1. Fetch Users
          const ncUsers = await fetchNextcloudUsers();
          if (ncUsers.length > 0) {
            setUsers(ncUsers);
          }

          // 2. Fetch Documents (Smart Sync using ETags)
          // We pass current documents for ETag optimization.
          // Note: fetchNextcloudDocuments returns 'currentDocs' if network fails,
          // so it is safe to always setDocuments with the result.
          const ncDocs = await fetchNextcloudDocuments(documents);
          setDocuments(ncDocs);

        } catch (e) {
          console.error("Sync failed", e);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    syncWithNextcloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run once on mount

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(faqs));
  }, [faqs]);

  useEffect(() => {
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(personas));
  }, [personas]);

  const handleLogin = (email: string) => {
    // If we have users loaded (from NC or Init), check them
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

  const handleAddDoc = async (doc: Document) => {
    setDocuments(prev => [...prev, doc]);
    setIsFaqGenerating(true);
    
    try {
      // Loop through all personas and generate specific FAQs for each
      for (const persona of personas) {
        setGeneratingStatus(`Lerne für ${persona.name}...`);
        const extractedFaqs = await gemini.generateFAQs(doc, persona);
        
        const newFaqItems: FAQItem[] = extractedFaqs.map(f => ({
          id: Math.random().toString(36).substr(2, 9),
          question: f.question || '',
          answer: f.answer || '',
          category: f.category || doc.category,
          sourceDocId: doc.id,
          sourceDocName: doc.name,
          personaId: persona.id
        }));
        
        setFaqs(prev => [...prev, ...newFaqItems]);
      }
    } catch (e) {
      console.error("Failed to generate FAQs background", e);
    } finally {
      setIsFaqGenerating(false);
      setGeneratingStatus('');
    }
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

  if (showLanding && !currentUser) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  if (!currentUser) {
    return (
      <>
        {isSyncing && (
          <div className="fixed top-4 right-4 z-[100] bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse shadow-lg">
            Synchronisiere mit Nextcloud...
          </div>
        )}
        <LoginView onLogin={handleLogin} />
      </>
    );
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
        <header className="flex items-center justify-between px-6 py-4 lg:hidden border-b border-gray-100 bg-white z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-bold text-gray-900 tracking-tight">Wohnpro Guide</span>
          <div className="w-10" />
        </header>

        {isSyncing && (
          <div className="absolute top-20 right-4 lg:top-4 z-50 animate-in slide-in-from-right-10 fade-in duration-700">
             <div className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
               <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               <span className="text-xs font-bold">Cloud Sync...</span>
             </div>
          </div>
        )}

        {isFaqGenerating && (
          <div className="absolute top-4 right-4 z-50 animate-in slide-in-from-right-10 fade-in duration-700">
            <div className="bg-black text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl ring-4 ring-black/5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-duration:0.8s]" />
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">KI lernt Hausregeln...</span>
                 <span className="text-[9px] text-gray-400">{generatingStatus}</span>
              </div>
            </div>
          </div>
        )}

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

        {currentView === 'faq' && (
          <FAQView 
            faqs={faqs}
            personas={personas}
            onViewSource={handleViewDocument}
          />
        )}

        {currentView.startsWith('admin') && (
          <AdminPanel 
            documents={documents}
            users={users}
            personas={personas}
            activeTab={currentView.split('-')[1] as any}
            setActiveTab={(tab) => setCurrentView(`admin-${tab}` as View)}
            onAddDoc={handleAddDoc}
            onRemoveDoc={(id) => {
              setDocuments(prev => prev.filter(d => d.id !== id));
              setFaqs(prev => prev.filter(f => f.sourceDocId !== id));
            }}
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
            onAddPersona={(p) => setPersonas(prev => [...prev, p])}
            onUpdatePersona={(p) => setPersonas(prev => prev.map(existing => existing.id === p.id ? p : existing))}
            onRemovePersona={(id) => {
              if (personas.length <= 1) {
                alert("Mindestens eine Persona muss existieren.");
                return;
              }
              setPersonas(prev => prev.filter(p => p.id !== id));
            }}
          />
        )}

        {currentView === 'docs-view' && (
          <div className="max-w-4xl mx-auto py-10 px-6 w-full overflow-y-auto no-scrollbar">
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
