import React, { useState, useCallback } from 'react';
import useProjectStore from '../../store/projectStore.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

// ── Single question card ──────────────────────────────────────────────────────
function QuestionCard({ question, answer, onAnswerChange, onDefer, onDelete, disabled }) {
  const handleKeyDown = (e) => {
    // Ctrl+Enter submits the whole form (handled by parent via form submit)
    if (e.key === 'Enter' && !e.ctrlKey) return; // allow normal newlines
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 transition-colors ${
      answer.trim() ? 'bg-gray-800 border-indigo-800/60' : 'bg-gray-800 border-gray-700'
    }`}>
      <p className="text-gray-200 text-sm leading-relaxed">{question.text}</p>

      <textarea
        value={answer}
        onChange={(e) => onAnswerChange(question.id, e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Votre réponse…"
        rows={3}
        className="w-full bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
        disabled={disabled}
        aria-label={`Answer for: ${question.text}`}
      />

      <div className="flex gap-3">
        <button
          onClick={() => onDefer(question.id)}
          disabled={disabled}
          className="text-xs text-gray-500 hover:text-yellow-400 transition-colors"
        >
          Mettre de côté
        </button>
        <button
          onClick={() => onDelete(question.id)}
          disabled={disabled}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

// ── Deferred item ─────────────────────────────────────────────────────────────
function DeferredItem({ text, onRestore, onDelete }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-700 last:border-0">
      <p className="text-gray-400 text-xs leading-relaxed flex-1">{text}</p>
      <div className="flex gap-2 shrink-0">
        <button onClick={onRestore} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap">
          Restaurer
        </button>
        <button onClick={onDelete} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function QuestionsPanel() {
  const [answers, setAnswers] = useState({}); // { [questionId]: string }
  const [deferredSectionOpen, setDeferredSectionOpen] = useState(false);

  const currentProject      = useProjectStore((s) => s.currentProject);
  const isLoading           = useProjectStore((s) => s.isLoading);
  const submitAnswersBatch   = useProjectStore((s) => s.submitAnswersBatch);
  const generateNextQuestion = useProjectStore((s) => s.generateNextQuestion);
  const deferQuestion        = useProjectStore((s) => s.deferQuestion);
  const restoreQuestion     = useProjectStore((s) => s.restoreQuestion);
  const deleteQuestion      = useProjectStore((s) => s.deleteQuestion);

  const allQuestions    = currentProject?.pendingQuestions || [];
  const deferredSet     = new Set(currentProject?.deferredQuestionIds || []);
  const activeQuestions = allQuestions.filter((q) => !deferredSet.has(q.id));
  const deferredQuestions = allQuestions.filter((q) => deferredSet.has(q.id));

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // Collect all non-empty answers
  const filledAnswers = activeQuestions
    .filter((q) => (answers[q.id] || '').trim())
    .map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: answers[q.id].trim(),
    }));

  const handleSubmit = useCallback(async () => {
    if (filledAnswers.length === 0 || isLoading) return;
    const ok = await submitAnswersBatch(currentProject.id, filledAnswers);
    if (ok) {
      // Clear answered fields
      const answeredIds = new Set(filledAnswers.map((a) => a.questionId));
      setAnswers((prev) => {
        const next = { ...prev };
        for (const id of answeredIds) delete next[id];
        return next;
      });
    }
  }, [filledAnswers, isLoading, submitAnswersBatch, currentProject]);

  return (
    <div className="flex flex-col h-full" data-testid="questions-panel">
      {/* ── Submit bar ── */}
      {activeQuestions.length > 0 && (
        <div className="shrink-0 px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-3 bg-gray-900">
          <span className="text-gray-400 text-xs">
            {filledAnswers.length > 0
              ? `${filledAnswers.length} réponse${filledAnswers.length > 1 ? 's' : ''} prête${filledAnswers.length > 1 ? 's' : ''}`
              : `${activeQuestions.length} question${activeQuestions.length > 1 ? 's' : ''} en attente`}
          </span>
          <button
            onClick={handleSubmit}
            disabled={filledAnswers.length === 0 || isLoading}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              filledAnswers.length === 0 || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
            }`}
          >
            {isLoading && <LoadingSpinner size="sm" />}
            Soumettre {filledAnswers.length > 0 ? `(${filledAnswers.length})` : ''}
          </button>
        </div>
      )}

      {/* ── Questions list ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeQuestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <p className="text-gray-400 text-sm">Aucune question active</p>
            {currentProject && (
              <button
                onClick={generateNextQuestion}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
              >
                {isLoading && <LoadingSpinner size="sm" />}
                Générer de nouvelles questions
              </button>
            )}
          </div>
        )}

        {activeQuestions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            answer={answers[q.id] || ''}
            onAnswerChange={handleAnswerChange}
            onDefer={deferQuestion}
            onDelete={deleteQuestion}
            disabled={isLoading}
          />
        ))}

        {/* ── Deferred section ── */}
        {deferredQuestions.length > 0 && (
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setDeferredSectionOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-800 hover:bg-gray-750 text-left transition-colors"
              aria-expanded={deferredSectionOpen}
            >
              <span className="text-gray-400 text-xs font-medium">
                {deferredQuestions.length} question{deferredQuestions.length > 1 ? 's' : ''} mise{deferredQuestions.length > 1 ? 's' : ''} de côté
              </span>
              <span className="text-gray-500 text-xs">{deferredSectionOpen ? '▲' : '▼'}</span>
            </button>

            {deferredSectionOpen && (
              <div className="px-4 py-2 border-t border-gray-700">
                {deferredQuestions.map((q) => (
                  <DeferredItem
                    key={q.id}
                    text={q.text}
                    onRestore={() => restoreQuestion(q.id)}
                    onDelete={() => deleteQuestion(q.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
