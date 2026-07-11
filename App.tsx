
import React, { useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';
import { View, ChatSession, Document, User, Message, Role, UserStatus, FAQItem, Persona, Milestone } from './types';
import { INITIAL_DOCUMENTS, INITIAL_USERS, INITIAL_PERSONAS, INITIAL_MILESTONES, INITIAL_CATEGORIES } from './constants';
import LoginView from './components/LoginView';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import VoiceMode from './components/VoiceMode';
import AdminPanel from './components/AdminPanel';
import DocumentDetail from './components/DocumentDetail';
import LandingPage from './components/LandingPage';
import FAQView from './components/FAQView';
import TimelineView from './components/TimelineView';
import { gemini } from './services/geminiService';
import { isNextcloudConfigured, fetchNextcloudDocuments, fetchNextcloudUsers, fetchNextcloudTimeline } from './services/nextcloudService';

const STORAGE_KEY = 'wohnprojekt_docs_cache';
const FAQ_STORAGE_KEY = 'wohnprojekt_faq_cache';
const PERSONA_STORAGE_KEY = 'wohnprojekt_persona_cache';
const SESSIONS_STORAGE_KEY = 'wohnprojekt_chat_sessions';
const MILESTONE_STORAGE_KEY = 'wohnprojekt_milestone_cache';
const CATEGORIES_STORAGE_KEY = 'wohnprojekt_categories_cache';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(() => {
    return localStorage.getItem('wohnpro_landing_seen') !== 'true';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);

  useEffect(() => {
    get(STORAGE_KEY).then((saved) => {
      if (saved) {
        setDocuments(saved);
      }
      setDocumentsLoaded(true);
    });
  }, []);

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  // Ensure initial categories are always present
  useEffect(() => {
    setCategories(prev => {
      const newCats = [...prev];
      let changed = false;
      INITIAL_CATEGORIES.forEach(cat => {
        if (!newCats.includes(cat)) {
          newCats.push(cat);
          changed = true;
        }
      });
      return changed ? newCats : prev;
    });
  }, []);

  const [faqs, setFaqs] = useState<FAQItem[]>(() => {
    const saved = localStorage.getItem(FAQ_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [personas, setPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem(PERSONA_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_PERSONAS;
  });

  const [milestones, setMilestones] = useState<Milestone[]>(() => {
      const saved = localStorage.getItem(MILESTONE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_MILESTONES;
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [systemPrompts, setSystemPrompts] = useState<{ textPrompt: string, voicePrompt: string, faqPrompt: string }>(() => {
    const saved = localStorage.getItem('wohnpro_system_prompts');
    if (saved) {
      const parsed = JSON.parse(saved);
      const defaultPrompts = gemini.getSystemPrompts();
      const textPrompt = parsed.textPrompt || defaultPrompts.textPrompt;
      const voicePrompt = parsed.voicePrompt || defaultPrompts.voicePrompt;
      const faqPrompt = parsed.faqPrompt || defaultPrompts.faqPrompt;
      gemini.setSystemPrompts(textPrompt, voicePrompt, faqPrompt);
      return { textPrompt, voicePrompt, faqPrompt };
    }
    return gemini.getSystemPrompts();
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void }>({ isOpen: false, title: '', message: '', type: 'alert' });
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingFAQs, setIsGeneratingFAQs] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [activeDoc, setActiveDoc] = useState<{ doc: Document, highlightText?: string, highlightSection?: string } | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  const showAlert = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalState({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  // Persistence
  useEffect(() => {
    if (documentsLoaded) {
      set(STORAGE_KEY, documents);
    }
  }, [documents, documentsLoaded]);

  useEffect(() => {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(faqs));
  }, [faqs]);

  useEffect(() => {
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
      localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(milestones));
  }, [milestones]);

  useEffect(() => {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('wohnpro_system_prompts', JSON.stringify(systemPrompts));
    gemini.setSystemPrompts(systemPrompts.textPrompt, systemPrompts.voicePrompt, systemPrompts.faqPrompt);
  }, [systemPrompts]);

  // Nextcloud Sync
  useEffect(() => {
    const syncNextcloud = async () => {
      if (isNextcloudConfigured()) {
        const ncDocs = await fetchNextcloudDocuments(documents);
        
        // Check for new docs that need categorization logic (optional enhancement for future)
        // For now, we assume Nextcloud docs get a default or are categorized manually later
        // or we could run the AI categorization here if we wanted fully automated background sync.
        
        if (ncDocs.length > 0) setDocuments(ncDocs);
        
        const ncUsers = await fetchNextcloudUsers();
        if (ncUsers.length > 0) setUsers(ncUsers);

        const ncTimeline = await fetchNextcloudTimeline();
        if (ncTimeline.length > 0) setMilestones(ncTimeline);
      }
    };
    syncNextcloud();
    const interval = setInterval(syncNextcloud, 60000); // Sync every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (email: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user && (user.status === 'aktiv' || user.status === 'eingeladen')) {
      setCurrentUser({ ...user, status: 'aktiv' });
    } else {
      showAlert("Fehler", "Zugriff verweigert. Bitte wende dich an die Wohnprojekt-Verwaltung.");
    }
  };

  const getActiveMessages = () => {
    if (!activeSessionId) return [];
    return sessions.find(s => s.id === activeSessionId)?.messages || [];
  };

  const handleAddDocument = async (doc: Document) => {
    // 1. Dynamic Category Detection
    let detectedCategory = "Allgemein";
    try {
      detectedCategory = await gemini.detectCategory(doc.content, categories);
    } catch (e) {
      console.warn("Could not detect category, using fallback.");
    }

    const docWithCategory = { ...doc, category: detectedCategory };
    setDocuments(prev => [...prev, docWithCategory]);

    // 2. Update Category List if new
    let updatedCategories = [...categories];
    if (!categories.includes(detectedCategory)) {
       updatedCategories = [...categories, detectedCategory];
       setCategories(updatedCategories);
    }
    
    // 3. Generate FAQs using the dynamic categories
    if (personas.length === 0) {
      showAlert("Warnung", "Keine Zielgruppen (Personas) definiert. Es können keine FAQs generiert werden.");
      return;
    }

    setIsGeneratingFAQs(true);
    let successCount = 0;
    let failCount = 0;

    for (const persona of personas) {
      try {
        setGeneratingStatus(`Lerne für ${persona.name}...`);
        const generated = await gemini.generateFAQs(docWithCategory, persona, updatedCategories);
        
        if (!generated || generated.length === 0) {
           console.warn(`[FAQ Gen] No FAQs generated for persona: ${persona.name}`);
           showAlert("Achtung", `Für die Zielgruppe "${persona.name}" konnten keine FAQs generiert werden. Bitte prüfe das Dokument.`);
           failCount++;
           continue;
        }

        const newFaqs: FAQItem[] = generated.map(g => ({
          id: Math.random().toString(36).substr(2, 9),
          question: g.question || '',
          answer: g.answer || '',
          category: g.category || detectedCategory,
          sourceDocId: doc.id,
          sourceDocName: doc.name,
          personaId: persona.id,
          feedback: undefined,
          userComment: ''
        }));
        setFaqs(prev => [...prev, ...newFaqs]);
        successCount++;
      } catch (e) {
        console.error(`Auto-FAQ Generation Error for ${persona.name}:`, e);
        showAlert("Fehler", `Fehler bei der FAQ-Generierung für "${persona.name}": ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`);
        failCount++;
      }
    }
    
    setIsGeneratingFAQs(false);
    setGeneratingStatus('');
    
    if (successCount > 0) {
       showAlert("Erfolg", `FAQ-Generierung abgeschlossen! Erfolgreich für ${successCount} Zielgruppe(n).`);
    } else if (failCount > 0) {
       showAlert("Fehler", `FAQ-Generierung fehlgeschlagen. Bitte prüfe die Konsole für Details.`);
    }
  };

  const handleSendMessage = async (text: string) => {
    let currentId = activeSessionId;
    let currentSessions = [...sessions];
    
    if (!currentId) {
      currentId = Math.random().toString(36).substr(2, 9);
      const newSession: ChatSession = {
        id: currentId,
        title: text.substring(0, 30) + '...',
        messages: [],
        createdAt: new Date().toISOString()
      };
      currentSessions = [newSession, ...currentSessions];
      setActiveSessionId(currentId);
      setSessions(currentSessions);
    }

    const userMsg: Message = { role: 'user', text };
    const sessionIndex = currentSessions.findIndex(s => s.id === currentId);
    currentSessions[sessionIndex].messages.push(userMsg);
    setSessions([...currentSessions]);
    
    setIsLoading(true);
    try {
      const history = currentSessions[sessionIndex].messages.map(m => ({ role: m.role, text: m.text }));
      const response = await gemini.askQuestion(text, documents, history);
      
      const aiMsg: Message = { 
        role: 'model', 
        text: response.text, 
        citations: response.citations 
      };
      
      currentSessions[sessionIndex].messages.push(aiMsg);
      setSessions([...currentSessions]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateFAQs = async () => {
    if (documents.length === 0) {
      showAlert("Fehler", "Keine Dokumente vorhanden, aus denen FAQs generiert werden können.");
      return;
    }

    if (personas.length === 0) {
      showAlert("Fehler", "Keine Zielgruppen (Personas) definiert. Es können keine FAQs generiert werden.");
      return;
    }

    showConfirm("FAQs neu generieren?", "Möchtest du wirklich alle FAQs neu generieren? Dies kann einige Zeit dauern.", async () => {
      setIsGeneratingFAQs(true);
      setFaqs([]); // Clear existing FAQs

      let successCount = 0;
      let failCount = 0;

      try {
        for (const doc of documents) {
          const docWithCategory = doc.category ? doc : { ...doc, category: "Allgemein" };
          
          for (const persona of personas) {
            try {
              setGeneratingStatus(`Lerne für ${persona.name} (Dokument: ${doc.name})...`);
              const generated = await gemini.generateFAQs(docWithCategory, persona, categories);
              
              if (!generated || generated.length === 0) {
                 console.warn(`[FAQ Gen] No FAQs generated for doc ${doc.name}, persona: ${persona.name}`);
                 failCount++;
                 continue;
              }

              const newFaqs: FAQItem[] = generated.map(g => ({
                id: Math.random().toString(36).substr(2, 9),
                question: g.question || '',
                answer: g.answer || '',
                category: g.category || docWithCategory.category || "Allgemein",
                sourceDocId: doc.id,
                sourceDocName: doc.name,
                personaId: persona.id,
                feedback: undefined,
                userComment: ''
              }));
              setFaqs(prev => [...prev, ...newFaqs]);
              successCount++;
            } catch (e) {
              console.error(`Error generating FAQs for doc ${doc.name} and persona ${persona.name}:`, e);
              showAlert("Fehler", `Fehler bei Dokument "${doc.name}" für Zielgruppe "${persona.name}": ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`);
              failCount++;
            }
          }
        }
        
        showAlert("Erfolg", `Regenerierung abgeschlossen! ${successCount} erfolgreiche Durchläufe, ${failCount} Fehler/Leermeldungen.`);
      } catch (e) {
        console.error("Global FAQ Generation Error:", e);
        showAlert("Fehler", "Schwerwiegender Fehler bei der FAQ-Generierung. Bitte versuche es später erneut.");
      } finally {
        setIsGeneratingFAQs(false);
        setGeneratingStatus('');
      }
    });
  };

  const handleExportCSV = () => {
    const headers = ['Frage', 'Antwort', 'Kategorie', 'Quelle', 'Zielgruppe', 'Feedback', 'Kommentar'];
    const rows = faqs.map(f => [
        `"${f.question.replace(/"/g, '""')}"`,
        `"${f.answer.replace(/"/g, '""')}"`,
        `"${f.category}"`,
        `"${f.sourceDocName}"`,
        `"${personas.find(p => p.id === f.personaId)?.name || 'Unbekannt'}"`,
        `"${f.feedback || ''}"`,
        `"${f.userComment || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wohnpro_faq_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (showLanding && !currentUser) {
    return (
      <LandingPage onStart={() => {
        setShowLanding(false);
        localStorage.setItem('wohnpro_landing_seen', 'true');
      }} />
    );
  }

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentView={currentView}
        setView={(v) => { setCurrentView(v); setActiveDoc(null); if(v==='chat') setActiveSessionId(null); }}
        onSelectSession={(id) => { setActiveSessionId(id); setCurrentView('chat'); setActiveDoc(null); }}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {/* FAQ Generation Popup */}
        {isGeneratingFAQs && (
          <div className="absolute top-4 right-4 z-50 bg-white shadow-lg rounded-xl p-4 border border-blue-100 flex items-center space-x-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="font-semibold text-gray-900">KI lernt Hausregeln...</p>
              <p className="text-sm text-gray-500">{generatingStatus || 'Analysiere Dokumente'}</p>
            </div>
          </div>
        )}

        {/* Header Mobile */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="font-bold text-gray-900">Wohnpro Guide</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 relative overflow-hidden">
          {activeDoc ? (
            <DocumentDetail 
              document={activeDoc.doc} 
              onClose={() => setActiveDoc(null)} 
              highlightText={activeDoc.highlightText}
              highlightSection={activeDoc.highlightSection}
            />
          ) : currentView === 'chat' ? (
            <ChatView 
              messages={getActiveMessages()} 
              onSendMessage={handleSendMessage}
              onEnterVoice={() => setCurrentView('voice')}
              onViewDocument={(name, text, section) => {
                const doc = documents.find(d => d.name.toLowerCase().includes(name.toLowerCase()));
                if (doc) setActiveDoc({ doc, highlightText: text, highlightSection: section });
              }}
              isLoading={isLoading}
            />
          ) : currentView === 'faq' ? (
            <FAQView 
              faqs={faqs}
              personas={personas}
              categories={categories}
              onViewSource={(name) => {
                const doc = documents.find(d => d.name.toLowerCase().includes(name.toLowerCase()));
                if (doc) setActiveDoc({ doc });
              }}
              onUpdateFaq={(id, updates) => setFaqs(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))}
              onExport={handleExportCSV}
              onRegenerate={handleRegenerateFAQs}
              isLoading={isGeneratingFAQs}
            />
          ) : currentView === 'timeline' ? (
              <TimelineView milestones={milestones} />
          ) : currentView === 'voice' ? (
            <VoiceMode 
              documents={documents}
              onClose={(transcript) => {
                if (transcript && transcript.length > 0) {
                  const newId = Math.random().toString(36).substr(2, 9);
                  const newSession: ChatSession = {
                    id: newId,
                    title: 'Sprachgespräch ' + new Date().toLocaleTimeString(),
                    messages: transcript,
                    createdAt: new Date().toISOString()
                  };
                  setSessions(prev => [newSession, ...prev]);
                }
                setCurrentView('chat');
              }}
              onViewDocument={(name) => {
                const doc = documents.find(d => d.name.toLowerCase().includes(name.toLowerCase()));
                if (doc) setActiveDoc({ doc });
              }}
            />
          ) : currentView === 'docs-view' ? (
            <div className="p-10 space-y-8 overflow-y-auto h-full no-scrollbar">
              <h1 className="text-4xl font-black mb-10">Dokumente</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map(doc => (
                  <button 
                    key={doc.id} 
                    onClick={() => setActiveDoc({ doc })}
                    className="text-left bg-white p-8 rounded-[2.5rem] border border-gray-100 hover:shadow-2xl transition-all group"
                  >
                    <div className="p-4 bg-gray-50 rounded-2xl mb-6 group-hover:bg-black group-hover:text-white transition-all w-fit">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{doc.name}</h3>
                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest">{doc.category}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AdminPanel 
              activeTab={currentView.startsWith('admin-users') ? 'users' : currentView.startsWith('admin-personas') ? 'personas' : currentView.startsWith('admin-timeline') ? 'timeline' : currentView.startsWith('admin-prompts') ? 'prompts' : 'docs'}
              setActiveTab={(tab) => setCurrentView(`admin-${tab}` as View)}
              documents={documents}
              users={users}
              personas={personas}
              milestones={milestones}
              systemPrompts={systemPrompts}
              onAddDoc={handleAddDocument}
              onRemoveDoc={(id) => setDocuments(prev => prev.filter(d => d.id !== id))}
              onInviteUser={(email, role, content) => setUsers(prev => [...prev, { id: Math.random().toString(), email, role, status: 'eingeladen', invitedAt: new Date().toISOString(), inviteEmailContent: content }])}
              onRemoveUser={(id) => setUsers(prev => prev.filter(u => u.id !== id))}
              onAddPersona={(p) => setPersonas(prev => [...prev, p])}
              onUpdatePersona={(p) => setPersonas(prev => prev.map(old => old.id === p.id ? p : old))}
              onRemovePersona={(id) => setPersonas(prev => prev.filter(p => p.id !== id))}
              onUpdateMilestones={setMilestones}
              onUpdateSystemPrompts={setSystemPrompts}
              showAlert={showAlert}
            />
          )}
        </div>
      </main>

      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-500 p-8">
            <h3 className="text-2xl font-black mb-4">{modalState.title}</h3>
            <p className="text-gray-600 mb-8">{modalState.message}</p>
            <div className="flex justify-end gap-4">
              {modalState.type === 'confirm' && (
                <button 
                  onClick={() => setModalState({ ...modalState, isOpen: false })}
                  className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Abbrechen
                </button>
              )}
              <button 
                onClick={() => {
                  if (modalState.type === 'confirm' && modalState.onConfirm) {
                    modalState.onConfirm();
                  }
                  setModalState({ ...modalState, isOpen: false });
                }}
                className="bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95"
              >
                {modalState.type === 'confirm' ? 'Bestätigen' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
