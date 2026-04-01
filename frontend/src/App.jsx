import React, { useState } from 'react';
import Header from './components/layout/Header.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import ProjectView from './views/ProjectView.jsx';
import ErrorBanner from './components/common/ErrorBanner.jsx';
import NewProjectModal from './components/dashboard/NewProjectModal.jsx';
import useProjectStore from './store/projectStore.js';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const loadProject = useProjectStore((state) => state.loadProject);
  const createProject = useProjectStore((state) => state.createProject);
  const importProject = useProjectStore((state) => state.importProject);
  const isLoading = useProjectStore((state) => state.isLoading);

  const handleSelectProject = async (project) => {
    await loadProject(project.id);
    setCurrentView('project');
  };

  const handleNewProject = async (name, description) => {
    const project = await createProject(name, description);
    if (project) {
      setShowNewProjectModal(false);
      await loadProject(project.id);
      setCurrentView('project');
    }
  };

  const handleImportProject = async (projectData) => {
    const project = await importProject(projectData);
    if (project) {
      setShowNewProjectModal(false);
      await loadProject(project.id);
      setCurrentView('project');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      <Header
        onNewProject={() => setShowNewProjectModal(true)}
        onSelectProject={handleSelectProject}
        currentView={currentView}
        onGoToDashboard={() => setCurrentView('dashboard')}
      />
      <ErrorBanner />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {currentView === 'dashboard' && (
          <Dashboard onSelectProject={handleSelectProject} />
        )}
        {currentView === 'project' && <ProjectView />}
      </div>

      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onSubmit={handleNewProject}
          onImport={handleImportProject}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
