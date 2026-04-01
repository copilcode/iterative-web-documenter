import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { getNodeTypeConfig, getStatusColor, getNodeTypeIcon } from './nodeUtils.js';

export default function CustomNode({ data }) {
  const typeConfig = getNodeTypeConfig(data.type);
  const statusColor = getStatusColor(data.status);
  const icon = getNodeTypeIcon(data.type);

  const { isSelected, highlighted, dimmed } = data;

  // Base ring/glow for the selected node
  let selectionStyle = '';
  if (isSelected) {
    selectionStyle = `ring-2 ring-white ring-offset-1 ring-offset-gray-950 shadow-[0_0_16px_2px_rgba(255,255,255,0.25)]`;
  } else if (highlighted) {
    selectionStyle = `ring-1 ring-white/40`;
  }

  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 min-w-[120px] max-w-[180px] cursor-pointer
        transition-all duration-150
        ${typeConfig.bg} ${typeConfig.border} ${typeConfig.text}
        ${selectionStyle}
        ${isSelected   ? 'scale-105' : ''}
        ${dimmed       ? 'opacity-20 saturate-0' : 'opacity-100'}
        ${!isSelected && !dimmed ? 'hover:brightness-110' : ''}
      `}
      data-testid="custom-node"
      data-type={data.type}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-500 !w-2 !h-2 !border-0"
      />

      <div className="flex items-center gap-2">
        <span className="text-xs opacity-70 shrink-0" aria-label={`type: ${data.type}`}>
          {icon}
        </span>
        <span className="text-xs font-medium leading-tight truncate flex-1">
          {data.label}
        </span>
        <span
          className="w-2 h-2 rounded-full shrink-0 transition-colors"
          style={{ backgroundColor: statusColor }}
          title={data.status}
          aria-label={`status: ${data.status}`}
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-500 !w-2 !h-2 !border-0"
      />
    </div>
  );
}
