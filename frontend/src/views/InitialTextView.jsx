import React, { useState } from 'react';
import useProjectStore from '../store/projectStore.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function InitialTextView() {
  const [text, setText] = useState('');

  const currentProject = useProjectStore((state) => state.currentProject);
  const isLoading = useProjectStore((state) => state.isLoading);
  const analyzeProject = useProjectStore((state) => state.analyzeProject);

  const handleAnalyze = async () => {
    if (!text.trim() || isLoading || !currentProject) return;
    await analyzeProject(currentProject.id, text.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAnalyze();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-white text-xl font-semibold mb-1">
            {currentProject?.name || 'Nouveau projet'}
          </h2>
          <p className="text-gray-400 text-sm">
            Collez votre plan de projet pour générer un arbre de connaissance interactif.
          </p>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Collez ici votre plan de projet..."
            className="flex-1 w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl p-5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-600 leading-relaxed min-h-[300px]"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-gray-500 text-xs">
              {text.length} caractères
              {text.length > 0 && ' · Ctrl+Entrée pour analyser'}
            </span>
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || isLoading}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  !text.trim() || isLoading
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }
              `}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Analyse en cours...</span>
                </>
              ) : (
                <span>Analyser →</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
