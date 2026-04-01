import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../store/projectStore.js', () => ({
  default: vi.fn(),
}));

import useProjectStore from '../../store/projectStore.js';
import DocsPanel from '../../components/panel/DocsPanel.jsx';

const mockDocs = {
  summary: 'This is the project summary.',
  backlog: [
    {
      id: 'b1',
      title: 'User authentication',
      description: 'Implement login and signup',
      domain: 'Security',
      priority: 'high',
    },
    {
      id: 'b2',
      title: 'Dashboard view',
      description: 'Create main dashboard',
      domain: 'UI',
      priority: 'medium',
    },
    {
      id: 'b3',
      title: 'Export feature',
      description: 'Export to PDF',
      domain: 'Utility',
      priority: 'low',
    },
  ],
  decisions: [
    {
      id: 'd1',
      title: 'Use React for frontend',
      rationale: 'Team familiarity and ecosystem',
      timestamp: '2026-03-01T10:00:00Z',
    },
  ],
  openQuestions: ['What is the deployment strategy?', 'Who is the target user?'],
};

function setupStore(docs = mockDocs) {
  useProjectStore.mockImplementation((selector) =>
    selector({
      currentProject: { id: 'p1', docs },
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupStore();
});

describe('DocsPanel', () => {
  it('renders the summary section', () => {
    render(<DocsPanel />);
    expect(screen.getByText('Résumé')).toBeInTheDocument();
    expect(screen.getByText('This is the project summary.')).toBeInTheDocument();
  });

  it('renders backlog items', () => {
    render(<DocsPanel />);
    expect(screen.getByText('User authentication')).toBeInTheDocument();
    expect(screen.getByText('Dashboard view')).toBeInTheDocument();
    expect(screen.getByText('Export feature')).toBeInTheDocument();
  });

  it('shows correct priority badges for backlog items', () => {
    render(<DocsPanel />);
    expect(screen.getByText('Haute')).toBeInTheDocument();
    expect(screen.getByText('Moyenne')).toBeInTheDocument();
    expect(screen.getByText('Basse')).toBeInTheDocument();
  });

  it('shows high priority badge with red color class', () => {
    render(<DocsPanel />);
    const highBadge = screen.getByText('Haute');
    expect(highBadge.className).toContain('bg-red-900');
  });

  it('shows medium priority badge with yellow color class', () => {
    render(<DocsPanel />);
    const medBadge = screen.getByText('Moyenne');
    expect(medBadge.className).toContain('bg-yellow-900');
  });

  it('shows low priority badge with green color class', () => {
    render(<DocsPanel />);
    const lowBadge = screen.getByText('Basse');
    expect(lowBadge.className).toContain('bg-green-900');
  });

  it('renders decisions section', () => {
    render(<DocsPanel />);
    expect(screen.getByText('Use React for frontend')).toBeInTheDocument();
    expect(screen.getByText('Team familiarity and ecosystem')).toBeInTheDocument();
  });

  it('shows "Aucune documentation disponible" when no docs', () => {
    useProjectStore.mockImplementation((selector) =>
      selector({ currentProject: { id: 'p1', docs: null } })
    );
    render(<DocsPanel />);
    expect(screen.getByText(/Aucune documentation disponible/)).toBeInTheDocument();
  });

  it('collapses summary section when clicked', () => {
    render(<DocsPanel />);
    const summaryButton = screen.getByText('Résumé');
    fireEvent.click(summaryButton);
    // After collapsing, the summary text should not be visible
    expect(screen.queryByText('This is the project summary.')).not.toBeInTheDocument();
  });

  it('shows backlog section with count', () => {
    render(<DocsPanel />);
    expect(screen.getByText(/Backlog \(3\)/)).toBeInTheDocument();
  });

  it('shows decisions section with count', () => {
    render(<DocsPanel />);
    expect(screen.getByText(/Décisions \(1\)/)).toBeInTheDocument();
  });
});
