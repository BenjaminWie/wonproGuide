import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gemini } from './geminiService';
import { Document, Persona } from '../types';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify([
            {
              question: 'Generated Q1?',
              answer: 'Generated A1.',
              category: 'Bau'
            }
          ])
        })
      };
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
      BOOLEAN: 'BOOLEAN'
    }
  };
});

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates FAQs correctly', async () => {
    const mockDoc: Document = {
      id: 'd1',
      name: 'Test Doc',
      content: 'Test content about building.',
      category: 'Bau',
      uploadDate: '2024-01-01',
      size: 100
    };

    const mockPersona: Persona = {
      id: 'p1',
      name: 'Beginner',
      role: 'beginner',
      description: 'A beginner persona'
    };

    const categories = ['Bau', 'Finanzen'];

    const faqs = await gemini.generateFAQs(mockDoc, mockPersona, categories);

    expect(faqs).toHaveLength(1);
    expect(faqs[0].question).toBe('Generated Q1?');
    expect(faqs[0].answer).toBe('Generated A1.');
    expect(faqs[0].category).toBe('Bau');
  });
});
