import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  normalizeUrl,
  hashUrl,
  loadHistory,
  appendHistory,
  latestRun,
} from '../../src/monitor/history.js';
import type { MonitorRun } from '../../src/monitor/types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'twig-history-test-'));
});

function makeTmpDir(): string {
  return tmpDir;
}

function makeRun(url: string, timestamp: string): MonitorRun {
  const normalized = normalizeUrl(url);
  return {
    url,
    normalizedUrl: normalized,
    timestamp,
    tools: [],
    averageComposite: 55,
    paymentVerified: false,
  };
}

describe('normalizeUrl', () => {
  it('lowercases the url', () => {
    expect(normalizeUrl('HTTPS://Example.COM/Path')).toBe('https://example.com/path');
  });

  it('strips trailing slash', () => {
    expect(normalizeUrl('https://example.com/mcp/')).toBe('https://example.com/mcp');
  });

  it('converts http to https', () => {
    expect(normalizeUrl('http://example.com')).toBe('https://example.com');
  });

  it('is idempotent', () => {
    const url = 'https://example.com/mcp';
    expect(normalizeUrl(normalizeUrl(url))).toBe(url);
  });
});

describe('hashUrl', () => {
  it('returns a 16-char hex string', () => {
    const h = hashUrl('https://example.com');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it('same url → same hash', () => {
    expect(hashUrl('https://example.com')).toBe(hashUrl('https://example.com'));
  });

  it('different urls → different hashes', () => {
    expect(hashUrl('https://a.com')).not.toBe(hashUrl('https://b.com'));
  });
});

describe('appendHistory / loadHistory', () => {
  it('loads empty array when no file exists', () => {
    const runs = loadHistory('https://example.com', makeTmpDir());
    expect(runs).toEqual([]);
  });

  it('appends a run and loads it back', () => {
    const run = makeRun('https://example.com/mcp', '2024-01-01T00:00:00.000Z');
    appendHistory(run, makeTmpDir());
    const loaded = loadHistory(run.normalizedUrl, makeTmpDir());
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.timestamp).toBe('2024-01-01T00:00:00.000Z');
  });

  it('appends multiple runs (never overwrites)', () => {
    const dir = makeTmpDir();
    const run1 = makeRun('https://example.com', '2024-01-01T00:00:00.000Z');
    const run2 = makeRun('https://example.com', '2024-01-02T00:00:00.000Z');
    appendHistory(run1, dir);
    appendHistory(run2, dir);
    const loaded = loadHistory(run1.normalizedUrl, dir);
    expect(loaded).toHaveLength(2);
    expect(loaded[1]!.timestamp).toBe('2024-01-02T00:00:00.000Z');
  });

  it('normalizes url before hashing — same slot for http and https variants', () => {
    const dir = makeTmpDir();
    const run1 = makeRun('http://example.com', '2024-01-01T00:00:00.000Z');
    const run2 = makeRun('https://example.com', '2024-01-02T00:00:00.000Z');
    appendHistory(run1, dir);
    appendHistory(run2, dir);
    // Both should end up in the same file
    const loaded = loadHistory('https://example.com', dir);
    expect(loaded).toHaveLength(2);
  });
});

describe('latestRun', () => {
  it('returns null when no history', () => {
    expect(latestRun('https://example.com', makeTmpDir())).toBeNull();
  });

  it('returns the most recently appended run', () => {
    const dir = makeTmpDir();
    const run1 = makeRun('https://example.com', '2024-01-01T00:00:00.000Z');
    const run2 = makeRun('https://example.com', '2024-01-02T00:00:00.000Z');
    appendHistory(run1, dir);
    appendHistory(run2, dir);
    const latest = latestRun('https://example.com', dir);
    expect(latest?.timestamp).toBe('2024-01-02T00:00:00.000Z');
  });
});
