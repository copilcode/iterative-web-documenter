import React from 'react';
import useProjectStore from '../../store/projectStore.js';
import { getNodeTypeConfig } from '../tree/nodeUtils.js';

const STATUS_OPTIONS = [
  { value: 'undocumented', label: 'Non documenté' },
  { value: 'partial', label: 'Partiel' },
  { value: 'documented', label: 'Documenté' },
  { value: 'validated', label: 'Validé' },
];

const TYPE_LABELS = {
  feature: 'Fonctionnalité',
  module: 'Module',
  constraint: 'Contrainte',
  decision: 'Décision',
  actor: 'Acteur',
  flow: 'Flux',
  open_question: 'Question ouverte',
};

export default function NodeDetail() {
  const selectedNodeId = useProjectStore((state) => state.selectedNodeId);
  const currentProject = useProjectStore((state) => state.currentProject);

  const node = currentProject?.tree?.nodes?.find((n) => n.id === selectedNodeId);

  if (!selectedNodeId || !node) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm p-4">
        Sélectionnez un nœud pour voir ses détails
      </div>
    );
  }

  const typeConfig = getNodeTypeConfig(node.type);

  return (
    <div className="p-4 space-y-4" data-testid="node-detail">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-white font-semibold text-base leading-tight">
          {node.label}
        </h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border} border`}
        >
          {TYPE_LABELS[node.type] || node.type}
        </span>
      </div>

      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
          Statut
        </label>
        <select
          value={node.status}
          className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded px-2 py-1 w-full"
          onChange={() => {}}
          aria-label="Node status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {node.summary && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
            Résumé
          </label>
          <p className="text-gray-300 text-sm leading-relaxed">{node.summary}</p>
        </div>
      )}

      {node.detail && (
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
            Détail
          </label>
          <pre className="text-gray-300 text-sm font-mono bg-gray-800 rounded p-3 whitespace-pre-wrap leading-relaxed overflow-auto max-h-60">
            {node.detail}
          </pre>
        </div>
      )}

      {!node.summary && !node.detail && (
        <p className="text-gray-500 text-sm italic">
          Aucune documentation disponible pour ce nœud.
        </p>
      )}
    </div>
  );
}
