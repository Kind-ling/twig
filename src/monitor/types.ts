/**
 * Twig Monitor — Domain Types
 */

import type { ScoreResult } from '../analyzer/scorer.js';

export interface MonitorRun {
  url: string;
  normalizedUrl: string;
  timestamp: string; // ISO 8601
  tools: ToolRunResult[];
  averageComposite: number;
  paymentVerified: boolean;
}

export interface ToolRunResult {
  name: string;
  score: ScoreResult;
}

export interface ScoreDiff {
  toolName: string;
  before: ScoreResult;
  after: ScoreResult;
  compositeDelta: number;
  gradeChanged: boolean;
  resolvedIssues: string[];
  newIssues: string[];
}

export interface MonitorDiffReport {
  url: string;
  previousRun: MonitorRun;
  currentRun: MonitorRun;
  diffs: ScoreDiff[];
  averageDelta: number;
  improved: number;
  regressed: number;
  unchanged: number;
}

export interface CompetitorEntry {
  url: string;
  averageComposite: number;
  toolCount: number;
}

export interface CompetitivePosition {
  url: string;
  subjectScore: number;
  peers: CompetitorEntry[];
  rank: number;
  percentile: number;
  totalPeers: number;
}
