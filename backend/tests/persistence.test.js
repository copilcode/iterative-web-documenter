'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { createProject } = require('../src/models/project');

// We need to set DATA_DIR before requiring the store module
// to control which directory is used in tests.

describe('persistence/store', () => {
  let tmpDir;
  let store;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'iterative-documenter-test-'));
    process.env.DATA_DIR = tmpDir;

    // Re-require store to pick up the new DATA_DIR
    jest.resetModules();
    store = require('../src/persistence/store');
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (_err) {
      // Ignore cleanup errors
    }
    delete process.env.DATA_DIR;
  });

  // -------------------------------------------------------------------------
  // saveProject + loadProject
  // -------------------------------------------------------------------------
  describe('saveProject and loadProject', () => {
    it('saves and loads a project correctly', async () => {
      const project = createProject({ name: 'Test Project', description: 'desc' });
      await store.saveProject(project);

      const loaded = await store.loadProject(project.id);
      expect(loaded).toEqual(project);
    });

    it('overwrites an existing project on save', async () => {
      const project = createProject({ name: 'Overwrite Me' });
      await store.saveProject(project);

      const updated = { ...project, name: 'Updated Name' };
      await store.saveProject(updated);

      const loaded = await store.loadProject(project.id);
      expect(loaded.name).toBe('Updated Name');
    });

    it('throws "Project not found" when loading non-existent id', async () => {
      await expect(store.loadProject('non-existent-id')).rejects.toThrow('Project not found');
    });
  });

  // -------------------------------------------------------------------------
  // listProjects
  // -------------------------------------------------------------------------
  describe('listProjects', () => {
    it('returns empty array when no projects exist', async () => {
      const projects = await store.listProjects();
      expect(projects).toEqual([]);
    });

    it('returns all saved projects', async () => {
      const p1 = createProject({ name: 'Project 1' });
      const p2 = createProject({ name: 'Project 2' });
      const p3 = createProject({ name: 'Project 3' });

      await store.saveProject(p1);
      await store.saveProject(p2);
      await store.saveProject(p3);

      const projects = await store.listProjects();
      expect(projects).toHaveLength(3);

      const ids = projects.map((p) => p.id);
      expect(ids).toContain(p1.id);
      expect(ids).toContain(p2.id);
      expect(ids).toContain(p3.id);
    });

    it('returns only one project after saving one', async () => {
      const project = createProject({ name: 'Only One' });
      await store.saveProject(project);

      const projects = await store.listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(project.id);
    });
  });

  // -------------------------------------------------------------------------
  // deleteProject
  // -------------------------------------------------------------------------
  describe('deleteProject', () => {
    it('deletes an existing project', async () => {
      const project = createProject({ name: 'To Delete' });
      await store.saveProject(project);

      await store.deleteProject(project.id);

      await expect(store.loadProject(project.id)).rejects.toThrow('Project not found');
    });

    it('removes the project from listProjects after deletion', async () => {
      const p1 = createProject({ name: 'Keep' });
      const p2 = createProject({ name: 'Delete' });

      await store.saveProject(p1);
      await store.saveProject(p2);

      await store.deleteProject(p2.id);

      const remaining = await store.listProjects();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(p1.id);
    });

    it('throws "Project not found" when deleting non-existent id', async () => {
      await expect(store.deleteProject('does-not-exist')).rejects.toThrow('Project not found');
    });
  });

  // -------------------------------------------------------------------------
  // ensureDataDir
  // -------------------------------------------------------------------------
  describe('ensureDataDir', () => {
    it('creates the data directory if it does not exist', async () => {
      const newDir = path.join(tmpDir, 'sub', 'nested');
      process.env.DATA_DIR = newDir;
      jest.resetModules();
      const freshStore = require('../src/persistence/store');

      await freshStore.ensureDataDir();

      const stat = await fs.stat(newDir);
      expect(stat.isDirectory()).toBe(true);
    });
  });
});
