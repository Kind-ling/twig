/**
 * Twig Monitor — Runner
 * Orchestrates a full monitor run: fetch, score, diff, gate, store.
 */

import { fetchMCPTools, fetchAgentCard } from '../analyzer/fetcher.js';
import { scoreDescription } from '../analyzer/scorer.js';
import { detectCategory, INTENT_QUERIES } from '../analyzer/intent-corpus.js';
import { checkPaymentGate, buildPaymentRequest } from '../payments/x402-gate.js';
import { normalizeUrl, appendHistory, latestRun } from './history.js';
import { diffRuns } from './diff.js';
import { getCompetitivePosition } from './competitive.js';
import type { MonitorRun, MonitorDiffReport, CompetitivePosition } from './types.js';

export interface RunOptions {
  /** Override storage dir for tests */
  historyDir?: string;
  receiptsDir?: string;
  /** Skip competitive lookup */
  skipCompetitive?: boolean;
  /** Pre-supplied tx hash (skips interactive prompt) */
  txHash?: string;
}

export interface RunResult {
  run: MonitorRun;
  diff: MonitorDiffReport | null;
  competitive: CompetitivePosition | null;
  isFirstRun: boolean;
  paymentUnverified: boolean;
  blocked: boolean;
  paymentRequest?: ReturnType<typeof buildPaymentRequest>;
}

export async function runMonitor(url: string, opts: RunOptions = {}): Promise<RunResult> {
  const normalizedUrl = normalizeUrl(url);
  const previous = latestRun(normalizedUrl, opts.historyDir);
  const isFirstRun = previous === null;

  // Payment gate check
  let paymentUnverified = false;

  if (!isFirstRun) {
    const gateResult = await checkPaymentGate({
      isFirstRun: false,
      txHash: opts.txHash,
      normalizedUrl,
      baseDir: opts.receiptsDir,
    });

    if (!gateResult.allowed) {
      // Need payment — return blocked with instructions
      let paymentRequest: ReturnType<typeof buildPaymentRequest> | undefined;
      try {
        paymentRequest = buildPaymentRequest(normalizedUrl);
      } catch {
        // wallet address not set, just return blocked
      }
      return {
        run: buildEmptyRun(url, normalizedUrl),
        diff: null,
        competitive: null,
        isFirstRun: false,
        paymentUnverified: false,
        blocked: true,
        paymentRequest,
      };
    }

    if (gateResult.unverified) {
      paymentUnverified = true;
    }
  }

  // Fetch and score
  const isAgentCard = url.includes('agent.json') || url.includes('.well-known');
  const fetchResult = isAgentCard ? await fetchAgentCard(url) : await fetchMCPTools(url);

  if (fetchResult.error || fetchResult.tools.length === 0) {
    throw new Error(fetchResult.error ?? `No tools found at ${url}`);
  }

  const toolResults = fetchResult.tools.map(tool => {
    const cat = detectCategory(tool.name, tool.description);
    const score = scoreDescription(tool, INTENT_QUERIES[cat]);
    return { name: tool.name, score };
  });

  const averageComposite =
    toolResults.reduce((s, t) => s + t.score.composite, 0) / toolResults.length;

  const run: MonitorRun = {
    url,
    normalizedUrl,
    timestamp: new Date().toISOString(),
    tools: toolResults,
    averageComposite: Math.round(averageComposite),
    paymentVerified: !paymentUnverified,
  };

  // Diff against previous run
  const diff = previous ? diffRuns(previous, run) : null;

  // Store run
  appendHistory(run, opts.historyDir);

  // Competitive position (first run only — free; subsequent runs included if paid)
  let competitive: CompetitivePosition | null = null;
  if (!opts.skipCompetitive) {
    competitive = await getCompetitivePosition(normalizedUrl, run.averageComposite).catch(
      () => null
    );
  }

  return {
    run,
    diff,
    competitive,
    isFirstRun,
    paymentUnverified,
    blocked: false,
  };
}

function buildEmptyRun(url: string, normalizedUrl: string): MonitorRun {
  return {
    url,
    normalizedUrl,
    timestamp: new Date().toISOString(),
    tools: [],
    averageComposite: 0,
    paymentVerified: false,
  };
}
