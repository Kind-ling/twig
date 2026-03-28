/**
 * Twig Monitor — History Storage
 * Append-only history per normalized URL hash.
 * Default storage: ~/.twig/history/<urlHash>.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import type { MonitorRun } from './types.js';

export function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  // http → https
  if (normalized.startsWith('http://')) {
    normalized = 'https://' + normalized.slice(7);
  }
  // strip trailing slash
  normalized = normalized.replace(/\/+$/, '');
  return normalized;
}

export function hashUrl(normalizedUrl: string): string {
  return createHash('sha256').update(normalizedUrl).digest('hex').slice(0, 16);
}

export function getHistoryDir(baseDir?: string): string {
  const home = process.env['HOME'] ?? '/tmp';
  return baseDir ?? join(home, '.twig', 'history');
}

export function historyPath(normalizedUrl: string, baseDir?: string): string {
  return join(getHistoryDir(baseDir), `${hashUrl(normalizedUrl)}.json`);
}

export function loadHistory(normalizedUrl: string, baseDir?: string): MonitorRun[] {
  const path = historyPath(normalizedUrl, baseDir);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf8');
  try {
    return JSON.parse(raw) as MonitorRun[];
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        level: 'warn',
        event: 'history-parse-error',
        path,
        message: err instanceof Error ? err.message : String(err),
      }) + '\n'
    );
    return [];
  }
}

export function appendHistory(run: MonitorRun, baseDir?: string): void {
  const dir = getHistoryDir(baseDir);
  mkdirSync(dir, { recursive: true });
  const path = historyPath(run.normalizedUrl, baseDir);
  const existing = loadHistory(run.normalizedUrl, baseDir);
  existing.push(run);
  writeFileSync(path, JSON.stringify(existing, null, 2));
}

export function latestRun(normalizedUrl: string, baseDir?: string): MonitorRun | null {
  const history = loadHistory(normalizedUrl, baseDir);
  if (history.length === 0) return null;
  return history[history.length - 1]!;
}
