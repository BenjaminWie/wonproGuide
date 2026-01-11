
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { Document, Citation, Role, FAQItem, Persona } from "../types";

export class GeminiService {
  private getAI() {
    // Check if Vertex AI specific variables are set
    if (process.env.GCP_PROJECT && process.env.GCP_LOCATION) {
      return new GoogleGenAI({
        vertexai: true,
        project: process.env.GCP_PROJECT,
        location: process.env.GCP_LOCATION,
      });
    }
    
    // Fallback to Google AI Studio (API Key)
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async askQuestion(
    question: string, 
    documents: Document[], 
    history: { role: 'user' | 'model'; text: string }[]
  ): Promise<{ text: string, citations: Citation[] }> {
    const ai = this.getAI();
    const context = documents.map(d => `[DOC: ${d.name}] ${d.content}`).join('\n\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
          { role: 'user', parts: [{ text: `Wissensbasis:\n${context}\n\nFrage: ${question}` }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              citations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    text: { type: Type.STRING },
                    section: { type: Type.STRING },
                  },
                  required: ["source", "text"]
                }
              }
            },
            required: ["answer", "citations"]
          }
        },
      });

      const data = JSON.parse(response.text || '{}');
      return {
        text: data.answer || "Fehler beim Laden.",
        citations: data.citations || []
      };
    } catch (e) {
      return { text: "API Error", citations: [] };
    }
  }

  async generateFAQs(doc: Document, persona: Persona): Promise<Partial<FAQItem>[]> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analysiere das folgende Dokument des Wohnprojekts.
        
        DEINE PERSONA / ZIELGRUPPE:
        Name: ${persona.name}
        Beschreibung: ${persona.description}
        
        AUFGABE:
        Extrahiere basierend auf deiner Persona-Beschreibung 2 bis 4 Fragen, die genau DIESE Person an das Dokument stellen würde.
        Formuliere die Antworten im Stil der Persona (einfach/emotional ODER komplex/fachlich).
        
        DOKUMENT:
        Name: ${doc.name}
        Kategorie: ${doc.category}
        Inhalt: ${doc.content.substring(0, 15000)}`,
        config: {
          systemInstruction: `Du bist ein spezialisierter FAQ-Generator. Du ignorierst allgemeine Fragen und konzentrierst dich NUR auf das, was die definierte Persona ("${persona.name}") wirklich wissen will.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["question", "answer", "category"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("FAQ generation failed", e);
      return [];
    }
  }

  async generateInvitation(email: string, role: Role, documents: Document[]): Promise<string> {
    const ai = this.getAI();
    const houseContext = documents.slice(0, 2).map(d => d.content).join(' ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Erstelle eine professionelle Einladungs-E-Mail für einen neuen Bewohner (${email}) mit der Rolle ${role}. 
      Beziehe dich kurz auf die Hausordnung oder das Gemeinschaftsgefühl des Wohnprojekts.
      Kontext: ${houseContext}`,
      config: {
        systemInstruction: "Du bist ein professioneller Verwalter eines modernen Wohnpro. Schreibstil: Herzlich, klar, einladend. Formatiere als Plain Text E-Mail. Bezeichne das Tool als Wohnpro Guide.",
      }
    });
    return response.text || "Willkommen im Wohnpro! Dein Wohnpro Guide ist für dich da.";
  }

  async verifyUser(email: string): Promise<{ success: boolean; reason: string }> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Prüfe die E-Mail "${email}" auf Plausibilität und Sicherheit. Ist sie formal korrekt?`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            success: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["success", "reason"]
        }
      }
    });
    return JSON.parse(response.text || '{"success":true, "reason": "Verifiziert durch Wohnpro Guide"}');
  }
}

export const gemini = new GeminiService();
