import { describe, it, expect } from 'vitest';
import { gemini } from '../services/geminiService';

describe('Gemini API Integration', () => {
  it('should be able to generate content', async () => {
    const ai = gemini.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Say hello world',
    });
    expect(response.text).toBeDefined();
    expect(response.text.length).toBeGreaterThan(0);
  });
});