import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('../api/client.js', () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  };
  return { default: mockClient };
});

import client from '../api/client.js';
import {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  analyzeProject,
  submitAnswer,
  getNextQuestion,
} from '../api/projects.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listProjects', () => {
  it('calls GET /projects and returns data', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    client.get.mockResolvedValueOnce({ data: { data: mockData } });

    const result = await listProjects();

    expect(client.get).toHaveBeenCalledWith('/projects');
    expect(result).toEqual(mockData);
  });
});

describe('createProject', () => {
  it('calls POST /projects with correct payload', async () => {
    const mockProject = { id: '1', name: 'My Project', description: 'Desc' };
    client.post.mockResolvedValueOnce({ data: { data: mockProject } });

    const result = await createProject('My Project', 'Desc');

    expect(client.post).toHaveBeenCalledWith('/projects', {
      name: 'My Project',
      description: 'Desc',
    });
    expect(result).toEqual(mockProject);
  });
});

describe('getProject', () => {
  it('calls GET /projects/:id', async () => {
    const mockProject = { id: 'abc', name: 'Test' };
    client.get.mockResolvedValueOnce({ data: { data: mockProject } });

    const result = await getProject('abc');

    expect(client.get).toHaveBeenCalledWith('/projects/abc');
    expect(result).toEqual(mockProject);
  });
});

describe('deleteProject', () => {
  it('calls DELETE /projects/:id', async () => {
    client.delete.mockResolvedValueOnce({ data: { data: null } });

    await deleteProject('abc');

    expect(client.delete).toHaveBeenCalledWith('/projects/abc');
  });
});

describe('analyzeProject', () => {
  it('calls POST /projects/:id/analyze with text', async () => {
    const mockResult = { tree: {}, docs: {}, question: null };
    client.post.mockResolvedValueOnce({ data: { data: mockResult } });

    const result = await analyzeProject('abc', 'project plan text');

    expect(client.post).toHaveBeenCalledWith('/projects/abc/analyze', {
      text: 'project plan text',
    });
    expect(result).toEqual(mockResult);
  });
});

describe('submitAnswer', () => {
  it('calls POST /projects/:id/answer with correct payload', async () => {
    const mockResult = { tree: {}, docs: {}, nextQuestion: null };
    client.post.mockResolvedValueOnce({ data: { data: mockResult } });

    const result = await submitAnswer('abc', 'q1', 'What is X?', 'X is Y');

    expect(client.post).toHaveBeenCalledWith('/projects/abc/answer', {
      questionId: 'q1',
      question: 'What is X?',
      answer: 'X is Y',
    });
    expect(result).toEqual(mockResult);
  });
});

describe('getNextQuestion', () => {
  it('calls POST /projects/:id/questions/next', async () => {
    const mockResult = { id: 'q2', text: 'Next question?' };
    client.post.mockResolvedValueOnce({ data: { data: mockResult } });

    const result = await getNextQuestion('abc');

    expect(client.post).toHaveBeenCalledWith('/projects/abc/questions/next');
    expect(result).toEqual(mockResult);
  });
});
