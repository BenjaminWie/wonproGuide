import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiService } from '../services/geminiService';

describe('GeminiService', () => {
  let originalEnv: any;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use GEMINI_PRO_API_KEY if available', () => {
    process.env.GEMINI_PRO_API_KEY = 'test-pro-key';
    const service = new GeminiService();
    const ai = service.getAI();
    expect(ai).toBeDefined();
  });

  it('should use GEMINI_API_KEY as fallback', () => {
    delete process.env.GEMINI_PRO_API_KEY;
    process.env.GEMINI_API_KEY = 'test-api-key';
    const service = new GeminiService();
    const ai = service.getAI();
    expect(ai).toBeDefined();
  });

  it('should throw an error if no API key is found', () => {
    delete process.env.GEMINI_PRO_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.API_KEY;
    delete process.env.GCP_PROJECT;
    delete process.env.GCP_LOCATION;
    
    const service = new GeminiService();
    expect(() => service.getAI()).toThrow('No valid Gemini API configuration found. Please set GEMINI_PRO_API_KEY or GEMINI_API_KEY.');
  });
});
