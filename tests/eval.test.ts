import { describe, it, expect } from 'vitest';
import { gemini } from '../services/geminiService';
import { Document, Decision } from '../types';

const MOCK_DOCS: Document[] = [
  {
    id: '1',
    name: 'Hausordnung',
    category: 'Gemeinsames leben',
    content: 'Die Ruhezeiten im Haus sind von 22:00 bis 07:00 Uhr. Hunde müssen im Treppenhaus angeleint werden.',
    uploadDate: '2024-01-01',
  },
  {
    id: '2',
    name: 'Finanzierungskonzept',
    category: 'Rechtsform & Finanzen',
    content: 'Der monatliche Beitrag zur Instandhaltungsrücklage beträgt 1,50 Euro pro Quadratmeter. Die Einlage für neue Gesellschafter beträgt 25.000 Euro.',
    uploadDate: '2024-01-01',
  }
];

const MOCK_DECISIONS: Decision[] = [
  {
    id: 'd1',
    title: 'Reinigungstreff',
    date: '2024-03-01',
    decidedBy: 'Plenum',
    reason: 'Der wöchentliche Putzplan wird durch einen monatlichen gemeinsamen Reinigungstreff am ersten Samstag des Monats ersetzt.'
  }
];

describe('LLM Evaluation of Prompt Changes', () => {

  it('answers should be concise, not chatty, and factual (LLM as Judge)', async () => {
    const question = "Wie hoch ist die Einlage und wie viel zahle ich für die Rücklage?";
    
    // Call the actual service
    const response = await gemini.askQuestion(question, MOCK_DOCS, []);
    const answerText = response.text;
    
    // Evaluate via another AI call acting as the judge
    const ai = gemini.getAI(true);
    const evaluationPrompt = `
    You are an expert prompt evaluator. 
    Evaluate the following response based on these criteria:
    1. Is it concise and direct? (No small talk, no "Hallo", no "Schön dass du da bist")
    2. Does it directly answer the user's question about Einlage (25.000 Euro) and Rücklage (1,50 Euro/qm)?
    3. Is the tone appropriate for an experienced insider (matter-of-fact, precise)?
    
    User Question: ${question}
    Response: ${answerText}
    
    Return ONLY a JSON object with this structure:
    {
      "pass": boolean,
      "reason": "string"
    }
    `;

    const evalResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: evaluationPrompt,
    });

    const evalText = evalResponse.text || '{}';
    const jsonStr = evalText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const result = JSON.parse(jsonStr);

    console.log("Evaluation Result (Text Mode):", result, "\nOriginal Answer:", answerText);

    expect(result.pass).toBe(true);
  }, 30000);

  it('voice mode answers should be extremely precise and factual (LLM as Judge)', async () => {
    const question = "Wann sind die Ruhezeiten?";
    
    const contextString = `
        BASIS-WISSEN FÜR DIESES HAUS:\n
        Dokumente: ${MOCK_DOCS.map(d => `${d.name}: ${d.content}`).join(' | ')}\n
    `;

    const ai = gemini.getAI(true);
    const voiceInstruct = gemini.getSystemPrompts().voicePrompt;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `${contextString}\n\nFrage: ${question}`,
      config: {
        systemInstruction: voiceInstruct,
      }
    });

    const answerText = response.text || '';

    const evaluationPrompt = `
    You are an expert prompt evaluator for Voice UI text outputs. 
    Evaluate the following response based on these criteria:
    1. Is it concise, direct, and completely devoid of smalltalk? (No greetings, no conversational filler like "Na klar!" or "Sehr gerne erläutere ich das")
    2. Does it directly answer the user's question about Ruhezeiten (22:00 bis 07:00)?
    3. Is the tone factual, precise, and treating the user like an insider?
    
    User Question: ${question}
    Response: ${answerText}
    
    Return ONLY a JSON object with this structure:
    {
      "pass": boolean,
      "reason": "string"
    }
    `;

    const evalResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: evaluationPrompt,
    });

    const evalText = evalResponse.text || '{}';
    const jsonStr = evalText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const result = JSON.parse(jsonStr);

    console.log("Voice Evaluation Result:", result, "\nOriginal Voice Text:", answerText);

    expect(result.pass).toBe(true);
  }, 30000);
});
