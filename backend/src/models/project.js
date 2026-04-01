'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Valid node statuses for computing completion.
 */
const DOCUMENTED_STATUSES = new Set(['documented', 'validated']);

/**
 * Creates a new Project object with all default fields.
 *
 * @param {object} params
 * @param {string} params.name - Project name (required)
 * @param {string} [params.description] - Short description (optional)
 * @returns {object} Full project object
 */
function createProject({ name, description = '' }) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('Project name is required');
  }

  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: name.trim(),
    description: description ? description.trim() : '',
    rawText: '',
    createdAt: now,
    updatedAt: now,
    tree: {
      nodes: [],
      edges: [],
    },
    docs: {
      summary: '',
      backlog: [],
      decisions: [],
    },
    answers: [],
    pendingQuestions: [],
    deferredQuestionIds: [],
  };
}

/**
 * Computes the documentation completion percentage for a project.
 * Based on the ratio of documented/validated nodes to total nodes.
 *
 * @param {object} project - Full project object
 * @returns {number} Completion percentage (0-100)
 */
function computeCompletion(project) {
  const nodes = project.tree && project.tree.nodes ? project.tree.nodes : [];

  if (nodes.length === 0) {
    return 0;
  }

  const documentedCount = nodes.filter(
    (node) => DOCUMENTED_STATUSES.has(node.status)
  ).length;

  return Math.round((documentedCount / nodes.length) * 100);
}

/**
 * Returns the summary shape of a project (used in GET /projects list).
 *
 * @param {object} project - Full project object
 * @returns {object} Summary object
 */
function toSummary(project) {
  const nodeCount = project.tree && project.tree.nodes
    ? project.tree.nodes.length
    : 0;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    nodeCount,
    completion: computeCompletion(project),
  };
}

module.exports = {
  createProject,
  computeCompletion,
  toSummary,
};
