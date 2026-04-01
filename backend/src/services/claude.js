'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { buildAnalyzePrompt } = require('../prompts/analyze');
const { buildQuestionPrompt, buildQuestionsPrompt } = require('../prompts/question');
const { buildEnrichPrompt, buildEnrichBatchPrompt } = require('../prompts/enrich');

const MODEL = 'claude-sonnet-4-6';

/**
 * Returns an initialized Anthropic client.
 * Throws a clear error if the API key is missing.
 *
 * @returns {Anthropic} Anthropic SDK client
 */
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. ' +
      'Please set it before starting the server.'
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Calls the Claude API with the given messages array and parses the JSON response.
 *
 * @param {Array<object>} messages - Messages array for the Claude API
 * @returns {Promise<object>} Parsed JSON response from Claude
 */
async function callClaude(messages, label = 'claude', attempt = 1) {
  const client = getClient();

  const promptChars = messages.reduce((sum, m) => sum + (m.content || '').length, 0);
  console.log(`[${label}] → attempt ${attempt} | prompt size: ${promptChars} chars (~${Math.round(promptChars / 4)} tokens)`);

  const t0 = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages,
  });
  const claudeMs = Date.now() - t0;

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response format from Claude API');
  }

  const text = content.text.trim();
  const stopReason = response.stop_reason;
  console.log(`[${label}] ← ${text.length} chars in ${claudeMs}ms | stop_reason=${stopReason} | in=${response.usage?.input_tokens} out=${response.usage?.output_tokens}`);

  if (stopReason === 'max_tokens') {
    console.warn(`[${label}] WARNING: response was cut off by max_tokens limit`);
  }

  // Strip markdown code fences if present (defensive)
  const jsonText = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    if (attempt < 3) {
      console.warn(`[${label}] JSON parse failed (attempt ${attempt}): ${err.message} — retrying with explicit JSON instruction`);
      // Append a correction message and retry
      const retryMessages = [
        ...messages,
        { role: 'assistant', content: text },
        {
          role: 'user',
          content: 'Your previous response was not valid JSON or was cut off. Please return ONLY the complete, valid JSON object. No markdown, no explanation, no truncation.',
        },
      ];
      return callClaude(retryMessages, label, attempt + 1);
    }
    throw new Error(`Failed to parse Claude response as JSON after ${attempt} attempts: ${err.message}\nRaw response: ${text.slice(0, 500)}`);
  }

  return parsed;
}

/**
 * Analyzes a raw project text and returns the initial tree diff, docs, and first question.
 *
 * @param {string} rawText - Raw project plan text
 * @returns {Promise<{treeDiff: object, docs: object, question: object}>}
 */
async function analyzeProject(rawText) {
  const messages = buildAnalyzePrompt(rawText);
  const result = await callClaude(messages, 'analyzeProject');

  if (!result.treeDiff || !result.docs || !Array.isArray(result.questions) || result.questions.length === 0) {
    throw new Error('Claude response missing required fields: treeDiff, docs, questions');
  }

  return {
    treeDiff: result.treeDiff,
    docs: result.docs,
    questions: result.questions,
  };
}

/**
 * Generates the next clarification question for a project.
 *
 * @param {object} project - Full project object
 * @returns {Promise<object>} Question object
 */
async function generateNextQuestion(project) {
  const messages = buildQuestionPrompt(project);
  const result = await callClaude(messages, 'generateNextQuestion');

  if (!result.id || !result.text) {
    throw new Error('Claude response missing required fields: id, text');
  }

  return result;
}

/**
 * Generates multiple clarification questions for a project in one call.
 *
 * @param {object} project - Full project object
 * @param {number} count - Number of questions to generate
 * @returns {Promise<Array<object>>} Array of question objects
 */
async function generateQuestions(project, count) {
  const messages = buildQuestionsPrompt(project, count);
  const result = await callClaude(messages, 'generateQuestions');

  if (!Array.isArray(result) || result.length === 0) {
    throw new Error('Claude response must be a non-empty array of questions');
  }

  return result;
}

/**
 * Enriches the project tree based on a Q&A pair and returns the next state.
 *
 * @param {object} project - Full project object
 * @param {string} questionId - ID of the answered question
 * @param {string} question - Text of the question
 * @param {string} answer - User's answer text
 * @returns {Promise<{treeDiff: object, updatedDocs: object, nextQuestion: object}>}
 */
async function enrichTree(project, questionId, question, answer) {
  const messages = buildEnrichPrompt(project, questionId, question, answer);
  const result = await callClaude(messages, 'enrichTree');

  if (!result.treeDiff || !result.docsDiff || !result.nextQuestion) {
    throw new Error('Claude response missing required fields: treeDiff, docsDiff, nextQuestion');
  }

  return {
    treeDiff: result.treeDiff,
    docsDiff: result.docsDiff,
    nextQuestion: result.nextQuestion,
  };
}

/**
 * Enriches the project tree from a batch of Q&A pairs in a single Claude call.
 *
 * @param {object} project - Full project object
 * @param {Array<{questionId, question, answer}>} answers - Batch of answered questions
 * @returns {Promise<{treeDiff: object, docsDiff: object}>}
 */
async function enrichTreeBatch(project, answers) {
  const messages = buildEnrichBatchPrompt(project, answers);
  const result = await callClaude(messages, 'enrichTreeBatch');

  if (!result.treeDiff || !result.docsDiff) {
    throw new Error('Claude response missing required fields: treeDiff, docsDiff');
  }

  return {
    treeDiff: result.treeDiff,
    docsDiff: result.docsDiff,
  };
}

module.exports = {
  analyzeProject,
  generateNextQuestion,
  generateQuestions,
  enrichTree,
  enrichTreeBatch,
};
