import React from 'react';

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
      <div className="text-gray-500 text-5xl mb-4">&#9741;</div>
      <h3 className="text-gray-300 text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm mb-6 max-w-xs">{description}</p>
      )}
      {action && action}
    </div>
  );
}
