
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export type UserStatus = 'aktiv' | 'eingeladen' | 'deaktiviert';

export type Category = string;

/**
 * Represents a registered user or a pending invitation.
 */
export interface User {
  id: string; // UUID
  email: string;
  role: Role;
  status: UserStatus;
  invitedAt: string; // ISO Date string
  inviteEmailContent?: string;
}

/**
 * Represents a knowledge source. 
 */
export interface Document {
  id: string; // UUID
  name: string;
  category: Category;
  uploadDate: string;
  content: string;
  status: 'aktiv' | 'archiviert';
  fileUrl?: string;
  etag?: string;
}

/**
 * Defines a target audience for FAQ generation.
 */
export interface Persona {
  id: string; // UUID
  name: string;
  description: string;
  role: 'beginner' | 'expert';
}

/**
 * AI-generated FAQ entries linked to specific documents and personas.
 */
export interface FAQItem {
  id: string; // UUID
  question: string;
  answer: string;
  category: Category;
  sourceDocId: string;
  sourceDocName: string;
  personaId: string;
  feedback?: 'like' | 'dislike';
  userComment?: string;
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

/**
 * Represents a project milestone for the timeline.
 */
export interface Milestone {
  id: string;
  title: string;
  startDate: string; // ISO Date YYYY-MM-DD
  endDate: string;   // ISO Date YYYY-MM-DD
  owner: string;     // Name or Initials
  progress: number;  // 0-100
  description: string;
  status: 'planned' | 'active' | 'done' | 'delayed';
}

export type View = 'chat' | 'voice' | 'admin-docs' | 'admin-users' | 'admin-personas' | 'admin-timeline' | 'admin-prompts' | 'docs-view' | 'doc-detail' | 'faq' | 'timeline';
