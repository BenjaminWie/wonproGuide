import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import FAQView from './FAQView';
import { FAQItem, Persona } from '../types';

const mockPersonas: Persona[] = [
  { id: 'p1', name: 'Beginner', role: 'beginner', description: 'A beginner' },
  { id: 'p2', name: 'Expert', role: 'expert', description: 'An expert' }
];

const mockCategories = ['Bau', 'Finanzen'];

const mockFaqs: FAQItem[] = [
  {
    id: 'f1',
    question: 'What is Bau?',
    answer: 'Bau is building.',
    category: 'Bau',
    sourceDocId: 'd1',
    sourceDocName: 'Doc 1',
    personaId: 'p1'
  },
  {
    id: 'f2',
    question: 'How to finance?',
    answer: 'With money.',
    category: 'Finanzen',
    sourceDocId: 'd2',
    sourceDocName: 'Doc 2',
    personaId: 'p1'
  },
  {
    id: 'f3',
    question: 'Expert Bau question?',
    answer: 'Complex building answer.',
    category: 'Bau',
    sourceDocId: 'd1',
    sourceDocName: 'Doc 1',
    personaId: 'p2'
  }
];

describe('FAQView', () => {
  it('renders empty state when no FAQs', () => {
    render(
      <FAQView 
        faqs={[]} 
        personas={mockPersonas} 
        categories={mockCategories}
        onViewSource={vi.fn()}
        onUpdateFaq={vi.fn()}
        onExport={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );
    expect(screen.getByText('Das Hausgedächtnis füllt sich noch...')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <FAQView 
        faqs={mockFaqs} 
        personas={mockPersonas} 
        categories={mockCategories}
        onViewSource={vi.fn()}
        onUpdateFaq={vi.fn()}
        onExport={vi.fn()}
        onRegenerate={vi.fn()}
        isLoading={true}
      />
    );
    expect(screen.getByText('Generiere neues Wissen...')).toBeInTheDocument();
  });

  it('filters FAQs by active persona', () => {
    render(
      <FAQView 
        faqs={mockFaqs} 
        personas={mockPersonas} 
        categories={mockCategories}
        onViewSource={vi.fn()}
        onUpdateFaq={vi.fn()}
        onExport={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );
    
    // Default is first persona (Beginner)
    expect(screen.getByText('What is Bau?')).toBeInTheDocument();
    expect(screen.getByText('How to finance?')).toBeInTheDocument();
    expect(screen.queryByText('Expert Bau question?')).not.toBeInTheDocument();

    // Switch to Expert
    fireEvent.click(screen.getByText('Expert'));
    expect(screen.queryByText('What is Bau?')).not.toBeInTheDocument();
    expect(screen.getByText('Expert Bau question?')).toBeInTheDocument();
  });

  it('filters FAQs by search query', async () => {
    const user = userEvent.setup();
    render(
      <FAQView 
        faqs={mockFaqs} 
        personas={mockPersonas} 
        categories={mockCategories}
        onViewSource={vi.fn()}
        onUpdateFaq={vi.fn()}
        onExport={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Suche nach Fragen oder Antworten...');
    await user.type(searchInput, 'finance');

    expect(screen.queryByText('What is Bau?')).not.toBeInTheDocument();
    expect(screen.getByText('How to finance?')).toBeInTheDocument();
  });

  it('filters FAQs by category', () => {
    render(
      <FAQView 
        faqs={mockFaqs} 
        personas={mockPersonas} 
        categories={mockCategories}
        onViewSource={vi.fn()}
        onUpdateFaq={vi.fn()}
        onExport={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // Click 'Finanzen' category filter
    // Note: 'Finanzen' might appear multiple times (as category header and filter button).
    // We target the button in the filter section.
    const filterButtons = screen.getAllByText('Finanzen');
    fireEvent.click(filterButtons[0]); // Assuming first one is the filter chip

    expect(screen.queryByText('What is Bau?')).not.toBeInTheDocument();
    expect(screen.getByText('How to finance?')).toBeInTheDocument();
  });

  it('calls onUpdateFaq when feedback is given', () => {
    const onUpdateFaqMock = vi.fn();
    render(
      <FAQView 
        faqs={mockFaqs} 
        personas={mockPersonas} 
        categories={mockCategories}
        onViewSource={vi.fn()}
        onUpdateFaq={onUpdateFaqMock}
        onExport={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // Open the FAQ first
    fireEvent.click(screen.getByText('What is Bau?'));

    // Click thumbs up
    const thumbsUpBtn = screen.getByTitle('Hilfreich');
    fireEvent.click(thumbsUpBtn);

    expect(onUpdateFaqMock).toHaveBeenCalledWith('f1', { feedback: 'like' });
  });

  it('calls onRegenerate when generate button is clicked', () => {
    const onRegenerateMock = vi.fn();
    render(
      <FAQView 
        faqs={mockFaqs} 
        personas={mockPersonas} 
        categories={mockCategories}
        onViewSource={vi.fn()}
        onUpdateFaq={vi.fn()}
        onExport={vi.fn()}
        onRegenerate={onRegenerateMock}
      />
    );

    fireEvent.click(screen.getByText('Neu generieren'));
    expect(onRegenerateMock).toHaveBeenCalled();
  });
});
