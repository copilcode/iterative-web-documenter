import React, { useState } from 'react';
import useProjectStore from '../../store/projectStore.js';
import { exportProjectJson } from '../../api/projects.js';

export default function Header({ onNewProject, onSelectProject, currentView, onGoToDashboard }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const projects = useProjectStore((state) => state.projects);
  const currentProject = useProjectStore((state) => state.currentProject);

  const handleSelectProject = (project) => {
    setDropdownOpen(false);
    if (onSelectProject) onSelectProject(project);
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700 shrink-0">
      <button
        onClick={onGoToDashboard}
        className="text-white font-bold text-lg tracking-tight hover:text-indigo-400 transition-colors"
      >
        ITERATIVE DOCUMENTER
      </button>

      <div className="flex items-center gap-3">
        {/* Project selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded hover:bg-gray-700 transition-colors"
            aria-label="Projects dropdown"
          >
            <span>
              {currentProject ? currentProject.name : 'Projets'}
            </span>
            <span className="text-gray-500">▼</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
              {projects.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  Aucun projet
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className={`
                      w-full text-left px-4 py-2 text-sm transition-colors
                      ${
                        currentProject?.id === project.id
                          ? 'text-indigo-400 bg-gray-700'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                    `}
                  >
                    {project.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Export current project */}
        {currentProject && (
          <button
            onClick={() => exportProjectJson(currentProject.id, currentProject.name)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white text-sm rounded transition-colors"
            title="Exporter le projet (backup JSON)"
          >
            ↓ Export
          </button>
        )}

        {/* New project button */}
        <button
          onClick={onNewProject}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
          aria-label="New project"
        >
          <span>+</span>
          <span>Nouveau projet</span>
        </button>
      </div>
    </header>
  );
}
