'use strict';

/**
 * Builds the messages array for the ANALYZE_INITIAL Claude call.
 *
 * Given raw project text, asks Claude to:
 * 1. Extract nodes with label, type, summary, status=undocumented, grid positions
 * 2. Extract edges between nodes
 * 3. Generate initial documentation (summary, backlog, decisions, openQuestions)
 * 4. Generate the first clarification question targeting the most ambiguous node
 *
 * @param {string} rawText - The raw project plan text pasted by the user
 * @returns {Array<object>} Messages array for the Claude API
 */
function buildAnalyzePrompt(rawText) {
  const content = `You are an expert software architect and technical writer. Your task is to analyze a raw project description and extract a structured knowledge tree from it.

You MUST return a single valid JSON object — no markdown, no explanation, no code fences — just the raw JSON.

The JSON object must conform exactly to this schema:
{
  "treeDiff": {
    "addNodes": [
      {
        "id": "<uuid-string>",
        "label": "<short display label>",
        "type": "<one of: feature, module, constraint, decision, actor, flow, open_question>",
        "status": "undocumented",
        "summary": "<1-2 sentence description>",
        "detail": "",
        "position": { "x": <number>, "y": <number> }
      }
    ],
    "updateNodes": [],
    "removeNodeIds": [],
    "addEdges": [
      {
        "id": "<uuid-string>",
        "source": "<node id>",
        "target": "<node id>",
        "type": "<one of: dependency, composition, conflict, alternative, association>",
        "label": "<optional short label>"
      }
    ],
    "removeEdgeIds": []
  },
  "docs": {
    "summary": "<markdown paragraph summarizing the project>",
    "backlog": [
      {
        "id": "<uuid-string>",
        "title": "<feature title>",
        "description": "<1-2 sentences>",
        "domain": "<domain name>",
        "priority": "<high | medium | low>"
      }
    ],
    "decisions": [
      {
        "id": "<uuid-string>",
        "title": "<decision title>",
        "rationale": "<why this decision was made>",
        "timestamp": "<ISO date string>"
      }
    ],
  },
  "questions": [
    {
      "id": "<uuid-string>",
      "text": "<clarification question>",
      "targetNodeIds": ["<node id>"],
      "priority": <number 1-10, lower = higher priority>,
      "createdAt": "<ISO date string>"
    }
  ]
}

Rules:
- Use real UUID v4 strings for all id fields (e.g. "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
- Position nodes in a logical grid layout: x increments by 200, y increments by 150. Start at x=100, y=100.
- Extract 5-20 nodes depending on project complexity
- Generate 3-6 questions covering the most ambiguous or underdocumented aspects of the project. Order them by priority (lowest number = most important).
- All "status" fields in addNodes must be "undocumented"
- Return today's date in ISO format for timestamps

Now analyze this project description and return the structured JSON:

---
${rawText}
---`;

  return [{ role: 'user', content }];
}

module.exports = { buildAnalyzePrompt };
