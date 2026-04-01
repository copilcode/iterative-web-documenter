import React from 'react';

export default function ProjectCard({ project, onClick, onDelete }) {
  const completion = project.completion || 0;
  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString('fr-FR')
    : '';

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(project.id);
  };

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 cursor-pointer hover:border-indigo-500 hover:bg-gray-750 transition-all group"
      onClick={onClick}
      data-testid="project-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <button
          onClick={handleDeleteClick}
          className="ml-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none shrink-0"
          aria-label="Delete project"
        >
          &times;
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{project.nodeCount || 0} nœuds</span>
        <span>{createdDate}</span>
      </div>

      {/* Completion bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Complétude</span>
          <span>{completion}%</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>
    </div>
  );
}
