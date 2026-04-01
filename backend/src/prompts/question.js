'use strict';

/**
 * Builds the messages array for the GENERATE_QUESTION Claude call.
 *
 * Given the current project state (tree + answers history), asks Claude to
 * identify the most underdocumented area and return the next clarification
 * question.
 *
 * @param {object} project - Full project object
 * @returns {Array<object>} Messages array for the Claude API
 */
function buildQuestionPrompt(project) {
  const treeSnapshot = {
    nodes: (project.tree && project.tree.nodes) ? project.tree.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      status: n.status,
      summary: n.summary,
    })) : [],
    edges: (project.tree && project.tree.edges) ? project.tree.edges : [],
  };

  const answersHistory = (project.answers || []).map((a) => ({
    question: a.question,
    answer: a.answer,
    timestamp: a.timestamp,
  }));

  const content = `You are an expert software architect conducting a structured interview to progressively document a project.

Your task is to identify the most underdocumented or ambiguous aspect of the current project knowledge tree and generate the single most valuable clarification question.

Prioritize questions that:
1. Target nodes with status "undocumented" or "partial"
2. Resolve contradictions or conflicts between nodes
3. Uncover missing relationships
4. Clarify constraints or decisions that affect many other nodes

You MUST return a single valid JSON object — no markdown, no explanation, no code fences — just the raw JSON.

The JSON object must conform exactly to this schema:
{
  "id": "<uuid-string>",
  "text": "<the question to ask the user>",
  "targetNodeIds": ["<node id>"],
  "priority": <number 1-10, lower is higher priority>,
  "createdAt": "<ISO date string>"
}

Rules:
- Use a real UUID v4 string for the id
- targetNodeIds should reference real node ids from the tree
- The question must be specific, actionable, and directly relevant to the project
- Do not repeat questions from the answers history

Project: ${project.name}
Description: ${project.description}

Current Knowledge Tree:
${JSON.stringify(treeSnapshot, null, 2)}

Answers History (${answersHistory.length} answers given so far):
${JSON.stringify(answersHistory, null, 2)}

Pending Questions already in queue:
${JSON.stringify((project.pendingQuestions || []).map((q) => q.text), null, 2)}

Generate the next most valuable clarification question as JSON:`;

  return [{ role: 'user', content }];
}

/**
 * Builds the messages array for a GENERATE_QUESTIONS (batch) Claude call.
 *
 * @param {object} project - Full project object
 * @param {number} count - Number of questions to generate
 * @returns {Array<object>} Messages array for the Claude API
 */
function buildQuestionsPrompt(project, count) {
  const treeSnapshot = {
    nodes: (project.tree && project.tree.nodes) ? project.tree.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      status: n.status,
      summary: n.summary,
    })) : [],
    edges: (project.tree && project.tree.edges) ? project.tree.edges : [],
  };

  const answersHistory = (project.answers || []).map((a) => ({
    question: a.question,
    answer: a.answer,
  }));

  const content = `You are an expert software architect conducting a structured interview to progressively document a project.

Generate the ${count} most valuable clarification questions, ordered by priority (most important first).

Prioritize questions that:
1. Target nodes with status "undocumented" or "partial"
2. Resolve contradictions or conflicts between nodes
3. Uncover missing relationships
4. Clarify constraints or decisions that affect many other nodes

You MUST return a single valid JSON array — no markdown, no explanation, no code fences — just the raw JSON array.

Each element must conform to this schema:
{ "id": "<uuidv4>", "text": "<question>", "targetNodeIds": ["<node id>"], "priority": <1-10>, "createdAt": "<ISO date>" }

Rules:
- Use real UUID v4 strings for all ids
- Do not repeat questions from answers history or pending queue
- Each question must target a distinct aspect of the project
- Return exactly ${count} questions

Project: ${project.name}
${project.description ? `Description: ${project.description}` : ''}

Current Knowledge Tree:
${JSON.stringify(treeSnapshot, null, 2)}

Answers History (${answersHistory.length} so far):
${JSON.stringify(answersHistory, null, 2)}

Pending Questions already in queue:
${JSON.stringify((project.pendingQuestions || []).map((q) => q.text), null, 2)}

Generate the ${count} questions as a JSON array:`;

  return [{ role: 'user', content }];
}

module.exports = { buildQuestionPrompt, buildQuestionsPrompt };
