'use strict';

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Applies forward-compatible migrations to a loaded project.
 * Saves the project back to disk if anything changed.
 * Returns the (potentially mutated) project.
 */
async function migrateProject(project) {
  let dirty = false;

  // 1. Add deferredQuestionIds if missing (new field)
  if (!Array.isArray(project.deferredQuestionIds)) {
    project.deferredQuestionIds = [];
    dirty = true;
  }

  // 2. Convert old docs.openQuestions (strings) → pendingQuestions (objects)
  const legacyOQ = project.docs?.openQuestions;
  if (Array.isArray(legacyOQ) && legacyOQ.length > 0) {
    const now = new Date().toISOString();
    const converted = legacyOQ.map((text) => ({
      id: uuidv4(),
      text,
      targetNodeIds: [],
      priority: 5,
      createdAt: now,
    }));
    project.pendingQuestions = [...(project.pendingQuestions || []), ...converted];
    delete project.docs.openQuestions;
    dirty = true;
  } else if (project.docs && 'openQuestions' in project.docs) {
    // Remove empty openQuestions array too
    delete project.docs.openQuestions;
    dirty = true;
  }

  if (dirty) {
    // Persist the migrated state immediately so it only runs once
    const filePath = projectFilePath(project.id);
    await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf8');
  }

  return project;
}

/**
 * Resolves the data directory path from env or default.
 * Can be overridden for testing by setting process.env.DATA_DIR.
 */
function getDataDir() {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(__dirname, '../../data');
}

/**
 * Ensures the data directory exists. Called once on module load (lazily).
 */
async function ensureDataDir() {
  const dir = getDataDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Returns the file path for a given project id.
 *
 * @param {string} id - Project UUID
 * @returns {string} Absolute path to the project JSON file
 */
function projectFilePath(id) {
  return path.join(getDataDir(), `${id}.json`);
}

/**
 * Saves (creates or overwrites) a project to disk.
 *
 * @param {object} project - Full project object
 * @returns {Promise<void>}
 */
async function saveProject(project) {
  await ensureDataDir();
  const filePath = projectFilePath(project.id);
  await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf8');
}

/**
 * Loads a single project from disk.
 *
 * @param {string} id - Project UUID
 * @returns {Promise<object>} Full project object
 * @throws {Error} If project file does not exist
 */
async function loadProject(id) {
  await ensureDataDir();
  const filePath = projectFilePath(id);
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Project not found: ${id}`);
    }
    throw err;
  }
  const project = JSON.parse(raw);
  return migrateProject(project);
}

/**
 * Lists all projects stored on disk (returns full project objects).
 *
 * @returns {Promise<object[]>} Array of full project objects
 */
async function listProjects() {
  const dir = await ensureDataDir();
  let files;
  try {
    files = await fs.readdir(dir);
  } catch (_err) {
    return [];
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const projects = await Promise.all(
    jsonFiles.map(async (filename) => {
      try {
        const raw = await fs.readFile(path.join(dir, filename), 'utf8');
        return JSON.parse(raw);
      } catch (_err) {
        // Skip corrupt / unreadable files
        return null;
      }
    })
  );

  return projects.filter(Boolean);
}

/**
 * Deletes a project file from disk.
 *
 * @param {string} id - Project UUID
 * @returns {Promise<void>}
 * @throws {Error} If project file does not exist
 */
async function deleteProject(id) {
  await ensureDataDir();
  const filePath = projectFilePath(id);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Project not found: ${id}`);
    }
    throw err;
  }
}

module.exports = {
  saveProject,
  loadProject,
  listProjects,
  deleteProject,
  getDataDir,
  ensureDataDir,
};
