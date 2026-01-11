
import React, { useState, useCallback, useRef } from 'react';
import { Document as AppDocument, User, Role, UserStatus, Persona } from '../types';
import { PlusIcon, TrashIcon, DocIcon, CloseIcon, UserPlusIcon, CheckCircleIcon, ClockIcon, AlertIcon, ShieldIcon, ArrowRightIcon, HelpIcon } from './Icons';
import { gemini } from '../services/geminiService';
import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface AdminPanelProps {
  documents: AppDocument[];
  users: User[];
  personas: Persona[];
  onAddDoc: (doc: AppDocument) => void;
  onRemoveDoc: (id: string) => void;
  onInviteUser: (email: string, role: Role, content: string) => void;
  onRemoveUser: (id: string) => void;
  onAddPersona: (persona: Persona) => void;
  onUpdatePersona: (persona: Persona) => void;
  onRemovePersona: (id: string) => void;
  activeTab: 'docs' | 'users' | 'personas';
  setActiveTab: (tab: 'docs' | 'users' | 'personas') => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  documents, users, personas, onAddDoc, onRemoveDoc, onInviteUser, onRemoveUser, onAddPersona, onUpdatePersona, onRemovePersona, activeTab, setActiveTab 
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const [inviteStep, setInviteStep] = useState<'input' | 'preview' | 'verifying'>('input');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>(Role.USER);
  const [aiDraft, setAiDraft] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; reason: string } | null>(null);

  // Persona State
  const [personaName, setPersonaName] = useState('');
  const [personaDesc, setPersonaDesc] = useState('');
  const [personaRole, setPersonaRole] = useState<'beginner' | 'expert'>('beginner');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const parseDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const parsePdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const determineCategory = (name: string): AppDocument['category'] => {
    const n = name.toLowerCase();
    if (n.includes('satzung') || n.includes('vertrag') || n.includes('recht') || n.includes('gbh') || n.includes('genossenschaft')) return 'Recht & Struktur';
    if (n.includes('vision') || n.includes('selbst') || n.includes('werte') || n.includes('konzept') || n.includes('leitbild')) return 'Selbstverständnis & Vision';
    if (n.includes('aufnahme') || n.includes('mitglied') || n.includes('mitwirkung') || n.includes('teilnahme') || n.includes('ag')) return 'Teilnahme & Mitwirkung';
    if (n.includes('protokoll') || n.includes('beschluss') || n.includes('entscheidung') || n.includes('plenum') || n.includes('versammlung')) return 'Entscheidungen & Prozesse';
    return 'Regeln & Hausordnung';
  };

  const handleFiles = async (files: FileList) => {
    setIsDragging(false);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = file.name.split('.').pop()?.toLowerCase();
      
      if (type !== 'pdf' && type !== 'docx') {
        alert(`Dateityp .${type} wird nicht unterstützt. Bitte lade nur .pdf oder .docx hoch.`);
        continue;
      }

      setUploadProgress(`Lese ${file.name}...`);
      try {
        const text = type === 'pdf' ? await parsePdf(file) : await parseDocx(file);
        
        const newDoc: AppDocument = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          category: determineCategory(file.name),
          uploadDate: new Date().toLocaleDateString('de-DE'),
          content: text,
          status: 'aktiv'
        };
        
        onAddDoc(newDoc);
      } catch (err) {
        console.error("Fehler beim Verarbeiten:", err);
        alert(`Fehler beim Einlesen von ${file.name}`);
      }
    }
    setUploadProgress(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handlePrepareInvitation = async () => {
    if (!inviteEmail.includes('@')) return;
    setIsProcessing(true);
    try {
      const draft = await gemini.generateInvitation(inviteEmail, inviteRole, documents);
      setAiDraft(draft);
      setInviteStep('preview');
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeInvite = async () => {
    setInviteStep('verifying');
    setIsProcessing(true);
    const verification = await gemini.verifyUser(inviteEmail);
    setVerificationResult(verification);
    setTimeout(() => {
      if (verification.success) {
        onInviteUser(inviteEmail, inviteRole, aiDraft);
        setShowInviteModal(false);
        resetInvite();
      }
      setIsProcessing(false);
    }, 2000);
  };

  const resetInvite = () => {
    setInviteStep('input');
    setInviteEmail('');
    setAiDraft('');
    setVerificationResult(null);
  };

  const handleSavePersona = () => {
    if (!personaName || !personaDesc) return;
    
    if (editingPersona) {
      onUpdatePersona({
        ...editingPersona,
        name: personaName,
        description: personaDesc,
        role: personaRole
      });
    } else {
      onAddPersona({
        id: Math.random().toString(36).substr(2, 9),
        name: personaName,
        description: personaDesc,
        role: personaRole
      });
    }
    setShowPersonaModal(false);
    setEditingPersona(null);
    setPersonaName('');
    setPersonaDesc('');
  };

  const openPersonaModal = (p?: Persona) => {
    if (p) {
      setEditingPersona(p);
      setPersonaName(p.name);
      setPersonaDesc(p.description);
      setPersonaRole(p.role);
    } else {
      setEditingPersona(null);
      setPersonaName('');
      setPersonaDesc('');
      setPersonaRole('beginner');
    }
    setShowPersonaModal(true);
  };

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case 'aktiv': return <ShieldIcon className="w-5 h-5 text-blue-500" />;
      case 'eingeladen': return <ClockIcon className="w-5 h-5 text-gray-300" />;
      case 'deaktiviert': return <AlertIcon className="w-5 h-5 text-red-400" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Sticky Tab Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 pt-10">
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {['docs', 'users', 'personas'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-4 text-sm font-black uppercase tracking-[0.2em] relative transition-colors whitespace-nowrap ${activeTab === tab ? 'text-black' : 'text-gray-300 hover:text-black'}`}
              >
                {tab === 'docs' ? 'Dokumente' : tab === 'users' ? 'Mitglieder' : 'FAQ-Personas'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-4xl mx-auto py-10 px-6 animate-in fade-in duration-500">
          
          {activeTab === 'docs' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Lade Satzungen, Visionen oder Beschlussprotokolle hoch.</p>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer transition-all duration-500 border-2 border-dashed rounded-[3rem] p-16 flex flex-col items-center justify-center text-center ${
                  isDragging 
                  ? 'border-black bg-gray-50 scale-[0.98]' 
                  : 'border-gray-100 hover:border-black/20 hover:bg-gray-50/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  accept=".pdf,.docx" 
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all ${isDragging ? 'bg-black text-white scale-110 rotate-12' : 'bg-gray-50 text-gray-300 group-hover:bg-black group-hover:text-white'}`}>
                  {uploadProgress ? (
                    <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PlusIcon className="w-10 h-10" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {uploadProgress || 'Wohnpro Wissen hinzufügen'}
                </h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  Dateien (.pdf, .docx) hier ablegen. Die KI generiert automatisch FAQs für alle aktiven Personas.
                </p>
              </div>

              {documents.length > 0 && (
                <div className="pt-10 space-y-4">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Aktive Dokumente ({documents.length})</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map(doc => (
                      <div key={doc.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-7 shadow-sm group hover:shadow-xl transition-all flex flex-col justify-between h-52 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-start justify-between">
                          <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
                            <DocIcon className="w-6 h-6" />
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onRemoveDoc(doc.id); }} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight">{doc.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                             <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{doc.category}</span>
                             <span className="text-[8px] text-gray-300 italic">{doc.uploadDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-400">Einladungen werden vom Wohnpro Guide verifiziert.</p>
                </div>
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                >
                  <UserPlusIcon className="w-5 h-5" />
                  Neu einladen
                </button>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Profil</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-8 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(user => (
                      <tr key={user.id} className="group hover:bg-gray-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${user.role === Role.ADMIN ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {user.email[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-gray-900 block">{user.email}</span>
                              <span className="text-[10px] text-gray-400 font-medium">{user.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(user.status)}
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              {user.status === 'aktiv' ? 'Wohnpro Identität bestätigt' : 'Wartet auf Check'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => onRemoveUser(user.id)} className="p-2 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'personas' && (
             <div className="space-y-8">
               <div className="flex items-center justify-between mb-2">
                 <div>
                   <p className="text-sm text-gray-400 max-w-md">Konfiguriere "Zielgruppen" für die FAQ-Generierung. Je genauer die Beschreibung, desto treffender die Fragen.</p>
                 </div>
                 <button 
                   onClick={() => openPersonaModal()}
                   className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                 >
                   <PlusIcon className="w-5 h-5" />
                   Persona erstellen
                 </button>
               </div>

               <div className="grid grid-cols-1 gap-6">
                 {personas.map(persona => (
                   <div key={persona.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative">
                      <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openPersonaModal(persona)} className="px-4 py-2 bg-gray-100 hover:bg-black hover:text-white rounded-xl text-xs font-bold transition-colors">
                            Bearbeiten
                         </button>
                         {personas.length > 1 && (
                            <button onClick={() => onRemovePersona(persona.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                               <TrashIcon className="w-4 h-4" />
                            </button>
                         )}
                      </div>

                      <div className="flex items-start gap-6">
                         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${persona.role === 'expert' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>
                            {persona.role === 'expert' ? <ShieldIcon className="w-8 h-8" /> : <HelpIcon className="w-8 h-8" />}
                         </div>
                         <div>
                            <div className="flex items-center gap-3 mb-2">
                               <h3 className="text-xl font-bold text-gray-900">{persona.name}</h3>
                               <span className="px-2 py-1 bg-gray-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400">{persona.role === 'expert' ? 'Experte' : 'Einsteiger'}</span>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed italic border-l-2 border-gray-100 pl-4 py-1">
                               "{persona.description}"
                            </p>
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-500">
            {/* ... invite modal content same as before ... */}
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <ShieldIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-black text-sm uppercase tracking-widest">Wohnpro Guide Einladungs-Assistent</span>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="p-2 text-gray-300 hover:text-black transition-colors">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10">
              {inviteStep === 'input' && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">E-Mail des neuen Bewohners</label>
                    <input 
                      type="email" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="name@provider.de"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setInviteRole(Role.USER)} className={`p-6 rounded-3xl border transition-all text-left ${inviteRole === Role.USER ? 'border-black bg-black text-white shadow-xl' : 'border-gray-100 text-gray-400 hover:border-black/20'}`}>
                      <span className="block font-black text-xs uppercase mb-1">Standard</span>
                      <span className="text-xl font-bold">Bewohner</span>
                    </button>
                    <button onClick={() => setInviteRole(Role.ADMIN)} className={`p-6 rounded-3xl border transition-all text-left ${inviteRole === Role.ADMIN ? 'border-black bg-black text-white shadow-xl' : 'border-gray-100 text-gray-400 hover:border-black/20'}`}>
                      <span className="block font-black text-xs uppercase mb-1">Verwaltung</span>
                      <span className="text-xl font-bold">Wohnpro Admin</span>
                    </button>
                  </div>
                  <button 
                    onClick={handlePrepareInvitation}
                    disabled={isProcessing || !inviteEmail.includes('@')}
                    className="w-full bg-blue-600 text-white rounded-2xl py-5 font-bold hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-300 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Einladung vorbereiten'}
                  </button>
                </div>
              )}

              {inviteStep === 'preview' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100">
                    <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold shadow-sm">G</div>
                      <div>
                        <p className="text-xs font-bold">An: {inviteEmail}</p>
                        <p className="text-[10px] text-gray-400">Betreff: Willkommen im Wohnpro Guide</p>
                      </div>
                    </div>
                    <div className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap font-serif italic h-48 overflow-y-auto">
                      {aiDraft}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setInviteStep('input')} className="flex-1 py-4 font-bold text-gray-400 hover:text-black">Anpassen</button>
                    <button 
                      onClick={handleFinalizeInvite}
                      className="flex-[2] bg-black text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-gray-800"
                    >
                      Prüfen & Absenden
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {inviteStep === 'verifying' && (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-50 rounded-full flex items-center justify-center">
                      <ShieldIcon className="w-10 h-10 text-blue-200 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Wohnpro Guide Check läuft</h3>
                    <p className="text-sm text-gray-400">Google AI überprüft Identität und Wohnpro-Richtlinien...</p>
                  </div>
                  {verificationResult && (
                    <div className="bg-green-50 text-green-700 px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4" />
                      {verificationResult.reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persona Modal */}
      {showPersonaModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-500">
               <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-purple-50 rounded-xl">
                        <HelpIcon className="w-5 h-5 text-purple-600" />
                     </div>
                     <span className="font-black text-sm uppercase tracking-widest">{editingPersona ? 'Persona bearbeiten' : 'Neue FAQ Persona'}</span>
                  </div>
                  <button onClick={() => setShowPersonaModal(false)} className="p-2 text-gray-300 hover:text-black transition-colors">
                     <CloseIcon className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="p-10 space-y-8">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Name der Zielgruppe</label>
                     <input 
                        type="text" 
                        value={personaName}
                        onChange={(e) => setPersonaName(e.target.value)}
                        placeholder="z.B. 'Der Kritische Nachbar'"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-purple-500/10 text-lg"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">KI-Prompt / Beschreibung</label>
                     <textarea 
                        value={personaDesc}
                        onChange={(e) => setPersonaDesc(e.target.value)}
                        placeholder="Beschreibe, was diese Person wissen will und wie die Antworten klingen sollen. Z.B. 'Du bist skeptisch, achtest auf Finanzen und magst kurze Fakten.'"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-purple-500/10 min-h-[120px]"
                     />
                     <p className="text-xs text-gray-400 ml-2">Dies ist die direkte Anweisung an die KI, wie sie Fragen aus Dokumenten extrahieren soll.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => setPersonaRole('beginner')} className={`p-4 rounded-2xl border transition-all text-center ${personaRole === 'beginner' ? 'border-green-500 bg-green-50 text-green-700 font-bold' : 'border-gray-100 text-gray-400'}`}>
                        Einsteiger / Interessiert
                     </button>
                     <button onClick={() => setPersonaRole('expert')} className={`p-4 rounded-2xl border transition-all text-center ${personaRole === 'expert' ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold' : 'border-gray-100 text-gray-400'}`}>
                        Experte / Detailverliebt
                     </button>
                  </div>

                  <button 
                     onClick={handleSavePersona}
                     disabled={!personaName || !personaDesc}
                     className="w-full bg-black text-white rounded-2xl py-5 font-bold hover:bg-gray-900 disabled:bg-gray-100 disabled:text-gray-300 transition-all shadow-xl shadow-black/10"
                  >
                     {editingPersona ? 'Änderungen speichern' : 'Persona erstellen'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AdminPanel;
