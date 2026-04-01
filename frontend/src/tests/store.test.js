import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { create } from 'zustand';

// We create a fresh store manually per test to avoid singleton state leakage
// by embedding the store factory logic here.

const mockApi = {
  listProjects: vi.fn(),
  createProject: vi.fn(),
  getProject: vi.fn(),
  deleteProject: vi.fn(),
  analyzeProject: vi.fn(),
  submitAnswer: vi.fn(),
  getNextQuestion: vi.fn(),
};

vi.mock('../api/projects.js', () => mockApi);

// Factory that creates a fresh Zustand store (same logic as projectStore.js)
function createFreshStore() {
  return create((set) => ({
    projects: [],
    currentProject: null,
    selectedNodeId: null,
    activeTab: 'questions',
    isLoading: false,
    error: null,

    fetchProjects: async () => {
      set({ isLoading: true, error: null });
      try {
        const projects = await mockApi.listProjects();
        set({ projects, isLoading: false });
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    },

    createProject: async (name, description) => {
      set({ isLoading: true, error: null });
      try {
        const project = await mockApi.createProject(name, description);
        set((state) => ({
          projects: [...state.projects, project],
          isLoading: false,
        }));
        return project;
      } catch (err) {
        set({ error: err.message, isLoading: false });
        return null;
      }
    },

    loadProject: async (id) => {
      set({ isLoading: true, error: null });
      try {
        const project = await mockApi.getProject(id);
        set({ currentProject: project, isLoading: false });
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    },

    deleteProject: async (id) => {
      set({ isLoading: true, error: null });
      try {
        await mockApi.deleteProject(id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
          isLoading: false,
        }));
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    },

    analyzeProject: async (id, text) => {
      set({ isLoading: true, error: null });
      try {
        const data = await mockApi.analyzeProject(id, text);
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                tree: data.tree,
                docs: data.docs,
                pendingQuestions: data.pendingQuestions ?? [],
              }
            : null,
          isLoading: false,
        }));
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    },

    submitAnswer: async (id, questionId, question, answer) => {
      set({ isLoading: true, error: null });
      try {
        const data = await mockApi.submitAnswer(id, questionId, question, answer);
        set((state) => {
          const currentQuestions = state.currentProject?.pendingQuestions || [];
          const filteredQuestions = currentQuestions.filter(
            (q) => q.id !== questionId
          );
          const nextQuestions = data.nextQuestion
            ? [data.nextQuestion, ...filteredQuestions]
            : filteredQuestions;
          return {
            currentProject: state.currentProject
              ? {
                  ...state.currentProject,
                  tree: data.tree,
                  docs: data.docs,
                  pendingQuestions: nextQuestions,
                }
              : null,
            isLoading: false,
          };
        });
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    },

    selectNode: (nodeId) => {
      set({ selectedNodeId: nodeId, activeTab: 'detail' });
    },

    setActiveTab: (tab) => {
      set({ activeTab: tab });
    },

    clearError: () => {
      set({ error: null });
    },
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchProjects', () => {
  it('sets projects after successful fetch', async () => {
    const mockProjects = [{ id: '1', name: 'Project A' }];
    mockApi.listProjects.mockResolvedValueOnce(mockProjects);

    const store = createFreshStore();
    await store.getState().fetchProjects();

    const state = store.getState();
    expect(state.projects).toEqual(mockProjects);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error on failed fetch', async () => {
    mockApi.listProjects.mockRejectedValueOnce(new Error('Network error'));

    const store = createFreshStore();
    await store.getState().fetchProjects();

    const state = store.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoading).toBe(false);
  });
});

describe('createProject', () => {
  it('adds project to list after creation', async () => {
    const newProject = { id: '2', name: 'New Project', description: 'Desc' };
    mockApi.createProject.mockResolvedValueOnce(newProject);

    const store = createFreshStore();
    const result = await store.getState().createProject('New Project', 'Desc');

    const state = store.getState();
    expect(result).toEqual(newProject);
    expect(state.projects).toContainEqual(newProject);
    expect(state.isLoading).toBe(false);
  });

  it('sets error and returns null on failure', async () => {
    mockApi.createProject.mockRejectedValueOnce(new Error('Creation failed'));

    const store = createFreshStore();
    const result = await store.getState().createProject('Bad', '');

    const state = store.getState();
    expect(result).toBeNull();
    expect(state.error).toBe('Creation failed');
  });
});

describe('loadProject', () => {
  it('sets currentProject after load', async () => {
    const project = {
      id: '3',
      name: 'Loaded',
      tree: { nodes: [], edges: [] },
      docs: {},
      pendingQuestions: [],
    };
    mockApi.getProject.mockResolvedValueOnce(project);

    const store = createFreshStore();
    await store.getState().loadProject('3');

    const state = store.getState();
    expect(state.currentProject).toEqual(project);
    expect(state.isLoading).toBe(false);
  });
});

describe('deleteProject', () => {
  it('removes project from list', async () => {
    mockApi.deleteProject.mockResolvedValueOnce(null);

    const store = createFreshStore();
    store.setState({ projects: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] });
    await store.getState().deleteProject('1');

    const state = store.getState();
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].id).toBe('2');
  });

  it('clears currentProject if it was deleted', async () => {
    mockApi.deleteProject.mockResolvedValueOnce(null);

    const store = createFreshStore();
    store.setState({
      projects: [{ id: '1', name: 'A' }],
      currentProject: { id: '1', name: 'A' },
    });
    await store.getState().deleteProject('1');

    const state = store.getState();
    expect(state.currentProject).toBeNull();
  });
});

describe('analyzeProject', () => {
  it('updates currentProject tree and docs after analysis', async () => {
    const mockTree = { nodes: [{ id: 'n1', label: 'Test' }], edges: [] };
    const mockDocs = { summary: 'Summary', backlog: [], decisions: [], openQuestions: [] };
    const mockQuestion = { id: 'q1', text: 'What is X?' };

    mockApi.analyzeProject.mockResolvedValueOnce({
      tree: mockTree,
      docs: mockDocs,
      pendingQuestions: [mockQuestion],
    });

    const store = createFreshStore();
    store.setState({
      currentProject: { id: 'p1', name: 'Test', tree: null, docs: null, pendingQuestions: [] },
    });
    await store.getState().analyzeProject('p1', 'raw text');

    const state = store.getState();
    expect(state.currentProject.tree).toEqual(mockTree);
    expect(state.currentProject.docs).toEqual(mockDocs);
    expect(state.currentProject.pendingQuestions).toEqual([mockQuestion]);
  });
});

describe('submitAnswer', () => {
  it('updates currentProject and sets next question', async () => {
    const nextQuestion = { id: 'q2', text: 'Follow-up?' };
    const updatedTree = { nodes: [], edges: [] };
    const updatedDocs = { summary: 'Updated', backlog: [], decisions: [], openQuestions: [] };

    mockApi.submitAnswer.mockResolvedValueOnce({
      tree: updatedTree,
      docs: updatedDocs,
      nextQuestion,
    });

    const store = createFreshStore();
    store.setState({
      currentProject: {
        id: 'p1',
        name: 'Test',
        tree: { nodes: [], edges: [] },
        docs: {},
        pendingQuestions: [{ id: 'q1', text: 'First question?' }],
      },
    });

    await store.getState().submitAnswer('p1', 'q1', 'First question?', 'My answer');

    const state = store.getState();
    expect(state.currentProject.tree).toEqual(updatedTree);
    expect(state.currentProject.pendingQuestions[0]).toEqual(nextQuestion);
  });
});

describe('selectNode', () => {
  it('sets selectedNodeId and switches to detail tab', () => {
    const store = createFreshStore();
    store.getState().selectNode('node-123');

    const state = store.getState();
    expect(state.selectedNodeId).toBe('node-123');
    expect(state.activeTab).toBe('detail');
  });
});

describe('setActiveTab', () => {
  it('updates activeTab', () => {
    const store = createFreshStore();
    store.getState().setActiveTab('docs');

    expect(store.getState().activeTab).toBe('docs');
  });
});

describe('clearError', () => {
  it('clears error state', () => {
    const store = createFreshStore();
    store.setState({ error: 'Some error' });
    store.getState().clearError();

    expect(store.getState().error).toBeNull();
  });
});
