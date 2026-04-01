'use strict';

const {
  createProject,
  toSummary,
  computeCompletion,
} = require('../src/models/project');

const {
  createNode,
  createEdge,
  applyTreeDiff,
  applyDocsDiff,
} = require('../src/models/tree');

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------
describe('createProject', () => {
  it('creates a project with all required fields', () => {
    const project = createProject({ name: 'My Project', description: 'A test project' });

    expect(project).toMatchObject({
      name: 'My Project',
      description: 'A test project',
      rawText: '',
      answers: [],
      pendingQuestions: [],
      deferredQuestionIds: [],
    });
    expect(project.id).toBeTruthy();
    expect(project.createdAt).toBeTruthy();
    expect(project.updatedAt).toBeTruthy();
    expect(project.tree).toEqual({ nodes: [], edges: [] });
    expect(project.docs).toEqual({
      summary: '',
      backlog: [],
      decisions: [],
    });
  });

  it('creates a project with no description', () => {
    const project = createProject({ name: 'Minimal' });
    expect(project.description).toBe('');
    expect(project.name).toBe('Minimal');
  });

  it('trims whitespace from name and description', () => {
    const project = createProject({ name: '  Trimmed  ', description: '  Also trimmed  ' });
    expect(project.name).toBe('Trimmed');
    expect(project.description).toBe('Also trimmed');
  });

  it('generates unique ids for each project', () => {
    const p1 = createProject({ name: 'A' });
    const p2 = createProject({ name: 'B' });
    expect(p1.id).not.toBe(p2.id);
  });

  it('throws if name is missing', () => {
    expect(() => createProject({})).toThrow();
  });

  it('throws if name is empty string', () => {
    expect(() => createProject({ name: '   ' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// toSummary
// ---------------------------------------------------------------------------
describe('toSummary', () => {
  it('returns the summary shape with correct fields', () => {
    const project = createProject({ name: 'Summary Test', description: 'desc' });
    const summary = toSummary(project);

    expect(summary).toMatchObject({
      id: project.id,
      name: 'Summary Test',
      description: 'desc',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      nodeCount: 0,
      completion: 0,
    });
  });

  it('returns correct nodeCount when tree has nodes', () => {
    const project = createProject({ name: 'Nodes Test' });
    project.tree.nodes = [
      { id: '1', status: 'undocumented' },
      { id: '2', status: 'documented' },
    ];
    const summary = toSummary(project);
    expect(summary.nodeCount).toBe(2);
  });

  it('does not include rawText, tree, docs, answers, or pendingQuestions', () => {
    const project = createProject({ name: 'No Extra Fields' });
    const summary = toSummary(project);
    expect(summary.rawText).toBeUndefined();
    expect(summary.tree).toBeUndefined();
    expect(summary.docs).toBeUndefined();
    expect(summary.answers).toBeUndefined();
    expect(summary.pendingQuestions).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// computeCompletion
// ---------------------------------------------------------------------------
describe('computeCompletion', () => {
  it('returns 0 when there are no nodes', () => {
    const project = createProject({ name: 'Empty' });
    expect(computeCompletion(project)).toBe(0);
  });

  it('returns 0 when all nodes are undocumented', () => {
    const project = createProject({ name: 'All Undoc' });
    project.tree.nodes = [
      { id: '1', status: 'undocumented' },
      { id: '2', status: 'undocumented' },
    ];
    expect(computeCompletion(project)).toBe(0);
  });

  it('returns 100 when all nodes are documented', () => {
    const project = createProject({ name: 'All Doc' });
    project.tree.nodes = [
      { id: '1', status: 'documented' },
      { id: '2', status: 'validated' },
    ];
    expect(computeCompletion(project)).toBe(100);
  });

  it('returns 50 when half the nodes are documented', () => {
    const project = createProject({ name: 'Half Doc' });
    project.tree.nodes = [
      { id: '1', status: 'documented' },
      { id: '2', status: 'undocumented' },
    ];
    expect(computeCompletion(project)).toBe(50);
  });

  it('counts "validated" as documented', () => {
    const project = createProject({ name: 'Validated' });
    project.tree.nodes = [
      { id: '1', status: 'validated' },
      { id: '2', status: 'partial' },
      { id: '3', status: 'undocumented' },
    ];
    // 1/3 ≈ 33%
    expect(computeCompletion(project)).toBe(33);
  });

  it('does not count "partial" as documented', () => {
    const project = createProject({ name: 'Partial' });
    project.tree.nodes = [
      { id: '1', status: 'partial' },
    ];
    expect(computeCompletion(project)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createNode
// ---------------------------------------------------------------------------
describe('createNode', () => {
  it('creates a node with default fields', () => {
    const node = createNode({ label: 'Auth Module' });

    expect(node.id).toBeTruthy();
    expect(node.label).toBe('Auth Module');
    expect(node.type).toBe('feature');
    expect(node.status).toBe('undocumented');
    expect(node.summary).toBe('');
    expect(node.detail).toBe('');
    expect(node.position).toEqual({ x: 0, y: 0 });
  });

  it('creates a node with provided fields', () => {
    const node = createNode({
      label: 'Database',
      type: 'module',
      status: 'partial',
      summary: 'Stores data',
      detail: '## Detail\nMore info',
      position: { x: 200, y: 100 },
    });

    expect(node.label).toBe('Database');
    expect(node.type).toBe('module');
    expect(node.status).toBe('partial');
    expect(node.summary).toBe('Stores data');
    expect(node.detail).toBe('## Detail\nMore info');
    expect(node.position).toEqual({ x: 200, y: 100 });
  });

  it('generates unique ids', () => {
    const n1 = createNode({ label: 'A' });
    const n2 = createNode({ label: 'B' });
    expect(n1.id).not.toBe(n2.id);
  });

  it('throws if label is missing', () => {
    expect(() => createNode({})).toThrow();
  });

  it('defaults invalid type to feature', () => {
    const node = createNode({ label: 'X', type: 'not_a_real_type' });
    expect(node.type).toBe('feature');
  });

  it('defaults invalid status to undocumented', () => {
    const node = createNode({ label: 'X', status: 'not_a_real_status' });
    expect(node.status).toBe('undocumented');
  });

  it('accepts all valid node types', () => {
    const validTypes = ['feature', 'module', 'constraint', 'decision', 'actor', 'flow', 'open_question'];
    validTypes.forEach((type) => {
      const node = createNode({ label: 'T', type });
      expect(node.type).toBe(type);
    });
  });
});

// ---------------------------------------------------------------------------
// createEdge
// ---------------------------------------------------------------------------
describe('createEdge', () => {
  it('creates an edge with default fields', () => {
    const edge = createEdge({ source: 'node-1', target: 'node-2' });

    expect(edge.id).toBeTruthy();
    expect(edge.source).toBe('node-1');
    expect(edge.target).toBe('node-2');
    expect(edge.type).toBe('association');
    expect(edge.label).toBe('');
  });

  it('creates an edge with all fields', () => {
    const edge = createEdge({
      source: 'node-a',
      target: 'node-b',
      type: 'dependency',
      label: 'depends on',
    });

    expect(edge.source).toBe('node-a');
    expect(edge.target).toBe('node-b');
    expect(edge.type).toBe('dependency');
    expect(edge.label).toBe('depends on');
  });

  it('generates unique ids', () => {
    const e1 = createEdge({ source: 'a', target: 'b' });
    const e2 = createEdge({ source: 'c', target: 'd' });
    expect(e1.id).not.toBe(e2.id);
  });

  it('throws if source is missing', () => {
    expect(() => createEdge({ target: 'b' })).toThrow();
  });

  it('throws if target is missing', () => {
    expect(() => createEdge({ source: 'a' })).toThrow();
  });

  it('accepts all valid edge types', () => {
    const validTypes = ['dependency', 'composition', 'conflict', 'alternative', 'association'];
    validTypes.forEach((type) => {
      const edge = createEdge({ source: 'a', target: 'b', type });
      expect(edge.type).toBe(type);
    });
  });
});

// ---------------------------------------------------------------------------
// applyTreeDiff
// ---------------------------------------------------------------------------
describe('applyTreeDiff', () => {
  const baseTree = {
    nodes: [
      { id: 'n1', label: 'Node 1', type: 'feature', status: 'undocumented', summary: '', detail: '', position: { x: 0, y: 0 } },
      { id: 'n2', label: 'Node 2', type: 'module', status: 'undocumented', summary: '', detail: '', position: { x: 0, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'dependency', label: '' },
    ],
  };

  it('returns a new tree without mutating the original', () => {
    const diff = { addNodes: [], updateNodes: [], removeNodeIds: [], addEdges: [], removeEdgeIds: [] };
    const result = applyTreeDiff(baseTree, diff);
    expect(result).not.toBe(baseTree);
    expect(result.nodes).not.toBe(baseTree.nodes);
  });

  it('adds new nodes', () => {
    const diff = {
      addNodes: [{ id: 'n3', label: 'Node 3', type: 'actor', status: 'undocumented', summary: '', detail: '', position: { x: 200, y: 0 } }],
      updateNodes: [],
      removeNodeIds: [],
      addEdges: [],
      removeEdgeIds: [],
    };
    const result = applyTreeDiff(baseTree, diff);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.find((n) => n.id === 'n3')).toBeTruthy();
  });

  it('updates existing nodes', () => {
    const diff = {
      addNodes: [],
      updateNodes: [{ id: 'n1', status: 'documented', summary: 'Updated summary' }],
      removeNodeIds: [],
      addEdges: [],
      removeEdgeIds: [],
    };
    const result = applyTreeDiff(baseTree, diff);
    const updatedNode = result.nodes.find((n) => n.id === 'n1');
    expect(updatedNode.status).toBe('documented');
    expect(updatedNode.summary).toBe('Updated summary');
    expect(updatedNode.label).toBe('Node 1'); // unchanged
  });

  it('removes nodes by id', () => {
    const diff = {
      addNodes: [],
      updateNodes: [],
      removeNodeIds: ['n2'],
      addEdges: [],
      removeEdgeIds: [],
    };
    const result = applyTreeDiff(baseTree, diff);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes.find((n) => n.id === 'n2')).toBeUndefined();
  });

  it('removes edges connected to removed nodes', () => {
    const diff = {
      addNodes: [],
      updateNodes: [],
      removeNodeIds: ['n1'],
      addEdges: [],
      removeEdgeIds: [],
    };
    const result = applyTreeDiff(baseTree, diff);
    // Edge e1 has n1 as source, so it should be removed too
    expect(result.edges).toHaveLength(0);
  });

  it('adds new edges', () => {
    const diff = {
      addNodes: [],
      updateNodes: [],
      removeNodeIds: [],
      addEdges: [{ id: 'e2', source: 'n1', target: 'n2', type: 'composition', label: 'part of' }],
      removeEdgeIds: [],
    };
    const result = applyTreeDiff(baseTree, diff);
    expect(result.edges).toHaveLength(2);
    expect(result.edges.find((e) => e.id === 'e2')).toBeTruthy();
  });

  it('removes edges by id', () => {
    const diff = {
      addNodes: [],
      updateNodes: [],
      removeNodeIds: [],
      addEdges: [],
      removeEdgeIds: ['e1'],
    };
    const result = applyTreeDiff(baseTree, diff);
    expect(result.edges).toHaveLength(0);
  });

  it('assigns ids to addNodes entries that lack ids', () => {
    const diff = {
      addNodes: [{ label: 'No ID Node', type: 'feature', status: 'undocumented', summary: '', detail: '', position: { x: 0, y: 0 } }],
      updateNodes: [],
      removeNodeIds: [],
      addEdges: [],
      removeEdgeIds: [],
    };
    const result = applyTreeDiff(baseTree, diff);
    const newNode = result.nodes.find((n) => n.label === 'No ID Node');
    expect(newNode).toBeTruthy();
    expect(newNode.id).toBeTruthy();
  });

  it('throws if tree is not provided', () => {
    expect(() => applyTreeDiff(null, {})).toThrow();
  });

  it('throws if diff is not provided', () => {
    expect(() => applyTreeDiff(baseTree, null)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// applyDocsDiff
// ---------------------------------------------------------------------------
describe('applyDocsDiff', () => {
  const baseDocs = {
    summary: 'Initial summary',
    backlog: [
      { id: 'b1', title: 'Feature A', description: 'Desc A', domain: 'core', priority: 'high' },
    ],
    decisions: [
      { id: 'd1', title: 'Use PostgreSQL', rationale: 'Reliable', timestamp: '2026-01-01' },
    ],
  };

  it('updates summary when provided', () => {
    const result = applyDocsDiff(baseDocs, { summary: 'Updated summary' });
    expect(result.summary).toBe('Updated summary');
  });

  it('does not change summary when null', () => {
    const result = applyDocsDiff(baseDocs, { summary: null });
    expect(result.summary).toBe('Initial summary');
  });

  it('adds backlog items', () => {
    const diff = { addBacklogItems: [{ id: 'b2', title: 'Feature B', priority: 'low' }] };
    const result = applyDocsDiff(baseDocs, diff);
    expect(result.backlog).toHaveLength(2);
    expect(result.backlog[1].id).toBe('b2');
  });

  it('removes backlog items by id', () => {
    const diff = { removeBacklogItemIds: ['b1'] };
    const result = applyDocsDiff(baseDocs, diff);
    expect(result.backlog).toHaveLength(0);
  });

  it('updates existing backlog items', () => {
    const diff = { updateBacklogItems: [{ id: 'b1', priority: 'low' }] };
    const result = applyDocsDiff(baseDocs, diff);
    expect(result.backlog[0].priority).toBe('low');
    expect(result.backlog[0].title).toBe('Feature A');
  });

  it('adds decisions', () => {
    const diff = { addDecisions: [{ id: 'd2', title: 'Use Redis', rationale: 'Fast', timestamp: '2026-02-01' }] };
    const result = applyDocsDiff(baseDocs, diff);
    expect(result.decisions).toHaveLength(2);
  });

  it('removes decisions by id', () => {
    const diff = { removeDecisionIds: ['d1'] };
    const result = applyDocsDiff(baseDocs, diff);
    expect(result.decisions).toHaveLength(0);
  });

  it('does not mutate the original docs', () => {
    const original = JSON.parse(JSON.stringify(baseDocs));
    applyDocsDiff(baseDocs, { addBacklogItems: [{ id: 'b99', title: 'X' }] });
    expect(baseDocs.backlog).toHaveLength(original.backlog.length);
  });

  it('throws if docs is not provided', () => {
    expect(() => applyDocsDiff(null, {})).toThrow();
  });

  it('throws if diff is not provided', () => {
    expect(() => applyDocsDiff(baseDocs, null)).toThrow();
  });
});
