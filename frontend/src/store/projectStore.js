import { create } from 'zustand';
import * as api from '../api/projects.js';

function applyQuestionUpdate(state, data) {
  if (!state.currentProject) return null;
  return {
    ...state.currentProject,
    pendingQuestions: data.pendingQuestions ?? state.currentProject.pendingQuestions,
    deferredQuestionIds: data.deferredQuestionIds ?? state.currentProject.deferredQuestionIds,
  };
}

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  selectedNodeId: null,
  activeTab: 'questions',
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await api.listProjects();
      set({ projects, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  createProject: async (name, description) => {
    set({ isLoading: true, error: null });
    try {
      const project = await api.createProject(name, description);
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
      const project = await api.getProject(id);
      set({ currentProject: project, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteProject(id);
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
      const data = await api.analyzeProject(id, text);
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
      const data = await api.submitAnswer(id, questionId, question, answer);
      set((state) => ({
        currentProject: state.currentProject
          ? {
              ...state.currentProject,
              tree: data.tree,
              docs: data.docs,
              // Use the authoritative list from the backend — it has all
              // accumulated questions, not just the one we knew about locally
              pendingQuestions: data.pendingQuestions ?? [],
            }
          : null,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  skipQuestion: async (questionId) => {
    const state = get();
    if (!state.currentProject) return;

    const questions = state.currentProject.pendingQuestions || [];
    const idx = questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return;

    // Move skipped question to end so the next one becomes [0]
    const reordered = [
      ...questions.slice(0, idx),
      ...questions.slice(idx + 1),
      questions[idx],
    ];
    set((s) => ({
      currentProject: { ...s.currentProject, pendingQuestions: reordered },
    }));

    // If this was the only question, generate a new one from the API
    // so the user isn't stuck seeing the same question forever
    if (questions.length <= 1) {
      set({ isLoading: true, error: null });
      try {
        const data = await api.getNextQuestion(state.currentProject.id);
        if (data?.question) {
          set((s) => ({
            currentProject: s.currentProject
              ? {
                  ...s.currentProject,
                  pendingQuestions: [
                    data.question,
                    ...(s.currentProject.pendingQuestions || []),
                  ],
                }
              : null,
            isLoading: false,
          }));
        } else {
          set({ isLoading: false });
        }
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    }
  },

  generateNextQuestion: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ isLoading: true, error: null });
    try {
      const data = await api.generateQuestions(currentProject.id, 5);
      if (data?.questions?.length > 0) {
        set((s) => ({
          currentProject: s.currentProject
            ? {
                ...s.currentProject,
                pendingQuestions: [...(s.currentProject.pendingQuestions || []), ...data.questions],
              }
            : null,
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  submitAnswersBatch: async (id, answers) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.submitAnswersBatch(id, answers);
      set((state) => ({
        currentProject: state.currentProject
          ? {
              ...state.currentProject,
              tree: data.tree,
              docs: data.docs,
              pendingQuestions: data.pendingQuestions ?? state.currentProject.pendingQuestions,
              deferredQuestionIds: data.deferredQuestionIds ?? state.currentProject.deferredQuestionIds,
            }
          : null,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  deferQuestion: async (questionId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    // Optimistic update
    set((s) => ({
      currentProject: s.currentProject ? {
        ...s.currentProject,
        deferredQuestionIds: [...(s.currentProject.deferredQuestionIds || []), questionId],
      } : null,
    }));
    try {
      const data = await api.manageQuestion(currentProject.id, questionId, 'defer');
      set((s) => ({ currentProject: applyQuestionUpdate(s, data) }));
    } catch (err) {
      // Rollback on failure
      set((s) => ({
        currentProject: s.currentProject ? {
          ...s.currentProject,
          deferredQuestionIds: (s.currentProject.deferredQuestionIds || []).filter((id) => id !== questionId),
        } : null,
        error: err.message,
      }));
    }
  },

  restoreQuestion: async (questionId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set((s) => ({
      currentProject: s.currentProject ? {
        ...s.currentProject,
        deferredQuestionIds: (s.currentProject.deferredQuestionIds || []).filter((id) => id !== questionId),
      } : null,
    }));
    try {
      const data = await api.manageQuestion(currentProject.id, questionId, 'restore');
      set((s) => ({ currentProject: applyQuestionUpdate(s, data) }));
    } catch (err) {
      set((s) => ({
        currentProject: s.currentProject ? {
          ...s.currentProject,
          deferredQuestionIds: [...(s.currentProject.deferredQuestionIds || []), questionId],
        } : null,
        error: err.message,
      }));
    }
  },

  deleteQuestion: async (questionId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set((s) => ({
      currentProject: s.currentProject ? {
        ...s.currentProject,
        pendingQuestions: (s.currentProject.pendingQuestions || []).filter((q) => q.id !== questionId),
        deferredQuestionIds: (s.currentProject.deferredQuestionIds || []).filter((id) => id !== questionId),
      } : null,
    }));
    try {
      await api.manageQuestion(currentProject.id, questionId, 'delete');
    } catch (err) {
      // On failure, reload the project to restore consistent state
      set({ error: err.message });
    }
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, activeTab: 'detail' });
  },

  deselectNode: () => {
    set({ selectedNodeId: null });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useProjectStore;
