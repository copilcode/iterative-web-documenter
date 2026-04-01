'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mock the Claude service BEFORE anything else.
// jest.mock is hoisted by Jest so this runs before any require().
// ---------------------------------------------------------------------------
jest.mock('../src/services/claude', () => ({
  analyzeProject: jest.fn(),
  generateNextQuestion: jest.fn(),
  enrichTree: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Set DATA_DIR synchronously before any module that reads it is required.
// We use a fixed known path that we'll create in beforeAll.
// We create the dir synchronously here using mkdtempSync.
// ---------------------------------------------------------------------------
const tmpDir = require('os').tmpdir();
const testDataDir = require('fs').mkdtempSync(
  require('path').join(tmpDir, 'iterative-documenter-routes-')
);
process.env.DATA_DIR = testDataDir;
process.env.ANTHROPIC_API_KEY = 'test-key';

// Now it is safe to require modules that read DATA_DIR / ANTHROPIC_API_KEY
const claudeService = require('../src/services/claude');
const app = require('../src/app');

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------
afterAll(async () => {
  try {
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch (_err) {
    // ignore
  }
});

beforeEach(async () => {
  // Reset mock call history before each test
  jest.clearAllMocks();

  // Remove all project JSON files so each test starts fresh
  try {
    const files = await fs.readdir(testDataDir);
    await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map((f) => fs.unlink(path.join(testDataDir, f)))
    );
  } catch (_err) {
    // ignore
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestProject(name = 'Test Project', description = 'desc') {
  const res = await request(app)
    .post('/api/projects')
    .send({ name, description });
  expect(res.status).toBe(201);
  return res.body.data;
}

function makeMockAnalyzeResult() {
  return {
    treeDiff: {
      addNodes: [
        {
          id: 'mock-node-1',
          label: 'Auth',
          type: 'feature',
          status: 'undocumented',
          summary: 'Authentication module',
          detail: '',
          position: { x: 100, y: 100 },
        },
        {
          id: 'mock-node-2',
          label: 'Payments',
          type: 'feature',
          status: 'undocumented',
          summary: 'Payment processing',
          detail: '',
          position: { x: 300, y: 100 },
        },
      ],
      updateNodes: [],
      removeNodeIds: [],
      addEdges: [
        {
          id: 'mock-edge-1',
          source: 'mock-node-1',
          target: 'mock-node-2',
          type: 'dependency',
          label: '',
        },
      ],
      removeEdgeIds: [],
    },
    docs: {
      summary: 'A web app with auth and payments',
      backlog: [
        { id: 'bl-1', title: 'Login flow', description: 'User auth', domain: 'auth', priority: 'high' },
      ],
      decisions: [],
    },
    questions: [
      {
        id: 'mock-question-1',
        text: 'What authentication method will you use?',
        targetNodeIds: ['mock-node-1'],
        priority: 1,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function makeMockEnrichResult() {
  return {
    treeDiff: {
      addNodes: [],
      updateNodes: [
        { id: 'mock-node-1', status: 'documented', summary: 'OAuth2-based authentication' },
      ],
      removeNodeIds: [],
      addEdges: [],
      removeEdgeIds: [],
    },
    docsDiff: {
      summary: 'An app using OAuth2 auth and Stripe payments',
      addBacklogItems: [
        { id: 'bl-1', title: 'Login flow', description: 'OAuth2 login', domain: 'auth', priority: 'high' },
      ],
      updateBacklogItems: [],
      removeBacklogItemIds: [],
      addDecisions: [
        { id: 'd-1', title: 'Use OAuth2', rationale: 'User confirmed', timestamp: new Date().toISOString() },
      ],
      removeDecisionIds: [],
      addOpenQuestions: ['Which payment gateway?'],
      removeOpenQuestions: [],
    },
    nextQuestion: {
      id: 'mock-question-2',
      text: 'Will you use Stripe or PayPal for payments?',
      targetNodeIds: ['mock-node-2'],
      priority: 1,
      createdAt: new Date().toISOString(),
    },
  };
}

function makeMockNextQuestion() {
  return {
    id: 'mock-next-question',
    text: 'What is the expected user load?',
    targetNodeIds: [],
    priority: 2,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// POST /api/projects — create project
// ---------------------------------------------------------------------------
describe('POST /api/projects', () => {
  it('creates a project and returns 201 with the project shape', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'My New Project', description: 'A description' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    const project = res.body.data;
    expect(project.name).toBe('My New Project');
    expect(project.description).toBe('A description');
    expect(project.id).toBeTruthy();
    expect(project.createdAt).toBeTruthy();
    expect(project.tree).toEqual({ nodes: [], edges: [] });
    expect(project.docs).toBeDefined();
    expect(project.answers).toEqual([]);
    expect(project.pendingQuestions).toEqual([]);
  });

  it('creates a project without description', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'No Desc' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('No Desc');
  });

  it('returns 400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ description: 'No name here' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 if name is empty string', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 if body is empty', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects — list projects
// ---------------------------------------------------------------------------
describe('GET /api/projects', () => {
  it('returns 200 with an empty array when no projects exist', async () => {
    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns 200 with summaries of all projects', async () => {
    await createTestProject('Project A');
    await createTestProject('Project B');

    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const names = res.body.data.map((p) => p.name);
    expect(names).toContain('Project A');
    expect(names).toContain('Project B');
  });

  it('returns summary shape (no rawText, tree, docs, answers)', async () => {
    await createTestProject('Summary Shape Test');
    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    const summary = res.body.data[0];
    expect(summary).toHaveProperty('id');
    expect(summary).toHaveProperty('name');
    expect(summary).toHaveProperty('nodeCount');
    expect(summary).toHaveProperty('completion');
    expect(summary.rawText).toBeUndefined();
    expect(summary.tree).toBeUndefined();
    expect(summary.docs).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id — get full project
// ---------------------------------------------------------------------------
describe('GET /api/projects/:id', () => {
  it('returns 200 with full project shape for existing project', async () => {
    const created = await createTestProject('Full Shape Test');

    const res = await request(app).get(`/api/projects/${created.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: created.id,
      name: 'Full Shape Test',
      tree: { nodes: [], edges: [] },
      answers: [],
      pendingQuestions: [],
    });
    expect(res.body.data).toHaveProperty('rawText');
    expect(res.body.data).toHaveProperty('docs');
  });

  it('returns 404 for non-existent project id', async () => {
    const res = await request(app).get('/api/projects/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id — delete project
// ---------------------------------------------------------------------------
describe('DELETE /api/projects/:id', () => {
  it('returns 200 on successful deletion', async () => {
    const project = await createTestProject('To Delete');

    const res = await request(app).delete(`/api/projects/${project.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('project is gone after deletion', async () => {
    const project = await createTestProject('Gone Project');
    await request(app).delete(`/api/projects/${project.id}`);

    const res = await request(app).get(`/api/projects/${project.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent project id', async () => {
    const res = await request(app).delete('/api/projects/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/analyze — analyze text
// ---------------------------------------------------------------------------
describe('POST /api/projects/:id/analyze', () => {
  it('returns 200 with tree, docs, and question (mocked Claude)', async () => {
    claudeService.analyzeProject.mockResolvedValue(makeMockAnalyzeResult());

    const project = await createTestProject('Analyze Test');

    const res = await request(app)
      .post(`/api/projects/${project.id}/analyze`)
      .send({ text: 'Build a web app with auth and payments' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('tree');
    expect(res.body.data).toHaveProperty('docs');
    expect(res.body.data).toHaveProperty('pendingQuestions');
    expect(res.body.data.tree.nodes).toHaveLength(2);
    expect(res.body.data.tree.edges).toHaveLength(1);
  });

  it('persists the analyzed state to the project', async () => {
    claudeService.analyzeProject.mockResolvedValue(makeMockAnalyzeResult());

    const project = await createTestProject('Persist Test');

    await request(app)
      .post(`/api/projects/${project.id}/analyze`)
      .send({ text: 'Some project plan' });

    const getRes = await request(app).get(`/api/projects/${project.id}`);
    expect(getRes.body.data.rawText).toBe('Some project plan');
    expect(getRes.body.data.tree.nodes).toHaveLength(2);
    expect(getRes.body.data.pendingQuestions).toHaveLength(1); // 1 question in mock
  });

  it('returns 400 if text is missing', async () => {
    const project = await createTestProject('No Text');

    const res = await request(app)
      .post(`/api/projects/${project.id}/analyze`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 if text is empty string', async () => {
    const project = await createTestProject('Empty Text');

    const res = await request(app)
      .post(`/api/projects/${project.id}/analyze`)
      .send({ text: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for non-existent project id', async () => {
    const res = await request(app)
      .post('/api/projects/does-not-exist/analyze')
      .send({ text: 'Some text' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('calls claudeService.analyzeProject with the raw text', async () => {
    claudeService.analyzeProject.mockResolvedValue(makeMockAnalyzeResult());

    const project = await createTestProject('Call Check');
    const rawText = 'Build an invoice management SaaS';

    await request(app)
      .post(`/api/projects/${project.id}/analyze`)
      .send({ text: rawText });

    expect(claudeService.analyzeProject).toHaveBeenCalledWith(rawText);
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/answer — submit answer
// ---------------------------------------------------------------------------
describe('POST /api/projects/:id/answer', () => {
  async function setupAnalyzedProject() {
    claudeService.analyzeProject.mockResolvedValue(makeMockAnalyzeResult());

    const project = await createTestProject('Answer Test');
    await request(app)
      .post(`/api/projects/${project.id}/analyze`)
      .send({ text: 'Build an app' });

    return project;
  }

  it('returns 200 with updated tree, docs, nextQuestion, and answer record', async () => {
    claudeService.enrichTree.mockResolvedValue(makeMockEnrichResult());

    const project = await setupAnalyzedProject();

    const res = await request(app)
      .post(`/api/projects/${project.id}/answer`)
      .send({
        questionId: 'mock-question-1',
        question: 'What auth method?',
        answer: 'We will use OAuth2',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('tree');
    expect(res.body.data).toHaveProperty('docs');
    expect(res.body.data).toHaveProperty('nextQuestion');
    expect(res.body.data).toHaveProperty('answer');
  });

  it('persists the answer to project.answers', async () => {
    claudeService.enrichTree.mockResolvedValue(makeMockEnrichResult());

    const project = await setupAnalyzedProject();

    await request(app)
      .post(`/api/projects/${project.id}/answer`)
      .send({
        questionId: 'mock-question-1',
        question: 'What auth method?',
        answer: 'OAuth2',
      });

    const getRes = await request(app).get(`/api/projects/${project.id}`);
    expect(getRes.body.data.answers).toHaveLength(1);
    expect(getRes.body.data.answers[0].answer).toBe('OAuth2');
  });

  it('applies treeDiff to the existing tree', async () => {
    claudeService.enrichTree.mockResolvedValue(makeMockEnrichResult());

    const project = await setupAnalyzedProject();

    const res = await request(app)
      .post(`/api/projects/${project.id}/answer`)
      .send({
        questionId: 'mock-question-1',
        question: 'What auth method?',
        answer: 'OAuth2',
      });

    // The updateNodes should have updated mock-node-1 status to documented
    const updatedNode = res.body.data.tree.nodes.find((n) => n.id === 'mock-node-1');
    expect(updatedNode).toBeTruthy();
    expect(updatedNode.status).toBe('documented');
  });

  it('returns 400 if questionId is missing', async () => {
    const project = await createTestProject('Missing QID');

    const res = await request(app)
      .post(`/api/projects/${project.id}/answer`)
      .send({ question: 'Q?', answer: 'A' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 if question is missing', async () => {
    const project = await createTestProject('Missing Q');

    const res = await request(app)
      .post(`/api/projects/${project.id}/answer`)
      .send({ questionId: 'q1', answer: 'A' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 if answer is missing', async () => {
    const project = await createTestProject('Missing A');

    const res = await request(app)
      .post(`/api/projects/${project.id}/answer`)
      .send({ questionId: 'q1', question: 'Q?' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for non-existent project id', async () => {
    const res = await request(app)
      .post('/api/projects/does-not-exist/answer')
      .send({ questionId: 'q1', question: 'Q?', answer: 'A' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/tree
// ---------------------------------------------------------------------------
describe('GET /api/projects/:id/tree', () => {
  it('returns 200 with tree shape for an existing project', async () => {
    const project = await createTestProject('Tree Test');

    const res = await request(app).get(`/api/projects/${project.id}/tree`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('nodes');
    expect(res.body.data).toHaveProperty('edges');
    expect(Array.isArray(res.body.data.nodes)).toBe(true);
    expect(Array.isArray(res.body.data.edges)).toBe(true);
  });

  it('returns the tree with nodes after analysis', async () => {
    claudeService.analyzeProject.mockResolvedValue(makeMockAnalyzeResult());

    const project = await createTestProject('Tree After Analyze');
    await request(app)
      .post(`/api/projects/${project.id}/analyze`)
      .send({ text: 'Some project' });

    const res = await request(app).get(`/api/projects/${project.id}/tree`);
    expect(res.status).toBe(200);
    expect(res.body.data.nodes).toHaveLength(2);
  });

  it('returns 404 for non-existent project id', async () => {
    const res = await request(app).get('/api/projects/does-not-exist/tree');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/docs
// ---------------------------------------------------------------------------
describe('GET /api/projects/:id/docs', () => {
  it('returns 200 with docs shape for an existing project', async () => {
    const project = await createTestProject('Docs Test');

    const res = await request(app).get(`/api/projects/${project.id}/docs`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('backlog');
    expect(res.body.data).toHaveProperty('decisions');
  });

  it('returns the updated docs after analysis', async () => {
    claudeService.analyzeProject.mockResolvedValue(makeMockAnalyzeResult());

    const project = await createTestProject('Docs After Analyze');
    await request(app)
      .post(`/api/projects/${project.id}/analyze`)
      .send({ text: 'A project plan' });

    const res = await request(app).get(`/api/projects/${project.id}/docs`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe('A web app with auth and payments');
    expect(res.body.data.backlog).toHaveLength(1);
  });

  it('returns 404 for non-existent project id', async () => {
    const res = await request(app).get('/api/projects/does-not-exist/docs');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/questions/next
// ---------------------------------------------------------------------------
describe('POST /api/projects/:id/questions/next', () => {
  it('returns 200 with the next question (mocked)', async () => {
    claudeService.generateNextQuestion.mockResolvedValue(makeMockNextQuestion());

    const project = await createTestProject('Next Q Test');

    const res = await request(app).post(`/api/projects/${project.id}/questions/next`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('question');
    expect(res.body.data.question.text).toBe('What is the expected user load?');
  });

  it('adds the new question to pendingQuestions', async () => {
    claudeService.generateNextQuestion.mockResolvedValue(makeMockNextQuestion());

    const project = await createTestProject('Add Pending Q');

    await request(app).post(`/api/projects/${project.id}/questions/next`);

    const getRes = await request(app).get(`/api/projects/${project.id}`);
    expect(getRes.body.data.pendingQuestions).toHaveLength(1);
    expect(getRes.body.data.pendingQuestions[0].id).toBe('mock-next-question');
  });

  it('returns 404 for non-existent project id', async () => {
    const res = await request(app).post('/api/projects/does-not-exist/questions/next');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
