/**
 * Twig Monitor — Score Diff
 * Pure functions: no side effects, no I/O.
 */

import type { ScoreResult } from '../analyzer/scorer.js';
import type { MonitorRun, ScoreDiff, MonitorDiffReport } from './types.js';

export function diffScores(before: ScoreResult, after: ScoreResult): ScoreDiff {
  const compositeDelta = after.composite - before.composite;
  const gradeChanged = before.grade !== after.grade;

  const resolvedIssues = before.issues.filter(i => !after.issues.includes(i));
  const newIssues = after.issues.filter(i => !before.issues.includes(i));

  return {
    toolName: after.tool,
    before,
    after,
    compositeDelta,
    gradeChanged,
    resolvedIssues,
    newIssues,
  };
}

export function diffRuns(previous: MonitorRun, current: MonitorRun): MonitorDiffReport {
  const diffs: ScoreDiff[] = [];

  for (const currentTool of current.tools) {
    const previousTool = previous.tools.find(t => t.name === currentTool.name);
    if (previousTool) {
      diffs.push(diffScores(previousTool.score, currentTool.score));
    }
  }

  const averageDelta =
    diffs.length > 0
      ? diffs.reduce((sum, d) => sum + d.compositeDelta, 0) / diffs.length
      : 0;

  const improved = diffs.filter(d => d.compositeDelta > 0).length;
  const regressed = diffs.filter(d => d.compositeDelta < 0).length;
  const unchanged = diffs.filter(d => d.compositeDelta === 0).length;

  return {
    url: current.url,
    previousRun: previous,
    currentRun: current,
    diffs,
    averageDelta: Math.round(averageDelta * 10) / 10,
    improved,
    regressed,
    unchanged,
  };
}
