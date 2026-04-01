'use strict';

const MAX_HISTORY = 5;

/**
 * Builds a compact representation of the tree for the prompt.
 * Drops `detail` (can be long markdown) — keeps id, label, type, status, summary.
 */
function compactTree(tree) {
  return {
    nodes: (tree.nodes || []).map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      status: n.status,
      summary: n.summary,
    })),
    edges: (tree.edges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
    })),
  };
}

/**
 * Builds a compact representation of docs for the prompt.
 * Backlog and decisions show only id + title (no full description/rationale).
 */
function compactDocs(docs) {
  return {
    summary: docs.summary || '',
    backlog: (docs.backlog || []).map((i) => ({
      id: i.id,
      title: i.title,
      domain: i.domain,
      priority: i.priority,
    })),
    decisions: (docs.decisions || []).map((d) => ({
      id: d.id,
      title: d.title,
    })),
  };
}

/**
 * Builds the messages array for the ENRICH_TREE Claude call.
 *
 * Sends a compact view of the tree and docs (no detail text, no rawText,
 * last 5 answers only) and asks Claude to return only DIFFS, not full objects.
 *
 * @param {object} project - Full project object
 * @param {string} questionId - ID of the answered question
 * @param {string} question - Text of the question that was answered
 * @param {string} answer - The user's answer
 * @returns {Array<object>} Messages array for the Claude API
 */
function buildEnrichPrompt(project, questionId, question, answer) {
  const tree = compactTree(project.tree || { nodes: [], edges: [] });
  const docs = compactDocs(project.docs || {});

  // Only the last N answers to keep the prompt small
  const recentAnswers = (project.answers || [])
    .slice(-MAX_HISTORY)
    .map((a) => ({ question: a.question, answer: a.answer }));

  const content = `You are an expert software architect enriching a project knowledge tree.

A user just answered a clarification question. Update the project state based on their answer.

You MUST return a single valid JSON object — no markdown, no explanation, no code fences.

The JSON must conform to this schema:
{
  "treeDiff": {
    "addNodes": [
      { "id": "<uuidv4>", "label": "<short label>", "type": "<feature|module|constraint|decision|actor|flow|open_question>", "status": "<undocumented|partial|documented|validated>", "summary": "<1-2 sentences>", "detail": "<markdown or empty>" }
    ],
    "updateNodes": [
      { "id": "<existing node id>", "status": "<new status>", "summary": "<updated>", "detail": "<updated>" }
    ],
    "removeNodeIds": [],
    "addEdges": [
      { "id": "<uuidv4>", "source": "<node id>", "target": "<node id>", "type": "<dependency|composition|conflict|alternative|association>", "label": "<optional>" }
    ],
    "removeEdgeIds": []
  },
  "docsDiff": {
    "summary": "<updated project summary string, or null if unchanged>",
    "addBacklogItems": [
      { "id": "<uuidv4>", "title": "<title>", "description": "<1-2 sentences>", "domain": "<domain>", "priority": "<high|medium|low>" }
    ],
    "updateBacklogItems": [
      { "id": "<existing backlog item id>", "title": "<new title>", "priority": "<new priority>" }
    ],
    "removeBacklogItemIds": [],
    "addDecisions": [
      { "id": "<uuidv4>", "title": "<decision title>", "rationale": "<why>", "timestamp": "<ISO date>" }
    ],
    "removeDecisionIds": [],
  },
  "nextQuestion": {
    "id": "<uuidv4>",
    "text": "<the next clarification question>",
    "targetNodeIds": ["<node id>"],
    "priority": <1-10>,
    "createdAt": "<ISO date>"
  }
}

Rules:
- treeDiff and docsDiff are DIFFERENTIAL — only include what actually changed
- updateNodes: include only the fields that changed (not all fields)
- docsDiff.summary: set to null if the summary does not need updating
- The nextQuestion must target a different aspect than the one just answered
- Do not repeat a question already in the answers history
- Generate real UUIDv4 strings for all new ids

Project: ${project.name}
${project.description ? `Description: ${project.description}` : ''}

Current tree (${tree.nodes.length} nodes, ${tree.edges.length} edges):
${JSON.stringify(tree, null, 2)}

Current docs (compact):
${JSON.stringify(docs, null, 2)}

Recent answers (last ${recentAnswers.length}):
${recentAnswers.length > 0 ? JSON.stringify(recentAnswers, null, 2) : '(none yet)'}

NEW ANSWER:
Question (id: ${questionId}): ${question}
Answer: ${answer}

Return the JSON diff:`;

  return [{ role: 'user', content }];
}

/**
 * Builds the messages array for a BATCH ENRICH call.
 *
 * Accepts multiple Q&A pairs at once and returns a single combined diff.
 * No nextQuestion is generated — the caller manages the question queue.
 *
 * @param {object} project - Full project object
 * @param {Array<{questionId, question, answer}>} answers - Batch of Q&A pairs
 * @returns {Array<object>} Messages array for the Claude API
 */
function buildEnrichBatchPrompt(project, answers) {
  const tree = compactTree(project.tree || { nodes: [], edges: [] });
  const docs = compactDocs(project.docs || {});

  const recentAnswers = (project.answers || [])
    .slice(-MAX_HISTORY)
    .map((a) => ({ question: a.question, answer: a.answer }));

  const answersBlock = answers
    .map((a, i) => `${i + 1}. Question: ${a.question}\n   Answer: ${a.answer}`)
    .join('\n\n');

  const content = `You are an expert software architect enriching a project knowledge tree.

The user has answered ${answers.length} clarification question(s) in one batch. Update the project state based on ALL of them combined.

You MUST return a single valid JSON object — no markdown, no explanation, no code fences.

The JSON must conform to this schema:
{
  "treeDiff": {
    "addNodes": [
      { "id": "<uuidv4>", "label": "<short label>", "type": "<feature|module|constraint|decision|actor|flow|open_question>", "status": "<undocumented|partial|documented|validated>", "summary": "<1-2 sentences>", "detail": "<markdown or empty>" }
    ],
    "updateNodes": [
      { "id": "<existing node id>", "status": "<new status>", "summary": "<updated>", "detail": "<updated>" }
    ],
    "removeNodeIds": [],
    "addEdges": [
      { "id": "<uuidv4>", "source": "<node id>", "target": "<node id>", "type": "<dependency|composition|conflict|alternative|association>", "label": "<optional>" }
    ],
    "removeEdgeIds": []
  },
  "docsDiff": {
    "summary": "<updated project summary string, or null if unchanged>",
    "addBacklogItems": [
      { "id": "<uuidv4>", "title": "<title>", "description": "<1-2 sentences>", "domain": "<domain>", "priority": "<high|medium|low>" }
    ],
    "updateBacklogItems": [
      { "id": "<existing backlog item id>", "title": "<new title>", "priority": "<new priority>" }
    ],
    "removeBacklogItemIds": [],
    "addDecisions": [
      { "id": "<uuidv4>", "title": "<decision title>", "rationale": "<why>", "timestamp": "<ISO date>" }
    ],
    "removeDecisionIds": []
  }
}

Rules:
- treeDiff and docsDiff are DIFFERENTIAL — only include what actually changed
- Synthesize ALL answers into a single coherent diff (do not produce N separate diffs)
- updateNodes: include only the fields that changed
- docsDiff.summary: set to null if the summary does not need updating
- Generate real UUIDv4 strings for all new ids

Project: ${project.name}
${project.description ? `Description: ${project.description}` : ''}

Current tree (${tree.nodes.length} nodes, ${tree.edges.length} edges):
${JSON.stringify(tree, null, 2)}

Current docs (compact):
${JSON.stringify(docs, null, 2)}

Recent answers (last ${recentAnswers.length}):
${recentAnswers.length > 0 ? JSON.stringify(recentAnswers, null, 2) : '(none yet)'}

NEW BATCH ANSWERS:
${answersBlock}

Return the combined JSON diff:`;

  return [{ role: 'user', content }];
}

module.exports = { buildEnrichPrompt, buildEnrichBatchPrompt };
