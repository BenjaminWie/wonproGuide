import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import VoiceMode from '../components/VoiceMode';
import { gemini } from '../services/geminiService';

// Mock the Gemini service
vi.mock('../services/geminiService', () => ({
  gemini: {
    getSystemPrompts: vi.fn(() => ({ voicePrompt: 'Test prompt' })),
    getAI: vi.fn(() => ({
      live: {
        connect: vi.fn()
      }
    }))
  }
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock AudioContext
class MockAudioContext {
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
  createScriptProcessor = vi.fn(() => ({ connect: vi.fn(), onaudioprocess: null }));
  createBufferSource = vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }));
  createBuffer = vi.fn();
  createAnalyser = vi.fn(() => ({ connect: vi.fn(), getByteTimeDomainData: vi.fn() }));
  destination = {};
  currentTime = 0;
  close = vi.fn();
}

(window as any).AudioContext = MockAudioContext;
(window as any).webkitAudioContext = MockAudioContext;

describe('VoiceMode Component', () => {
  const mockDocuments = [
    { id: '1', name: 'TestDoc.pdf', content: 'Test content 1' },
    { id: '2', name: 'AnotherDoc.docx', content: 'Test content 2' }
  ];
  
  const mockOnClose = vi.fn();
  const mockOnViewDocument = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({}); // Mock stream
  });

  it('renders correctly and starts connecting', async () => {
    const mockConnect = vi.fn().mockResolvedValue({
      sendRealtimeInput: vi.fn(),
      close: vi.fn()
    });
    (gemini.getAI as any).mockReturnValue({
      live: {
        connect: mockConnect
      }
    });

    render(
      <VoiceMode 
        documents={mockDocuments} 
        onClose={mockOnClose} 
        onViewDocument={mockOnViewDocument} 
      />
    );

    expect(screen.getByText('Wohnpro Guide Voice')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(gemini.getAI().live.connect).toHaveBeenCalled();
    });
  });

  it('handles incoming transcriptions and citations', async () => {
    let mockOnMessage: any;
    
    const mockSession = {
      sendRealtimeInput: vi.fn(),
      close: vi.fn()
    };

    (gemini.getAI as any).mockReturnValue({
      live: {
        connect: (config: any) => {
          mockOnMessage = config.callbacks.onmessage;
          return Promise.resolve(mockSession);
        }
      }
    });

    render(
      <VoiceMode 
        documents={mockDocuments} 
        onClose={mockOnClose} 
        onViewDocument={mockOnViewDocument} 
      />
    );

    await waitFor(() => {
      expect(mockOnMessage).toBeDefined();
    });

    // Simulate user speaking
    act(() => {
      mockOnMessage({
        serverContent: {
          inputTranscription: { text: 'Hello ' }
        }
      });
    });

    // Simulate model responding with a citation
    act(() => {
      mockOnMessage({
        serverContent: {
          modelTurn: {
            parts: [{ text: 'Here is the info. [Quelle: TestDoc]' }]
          }
        }
      });
    });

    await waitFor(() => {
      // The citation should be extracted and displayed
      expect(screen.getByText('TestDoc')).toBeInTheDocument();
      expect(screen.getByText('"Information gefunden..."')).toBeInTheDocument();
    });
    
    // Simulate turn complete
    act(() => {
      mockOnMessage({
        serverContent: {
          turnComplete: true
        }
      });
    });
    
    // Click the citation
    fireEvent.click(screen.getByText('TestDoc'));
    expect(mockOnViewDocument).toHaveBeenCalledWith('TestDoc.pdf');
  });

  it('handles interrupted state', async () => {
    let mockOnMessage: any;
    
    const mockSession = {
      sendRealtimeInput: vi.fn(),
      close: vi.fn()
    };

    (gemini.getAI as any).mockReturnValue({
      live: {
        connect: (config: any) => {
          mockOnMessage = config.callbacks.onmessage;
          return Promise.resolve(mockSession);
        }
      }
    });

    render(
      <VoiceMode 
        documents={mockDocuments} 
        onClose={mockOnClose} 
        onViewDocument={mockOnViewDocument} 
      />
    );

    await waitFor(() => {
      expect(mockOnMessage).toBeDefined();
    });

    // Simulate model responding
    act(() => {
      mockOnMessage({
        serverContent: {
          modelTurn: {
            parts: [{ text: 'Some long text that gets interrupted' }]
          }
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText('"Some long text that gets interrupted"')).toBeInTheDocument();
    });

    // Simulate interruption
    act(() => {
      mockOnMessage({
        serverContent: {
          interrupted: true
        }
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('"Some long text that gets interrupted"')).not.toBeInTheDocument();
    });
  });
});
