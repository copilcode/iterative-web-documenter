import React from 'react';

export default function MainLayout({ leftPanel, rightPanel }) {
  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Left: Knowledge Tree */}
      <div className="flex-1 min-w-0 h-full">
        {leftPanel}
      </div>

      {/* Right: Panel */}
      <div className="w-96 shrink-0 h-full flex flex-col">
        {rightPanel}
      </div>
    </div>
  );
}
