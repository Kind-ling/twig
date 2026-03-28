/**
 * Twig — Public API
 * Named exports only.
 */

// Analyzer
export { scoreDescription } from './analyzer/scorer.js';
export type { ScoreResult, ToolDefinition } from './analyzer/scorer.js';
export { fetchMCPTools, fetchAgentCard } from './analyzer/fetcher.js';
export { detectCategory, INTENT_QUERIES } from './analyzer/intent-corpus.js';
export type { Category } from './analyzer/intent-corpus.js';

// Optimizer
export { generateOptimizedDescriptions } from './optimizer/generator.js';

// Monitor
export { diffScores, diffRuns } from './monitor/diff.js';
export {
  normalizeUrl,
  hashUrl,
  loadHistory,
  appendHistory,
  latestRun,
} from './monitor/history.js';
export { getCompetitivePosition, fetchCatalog } from './monitor/competitive.js';
export { runMonitor } from './monitor/runner.js';
export type {
  MonitorRun,
  ToolRunResult,
  ScoreDiff,
  MonitorDiffReport,
  CompetitorEntry,
  CompetitivePosition,
} from './monitor/types.js';

// Payments
export {
  checkPaymentGate,
  loadReceipts,
  buildPaymentRequest,
  getPaymentAddress,
  getPaymentAmount,
  verifyOnChain,
} from './payments/x402-gate.js';
export type {
  PaymentReceipt,
  PaymentGateResult,
  PaymentRequest,
} from './payments/types.js';
