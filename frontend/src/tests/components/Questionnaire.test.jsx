import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../store/projectStore.js', () => ({
  default: vi.fn(),
}));

import useProjectStore from '../../store/projectStore.js';
import Questionnaire from '../../components/panel/Questionnaire.jsx';

const mockSubmitAnswer = vi.fn();

const mockQuestion = {
  id: 'q1',
  text: 'What are the main features of your project?',
  priority: 1,
};

const defaultState = {
  currentProject: {
    id: 'p1',
    pendingQuestions: [mockQuestion],
  },
  isLoading: false,
  submitAnswer: mockSubmitAnswer,
};

function setupStore(stateOverride = {}) {
  const state = { ...defaultState, ...stateOverride };
  useProjectStore.mockImplementation((selector) => selector(state));
}

beforeEach(() => {
  vi.clearAllMocks();
  setupStore();
});

describe('Questionnaire', () => {
  it('renders the current question text', () => {
    render(<Questionnaire />);
    expect(
      screen.getByText('What are the main features of your project?')
    ).toBeInTheDocument();
  });

  it('shows question count', () => {
    render(<Questionnaire />);
    expect(screen.getByText(/Question 1 \/ 1 en attente/)).toBeInTheDocument();
  });

  it('renders the answer textarea', () => {
    render(<Questionnaire />);
    expect(screen.getByLabelText('Answer input')).toBeInTheDocument();
  });

  it('disables submit button when answer is empty', () => {
    render(<Questionnaire />);
    const button = screen.getByText('Répondre →').closest('button');
    expect(button).toBeDisabled();
  });

  it('enables submit button when answer is not empty', () => {
    render(<Questionnaire />);
    const textarea = screen.getByLabelText('Answer input');
    fireEvent.change(textarea, { target: { value: 'My answer' } });
    const button = screen.getByText('Répondre →').closest('button');
    expect(button).not.toBeDisabled();
  });

  it('calls submitAnswer with correct args when submit button clicked', () => {
    render(<Questionnaire />);
    const textarea = screen.getByLabelText('Answer input');
    fireEvent.change(textarea, { target: { value: 'My answer' } });
    fireEvent.click(screen.getByText('Répondre →'));

    expect(mockSubmitAnswer).toHaveBeenCalledWith(
      'p1',
      'q1',
      'What are the main features of your project?',
      'My answer'
    );
  });

  it('disables submit button while loading', () => {
    setupStore({
      currentProject: { id: 'p1', pendingQuestions: [mockQuestion] },
      isLoading: true,
      submitAnswer: mockSubmitAnswer,
    });
    render(<Questionnaire />);
    const textarea = screen.getByLabelText('Answer input');
    fireEvent.change(textarea, { target: { value: 'answer' } });
    const button = screen.getByText('Répondre →').closest('button');
    expect(button).toBeDisabled();
  });

  it('shows "Passer cette question" link', () => {
    render(<Questionnaire />);
    expect(screen.getByText('Passer cette question')).toBeInTheDocument();
  });

  it('shows "Aucune question en attente" when no questions', () => {
    setupStore({
      currentProject: { id: 'p1', pendingQuestions: [] },
      isLoading: false,
      submitAnswer: mockSubmitAnswer,
    });
    render(<Questionnaire />);
    expect(screen.getByText('Aucune question en attente')).toBeInTheDocument();
  });

  it('shows generate questions button when no questions', () => {
    setupStore({
      currentProject: { id: 'p1', pendingQuestions: [] },
      isLoading: false,
      submitAnswer: mockSubmitAnswer,
    });
    render(<Questionnaire />);
    expect(screen.getByText('Générer des questions')).toBeInTheDocument();
  });

  it('shows multiple question count correctly', () => {
    setupStore({
      currentProject: {
        id: 'p1',
        pendingQuestions: [
          { id: 'q1', text: 'First?' },
          { id: 'q2', text: 'Second?' },
          { id: 'q3', text: 'Third?' },
        ],
      },
      isLoading: false,
      submitAnswer: mockSubmitAnswer,
    });
    render(<Questionnaire />);
    expect(screen.getByText(/Question 1 \/ 3 en attente/)).toBeInTheDocument();
  });
});
