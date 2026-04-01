import React from 'react';
import useProjectStore from '../../store/projectStore.js';

export default function ErrorBanner() {
  const error = useProjectStore((state) => state.error);
  const clearError = useProjectStore((state) => state.clearError);

  if (!error) return null;

  return (
    <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 flex items-center justify-between">
      <span className="text-sm">{error}</span>
      <button
        onClick={clearError}
        className="text-red-300 hover:text-white ml-4 text-lg leading-none"
        aria-label="Dismiss error"
      >
        &times;
      </button>
    </div>
  );
}
