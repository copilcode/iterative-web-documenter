import React, { useState } from 'react';
import useProjectStore from '../../store/projectStore.js';

const PRIORITY_STYLES = {
  high: 'bg-red-900 text-red-200 border border-red-700',
  medium: 'bg-yellow-900 text-yellow-200 border border-yellow-700',
  low: 'bg-green-900 text-green-200 border border-green-700',
};

const PRIORITY_LABELS = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 text-left transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-gray-200 text-sm font-medium">{title}</span>
        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="bg-gray-850 border-t border-gray-700">{children}</div>
      )}
    </div>
  );
}

export default function DocsPanel() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const docs = currentProject?.docs;
  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState(null);

  const handleExport = async (format) => {
    if (!currentProject?.id || exporting) return;
    console.log('[export] starting', format, 'for project', currentProject.id);
    setExporting(format);
    setExportError(null);
    try {
      const url = `/api/projects/${currentProject.id}/export?format=${format}`;
      console.log('[export] fetching', url);
      const res = await fetch(url);
      console.log('[export] response status', res.status);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erreur ${res.status}: ${text}`);
      }
      const blob = await res.blob();
      console.log('[export] blob size', blob.size, 'type', blob.type);
      const objectUrl = URL.createObjectURL(blob);
      const slug = currentProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = format === 'json' ? `${slug}_export.json` : `${slug}_documentation.md`;
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }, 100);
      console.log('[export] done:', filename);
    } catch (err) {
      console.error('[export] failed:', err);
      setExportError(err.message);
    } finally {
      setExporting(null);
    }
  };

  if (!docs) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center">
        Aucune documentation disponible. Analysez votre projet pour commencer.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto" data-testid="docs-panel">
      {/* Export buttons */}
      <div className="flex gap-2 pb-1">
        <button
          onClick={() => handleExport('markdown')}
          disabled={!!exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
          title="Télécharger la documentation au format Markdown"
        >
          {exporting === 'markdown' ? '...' : '↓ Markdown'}
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={!!exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 text-xs rounded transition-colors"
          title="Télécharger les données du projet au format JSON"
        >
          {exporting === 'json' ? '...' : '↓ JSON'}
        </button>
      </div>
      {exportError && (
        <div className="text-red-400 text-xs px-1 pb-1">
          Export échoué : {exportError}
        </div>
      )}
      {/* Summary */}
      <CollapsibleSection title="Résumé" defaultOpen={true}>
        <div className="p-4">
          {docs.summary ? (
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {docs.summary}
            </p>
          ) : (
            <p className="text-gray-500 text-sm italic">Aucun résumé disponible.</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Backlog */}
      <CollapsibleSection title={`Backlog (${docs.backlog?.length || 0})`} defaultOpen={true}>
        <div className="p-3 space-y-2">
          {docs.backlog && docs.backlog.length > 0 ? (
            docs.backlog.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                data-testid="backlog-item"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-gray-200 text-sm font-medium leading-tight">
                    {item.title}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low
                    }`}
                  >
                    {PRIORITY_LABELS[item.priority] || item.priority}
                  </span>
                </div>
                {item.description && (
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {item.description}
                  </p>
                )}
                {item.domain && (
                  <span className="text-gray-500 text-xs mt-1 inline-block">
                    {item.domain}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm italic px-1">
              Aucun item dans le backlog.
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* Decisions */}
      <CollapsibleSection
        title={`Décisions (${docs.decisions?.length || 0})`}
        defaultOpen={true}
      >
        <div className="p-3 space-y-2">
          {docs.decisions && docs.decisions.length > 0 ? (
            docs.decisions.map((decision) => (
              <div
                key={decision.id}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                data-testid="decision-item"
              >
                <p className="text-gray-200 text-sm font-medium mb-1">
                  {decision.title}
                </p>
                {decision.rationale && (
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {decision.rationale}
                  </p>
                )}
                {decision.timestamp && (
                  <p className="text-gray-600 text-xs mt-1">
                    {new Date(decision.timestamp).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm italic px-1">
              Aucune décision enregistrée.
            </p>
          )}
        </div>
      </CollapsibleSection>

    </div>
  );
}
