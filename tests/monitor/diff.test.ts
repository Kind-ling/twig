import { describe, it, expect } from 'vitest';
import { diffScores, diffRuns } from '../../src/monitor/diff.js';
import type { ScoreResult } from '../../src/analyzer/scorer.js';
import type { MonitorRun } from '../../src/monitor/types.js';

function makeScore(overrides: Partial<ScoreResult> = {}): ScoreResult {
  return {
    tool: 'test/tool',
    description: 'A test description',
    scores: { intentMatch: 50, specificity: 50, selectability: 50 },
    composite: 50,
    grade: 'C',
    issues: [],
    suggestions: [],
    ...overrides,
  };
}

function makeRun(tools: Array<{ name: string; score: ScoreResult }>, overrides: Partial<MonitorRun> = {}): MonitorRun {
  const avg = tools.length > 0
    ? tools.reduce((s, t) => s + t.score.composite, 0) / tools.length
    : 0;
  return {
    url: 'https://example.com/mcp',
    normalizedUrl: 'https://example.com/mcp',
    timestamp: '2024-01-01T00:00:00.000Z',
    tools,
    averageComposite: avg,
    paymentVerified: false,
    ...overrides,
  };
}

describe('diffScores', () => {
  it('computes positive delta when score improves', () => {
    const before = makeScore({ composite: 40 });
    const after = makeScore({ composite: 65 });
    const diff = diffScores(before, after);
    expect(diff.compositeDelta).toBe(25);
    expect(diff.gradeChanged).toBe(false);
  });

  it('computes negative delta when score regresses', () => {
    const before = makeScore({ composite: 70, grade: 'B' });
    const after = makeScore({ composite: 45, grade: 'D' });
    const diff = diffScores(before, after);
    expect(diff.compositeDelta).toBe(-25);
    expect(diff.gradeChanged).toBe(true);
  });

  it('detects resolved issues', () => {
    const before = makeScore({ issues: ['Too short', 'No return format'] });
    const after = makeScore({ issues: ['Too short'] });
    const diff = diffScores(before, after);
    expect(diff.resolvedIssues).toContain('No return format');
    expect(diff.newIssues).toHaveLength(0);
  });

  it('detects new issues', () => {
    const before = makeScore({ issues: [] });
    const after = makeScore({ issues: ['Vague verb'] });
    const diff = diffScores(before, after);
    expect(diff.newIssues).toContain('Vague verb');
    expect(diff.resolvedIssues).toHaveLength(0);
  });

  it('reports no grade change when grade stays same', () => {
    const before = makeScore({ grade: 'B', composite: 70 });
    const after = makeScore({ grade: 'B', composite: 72 });
    const diff = diffScores(before, after);
    expect(diff.gradeChanged).toBe(false);
  });
});

describe('diffRuns', () => {
  it('computes averageDelta across tools', () => {
    const prev = makeRun([
      { name: 'a', score: makeScore({ tool: 'a', composite: 50 }) },
      { name: 'b', score: makeScore({ tool: 'b', composite: 60 }) },
    ]);
    const curr = makeRun([
      { name: 'a', score: makeScore({ tool: 'a', composite: 60 }) },
      { name: 'b', score: makeScore({ tool: 'b', composite: 80 }) },
    ]);
    const report = diffRuns(prev, curr);
    expect(report.averageDelta).toBe(15);
    expect(report.improved).toBe(2);
    expect(report.regressed).toBe(0);
    expect(report.unchanged).toBe(0);
  });

  it('handles a tool that regressed', () => {
    const prev = makeRun([{ name: 'a', score: makeScore({ tool: 'a', composite: 80 }) }]);
    const curr = makeRun([{ name: 'a', score: makeScore({ tool: 'a', composite: 50 }) }]);
    const report = diffRuns(prev, curr);
    expect(report.regressed).toBe(1);
    expect(report.averageDelta).toBe(-30);
  });

  it('skips tools that appear only in current (new tools)', () => {
    const prev = makeRun([{ name: 'a', score: makeScore({ tool: 'a', composite: 50 }) }]);
    const curr = makeRun([
      { name: 'a', score: makeScore({ tool: 'a', composite: 50 }) },
      { name: 'b', score: makeScore({ tool: 'b', composite: 70 }) },
    ]);
    const report = diffRuns(prev, curr);
    // Only tool 'a' is diffed (unchanged)
    expect(report.diffs).toHaveLength(1);
    expect(report.unchanged).toBe(1);
  });
});
