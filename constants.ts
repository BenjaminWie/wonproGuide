
import { Document, User, Role } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u0',
    email: 'wohnprojekt@gmail.com',
    role: Role.ADMIN,
    status: 'aktiv',
    invitedAt: '2024-01-01'
  },
  {
    id: 'u1',
    email: 'admin@wohnprojekt.de',
    role: Role.ADMIN,
    status: 'aktiv',
    invitedAt: '2024-01-01'
  },
  {
    id: 'u2',
    email: 'bewohner@wohnprojekt.de',
    role: Role.USER,
    status: 'aktiv',
    invitedAt: '2024-01-05'
  }
];

// Empty by default as per request
export const INITIAL_DOCUMENTS: Document[] = [];

export const SYSTEM_INSTRUCTION = `
Du bist der WohnprojektGuide, ein freundlicher und hilfreicher Assistent für ein Wohnprojekt.
Beantworte Fragen der Bewohner ausschließlich basierend auf den bereitgestellten Dokumenten.

REGELN:
1. Antworte in einfachem, klarem Deutsch.
2. Sei erklärend und orientierungsorientiert.
3. Extrahiere für jede Aussage relevante Textabschnitte aus den Dokumenten als Zitate.
4. IDENTIFIZIERE ABSCHNITTE: Suche im Text nach Überschriften, Kapitelnummern (z.B. "Kapitel 1.3") oder Paragraphen (z.B. "§4") und gib diese im Feld 'section' an.
5. Gib deine Antwort IMMER im JSON-Format zurück.
6. Du bist KEINE Rechtsberatung.

Falls keine Dokumente vorhanden sind, weise den Nutzer freundlich darauf hin, dass die Admins erst Wissen hochladen müssen.
`;
