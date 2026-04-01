import React from 'react';
import useProjectStore from '../../store/projectStore.js';
import NodeDetail from './NodeDetail.jsx';
import QuestionsPanel from './QuestionsPanel.jsx';
import DocsPanel from './DocsPanel.jsx';

const TABS = [
  { id: 'detail', label: 'Détail' },
  { id: 'questions', label: 'Questions' },
  { id: 'docs', label: 'Docs' },
];

export default function RightPanel() {
  const activeTab = useProjectStore((state) => state.activeTab);
  const setActiveTab = useProjectStore((state) => state.setActiveTab);
  const currentProject = useProjectStore((state) => state.currentProject);

  const deferredSet = new Set(currentProject?.deferredQuestionIds || []);
  const pendingCount = (currentProject?.pendingQuestions || []).filter((q) => !deferredSet.has(q.id)).length;

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700">
      {/* Tab bar */}
      <div className="flex border-b border-gray-700 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-3 text-sm font-medium transition-colors relative
              ${
                activeTab === tab.id
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-gray-200'
              }
            `}
          >
            {tab.label}
            {tab.id === 'questions' && pendingCount > 0 && (
              <span className="ml-1.5 bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'detail' && <NodeDetail />}
        {activeTab === 'questions' && <QuestionsPanel />}
        {activeTab === 'docs' && <DocsPanel />}
      </div>
    </div>
  );
}
