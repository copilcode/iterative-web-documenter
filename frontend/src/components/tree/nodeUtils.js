export const NODE_TYPE_COLORS = {
  feature: {
    bg: 'bg-blue-900',
    border: 'border-blue-500',
    text: 'text-blue-200',
    hex: '#1e3a5f',
    borderHex: '#3b82f6',
  },
  module: {
    bg: 'bg-purple-900',
    border: 'border-purple-500',
    text: 'text-purple-200',
    hex: '#3b0764',
    borderHex: '#a855f7',
  },
  constraint: {
    bg: 'bg-red-900',
    border: 'border-red-500',
    text: 'text-red-200',
    hex: '#450a0a',
    borderHex: '#ef4444',
  },
  decision: {
    bg: 'bg-orange-900',
    border: 'border-orange-500',
    text: 'text-orange-200',
    hex: '#431407',
    borderHex: '#f97316',
  },
  actor: {
    bg: 'bg-green-900',
    border: 'border-green-500',
    text: 'text-green-200',
    hex: '#052e16',
    borderHex: '#22c55e',
  },
  flow: {
    bg: 'bg-teal-900',
    border: 'border-teal-500',
    text: 'text-teal-200',
    hex: '#042f2e',
    borderHex: '#14b8a6',
  },
  open_question: {
    bg: 'bg-yellow-900',
    border: 'border-yellow-500',
    text: 'text-yellow-200',
    hex: '#422006',
    borderHex: '#eab308',
  },
};

export const STATUS_COLORS = {
  undocumented: '#6b7280',
  partial: '#eab308',
  documented: '#3b82f6',
  validated: '#22c55e',
};

export const NODE_TYPE_ICONS = {
  feature: '★',
  module: '⬡',
  constraint: '⚠',
  decision: '◆',
  actor: '●',
  flow: '→',
  open_question: '?',
};

export function getNodeTypeConfig(type) {
  return NODE_TYPE_COLORS[type] || NODE_TYPE_COLORS.feature;
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.undocumented;
}

export function getNodeTypeIcon(type) {
  return NODE_TYPE_ICONS[type] || '●';
}
