'use strict';

const STATUS_LABELS = {
  undocumented: 'Non documenté',
  partial: 'Partiel',
  documented: 'Documenté',
  validated: 'Validé',
};

const TYPE_LABELS = {
  feature: 'Fonctionnalité',
  module: 'Module',
  constraint: 'Contrainte',
  decision: 'Décision',
  actor: 'Acteur',
  flow: 'Flux',
  open_question: 'Question ouverte',
};

const PRIORITY_LABELS = {
  high: '🔴 Haute',
  medium: '🟡 Moyenne',
  low: '🟢 Basse',
};

/**
 * Generates a Markdown document from a project.
 *
 * @param {object} project - Full project object
 * @returns {string} Markdown string
 */
function toMarkdown(project) {
  const lines = [];
  const now = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Header
  lines.push(`# ${project.name}`);
  if (project.description) lines.push(`\n> ${project.description}`);
  lines.push(`\n*Documentation générée le ${now} — ${project.answers?.length ?? 0} question(s) traitée(s)*`);
  lines.push('\n---\n');

  // Summary
  const summary = project.docs?.summary;
  if (summary) {
    lines.push('## Résumé du projet\n');
    lines.push(summary);
    lines.push('\n---\n');
  }

  // Knowledge tree — grouped by type
  const nodes = project.tree?.nodes || [];
  if (nodes.length > 0) {
    lines.push('## Arbre de connaissance\n');

    const byType = {};
    for (const node of nodes) {
      const type = node.type || 'feature';
      if (!byType[type]) byType[type] = [];
      byType[type].push(node);
    }

    for (const [type, typeNodes] of Object.entries(byType)) {
      lines.push(`### ${TYPE_LABELS[type] || type}s\n`);
      for (const node of typeNodes) {
        const statusLabel = STATUS_LABELS[node.status] || node.status;
        lines.push(`#### ${node.label} *(${statusLabel})*`);
        if (node.summary) lines.push(`\n${node.summary}`);
        if (node.detail) {
          lines.push('\n' + node.detail);
        }
        lines.push('');
      }
    }
    lines.push('---\n');
  }

  // Backlog
  const backlog = project.docs?.backlog || [];
  if (backlog.length > 0) {
    lines.push('## Backlog fonctionnel\n');

    // Group by domain
    const byDomain = {};
    for (const item of backlog) {
      const domain = item.domain || 'Général';
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(item);
    }

    for (const [domain, items] of Object.entries(byDomain)) {
      lines.push(`### ${domain}\n`);
      for (const item of items) {
        const priority = PRIORITY_LABELS[item.priority] || item.priority || '';
        lines.push(`- **${item.title}** ${priority}`);
        if (item.description) lines.push(`  ${item.description}`);
      }
      lines.push('');
    }
    lines.push('---\n');
  }

  // Decisions
  const decisions = project.docs?.decisions || [];
  if (decisions.length > 0) {
    lines.push('## Décisions techniques\n');
    for (const decision of decisions) {
      const date = decision.timestamp
        ? new Date(decision.timestamp).toLocaleDateString('fr-FR')
        : '';
      lines.push(`### ${decision.title}${date ? ` *(${date})*` : ''}\n`);
      if (decision.rationale) lines.push(decision.rationale);
      lines.push('');
    }
    lines.push('---\n');
  }

  // Open questions
  const openQuestions = project.docs?.openQuestions || [];
  if (openQuestions.length > 0) {
    lines.push('## Questions ouvertes\n');
    for (const q of openQuestions) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }

  // Completion stats
  const total = nodes.length;
  const documented = nodes.filter(
    (n) => n.status === 'documented' || n.status === 'validated'
  ).length;
  const pct = total > 0 ? Math.round((documented / total) * 100) : 0;

  lines.push('---\n');
  lines.push(`*Complétude : ${documented}/${total} nœuds documentés (${pct}%)*`);

  return lines.join('\n');
}

/**
 * Returns the full project as a clean JSON export.
 *
 * @param {object} project - Full project object
 * @returns {object} Export-ready object
 */
function toJson(project) {
  return {
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      tree: project.tree,
      docs: project.docs,
      answers: project.answers,
    },
  };
}

module.exports = { toMarkdown, toJson };
