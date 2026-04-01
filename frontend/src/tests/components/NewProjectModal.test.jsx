import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewProjectModal from '../../components/dashboard/NewProjectModal.jsx';

describe('NewProjectModal', () => {
  it('renders the modal title', () => {
    render(<NewProjectModal onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Nouveau projet')).toBeInTheDocument();
  });

  it('renders name and description fields', () => {
    render(<NewProjectModal onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByLabelText(/Nom du projet/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Brève description du projet...')).toBeInTheDocument();
  });

  it('shows validation error when submitting empty name', async () => {
    render(<NewProjectModal onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByText('Créer le projet'));
    await waitFor(() => {
      expect(screen.getByText('Le nom du projet est requis.')).toBeInTheDocument();
    });
  });

  it('does not call onSubmit when name is empty', () => {
    const onSubmit = vi.fn();
    render(<NewProjectModal onClose={vi.fn()} onSubmit={onSubmit} isLoading={false} />);
    fireEvent.click(screen.getByText('Créer le projet'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with name and description when form is valid', () => {
    const onSubmit = vi.fn();
    render(<NewProjectModal onClose={vi.fn()} onSubmit={onSubmit} isLoading={false} />);

    fireEvent.change(screen.getByPlaceholderText('Mon super projet'), {
      target: { value: 'My Project' },
    });
    fireEvent.change(screen.getByPlaceholderText('Brève description du projet...'), {
      target: { value: 'A description' },
    });
    fireEvent.click(screen.getByText('Créer le projet'));

    expect(onSubmit).toHaveBeenCalledWith('My Project', 'A description');
  });

  it('calls onSubmit without description when description is empty', () => {
    const onSubmit = vi.fn();
    render(<NewProjectModal onClose={vi.fn()} onSubmit={onSubmit} isLoading={false} />);

    fireEvent.change(screen.getByPlaceholderText('Mon super projet'), {
      target: { value: 'Only Name' },
    });
    fireEvent.click(screen.getByText('Créer le projet'));

    expect(onSubmit).toHaveBeenCalledWith('Only Name', '');
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<NewProjectModal onClose={onClose} onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close X button is clicked', () => {
    const onClose = vi.fn();
    render(<NewProjectModal onClose={onClose} onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when loading', () => {
    render(<NewProjectModal onClose={vi.fn()} onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByText('Créer le projet').closest('button')).toBeDisabled();
  });
});
