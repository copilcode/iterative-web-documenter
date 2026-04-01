import client from './client.js';

export async function listProjects() {
  const response = await client.get('/projects');
  return response.data.data;
}

export async function createProject(name, description) {
  const response = await client.post('/projects', { name, description });
  return response.data.data;
}

export async function getProject(id) {
  const response = await client.get(`/projects/${id}`);
  return response.data.data;
}

export async function deleteProject(id) {
  const response = await client.delete(`/projects/${id}`);
  return response.data.data;
}

export async function analyzeProject(id, text) {
  const response = await client.post(`/projects/${id}/analyze`, { text });
  return response.data.data;
}

export async function submitAnswer(id, questionId, question, answer) {
  const response = await client.post(`/projects/${id}/answer`, {
    questionId,
    question,
    answer,
  });
  return response.data.data;
}

export async function getNextQuestion(id) {
  const response = await client.post(`/projects/${id}/questions/next`);
  return response.data.data;
}

export async function generateQuestions(id, count = 5) {
  const response = await client.post(`/projects/${id}/questions/generate`, { count });
  return response.data.data;
}

export async function submitAnswersBatch(id, answers) {
  const response = await client.post(`/projects/${id}/answers/batch`, { answers });
  return response.data.data;
}

export async function manageQuestion(projectId, questionId, action) {
  const response = await client.patch(`/projects/${projectId}/questions/${questionId}`, { action });
  return response.data.data;
}

export async function importProject(projectData) {
  const response = await client.post('/projects/import', projectData);
  return response.data.data;
}

export async function exportProjectJson(id, projectName) {
  const response = await client.get(`/projects/${id}`);
  const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
