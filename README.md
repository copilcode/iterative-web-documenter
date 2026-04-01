# Iterative Documenter

An AI-powered project documentation tool that transforms a raw project description into structured, living documentation through iterative Q&A with Claude.

## What it does

1. **Paste** an unstructured project description (notes, brain dump, spec draft)
2. **Claude analyzes** it and builds an initial knowledge tree (features, modules, constraints, decisions, actors…)
3. **Answer questions** — Claude asks targeted clarification questions, one batch at a time. Each answer enriches the tree and the documentation
4. **Explore the graph** — an interactive mindmap shows all nodes, their relationships, and their documentation status
5. **Export** the final documentation as Markdown or JSON

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS, Zustand, React Flow + Dagre |
| Backend | Node.js 20, Express, CommonJS |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Persistence | JSON files per project (`backend/data/`) |
| Testing | Vitest (frontend), Jest + Supertest (backend) |

## Prerequisites

- Node.js ≥ 20
- An [Anthropic API key](https://console.anthropic.com/)

## Getting started

### 1. Clone & install

```bash
git clone https://github.com/your-username/iterative-documenter.git
cd iterative-documenter

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# backend/.env
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY
```

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

### 3. Run in development

```bash
# Terminal 1 — backend (port 3001)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project structure

```
iterative-documenter/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app (middleware, routes)
│   │   ├── server.js               # Entry point
│   │   ├── models/
│   │   │   ├── project.js          # Project schema & helpers
│   │   │   └── tree.js             # Node/edge creation & diff logic
│   │   ├── persistence/
│   │   │   └── store.js            # JSON file storage + migrations
│   │   ├── routes/
│   │   │   └── projects.js         # REST endpoints
│   │   ├── services/
│   │   │   ├── claude.js           # Claude API calls
│   │   │   └── exporter.js         # Markdown / JSON export
│   │   └── prompts/
│   │       ├── analyze.js          # Initial analysis prompt
│   │       ├── question.js         # Question generation prompts
│   │       └── enrich.js           # Tree enrichment prompts
│   ├── data/                       # Auto-created, one JSON file per project
│   └── tests/
│
└── frontend/
    ├── src/
    │   ├── api/projects.js         # API client
    │   ├── store/projectStore.js   # Zustand store
    │   ├── views/                  # Page-level components
    │   └── components/             # UI components (tree, panels, modals)
    └── tests/
```

## API

The backend exposes a REST API under `/api/projects`. See [API_CONTRACT.md](./API_CONTRACT.md) for the full specification.

Key endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `POST` | `/api/projects/:id/analyze` | Analyze raw text → initial tree |
| `POST` | `/api/projects/:id/answers/batch` | Submit multiple answers at once |
| `POST` | `/api/projects/:id/questions/generate` | Generate N new questions |
| `PATCH` | `/api/projects/:id/questions/:qId` | Defer / restore / delete a question |
| `GET` | `/api/projects/:id/export?format=markdown\|json` | Export documentation |

## Running tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## Deploying to Azure App Service

### 1. Prepare for production

Add static file serving to `backend/src/app.js`:

```js
const path = require('path');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'))
  );
}
```

Make the data directory configurable in `backend/src/persistence/store.js`:

```js
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
```

Build the frontend:

```bash
cd frontend && npm run build
```

### 2. Deploy

```bash
az login

az webapp up \
  --name my-documenter \
  --resource-group rg-documenter \
  --runtime "NODE:20-lts" \
  --sku B1 \
  --os-type Linux

az webapp config appsettings set \
  --name my-documenter \
  --resource-group rg-documenter \
  --settings \
    ANTHROPIC_API_KEY="sk-ant-..." \
    NODE_ENV="production" \
    DATA_DIR="/home/data" \
    PORT="8080"
```

Project data is stored under `/home/data` — Azure App Service persists the `/home` volume across restarts and redeployments (single-instance).

> **Note:** If you scale to multiple instances, use an Azure Files share mounted at `/home` to keep data consistent across instances.

## Data model

Each project is stored as a single JSON file with this shape:

```json
{
  "id": "uuid",
  "name": "My Project",
  "description": "...",
  "rawText": "...",
  "tree": {
    "nodes": [{ "id", "label", "type", "status", "summary", "details" }],
    "edges": [{ "id", "source", "target", "type" }]
  },
  "docs": {
    "summary": "...",
    "backlog": [],
    "decisions": []
  },
  "answers": [],
  "pendingQuestions": [],
  "deferredQuestionIds": []
}
```

Node types: `feature` · `module` · `constraint` · `decision` · `actor` · `flow`

Node statuses: `undocumented` · `partial` · `documented` · `validated`
