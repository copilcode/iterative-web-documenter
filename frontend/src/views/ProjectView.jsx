import React from 'react';
import useProjectStore from '../store/projectStore.js';
import MainLayout from '../components/layout/MainLayout.jsx';
import KnowledgeTree from '../components/tree/KnowledgeTree.jsx';
import RightPanel from '../components/panel/RightPanel.jsx';
import InitialTextView from './InitialTextView.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function ProjectView() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const isLoading = useProjectStore((state) => state.isLoading);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center flex-1 bg-gray-950">
        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <p className="text-gray-500">Aucun projet sélectionné.</p>
        )}
      </div>
    );
  }

  const hasTree =
    currentProject.tree &&
    currentProject.tree.nodes &&
    currentProject.tree.nodes.length > 0;

  if (!hasTree) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <InitialTextView />
        </div>
        <div className="w-96 shrink-0 flex flex-col">
          <RightPanel />
        </div>
      </div>
    );
  }

  return (
    <MainLayout
      leftPanel={<KnowledgeTree tree={currentProject.tree} />}
      rightPanel={<RightPanel />}
    />
  );
}
