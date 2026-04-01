'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Valid node types.
 */
const NODE_TYPES = new Set([
  'feature',
  'module',
  'constraint',
  'decision',
  'actor',
  'flow',
  'open_question',
]);

/**
 * Valid node statuses.
 */
const NODE_STATUSES = new Set([
  'undocumented',
  'partial',
  'documented',
  'validated',
]);

/**
 * Valid edge types.
 */
const EDGE_TYPES = new Set([
  'dependency',
  'composition',
  'conflict',
  'alternative',
  'association',
]);

/**
 * Creates a new Node object.
 *
 * @param {object} params
 * @param {string} params.label - Display label (required)
 * @param {string} [params.type] - Node type (default: 'feature')
 * @param {string} [params.status] - Node status (default: 'undocumented')
 * @param {string} [params.summary] - Short summary (1-2 sentences)
 * @param {string} [params.detail] - Detailed markdown content
 * @param {object} [params.position] - {x, y} position
 * @returns {object} Node object
 */
function createNode({
  label,
  type = 'feature',
  status = 'undocumented',
  summary = '',
  detail = '',
  position = { x: 0, y: 0 },
} = {}) {
  if (!label || typeof label !== 'string' || label.trim() === '') {
    throw new Error('Node label is required');
  }

  const resolvedType = NODE_TYPES.has(type) ? type : 'feature';
  const resolvedStatus = NODE_STATUSES.has(status) ? status : 'undocumented';

  return {
    id: uuidv4(),
    label: label.trim(),
    type: resolvedType,
    status: resolvedStatus,
    summary: summary || '',
    detail: detail || '',
    position: {
      x: (position && typeof position.x === 'number') ? position.x : 0,
      y: (position && typeof position.y === 'number') ? position.y : 0,
    },
  };
}

/**
 * Creates a new Edge object.
 *
 * @param {object} params
 * @param {string} params.source - Source node id (required)
 * @param {string} params.target - Target node id (required)
 * @param {string} [params.type] - Edge type (default: 'association')
 * @param {string} [params.label] - Optional edge label
 * @returns {object} Edge object
 */
function createEdge({
  source,
  target,
  type = 'association',
  label = '',
} = {}) {
  if (!source || !target) {
    throw new Error('Edge source and target are required');
  }

  const resolvedType = EDGE_TYPES.has(type) ? type : 'association';

  return {
    id: uuidv4(),
    source,
    target,
    type: resolvedType,
    label: label || '',
  };
}

/**
 * Applies a diff object to a tree, returning a new (mutated copy) tree.
 *
 * Diff shape:
 * {
 *   addNodes: [...nodes],
 *   updateNodes: [...partial node objects with id],
 *   removeNodeIds: [...ids],
 *   addEdges: [...edges],
 *   removeEdgeIds: [...ids],
 * }
 *
 * @param {object} tree - Current tree { nodes: [], edges: [] }
 * @param {object} diff - Diff object
 * @returns {object} New tree after applying the diff
 */
function applyTreeDiff(tree, diff) {
  if (!tree || !diff) {
    throw new Error('tree and diff are required');
  }

  // Work on copies to avoid mutation
  let nodes = [...(tree.nodes || [])];
  let edges = [...(tree.edges || [])];

  // 1. Remove nodes
  const removeNodeIds = new Set(diff.removeNodeIds || []);
  if (removeNodeIds.size > 0) {
    nodes = nodes.filter((n) => !removeNodeIds.has(n.id));
    // Also remove any edges connected to removed nodes
    edges = edges.filter(
      (e) => !removeNodeIds.has(e.source) && !removeNodeIds.has(e.target)
    );
  }

  // 2. Update existing nodes
  const updateNodes = diff.updateNodes || [];
  if (updateNodes.length > 0) {
    const updateMap = new Map(updateNodes.map((n) => [n.id, n]));
    nodes = nodes.map((node) => {
      if (updateMap.has(node.id)) {
        const updates = updateMap.get(node.id);
        return { ...node, ...updates };
      }
      return node;
    });
  }

  // 3. Add new nodes
  const addNodes = diff.addNodes || [];
  if (addNodes.length > 0) {
    // Assign ids if missing
    const newNodes = addNodes.map((n) => ({
      id: n.id || uuidv4(),
      label: n.label || '',
      type: NODE_TYPES.has(n.type) ? n.type : 'feature',
      status: NODE_STATUSES.has(n.status) ? n.status : 'undocumented',
      summary: n.summary || '',
      detail: n.detail || '',
      position: {
        x: (n.position && typeof n.position.x === 'number') ? n.position.x : 0,
        y: (n.position && typeof n.position.y === 'number') ? n.position.y : 0,
      },
    }));
    nodes = [...nodes, ...newNodes];
  }

  // 4. Remove edges
  const removeEdgeIds = new Set(diff.removeEdgeIds || []);
  if (removeEdgeIds.size > 0) {
    edges = edges.filter((e) => !removeEdgeIds.has(e.id));
  }

  // 5. Add new edges
  const addEdges = diff.addEdges || [];
  if (addEdges.length > 0) {
    const newEdges = addEdges.map((e) => ({
      id: e.id || uuidv4(),
      source: e.source,
      target: e.target,
      type: EDGE_TYPES.has(e.type) ? e.type : 'association',
      label: e.label || '',
    }));
    edges = [...edges, ...newEdges];
  }

  return { nodes, edges };
}

/**
 * Applies a diff object to the docs, returning a new docs object.
 *
 * Diff shape:
 * {
 *   summary: string | null,          // null = unchanged
 *   addBacklogItems: [...],
 *   updateBacklogItems: [...partial with id],
 *   removeBacklogItemIds: [...ids],
 *   addDecisions: [...],
 *   removeDecisionIds: [...ids],
 * }
 *
 * @param {object} docs - Current docs { summary, backlog, decisions }
 * @param {object} diff - Docs diff object
 * @returns {object} New docs after applying the diff
 */
function applyDocsDiff(docs, diff) {
  if (!docs || !diff) {
    throw new Error('docs and diff are required');
  }

  let { summary, backlog, decisions } = {
    summary: docs.summary || '',
    backlog: [...(docs.backlog || [])],
    decisions: [...(docs.decisions || [])],
  };

  // Summary — only replace if explicitly provided (non-null)
  if (diff.summary != null) {
    summary = diff.summary;
  }

  // Backlog — remove, then update, then add
  const removeBacklogIds = new Set(diff.removeBacklogItemIds || []);
  backlog = backlog.filter((i) => !removeBacklogIds.has(i.id));

  const updateBacklogMap = new Map((diff.updateBacklogItems || []).map((i) => [i.id, i]));
  backlog = backlog.map((i) =>
    updateBacklogMap.has(i.id) ? { ...i, ...updateBacklogMap.get(i.id) } : i
  );

  backlog = [...backlog, ...(diff.addBacklogItems || [])];

  // Decisions — remove, then add
  const removeDecisionIds = new Set(diff.removeDecisionIds || []);
  decisions = decisions.filter((d) => !removeDecisionIds.has(d.id));
  decisions = [...decisions, ...(diff.addDecisions || [])];

  return { summary, backlog, decisions };
}

module.exports = {
  createNode,
  createEdge,
  applyTreeDiff,
  applyDocsDiff,
  NODE_TYPES,
  NODE_STATUSES,
  EDGE_TYPES,
};
