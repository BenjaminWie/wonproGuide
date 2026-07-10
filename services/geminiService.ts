
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, VOICE_SYSTEM_INSTRUCTION, FAQ_SYSTEM_INSTRUCTION } from "../constants";
import { Document, Citation, Role, FAQItem, Persona } from "../types";

export class GeminiService {
  private textSystemPrompt: string = SYSTEM_INSTRUCTION;
  private voiceSystemPrompt: string = VOICE_SYSTEM_INSTRUCTION;
  private faqSystemPrompt: string = FAQ_SYSTEM_INSTRUCTION;

  public setSystemPrompts(textPrompt: string, voicePrompt: string, faqPrompt: string) {
    this.textSystemPrompt = textPrompt;
    this.voiceSystemPrompt = voicePrompt;
    this.faqSystemPrompt = faqPrompt;
  }

  public getSystemPrompts() {
    return {
      textPrompt: this.textSystemPrompt,
      voicePrompt: this.voiceSystemPrompt,
      faqPrompt: this.faqSystemPrompt
    };
  }

  public getAI(isPro: boolean = false) {
    let apiKey = '';
    
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        apiKey = apiKey || import.meta.env.VITE_GEMINI_PRO_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      }
    } catch (e) {}

    try {
      // @ts-ignore
      apiKey = apiKey || process.env.GEMINI_PRO_API_KEY;
    } catch (e) {}

    try {
      // @ts-ignore
      apiKey = apiKey || process.env.GEMINI_API_KEY;
    } catch (e) {}

    try {
      // @ts-ignore
      apiKey = apiKey || process.env.API_KEY;
    } catch (e) {}
    
    if (apiKey) {
      return new GoogleGenAI({ apiKey });
    }

    // Fallback to Vertex AI Configuration (Hosting project)
    if (process.env.GCP_PROJECT && process.env.GCP_LOCATION) {
      return new GoogleGenAI({
        vertexai: {
          project: process.env.GCP_PROJECT,
          location: process.env.GCP_LOCATION,
        }
      });
    }

    throw new Error("No valid Gemini API configuration found. Please set GEMINI_PRO_API_KEY or GEMINI_API_KEY.");
  }

  /**
   * Analyzes a document and assigns it to an existing category or creates a new one.
   */
  async detectCategory(docContent: string, existingCategories: string[]): Promise<string> {
    const ai = this.getAI();
    try {
      console.log(`[Gemini] Detecting category for document: ${docContent.substring(0, 50)}...`);
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analysiere den Inhalt des folgenden Dokuments und ordne es einer Kategorie zu.
        
        EXISTIERENDE KATEGORIEN:
        ${JSON.stringify(existingCategories)}
        
        REGELN:
        1. Wenn das Dokument gut in eine existierende Kategorie passt, wähle diese.
        2. Wenn es NICHT passt, erstelle einen NEUEN, kurzen Kategorienamen (max. 2 Wörter, z.B. "Gemeinschaft", "Rechtliches", "Garten").
        3. Sei präzise und vermeide generische Begriffe wie "Sonstiges" wenn möglich.
        
        DOKUMENT AUSZUG:
        ${docContent.substring(0, 5000)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING }
            },
            required: ["category"]
          }
        }
      });
      console.log(`[Gemini] Category detection raw response:`, response.text);
      const data = JSON.parse(response.text || '{}');
      return data.category || "Allgemein";
    } catch (e) {
      console.error("[Gemini] Category detection failed", e);
      return "Allgemein";
    }
  }

  async askQuestion(
    question: string, 
    documents: Document[], 
    history: { role: 'user' | 'model'; text: string }[]
  ): Promise<{ text: string, citations: Citation[] }> {
    const ai = this.getAI(true);
    const context = documents.map(d => `[DOC: ${d.name} (${d.category})] ${d.content}`).join('\n\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
          { role: 'user', parts: [{ text: `Wissensbasis:\n${context}\n\nFrage: ${question}` }] }
        ],
        config: {
          systemInstruction: this.textSystemPrompt,
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

  async generateFAQs(doc: Document, persona: Persona, availableCategories: string[]): Promise<Partial<FAQItem>[]> {
    const ai = this.getAI(true);
    try {
      console.log(`[Gemini] Starting FAQ generation for doc: ${doc.name}, persona: ${persona.name}`);
      const prompt = `Analysiere das folgende Dokument des Wohnprojekts.
        
        DEINE PERSONA / ZIELGRUPPE:
        Name: ${persona.name}
        Beschreibung: ${persona.description}
        
        AUFGABE:
        Extrahiere basierend auf deiner Persona-Beschreibung 2 bis 4 Fragen, die genau DIESE Person an das Dokument stellen würde.
        
        KATEGORISIERUNG:
        Ordne jeder Frage eine Kategorie zu. 
        Bevorzuge diese Liste: ${JSON.stringify(availableCategories)}.
        Wenn eine Frage thematisch eindeutig woanders hingehört, nutze die Dokumentenkategorie: "${doc.category}".
        
        DOKUMENT:
        Name: ${doc.name}
        Inhalt: ${doc.content.substring(0, 15000)}`;
        
      console.log(`[Gemini] FAQ Prompt length: ${prompt.length} characters`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: this.faqSystemPrompt,
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
      
      console.log(`[Gemini] FAQ raw response for ${persona.name}:`, response.text);
      
      if (!response.text) {
         throw new Error("Empty response from Gemini API");
      }
      
      const parsed = JSON.parse(response.text);
      if (!Array.isArray(parsed)) {
         throw new Error("Response is not a JSON array");
      }
      
      console.log(`[Gemini] Successfully generated ${parsed.length} FAQs for ${persona.name}`);
      return parsed;
    } catch (e) {
      console.error(`[Gemini] FAQ Generation Error for ${persona.name}:`, e);
      throw e; // Rethrow to be caught by the caller for alerting
    }
  }

  async generateInvitation(email: string, role: Role, documents: Document[]): Promise<string> {
    const ai = this.getAI();
    const houseContext = documents.slice(0, 2).map(d => d.content).join(' ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Erstelle eine Einladung für Bewohner ${email} mit Rolle ${role}. Kontext: ${houseContext}`,
      config: {
        systemInstruction: "Du bist ein professioneller Verwalter eines modernen Wohnpro.",
      }
    });
    return response.text || "Willkommen im Wohnpro!";
  }

  async verifyUser(email: string): Promise<{ success: boolean; reason: string }> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Prüfe die E-Mail "${email}"`,
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
