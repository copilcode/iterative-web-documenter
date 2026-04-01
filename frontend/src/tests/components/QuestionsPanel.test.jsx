import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../store/projectStore.js', () => ({
  default: vi.fn(),
}));

import useProjectStore from '../../store/projectStore.js';
import QuestionsPanel from '../../components/panel/QuestionsPanel.jsx';

const mockSubmitBatch  = vi.fn();
const mockDeferQ       = vi.fn();
const mockRestoreQ     = vi.fn();
const mockDeleteQ      = vi.fn();

const Q1 = { id: 'q1', text: 'What are the main features?' };
const Q2 = { id: 'q2', text: 'Who is the target user?' };

function setupStore(projectOverride = {}, stateOverride = {}) {
  const state = {
    currentProject: {
      id: 'p1',
      pendingQuestions: [Q1],
      deferredQuestionIds: [],
      ...projectOverride,
    },
    isLoading: false,
    submitAnswersBatch: mockSubmitBatch,
    deferQuestion: mockDeferQ,
    restoreQuestion: mockRestoreQ,
    deleteQuestion: mockDeleteQ,
    ...stateOverride,
  };
  useProjectStore.mockImplementation((selector) => selector(state));
}

beforeEach(() => {
  vi.clearAllMocks();
  setupStore();
});

describe('QuestionsPanel — rendering', () => {
  it('renders a question', () => {
    render(<QuestionsPanel />);
    expect(screen.getByText('What are the main features?')).toBeInTheDocument();
  });

  it('renders textarea for each question', () => {
    setupStore({ pendingQuestions: [Q1, Q2] });
    render(<QuestionsPanel />);
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('shows question count in submit bar', () => {
    render(<QuestionsPanel />);
    expect(screen.getByText(/1 question en attente/)).toBeInTheDocument();
  });

  it('shows empty state when no questions', () => {
    setupStore({ pendingQuestions: [] });
    render(<QuestionsPanel />);
    expect(screen.getByText('Aucune question active')).toBeInTheDocument();
  });

  it('hides submit bar when no questions', () => {
    setupStore({ pendingQuestions: [] });
    render(<QuestionsPanel />);
    expect(screen.queryByText(/Soumettre/)).not.toBeInTheDocument();
  });
});

describe('QuestionsPanel — batch submit', () => {
  it('submit button disabled when no answers filled', () => {
    render(<QuestionsPanel />);
    expect(screen.getByRole('button', { name: /Soumettre/ })).toBeDisabled();
  });

  it('submit button enabled when at least one answer filled', () => {
    render(<QuestionsPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My answer' } });
    expect(screen.getByRole('button', { name: /Soumettre/ })).not.toBeDisabled();
  });

  it('shows filled count on submit button', () => {
    setupStore({ pendingQuestions: [Q1, Q2] });
    render(<QuestionsPanel />);
    const [ta1] = screen.getAllByRole('textbox');
    fireEvent.change(ta1, { target: { value: 'Answer 1' } });
    expect(screen.getByRole('button', { name: /Soumettre \(1\)/ })).toBeInTheDocument();
  });

  it('calls submitAnswersBatch with correct payload', async () => {
    mockSubmitBatch.mockResolvedValueOnce(true);
    render(<QuestionsPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My answer' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Soumettre/ })); });
    expect(mockSubmitBatch).toHaveBeenCalledWith('p1', [
      { questionId: 'q1', question: 'What are the main features?', answer: 'My answer' },
    ]);
  });

  it('submits only filled answers when multiple questions', async () => {
    mockSubmitBatch.mockResolvedValueOnce(true);
    setupStore({ pendingQuestions: [Q1, Q2] });
    render(<QuestionsPanel />);
    const [ta1] = screen.getAllByRole('textbox');
    fireEvent.change(ta1, { target: { value: 'Answer for Q1' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Soumettre/ })); });
    expect(mockSubmitBatch).toHaveBeenCalledWith('p1', [
      { questionId: 'q1', question: 'What are the main features?', answer: 'Answer for Q1' },
    ]);
  });

  it('clears answered fields after successful submit', async () => {
    mockSubmitBatch.mockResolvedValueOnce(true);
    render(<QuestionsPanel />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'My answer' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Soumettre/ })); });
    expect(ta.value).toBe('');
  });
});

describe('QuestionsPanel — defer and delete', () => {
  it('calls deferQuestion', () => {
    render(<QuestionsPanel />);
    fireEvent.click(screen.getByText('Mettre de côté'));
    expect(mockDeferQ).toHaveBeenCalledWith('q1');
  });

  it('calls deleteQuestion', () => {
    render(<QuestionsPanel />);
    fireEvent.click(screen.getByText('Supprimer'));
    expect(mockDeleteQ).toHaveBeenCalledWith('q1');
  });

  it('hides deferred question from active list', () => {
    setupStore({ pendingQuestions: [Q1], deferredQuestionIds: ['q1'] });
    render(<QuestionsPanel />);
    expect(screen.queryByText('What are the main features?')).not.toBeInTheDocument();
  });

  it('shows deferred section with count', () => {
    setupStore({ pendingQuestions: [Q1], deferredQuestionIds: ['q1'] });
    render(<QuestionsPanel />);
    expect(screen.getByText(/1 question mise de côté/)).toBeInTheDocument();
  });

  it('reveals deferred questions when expanded', () => {
    setupStore({ pendingQuestions: [Q1], deferredQuestionIds: ['q1'] });
    render(<QuestionsPanel />);
    fireEvent.click(screen.getByText(/1 question mise de côté/));
    expect(screen.getByText('What are the main features?')).toBeInTheDocument();
  });

  it('calls restoreQuestion from deferred section', () => {
    setupStore({ pendingQuestions: [Q1], deferredQuestionIds: ['q1'] });
    render(<QuestionsPanel />);
    fireEvent.click(screen.getByText(/1 question mise de côté/));
    fireEvent.click(screen.getByText('Restaurer'));
    expect(mockRestoreQ).toHaveBeenCalledWith('q1');
  });
});
