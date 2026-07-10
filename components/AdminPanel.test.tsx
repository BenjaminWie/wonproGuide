import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AdminPanel from './AdminPanel';
import { Persona, User, Document, Milestone } from '../types';

const mockPersonas: Persona[] = [
  { id: 'p1', name: 'Beginner', role: 'beginner', description: 'A beginner' }
];

const mockUsers: User[] = [];
const mockDocuments: Document[] = [];
const mockMilestones: Milestone[] = [];

describe('AdminPanel Personas', () => {
  it('renders persona list', () => {
    render(
      <AdminPanel 
        activeTab="personas"
        setActiveTab={vi.fn()}
        documents={mockDocuments}
        users={mockUsers}
        personas={mockPersonas}
        milestones={mockMilestones}
        onAddDoc={vi.fn()}
        onRemoveDoc={vi.fn()}
        onInviteUser={vi.fn()}
        onRemoveUser={vi.fn()}
        onAddPersona={vi.fn()}
        onUpdatePersona={vi.fn()}
        onRemovePersona={vi.fn()}
        onUpdateMilestones={vi.fn()}
      />
    );
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('adds a new persona', async () => {
    const onAddPersonaMock = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminPanel 
        activeTab="personas"
        setActiveTab={vi.fn()}
        documents={mockDocuments}
        users={mockUsers}
        personas={mockPersonas}
        milestones={mockMilestones}
        onAddDoc={vi.fn()}
        onRemoveDoc={vi.fn()}
        onInviteUser={vi.fn()}
        onRemoveUser={vi.fn()}
        onAddPersona={onAddPersonaMock}
        onUpdatePersona={vi.fn()}
        onRemovePersona={vi.fn()}
        onUpdateMilestones={vi.fn()}
      />
    );

    // Open Add Persona modal
    fireEvent.click(screen.getByText('Persona erstellen'));

    // Fill form
    await user.type(screen.getByPlaceholderText('z.B. Junge Familie'), 'Expert');
    await user.type(screen.getByPlaceholderText('Beschreibe, was diese Person wissen will...'), 'An expert persona');
    
    // Submit
    fireEvent.click(screen.getByText('Speichern'));

    expect(onAddPersonaMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Expert',
      description: 'An expert persona',
      role: 'beginner' // Default role in the form
    }));
  });

  it('updates an existing persona', async () => {
    const onUpdatePersonaMock = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminPanel 
        activeTab="personas"
        setActiveTab={vi.fn()}
        documents={mockDocuments}
        users={mockUsers}
        personas={mockPersonas}
        milestones={mockMilestones}
        onAddDoc={vi.fn()}
        onRemoveDoc={vi.fn()}
        onInviteUser={vi.fn()}
        onRemoveUser={vi.fn()}
        onAddPersona={vi.fn()}
        onUpdatePersona={onUpdatePersonaMock}
        onRemovePersona={vi.fn()}
        onUpdateMilestones={vi.fn()}
      />
    );

    // Click edit on the first persona
    const editButton = screen.getByText('Bearbeiten');
    fireEvent.click(editButton);

    // Change name
    const nameInput = screen.getByDisplayValue('Beginner');
    await user.clear(nameInput);
    await user.type(nameInput, 'Advanced Beginner');

    // Submit
    fireEvent.click(screen.getByText('Speichern'));

    expect(onUpdatePersonaMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p1',
      name: 'Advanced Beginner',
      description: 'A beginner'
    }));
  });
});
