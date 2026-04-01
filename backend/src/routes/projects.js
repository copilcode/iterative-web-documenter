'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createProject, toSummary } = require('../models/project');
const { applyTreeDiff, applyDocsDiff } = require('../models/tree');
const { saveProject, loadProject, listProjects, deleteProject } = require('../persistence/store');
const claudeService = require('../services/claude');
const { toMarkdown, toJson } = require('../services/exporter');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/projects — list all projects (returns summary shape)
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const projects = await listProjects();
    const summaries = projects.map(toSummary);
    return res.status(200).json({ data: summaries });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects — create a new project
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Field "name" is required' });
    }

    const project = createProject({ name, description });
    await saveProject(project);

    return res.status(201).json({ data: project });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects/import — restore a project from a JSON backup
// ---------------------------------------------------------------------------
router.post('/import', async (req, res) => {
  try {
    const projectData = req.body;

    if (!projectData || typeof projectData !== 'object' || Array.isArray(projectData)) {
      return res.status(400).json({ error: 'Invalid project data' });
    }
    if (!projectData.name || typeof projectData.name !== 'string') {
      return res.status(400).json({ error: 'Project data must include a name' });
    }

    const now = new Date().toISOString();
    const imported = {
      ...projectData,
      id: uuidv4(),
      updatedAt: now,
      createdAt: projectData.createdAt || now,
      tree: projectData.tree || { nodes: [], edges: [] },
      docs: projectData.docs || { summary: '', backlog: [], decisions: [] },
      answers: projectData.answers || [],
      pendingQuestions: projectData.pendingQuestions || [],
      deferredQuestionIds: projectData.deferredQuestionIds || [],
    };

    await saveProject(imported);
    return res.status(201).json({ data: imported });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id — get full project state
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const project = await loadProject(req.params.id);
    return res.status(200).json({ data: project });
  } catch (err) {
    if (err.message.startsWith('Project not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id — delete a project
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    await deleteProject(req.params.id);
    return res.status(200).json({ data: { message: 'Project deleted successfully' } });
  } catch (err) {
    if (err.message.startsWith('Project not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/analyze — analyze raw text → tree + first question
// ---------------------------------------------------------------------------
router.post('/:id/analyze', async (req, res) => {
  try {
    const { text } = req.body || {};

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Field "text" is required' });
    }

    let project;
    try {
      project = await loadProject(req.params.id);
    } catch (err) {
      if (err.message.startsWith('Project not found')) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }

    const { treeDiff, docs, questions } = await claudeService.analyzeProject(text);

    // Apply tree diff to the (empty) initial tree
    project.rawText = text.trim();
    project.tree = applyTreeDiff(project.tree, treeDiff);
    project.docs = docs;
    project.pendingQuestions = questions;
    project.updatedAt = new Date().toISOString();

    await saveProject(project);

    return res.status(200).json({
      data: {
        tree: project.tree,
        docs: project.docs,
        pendingQuestions: project.pendingQuestions,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/answer — submit answer → enrich tree + next question
// ---------------------------------------------------------------------------
router.post('/:id/answer', async (req, res) => {
  const tTotal = Date.now();
  console.log(`\n[answer] ---- START ${new Date().toISOString()} ----`);
  try {
    const { questionId, question, answer } = req.body || {};

    if (!questionId || typeof questionId !== 'string' || questionId.trim() === '') {
      return res.status(400).json({ error: 'Field "questionId" is required' });
    }
    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: 'Field "question" is required' });
    }
    if (!answer || typeof answer !== 'string' || answer.trim() === '') {
      return res.status(400).json({ error: 'Field "answer" is required' });
    }

    let project;
    const t1 = Date.now();
    try {
      project = await loadProject(req.params.id);
    } catch (err) {
      if (err.message.startsWith('Project not found')) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }
    console.log(`[answer] loadProject: ${Date.now() - t1}ms | nodes=${project.tree?.nodes?.length ?? 0} edges=${project.tree?.edges?.length ?? 0} answers=${project.answers?.length ?? 0} pendingQuestions=${project.pendingQuestions?.length ?? 0}`);
    console.log(`[answer] questionId received: "${questionId}"`);
    console.log(`[answer] pendingQuestions in DB: ${JSON.stringify((project.pendingQuestions || []).map(q => ({ id: q.id, text: q.text?.slice(0, 60) })))}`);

    const t2 = Date.now();
    const { treeDiff, docsDiff, nextQuestion } = await claudeService.enrichTree(
      project,
      questionId,
      question,
      answer
    );
    console.log(`[answer] enrichTree (total w/ network): ${Date.now() - t2}ms`);

    const t3 = Date.now();
    // Record the answer
    const answerRecord = {
      questionId,
      question,
      answer,
      timestamp: new Date().toISOString(),
    };
    project.answers = [...(project.answers || []), answerRecord];

    // Apply diffs (both are differential — never full replacements)
    project.tree = applyTreeDiff(project.tree, treeDiff);
    project.docs = applyDocsDiff(project.docs, docsDiff);

    // Remove the answered question from pending, add the next one
    const beforeFilter = project.pendingQuestions || [];
    const matched = beforeFilter.filter((q) => q.id === questionId).length;
    console.log(`[answer] filter: "${questionId}" matched ${matched}/${beforeFilter.length} question(s)`);
    project.pendingQuestions = beforeFilter.filter((q) => q.id !== questionId);
    project.pendingQuestions.push(nextQuestion);

    project.updatedAt = new Date().toISOString();
    console.log(`[answer] nextQuestion.id: "${nextQuestion?.id}" text: "${nextQuestion?.text?.slice(0, 60)}"`);
    console.log(`[answer] applyDiff: ${Date.now() - t3}ms | new nodes=${project.tree?.nodes?.length ?? 0}`);

    const t4 = Date.now();
    await saveProject(project);
    console.log(`[answer] saveProject: ${Date.now() - t4}ms`);

    console.log(`[answer] ---- TOTAL: ${Date.now() - tTotal}ms ----\n`);
    return res.status(200).json({
      data: {
        tree: project.tree,
        docs: project.docs,
        nextQuestion,
        pendingQuestions: project.pendingQuestions,
        answer: answerRecord,
      },
    });
  } catch (err) {
    console.log(`[answer] ERROR after ${Date.now() - tTotal}ms: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/answers/batch — submit multiple answers at once
// ---------------------------------------------------------------------------
router.post('/:id/answers/batch', async (req, res) => {
  const tTotal = Date.now();
  try {
    const { answers } = req.body || {};

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Field "answers" must be a non-empty array' });
    }

    for (const a of answers) {
      if (!a.questionId || !a.question || !a.answer) {
        return res.status(400).json({ error: 'Each answer must have questionId, question, and answer' });
      }
    }

    let project;
    try {
      project = await loadProject(req.params.id);
    } catch (err) {
      if (err.message.startsWith('Project not found')) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }

    const { treeDiff, docsDiff } = await claudeService.enrichTreeBatch(project, answers);

    // Record all answers
    const now = new Date().toISOString();
    const answerRecords = answers.map((a) => ({
      questionId: a.questionId,
      question: a.question,
      answer: a.answer,
      timestamp: now,
    }));
    project.answers = [...(project.answers || []), ...answerRecords];

    // Apply diffs
    project.tree = applyTreeDiff(project.tree, treeDiff);
    project.docs = applyDocsDiff(project.docs, docsDiff);

    // Remove answered questions from pending and deferred lists
    const answeredIds = new Set(answers.map((a) => a.questionId));
    project.pendingQuestions = (project.pendingQuestions || []).filter((q) => !answeredIds.has(q.id));
    project.deferredQuestionIds = (project.deferredQuestionIds || []).filter((id) => !answeredIds.has(id));

    project.updatedAt = now;
    await saveProject(project);

    console.log(`[batch] ${answers.length} answers processed in ${Date.now() - tTotal}ms | nodes=${project.tree?.nodes?.length}`);

    return res.status(200).json({
      data: {
        tree: project.tree,
        docs: project.docs,
        pendingQuestions: project.pendingQuestions,
        deferredQuestionIds: project.deferredQuestionIds,
      },
    });
  } catch (err) {
    console.log(`[batch] ERROR after ${Date.now() - tTotal}ms: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/projects/:id/questions/:questionId — defer | restore | delete
// ---------------------------------------------------------------------------
router.patch('/:id/questions/:questionId', async (req, res) => {
  try {
    const { action } = req.body || {};
    if (!['defer', 'restore', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'action must be defer, restore, or delete' });
    }

    let project;
    try {
      project = await loadProject(req.params.id);
    } catch (err) {
      if (err.message.startsWith('Project not found')) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }

    const qId = req.params.questionId;

    if (action === 'defer') {
      if (!project.deferredQuestionIds.includes(qId)) {
        project.deferredQuestionIds = [...project.deferredQuestionIds, qId];
      }
    } else if (action === 'restore') {
      project.deferredQuestionIds = project.deferredQuestionIds.filter((id) => id !== qId);
    } else if (action === 'delete') {
      project.pendingQuestions = (project.pendingQuestions || []).filter((q) => q.id !== qId);
      project.deferredQuestionIds = project.deferredQuestionIds.filter((id) => id !== qId);
    }

    project.updatedAt = new Date().toISOString();
    await saveProject(project);

    return res.status(200).json({
      data: {
        pendingQuestions: project.pendingQuestions,
        deferredQuestionIds: project.deferredQuestionIds,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/tree — get knowledge tree
// ---------------------------------------------------------------------------
router.get('/:id/tree', async (req, res) => {
  try {
    const project = await loadProject(req.params.id);
    return res.status(200).json({ data: project.tree });
  } catch (err) {
    if (err.message.startsWith('Project not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/docs — get documentation outputs
// ---------------------------------------------------------------------------
router.get('/:id/docs', async (req, res) => {
  try {
    const project = await loadProject(req.params.id);
    return res.status(200).json({ data: project.docs });
  } catch (err) {
    if (err.message.startsWith('Project not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/questions/generate — generate N questions at once
// ---------------------------------------------------------------------------
router.post('/:id/questions/generate', async (req, res) => {
  try {
    const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 5, 1), 20);

    let project;
    try {
      project = await loadProject(req.params.id);
    } catch (err) {
      if (err.message.startsWith('Project not found')) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }

    const questions = await claudeService.generateQuestions(project, count);

    project.pendingQuestions = [...(project.pendingQuestions || []), ...questions];
    project.updatedAt = new Date().toISOString();
    await saveProject(project);

    return res.status(200).json({ data: { questions } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/questions/next — force-generate next question
// ---------------------------------------------------------------------------
router.post('/:id/questions/next', async (req, res) => {
  try {
    let project;
    try {
      project = await loadProject(req.params.id);
    } catch (err) {
      if (err.message.startsWith('Project not found')) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }

    const question = await claudeService.generateNextQuestion(project);

    // Add to pending questions
    project.pendingQuestions = [...(project.pendingQuestions || []), question];
    project.updatedAt = new Date().toISOString();

    await saveProject(project);

    return res.status(200).json({ data: { question } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/export?format=markdown|json
// ---------------------------------------------------------------------------
router.get('/:id/export', async (req, res) => {
  try {
    let project;
    try {
      project = await loadProject(req.params.id);
    } catch (err) {
      if (err.message.startsWith('Project not found')) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }

    const format = (req.query.format || 'markdown').toLowerCase();
    const slug = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${slug}_export.json"`);
      return res.send(JSON.stringify(toJson(project), null, 2));
    }

    // Default: markdown
    const markdown = toMarkdown(project);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}_documentation.md"`);
    return res.send(markdown);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
