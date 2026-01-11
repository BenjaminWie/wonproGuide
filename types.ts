
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export type UserStatus = 'aktiv' | 'eingeladen' | 'deaktiviert';

export interface User {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  invitedAt: string;
  inviteEmailContent?: string; // AI-generated content
}

export interface Document {
  id: string;
  name: string;
  category: 'Recht & Struktur' | 'Selbstverständnis & Vision' | 'Teilnahme & Mitwirkung' | 'Entscheidungen & Prozesse' | 'Regeln & Hausordnung';
  uploadDate: string;
  content: string;
  status: 'aktiv' | 'archiviert';
  fileUrl?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string; // The "Meta-Dynamic" prompt for the AI
  role: 'beginner' | 'expert'; // For UI styling/icon hints
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sourceDocId: string;
  sourceDocName: string;
  personaId: string;
}

export interface Citation {
  source: string;
  text: string;
  section?: string;
  documentId?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  citations?: Citation[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export type View = 'chat' | 'voice' | 'admin-docs' | 'admin-users' | 'admin-personas' | 'docs-view' | 'doc-detail' | 'faq';
