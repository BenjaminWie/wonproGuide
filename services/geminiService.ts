
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { Document, Citation, Role } from "../types";

export class GeminiService {
  // Fix: Ensure standard initialization with direct process.env usage
  private getAI() {
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

  async generateInvitation(email: string, role: Role, documents: Document[]): Promise<string> {
    const ai = this.getAI();
    const houseContext = documents.slice(0, 2).map(d => d.content).join(' ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Erstelle eine professionelle Einladungs-E-Mail für einen neuen Bewohner (${email}) mit der Rolle ${role}. 
      Beziehe dich kurz auf die Hausordnung oder das Gemeinschaftsgefühl des Wohnprojekts.
      Kontext: ${houseContext}`,
      config: {
        systemInstruction: "Du bist ein professioneller Verwalter eines modernen Wohnprojekts. Schreibstil: Herzlich, klar, einladend. Formatiere als Plain Text E-Mail.",
      }
    });
    return response.text || "Willkommen im Wohnprojekt!";
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
    return JSON.parse(response.text || '{"success":true, "reason": "Verifiziert"}');
  }
}

export const gemini = new GeminiService();
