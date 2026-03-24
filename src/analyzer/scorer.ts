/**
 * Twig Description Scorer
 *
 * Three dimensions, each 0-100:
 * - Intent Match (40%): cosine similarity to top agent queries for the category
 * - Specificity (35%): concreteness of outputs, constraints, examples
 * - Selectability (25%): would an LLM choose this vs. adjacent tools?
 */

export interface ScoreResult {
  tool: string;
  description: string;
  scores: {
    intentMatch: number;      // 0-100: does it match what agents search for?
    specificity: number;      // 0-100: concrete outputs, params, constraints?
    selectability: number;    // 0-100: would LLM choose this over alternatives?
  };
  composite: number;          // weighted: 40/35/25
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];           // specific problems found
  suggestions: string[];      // specific improvements
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: {
    properties?: Record<string, { description?: string; type?: string }>;
    required?: string[];
  };
}

const SPECIFICITY_SIGNALS = {
  positive: [
    /returns?\s+(a|an|the)\s+\w+/i,   // "returns a JSON object"
    /outputs?\s+(a|an|the)\s+\w+/i,
    /format:/i,
    /example:/i,
    /e\.g\./i,
    /supports?\s+(up to|\d)/i,
    /\d+\s*(ms|seconds?|minutes?)/i,  // latency claims
    /paginated/i,
    /cursor/i,
    /sorted by/i,
    /filter/i,
    /with\s+\w+\s+and\s+\w+/i,        // "with X and Y support"
  ],
  negative: [
    /^(get|fetch|retrieve|run|call|invoke|execute)\s+\w+\s*$/i,  // single verb + noun
    /^[a-z]+\s+(api|service|tool|endpoint)\s*$/i,
    /^(ai[- ]powered|smart|intelligent)\s/i,
  ],
};

const SELECTABILITY_KILLERS = [
  { pattern: /^[^.!?]{0,40}$/, issue: 'Too short — agents skip vague tools' },
  { pattern: /^(a |an |the )?\w+ (api|service|tool)\.?$/i, issue: 'Just names the category, not the capability' },
  { pattern: /^run .{0,30}$/i, issue: '"Run X" tells agents nothing about what X does' },
  { pattern: /^(get|fetch) .{0,25}$/i, issue: 'Verb + noun only — no context for LLM selection' },
];

export function scoreDescription(tool: ToolDefinition, intentQueries: string[] = []): ScoreResult {
  const desc = tool.description?.trim() ?? '';
  const issues: string[] = [];
  const suggestions: string[] = [];

  // --- SPECIFICITY SCORE ---
  let specificityScore = 50;

  if (desc.length < 20) {
    specificityScore -= 30;
    issues.push('Description too short (<20 chars)');
  } else if (desc.length < 40) {
    specificityScore -= 15;
    issues.push('Description very short (<40 chars) — insufficient for LLM selection');
  } else if (desc.length > 280) {
    specificityScore += 10; // rewarded for thoroughness
  }

  for (const pattern of SPECIFICITY_SIGNALS.positive) {
    if (pattern.test(desc)) specificityScore += 8;
  }
  for (const pattern of SPECIFICITY_SIGNALS.negative) {
    if (pattern.test(desc)) {
      specificityScore -= 20;
      issues.push('Matches generic pattern — indistinguishable from boilerplate');
    }
  }

  // params in schema add specificity
  const paramCount = Object.keys(tool.inputSchema?.properties ?? {}).length;
  if (paramCount > 3) specificityScore += 10;

  specificityScore = Math.max(0, Math.min(100, specificityScore));

  // --- SELECTABILITY SCORE ---
  let selectabilityScore = 70;

  for (const { pattern, issue } of SELECTABILITY_KILLERS) {
    if (pattern.test(desc)) {
      selectabilityScore -= 25;
      issues.push(issue);
    }
  }

  // Penalty: description matches tool name almost exactly
  const toolNameWords = tool.name.toLowerCase().split(/[/_-]/);
  const descWords = desc.toLowerCase().split(/\s+/);
  const overlap = toolNameWords.filter(w => w.length > 3 && descWords.includes(w)).length;
  if (overlap >= toolNameWords.length - 1) {
    selectabilityScore -= 15;
    issues.push('Description just restates the tool name — adds no selection signal');
  }

  selectabilityScore = Math.max(0, Math.min(100, selectabilityScore));

  // --- INTENT MATCH SCORE ---
  // Without actual embeddings, use keyword heuristics against intent queries
  let intentScore = 50;
  if (intentQueries.length > 0) {
    const descLower = desc.toLowerCase();
    const matches = intentQueries.filter(q =>
      q.toLowerCase().split(/\s+/).filter(w => w.length > 4).some(w => descLower.includes(w))
    ).length;
    intentScore = Math.min(100, 30 + (matches / intentQueries.length) * 70);
  }

  // --- COMPOSITE ---
  const composite = Math.round(
    intentScore * 0.40 +
    specificityScore * 0.35 +
    selectabilityScore * 0.25
  );

  // --- GRADE ---
  const grade = composite >= 85 ? 'A'
    : composite >= 70 ? 'B'
    : composite >= 55 ? 'C'
    : composite >= 40 ? 'D'
    : 'F';

  // --- SUGGESTIONS ---
  if (specificityScore < 60) {
    suggestions.push('Add what the tool returns (format, fields, or example output)');
  }
  if (selectabilityScore < 60) {
    suggestions.push('Lead with the use case, not the tool name or category');
  }
  if (desc.length < 80) {
    suggestions.push('Expand to 80-200 chars — longer descriptions score higher in semantic search');
  }
  if (!desc.includes('with') && !desc.includes('support')) {
    suggestions.push('Add key constraints or capabilities using "with X and Y support" pattern');
  }

  return {
    tool: tool.name,
    description: desc,
    scores: {
      intentMatch: Math.round(intentScore),
      specificity: Math.round(specificityScore),
      selectability: Math.round(selectabilityScore),
    },
    composite,
    grade,
    issues,
    suggestions,
  };
}
