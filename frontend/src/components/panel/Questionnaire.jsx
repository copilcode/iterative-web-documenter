import React, { useState, useCallback } from 'react';
import useProjectStore from '../../store/projectStore.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

export default function Questionnaire() {
  const [answerText, setAnswerText] = useState('');

  const currentProject = useProjectStore((state) => state.currentProject);
  const isLoading = useProjectStore((state) => state.isLoading);
  const submitAnswer = useProjectStore((state) => state.submitAnswer);

  const pendingQuestions = currentProject?.pendingQuestions || [];
  const currentQuestion = pendingQuestions[0] || null;
  const questionCount = pendingQuestions.length;

  const handleSubmit = async () => {
    if (!answerText.trim() || !currentQuestion || isLoading) return;
    const success = await submitAnswer(
      currentProject.id,
      currentQuestion.id,
      currentQuestion.text,
      answerText.trim()
    );
    if (success) setAnswerText('');
  };

  const skipQuestion = useProjectStore((state) => state.skipQuestion);

  const handleSkip = useCallback(() => {
    if (!currentQuestion || isLoading) return;
    setAnswerText('');
    skipQuestion(currentQuestion.id);
  }, [currentQuestion, isLoading, skipQuestion]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  if (!currentQuestion) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-gray-400 text-sm text-center">
          Aucune question en attente
        </p>
        <button
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
          disabled={isLoading}
        >
          {isLoading ? (
            <LoadingSpinner size="sm" className="inline mr-2" />
          ) : null}
          Générer des questions
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" data-testid="questionnaire">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs">
          Question {1} / {questionCount} en attente
        </span>
      </div>

      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p className="text-gray-200 text-sm leading-relaxed">
          {currentQuestion.text}
        </p>
      </div>

      <textarea
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Votre réponse... (Ctrl+Entrée pour soumettre)"
        rows={4}
        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500"
        disabled={isLoading}
        aria-label="Answer input"
      />

      <div className="flex items-center justify-between">
        <button
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          disabled={isLoading}
        >
          Passer cette question
        </button>

        <button
          onClick={handleSubmit}
          disabled={!answerText.trim() || isLoading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors
            ${
              !answerText.trim() || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
            }
          `}
        >
          {isLoading && <LoadingSpinner size="sm" />}
          Répondre →
        </button>
      </div>
    </div>
  );
}
