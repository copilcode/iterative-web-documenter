import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../../components/layout/Header.jsx';

// Mock the Zustand store
vi.mock('../../store/projectStore.js', () => ({
  default: vi.fn(),
}));

import useProjectStore from '../../store/projectStore.js';

const mockProjects = [
  { id: '1', name: 'Project Alpha' },
  { id: '2', name: 'Project Beta' },
];

beforeEach(() => {
  useProjectStore.mockImplementation((selector) =>
    selector({
      projects: mockProjects,
      currentProject: null,
    })
  );
});

describe('Header', () => {
  it('renders the app title', () => {
    render(
      <Header
        onNewProject={vi.fn()}
        onSelectProject={vi.fn()}
        onGoToDashboard={vi.fn()}
      />
    );
    expect(screen.getByText('ITERATIVE DOCUMENTER')).toBeInTheDocument();
  });

  it('renders the new project button', () => {
    render(
      <Header
        onNewProject={vi.fn()}
        onSelectProject={vi.fn()}
        onGoToDashboard={vi.fn()}
      />
    );
    expect(screen.getByLabelText('New project')).toBeInTheDocument();
  });

  it('calls onNewProject when new project button is clicked', () => {
    const onNewProject = vi.fn();
    render(
      <Header
        onNewProject={onNewProject}
        onSelectProject={vi.fn()}
        onGoToDashboard={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('New project'));
    expect(onNewProject).toHaveBeenCalledTimes(1);
  });

  it('calls onGoToDashboard when title is clicked', () => {
    const onGoToDashboard = vi.fn();
    render(
      <Header
        onNewProject={vi.fn()}
        onSelectProject={vi.fn()}
        onGoToDashboard={onGoToDashboard}
      />
    );
    fireEvent.click(screen.getByText('ITERATIVE DOCUMENTER'));
    expect(onGoToDashboard).toHaveBeenCalledTimes(1);
  });

  it('shows project name in dropdown when a project is selected', () => {
    useProjectStore.mockImplementation((selector) =>
      selector({
        projects: mockProjects,
        currentProject: { id: '1', name: 'Project Alpha' },
      })
    );
    render(
      <Header
        onNewProject={vi.fn()}
        onSelectProject={vi.fn()}
        onGoToDashboard={vi.fn()}
      />
    );
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
  });

  it('opens dropdown and shows projects on click', () => {
    render(
      <Header
        onNewProject={vi.fn()}
        onSelectProject={vi.fn()}
        onGoToDashboard={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Projects dropdown'));
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('calls onSelectProject when a project is clicked in dropdown', () => {
    const onSelectProject = vi.fn();
    render(
      <Header
        onNewProject={vi.fn()}
        onSelectProject={onSelectProject}
        onGoToDashboard={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Projects dropdown'));
    fireEvent.click(screen.getByText('Project Alpha'));
    expect(onSelectProject).toHaveBeenCalledWith(mockProjects[0]);
  });
});
