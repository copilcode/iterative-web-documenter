import React, { useEffect, useState } from 'react';
import useProjectStore from '../../store/projectStore.js';
import ProjectCard from './ProjectCard.jsx';
import NewProjectModal from './NewProjectModal.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

export default function Dashboard({ onSelectProject }) {
  const [showModal, setShowModal] = useState(false);

  const projects = useProjectStore((state) => state.projects);
  const isLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const createProject = useProjectStore((state) => state.createProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (name, description) => {
    const project = await createProject(name, description);
    if (project) {
      setShowModal(false);
      if (onSelectProject) onSelectProject(project);
    }
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('Supprimer ce projet ?')) {
      await deleteProject(id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">Mes projets</h1>
            <p className="text-gray-400 text-sm mt-1">
              {projects.length} projet{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
          >
            <span>+</span>
            <span>Nouveau projet</span>
          </button>
        </div>

        {isLoading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4 text-gray-700">&#9741;</div>
            <h3 className="text-gray-300 text-lg font-semibold mb-2">
              Aucun projet
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">
              Créez votre premier projet pour commencer à documenter.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
            >
              Créer mon premier projet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onSelectProject && onSelectProject(project)}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateProject}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
