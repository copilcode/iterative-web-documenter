# CLAUDE.md — Iterative Documenter

## Project overview

A web portal for iterative project documentation. The user pastes a raw project plan, Claude generates an interactive knowledge tree (mindmap), then enriches the documentation through successive Q&A cycles. Supports multiple projects in parallel.

## Monorepo structure

```
iterative-documenter/
  backend/          Node.js/Express API + Claude integration
  frontend/         React/Vite SPA
  API_CONTRACT.md   Source of truth for frontend/backend interface
  expectations.md   Full product specifications
```

---

## Backend

**Stack**: Node.js 20, Express 4, CommonJS (`require`/`module.exports`, no ESM), `@anthropic-ai/sdk`, `uuid`, `cors`, `dotenv`

**Tests**: Jest + supertest — run with `npm test` from `backend/`

**Start**: `node src/server.js` (requires `backend/.env` with `ANTHROPIC_API_KEY`)

### Key files

| File | Role |
|------|------|
| `src/app.js` | Express app, exported without `listen` (for supertest) |
| `src/server.js` | Calls `app.listen()`, loads dotenv |
| `src/models/project.js` | `createProject`, `toSummary`, `computeCompletion` |
| `src/models/tree.js` | `createNode`, `createEdge`, `applyTreeDiff` |
| `src/persistence/store.js` | JSON file storage in `data/` dir, one file per project |
| `src/services/claude.js` | `analyzeProject`, `enrichTree`, `generateNextQuestion` |
| `src/prompts/analyze.js` | Prompt builder for initial tree generation |
| `src/prompts/question.js` | Prompt builder for next question |
| `src/prompts/enrich.js` | Prompt builder for tree enrichment after an answer |
| `src/routes/projects.js` | All 9 REST endpoints under `/api/projects` |

### Claude model
Always use `claude-sonnet-4-6`. Defined as `const MODEL = 'claude-sonnet-4-6'` in `services/claude.js`.

### Claude response contract
All Claude calls return structured JSON. Prompt builders include the full expected schema in the prompt. Responses are parsed with `JSON.parse` after stripping markdown code fences defensively.

- `analyzeProject` → `{ treeDiff, docs, question }`
- `enrichTree` → `{ treeDiff, updatedDocs, nextQuestion }`
- `generateNextQuestion` → `{ id, text, targetNodeIds, priority, createdAt }`

### Data model rules
- Node types: `feature | module | constraint | decision | actor | flow | open_question`
- Node statuses: `undocumented | partial | documented | validated`
- Edge types: `dependency | composition | conflict | alternative | association`
- `applyTreeDiff` is immutable — never mutates the original tree
- Completion = % of nodes with status `documented` or `validated`

### Testing rules
- **Never call the real Claude API in tests** — always `jest.mock('../src/services/claude')`
- Persistence tests use `os.tmpdir()` + unique subdirectory, cleaned up in `afterEach`
- `DATA_DIR` is read dynamically per call in `store.js` (allows test isolation via `process.env`)

---

## Frontend

**Stack**: React 18, Vite 5, Tailwind CSS v3, `@xyflow/react` v12, Zustand v4, axios

**Tests**: Vitest + `@testing-library/react` — run with `npm test` from `frontend/`

**Dev**: `npm run dev` — proxies `/api` to `http://localhost:3001`

### Key files

| File | Role |
|------|------|
| `src/App.jsx` | State-based routing: `dashboard` or `project` view (no react-router) |
| `src/store/projectStore.js` | Zustand store — single source of truth |
| `src/api/projects.js` | API call functions, unwrap `response.data.data` |
| `src/components/tree/KnowledgeTree.jsx` | React Flow wrapper with dagre auto-layout |
| `src/components/tree/layoutUtils.js` | Dagre layout engine (`getLayoutedElements`) |
| `src/components/tree/CustomNode.jsx` | Custom node renderer (color by type, status dot) |
| `src/components/panel/Questionnaire.jsx` | One question at a time, answer textarea, skip |
| `src/components/panel/NodeDetail.jsx` | Selected node detail + status dropdown |
| `src/components/panel/DocsPanel.jsx` | Summary / backlog / decisions / open questions |
| `src/views/InitialTextView.jsx` | Large textarea for pasting raw project plan |

### Layout
Two-column layout: knowledge tree (left, `bg-gray-950`) + right panel (tabs: Détail / Questions / Docs). No external CSS — Tailwind classes only. Dark theme throughout.

### Knowledge tree / dagre
- `@dagrejs/dagre` handles node positioning (direction `TB`, nodesep 60, ranksep 80)
- `getLayoutedElements(nodes, edges)` in `layoutUtils.js` — call this whenever tree data changes
- `ReactFlowProvider` wraps `KnowledgeTreeInner` to enable `useReactFlow()` for programmatic `fitView`
- Node positions from the API are **ignored** — dagre recalculates everything on each tree update

### Node colors (by type)
`feature`→blue, `module`→purple, `constraint`→red, `decision`→orange, `actor`→green, `flow`→teal, `open_question`→yellow

### Zustand store actions
`fetchProjects`, `createProject`, `loadProject`, `deleteProject`, `analyzeProject`, `submitAnswer`, `selectNode`, `setActiveTab`, `clearError`

### Testing rules
- Mock `../../store/projectStore.js` with `vi.mock` in all component tests
- Mock `axios` / `api/client.js` in API tests
- Use function matchers for multiline text in `<pre>` elements (getByText with `(_, el) => ...`)

---

## Development workflow

1. Always run tests after any change: `npm test` in both `backend/` and `frontend/`
2. Backend and frontend can be developed in parallel (no shared code)
3. `API_CONTRACT.md` is the interface contract — update it if endpoints change
4. `expectations.md` is the product spec — update it if requirements change
5. When adding new Claude prompt behaviour, update the corresponding prompt builder in `src/prompts/`

## Environment setup

```bash
# Backend
cd backend
cp ../.env.example .env   # then fill in ANTHROPIC_API_KEY
npm install
node src/server.js        # starts on port 3001

# Frontend
cd frontend
npm install
npm run dev               # starts on port 5173
```
