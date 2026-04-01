# Iterative Documenter — Spécifications du projet
Version 3.0 | Révisé le 2026-03-31

---

## 1. Vision générale

Un portail web qui transforme une description brute de projet en documentation structurée et vivante, par enrichissement itératif. L'utilisateur colle une ébauche de projet, l'IA génère un arbre de connaissance visuel, puis engage un dialogue asynchrone sous forme de questionnaire. À chaque réponse, la documentation s'étoffe, les nœuds se précisent, et de nouvelles questions émergent. L'application gère plusieurs projets en parallèle.

L'objectif : partir d'une page blanche et arriver, session après session, à une documentation projet complète, cohérente et exploitable.

---

## 2. Expérience utilisateur

### 2.1 Flux principal — création d'un projet

1. L'utilisateur crée un nouveau projet (nom + description courte optionnelle).
2. Il colle son plan de projet brut dans une grande zone de texte (aucun format imposé).
3. Il valide : l'IA analyse le texte et génère un premier arbre de connaissance.
4. L'arbre s'affiche sous forme de mindmap interactive.
5. L'IA génère un premier questionnaire de clarification (3 à 7 questions).
6. L'utilisateur répond aux questions une par une dans des zones de texte.
7. L'IA intègre les réponses, enrichit l'arbre, met à jour la documentation et génère de nouvelles questions.
8. Ce cycle se répète indéfiniment jusqu'à ce que la documentation soit satisfaisante.

### 2.2 Interface — disposition générale

```
┌─────────────────────────────────────────────────────────────────┐
│  ITERATIVE DOCUMENTER        [Projets ▼]   [+ Nouveau projet]   │
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│      KNOWLEDGE TREE          │      PANNEAU DE DROITE           │
│      (mindmap interactive)   │                                  │
│                              │  ┌──────────────────────────┐   │
│   [nœud]──[nœud]             │  │ Détail du nœud sélectionné│   │
│      └──[nœud]──[nœud]       │  │ (texte éditable)          │   │
│                              │  └──────────────────────────┘   │
│                              │                                  │
│                              │  ┌──────────────────────────┐   │
│                              │  │ QUESTIONNAIRE EN COURS    │   │
│                              │  │ Q: ...?                   │   │
│                              │  │ [zone de réponse]         │   │
│                              │  │              [Répondre →] │   │
│                              │  └──────────────────────────┘   │
│                              │                                  │
│                              │  ┌──────────────────────────┐   │
│                              │  │ DOCUMENTATION GÉNÉRÉE     │   │
│                              │  │ (résumé, backlog, etc.)   │   │
│                              │  └──────────────────────────┘   │
└──────────────────────────────┴──────────────────────────────────┘
```

### 2.3 Knowledge Tree — comportement

- Rendu sous forme de mindmap interactive (zoom, drag, pan).
- Chaque nœud affiche son **nom** et une **icône d'état** (non documenté / partiel / documenté / validé).
- Le **texte détaillé** de chaque nœud est masqué par défaut pour éviter la surcharge visuelle.
- Cliquer sur un nœud ouvre son détail dans le panneau de droite.
- Les nœuds sont colorés selon leur domaine (fonctionnel, technique, contrainte, décision...).
- L'utilisateur peut créer, renommer, déplacer et supprimer des nœuds manuellement.
- Les relations entre nœuds sont typées et visibles (dépendance, composition, conflit, alternative).

### 2.4 Questionnaire — comportement

- L'IA pose **une question à la fois** pour ne pas submerger l'utilisateur.
- Les questions sont priorisées : zones floues → contradictions → approfondissement.
- L'utilisateur peut **passer** une question (elle revient plus tard).
- L'utilisateur peut **déclencher manuellement** une nouvelle série de questions.
- Chaque réponse est enregistrée, liée au nœud concerné, et horodatée.
- L'IA peut challenger l'utilisateur : "Tu as mentionné X mais aussi Y — comment tu réconcilies ça ?"

### 2.5 Gestion multi-projets

- Dashboard listant tous les projets avec leur état d'avancement global.
- Chaque projet est isolé (arbre, questions, documentation, historique séparés).
- Navigation rapide entre projets via un menu déroulant.
- Pas de limitation sur le nombre de projets.

---

## 3. Gestion de la connaissance

### 3.1 Structure d'un nœud

Chaque nœud contient :
- `id` : identifiant unique
- `label` : nom court affiché sur le graphe
- `type` : fonctionnalité | module | contrainte | décision | question ouverte | acteur | flux
- `status` : undocumented | partial | documented | validated
- `summary` : résumé court généré par l'IA (1-2 phrases)
- `detail` : texte long, enrichi à chaque cycle (markdown)
- `sources` : liste des réponses utilisateur qui ont alimenté ce nœud
- `children` / `relations` : liens vers d'autres nœuds avec type de relation
- `questions_pending` : questions en attente liées à ce nœud
- `updated_at` : horodatage de la dernière mise à jour

### 3.2 Cycle d'enrichissement IA

À chaque réponse utilisateur, l'IA :
1. Analyse la réponse dans le contexte de l'arbre existant.
2. Met à jour les nœuds concernés (résumé, détail, statut).
3. Crée de nouveaux nœuds si nécessaire.
4. Détecte les contradictions ou incohérences et les signale.
5. Génère la prochaine question prioritaire.
6. Régénère les livrables documentaires concernés.

### 3.3 Persistance

- Sauvegarde automatique après chaque action (modification de nœud, réponse à une question).
- Format : JSON par projet, stocké localement ou en base.
- Historique complet des réponses conservé (traçabilité).
- Export possible à tout moment.

---

## 4. Sorties documentaires

Accessibles à tout moment depuis le panneau de droite (onglets) :

| Livrable | Description |
|---|---|
| **Résumé projet** | Description synthétique : objectifs, périmètre, contraintes, acteurs |
| **Knowledge Tree** | Visualisation interactive de l'arbre avec état de complétude |
| **Backlog fonctionnel** | Liste des fonctionnalités identifiées, groupées par domaine et priorisées |
| **Décisions techniques** | Historique des choix architecturaux avec leur justification |
| **Questions ouvertes** | Zones non résolues, contradictions, sujets à approfondir |
| **Export** | Export JSON (structure complète) ou Markdown (documentation narrative) |

---

## 5. Architecture technique

### 5.1 Frontend

- **Framework** : React (Vite)
- **Mindmap / graphe** : React Flow ou D3.js (nœuds interactifs, zoom/pan, drag)
- **UI** : Tailwind CSS
- **État global** : Zustand ou React Context
- **Communication avec le backend** : REST API + polling ou WebSocket pour les mises à jour IA

### 5.2 Backend

- **Runtime** : Node.js avec Express (ou Python avec FastAPI)
- **LLM** : Claude API (claude-sonnet-4-6 par défaut)
- **Stockage** : fichiers JSON par projet dans un répertoire `data/` (v1), SQLite envisageable pour v2
- **Endpoints principaux** :
  - `POST /projects` — créer un projet
  - `GET /projects` — lister les projets
  - `POST /projects/:id/analyze` — analyser le texte initial et générer l'arbre
  - `POST /projects/:id/answer` — soumettre une réponse et déclencher l'enrichissement
  - `GET /projects/:id/tree` — récupérer l'arbre de connaissance
  - `GET /projects/:id/docs` — récupérer les livrables documentaires
  - `POST /projects/:id/questions/next` — demander la prochaine question

### 5.3 Intégration Claude

- Le LLM reçoit à chaque appel :
  - Le texte brut initial du projet
  - L'état actuel de l'arbre (JSON sérialisé)
  - L'historique des réponses précédentes
  - L'action demandée (analyser / questionner / enrichir / exporter)
- Le LLM retourne :
  - Un diff de l'arbre (nœuds créés, modifiés, supprimés)
  - La prochaine question à poser (avec nœud(s) cible(s))
  - Les livrables mis à jour
- Structured outputs (JSON mode) utilisés pour les réponses IA manipulant l'arbre.

### 5.4 Prompts système

Un prompt système dédié par action :
- `ANALYZE_INITIAL` : extraire les nœuds, les relations, le statut depuis le texte brut
- `GENERATE_QUESTION` : identifier la zone la plus floue et formuler une question précise
- `ENRICH_TREE` : intégrer une réponse dans l'arbre existant et mettre à jour les livrables
- `GENERATE_DOCS` : produire un livrable documentaire à partir de l'arbre

---

## 6. Contraintes non fonctionnelles

| Critère | Exigence |
|---|---|
| Réactivité IA | Réponse IA en < 10 secondes (feedback visuel de chargement sinon) |
| Persistance | Zéro perte de données — sauvegarde après chaque action |
| Lisibilité du graphe | Textes détaillés masqués par défaut, visible uniquement à la sélection |
| Multi-projets | Isolation complète entre projets |
| Exportabilité | Export JSON + Markdown disponibles à tout moment |
| Portabilité | Application web, fonctionne dans tout navigateur moderne |
| Autonomie | Fonctionne sans compte utilisateur en v1 (données locales) |

---

## 7. Hors périmètre (v1)

- Authentification / comptes utilisateurs
- Collaboration multi-utilisateurs en temps réel
- Intégrations tierces (Jira, Notion, GitHub, etc.)
- Export vers Word / PDF mis en forme
- Version mobile
- Analyse de fichiers joints (PDF, Word, etc.) — v2
- Historique de versions du graphe (diff visuel) — v2

---

## 8. Priorités de développement (ordre suggéré)

1. Backend : structure de données projet + persistance JSON
2. Backend : endpoint `analyze` — premier appel Claude → arbre initial
3. Frontend : dashboard multi-projets + création de projet
4. Frontend : rendu du knowledge tree (mindmap)
5. Backend + Frontend : cycle question/réponse + enrichissement IA
6. Frontend : panneau de détail d'un nœud + livrables documentaires
7. Export JSON et Markdown
8. Polish UX : états de chargement, gestion d'erreurs, édition manuelle des nœuds
