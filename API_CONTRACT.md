# API Contract — Iterative Documenter

Base URL: `http://localhost:3001/api`

---

## Endpoints

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all projects |
| POST | `/projects` | Create a new project |
| GET | `/projects/:id` | Get full project state |
| DELETE | `/projects/:id` | Delete a project |
| POST | `/projects/:id/analyze` | Analyze initial text → generate tree + first question |
| POST | `/projects/:id/answer` | Submit an answer → enrich tree + next question |
| GET | `/projects/:id/tree` | Get knowledge tree |
| GET | `/projects/:id/docs` | Get documentation outputs |
| POST | `/projects/:id/questions/next` | Force-generate next question |

---

## Data Models

### Project (summary, used in GET /projects)
```json
{
  "id": "string (uuid)",
  "name": "string",
  "description": "string",
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string",
  "nodeCount": "number",
  "completion": "number (0-100, % of documented nodes)"
}
```

### Project (full, used in GET /projects/:id)
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "rawText": "string",
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string",
  "tree": { "nodes": [], "edges": [] },
  "docs": { "summary": "", "backlog": [], "decisions": [], "openQuestions": [] },
  "answers": [],
  "pendingQuestions": []
}
```

### Node
```json
{
  "id": "string (uuid)",
  "label": "string",
  "type": "feature | module | constraint | decision | actor | flow | open_question",
  "status": "undocumented | partial | documented | validated",
  "summary": "string (1-2 sentences)",
  "detail": "string (markdown, can be empty)",
  "position": { "x": "number", "y": "number" }
}
```

### Edge
```json
{
  "id": "string (uuid)",
  "source": "node id",
  "target": "node id",
  "type": "dependency | composition | conflict | alternative | association",
  "label": "string (optional)"
}
```

### Question
```json
{
  "id": "string (uuid)",
  "text": "string",
  "targetNodeIds": ["node id"],
  "priority": "number (lower = higher priority)",
  "createdAt": "ISO date string"
}
```

### Answer
```json
{
  "questionId": "string",
  "question": "string",
  "answer": "string",
  "timestamp": "ISO date string"
}
```

### Docs
```json
{
  "summary": "string (markdown)",
  "backlog": [
    { "id": "string", "title": "string", "description": "string", "domain": "string", "priority": "high | medium | low" }
  ],
  "decisions": [
    { "id": "string", "title": "string", "rationale": "string", "timestamp": "ISO date string" }
  ],
  "openQuestions": ["string"]
}
```

---

## Response format

All responses follow:
```json
{ "data": { ... } }
```

Errors:
```json
{ "error": "message string" }
```

HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Internal Server Error

---

## POST /projects body
```json
{ "name": "string (required)", "description": "string (optional)" }
```

## POST /projects/:id/analyze body
```json
{ "text": "string (required, the raw project plan)" }
```

## POST /projects/:id/answer body
```json
{
  "questionId": "string (required)",
  "question": "string (required, text of the question)",
  "answer": "string (required)"
}
```
