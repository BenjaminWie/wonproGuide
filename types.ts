
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export type UserStatus = 'aktiv' | 'eingeladen' | 'deaktiviert';

/**
 * Represents a registered user or a pending invitation.
 * Database Mapping: Table `users`
 */
export interface User {
  id: string; // UUID
  email: string;
  role: Role;
  status: UserStatus;
  invitedAt: string; // ISO Date string
  inviteEmailContent?: string; // AI-generated content stored for preview/history
}

/**
 * Represents a knowledge source. 
 * NOTE: 'content' stores the raw text extracted from PDF/DOCX.
 * Database Mapping: Table `documents`
 */
export interface Document {
  id: string; // UUID
  name: string;
  category: 'Recht & Struktur' | 'Selbstverständnis & Vision' | 'Teilnahme & Mitwirkung' | 'Entscheidungen & Prozesse' | 'Regeln & Hausordnung';
  uploadDate: string;
  content: string; // TEXT column in DB - used for RAG context window
  status: 'aktiv' | 'archiviert';
  fileUrl?: string; // Optional URL to original file storage (S3/GCS)
}

/**
 * Defines a target audience for FAQ generation.
 * This instructs the AI on the tone, complexity, and focus of questions.
 * Database Mapping: Table `personas`
 */
export interface Persona {
  id: string; // UUID
  name: string; // e.g. "The Critic", "The Newcomer"
  description: string; // The "Meta-Dynamic" prompt instruction for the AI
  role: 'beginner' | 'expert'; // UI hint for icon/color coding
}

/**
 * AI-generated FAQ entries linked to specific documents and personas.
 * Database Mapping: Table `faqs`
 */
export interface FAQItem {
  id: string; // UUID
  question: string;
  answer: string;
  category: string;
  sourceDocId: string; // Foreign Key to Document
  sourceDocName: string; // Denormalized name for display
  personaId: string; // Foreign Key to Persona
}

/**
 * Represents a citation within a chat response.
 * JSON Structure stored within Message content if using a relational DB, 
 * or as a nested object in NoSQL.
 */
export interface Citation {
  source: string; // Document Name
  text: string; // The specific snippet quoted
  section?: string;
  documentId?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  citations?: Citation[];
}

/**
 * Represents a conversation history.
 * Database Mapping: Table `chat_sessions`
 */
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[]; // Stored as JSONB in SQL or Array in NoSQL
  createdAt: string;
}

export type View = 'chat' | 'voice' | 'admin-docs' | 'admin-users' | 'admin-personas' | 'docs-view' | 'doc-detail' | 'faq';
