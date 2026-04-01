import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../store/projectStore.js', () => ({
  default: vi.fn(),
}));

import useProjectStore from '../../store/projectStore.js';
import NodeDetail from '../../components/panel/NodeDetail.jsx';

const mockNode = {
  id: 'node-1',
  label: 'User Authentication',
  type: 'feature',
  status: 'partial',
  summary: 'Handles user login and registration.',
  detail: '## Authentication\nThis feature covers all auth flows.',
};

function setupStore(selectedNodeId = 'node-1', node = mockNode) {
  useProjectStore.mockImplementation((selector) =>
    selector({
      selectedNodeId,
      currentProject: {
        id: 'p1',
        tree: {
          nodes: node ? [node] : [],
          edges: [],
        },
      },
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupStore();
});

describe('NodeDetail', () => {
  it('renders node label when a node is selected', () => {
    render(<NodeDetail />);
    expect(screen.getByText('User Authentication')).toBeInTheDocument();
  });

  it('renders node type badge', () => {
    render(<NodeDetail />);
    expect(screen.getByText('Fonctionnalité')).toBeInTheDocument();
  });

  it('renders node summary', () => {
    render(<NodeDetail />);
    expect(
      screen.getByText('Handles user login and registration.')
    ).toBeInTheDocument();
  });

  it('renders node detail text', () => {
    render(<NodeDetail />);
    expect(
      screen.getByText((_, el) =>
        el?.tagName === 'PRE' &&
        el?.textContent.includes('## Authentication') &&
        el?.textContent.includes('This feature covers all auth flows.')
      )
    ).toBeInTheDocument();
  });

  it('renders status selector', () => {
    render(<NodeDetail />);
    expect(screen.getByLabelText('Node status')).toBeInTheDocument();
  });

  it('shows correct status value in dropdown', () => {
    render(<NodeDetail />);
    const select = screen.getByLabelText('Node status');
    expect(select.value).toBe('partial');
  });

  it('shows "no selection" message when no node is selected', () => {
    setupStore(null, null);
    render(<NodeDetail />);
    expect(
      screen.getByText('Sélectionnez un nœud pour voir ses détails')
    ).toBeInTheDocument();
  });

  it('shows "no selection" message when selectedNodeId does not match any node', () => {
    setupStore('non-existent-id');
    render(<NodeDetail />);
    expect(
      screen.getByText('Sélectionnez un nœud pour voir ses détails')
    ).toBeInTheDocument();
  });

  it('renders correct type badge for module', () => {
    setupStore('node-1', { ...mockNode, type: 'module' });
    render(<NodeDetail />);
    expect(screen.getByText('Module')).toBeInTheDocument();
  });

  it('renders correct type badge for decision', () => {
    setupStore('node-1', { ...mockNode, type: 'decision' });
    render(<NodeDetail />);
    expect(screen.getByText('Décision')).toBeInTheDocument();
  });
});
