'use strict';

const { buildAnalyzePrompt } = require('../src/prompts/analyze');
const { buildQuestionPrompt } = require('../src/prompts/question');
const { buildEnrichPrompt } = require('../src/prompts/enrich');
const { createProject } = require('../src/models/project');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProjectWithTree() {
  const project = createProject({ name: 'Tree Project', description: 'A project with nodes' });
  project.rawText = 'Build a web app with auth and payments';
  project.tree = {
    nodes: [
      { id: 'n1', label: 'Auth', type: 'feature', status: 'undocumented', summary: '', detail: '', position: { x: 0, y: 0 } },
      { id: 'n2', label: 'Payments', type: 'feature', status: 'partial', summary: 'Handle payments', detail: '', position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'dependency', label: '' },
    ],
  };
  project.answers = [
    { questionId: 'q1', question: 'What auth method?', answer: 'OAuth2', timestamp: new Date().toISOString() },
  ];
  project.pendingQuestions = [];
  return project;
}

// ---------------------------------------------------------------------------
// buildAnalyzePrompt
// ---------------------------------------------------------------------------
describe('buildAnalyzePrompt', () => {
  const rawText = 'Build a SaaS platform for managing invoices with multi-tenant support.';

  it('returns an array of messages', () => {
    const messages = buildAnalyzePrompt(rawText);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });

  it('all messages have role and content fields', () => {
    const messages = buildAnalyzePrompt(rawText);
    messages.forEach((msg) => {
      expect(msg).toHaveProperty('role');
      expect(msg).toHaveProperty('content');
      expect(typeof msg.content).toBe('string');
    });
  });

  it('contains the raw text in one of the messages', () => {
    const messages = buildAnalyzePrompt(rawText);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain(rawText);
  });

  it('mentions JSON in the prompt (structured output requirement)', () => {
    const messages = buildAnalyzePrompt(rawText);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent.toLowerCase()).toContain('json');
  });

  it('mentions treeDiff in the prompt schema', () => {
    const messages = buildAnalyzePrompt(rawText);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('treeDiff');
  });

  it('mentions docs in the prompt schema', () => {
    const messages = buildAnalyzePrompt(rawText);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('docs');
  });

  it('mentions question in the prompt schema', () => {
    const messages = buildAnalyzePrompt(rawText);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('question');
  });

  it('mentions node types', () => {
    const messages = buildAnalyzePrompt(rawText);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('feature');
    expect(allContent).toContain('module');
  });

  it('handles different raw text inputs', () => {
    const otherText = 'A mobile app for tracking fitness goals';
    const messages = buildAnalyzePrompt(otherText);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain(otherText);
  });
});

// ---------------------------------------------------------------------------
// buildQuestionPrompt
// ---------------------------------------------------------------------------
describe('buildQuestionPrompt', () => {
  it('returns an array of messages', () => {
    const project = makeProjectWithTree();
    const messages = buildQuestionPrompt(project);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });

  it('all messages have role and content fields', () => {
    const project = makeProjectWithTree();
    const messages = buildQuestionPrompt(project);
    messages.forEach((msg) => {
      expect(msg).toHaveProperty('role');
      expect(msg).toHaveProperty('content');
    });
  });

  it('contains the project name', () => {
    const project = makeProjectWithTree();
    const messages = buildQuestionPrompt(project);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain(project.name);
  });

  it('mentions JSON in the prompt', () => {
    const project = makeProjectWithTree();
    const messages = buildQuestionPrompt(project);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent.toLowerCase()).toContain('json');
  });

  it('includes node labels from the tree', () => {
    const project = makeProjectWithTree();
    const messages = buildQuestionPrompt(project);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('Auth');
    expect(allContent).toContain('Payments');
  });

  it('includes answer history', () => {
    const project = makeProjectWithTree();
    const messages = buildQuestionPrompt(project);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('OAuth2');
  });

  it('works with an empty project (no tree, no answers)', () => {
    const project = createProject({ name: 'Empty Project' });
    const messages = buildQuestionPrompt(project);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// buildEnrichPrompt
// ---------------------------------------------------------------------------
describe('buildEnrichPrompt', () => {
  const questionId = 'q-test-id';
  const question = 'What database technology will you use?';
  const answer = 'We will use PostgreSQL for primary storage and Redis for caching.';

  it('returns an array of messages', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });

  it('all messages have role and content fields', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    messages.forEach((msg) => {
      expect(msg).toHaveProperty('role');
      expect(msg).toHaveProperty('content');
    });
  });

  it('contains the question text', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain(question);
  });

  it('contains the answer text', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain(answer);
  });

  it('contains the question id', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain(questionId);
  });

  it('mentions JSON in the prompt', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent.toLowerCase()).toContain('json');
  });

  it('mentions treeDiff in the schema', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('treeDiff');
  });

  it('mentions docsDiff in the schema', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('docsDiff');
  });

  it('mentions nextQuestion in the schema', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain('nextQuestion');
  });

  it('includes the project name', () => {
    const project = makeProjectWithTree();
    const messages = buildEnrichPrompt(project, questionId, question, answer);
    const allContent = messages.map((m) => m.content).join('\n');
    expect(allContent).toContain(project.name);
  });
});
