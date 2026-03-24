/**
 * Twig Baseline Manager
 * Stores and compares revenue snapshots for before/after measurement.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { RevenueSnapshot } from './onchain.js';

const DATA_DIR = join(process.env['HOME'] ?? '/tmp', '.twig', 'baselines');

export interface ComparisonResult {
  wallet: string;
  baseline: RevenueSnapshot;
  current: RevenueSnapshot;
  delta: {
    transactions: number;
    transactionsPct: number;
    uniquePayers: number;
    totalUSDC: string;
    totalUSDCPct: number;
  };
  twigFee15pct: string;
  twigFee10pct: string;
}

export function saveBaseline(snapshot: RevenueSnapshot): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const path = join(DATA_DIR, `${snapshot.wallet.toLowerCase()}.json`);
  writeFileSync(path, JSON.stringify(snapshot, null, 2));
}

export function loadBaseline(wallet: string): RevenueSnapshot | null {
  const path = join(DATA_DIR, `${wallet.toLowerCase()}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as RevenueSnapshot;
}

export function compareToBaseline(current: RevenueSnapshot, baseline: RevenueSnapshot): ComparisonResult {
  const txDelta = current.transactions - baseline.transactions;
  const txPct = baseline.transactions > 0
    ? Math.round((txDelta / baseline.transactions) * 100)
    : 0;

  const payerDelta = current.uniquePayers - baseline.uniquePayers;

  const currentUSDC = parseFloat(current.totalUSDC);
  const baselineUSDC = parseFloat(baseline.totalUSDC);
  const usdcDelta = currentUSDC - baselineUSDC;
  const usdcPct = baselineUSDC > 0
    ? Math.round((usdcDelta / baselineUSDC) * 100)
    : 0;

  const twigFee15 = Math.max(0, usdcDelta * 0.15).toFixed(2);
  const twigFee10 = Math.max(0, usdcDelta * 0.10).toFixed(2);

  return {
    wallet: current.wallet,
    baseline,
    current,
    delta: {
      transactions: txDelta,
      transactionsPct: txPct,
      uniquePayers: payerDelta,
      totalUSDC: usdcDelta.toFixed(2),
      totalUSDCPct: usdcPct,
    },
    twigFee15pct: twigFee15,
    twigFee10pct: twigFee10,
  };
}
