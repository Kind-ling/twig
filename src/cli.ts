#!/usr/bin/env node
/**
 * Twig CLI
 * twig analyze <url>
 * twig optimize <url> [--category crypto-defi]
 * twig measure <wallet> [--baseline] [--compare] [--days 7]
 * twig report <wallet> [--period 30d]
 * twig monitor <url>
 * twig monitor --history <url>
 */

import { fetchMCPTools, fetchAgentCard } from './analyzer/fetcher.js';
import { runCompetitive } from './competitive/index.js';
import { scoreDescription } from './analyzer/scorer.js';
import { detectCategory, INTENT_QUERIES, type Category } from './analyzer/intent-corpus.js';
import { generateOptimizedDescriptions } from './optimizer/generator.js';
import { measureRevenue } from './measurer/onchain.js';
import { saveBaseline, loadBaseline, compareToBaseline } from './measurer/baseline.js';
import { renderOptimizationReport, renderRevenueReport } from './reporter/markdown.js';
import { runMonitor } from './monitor/runner.js';
import { loadHistory, normalizeUrl } from './monitor/history.js';
import { getPaymentAmount } from './payments/x402-gate.js';

const args = process.argv.slice(2);
const command = args[0];
const target = args[1];
const flags = parseFlags(args.slice(2));

async function main(): Promise<void> {
  switch (command) {
    case 'analyze':
      await runAnalyze(target ?? '');
      break;
    case 'optimize':
      await runOptimize(target ?? '', flags['category'] as string | undefined);
      break;
    case 'measure':
      await runMeasure(target ?? '', flags);
      break;
    case 'report':
      await runReport(target ?? '', flags);
      break;
    case 'monitor':
      if (flags['history']) {
        await runMonitorHistory(target ?? '');
      } else {
        await runMonitorCmd(target ?? '', flags);
      }
      break;
    case 'competitive':
      await runCompetitiveCmd(target ?? '');
      break;
    default:
      printHelp();
  }
}

async function runAnalyze(url: string): Promise<void> {
  if (!url) { console.error('Usage: twig analyze <url>'); process.exit(1); }

  console.log(`\n🔍 Analyzing: ${url}\n`);

  const isAgentCard = url.includes('agent.json') || flags['agent-card'];
  const result = isAgentCard
    ? await fetchAgentCard(url)
    : await fetchMCPTools(url);

  if (result.error) {
    console.error(`❌ ${result.error}`);
    process.exit(1);
  }

  if (result.tools.length === 0) {
    console.log('No tools found at this URL.');
    return;
  }

  console.log(`Found ${result.tools.length} tool(s)\n`);
  console.log('Tool | Grade | Composite | Issues');
  console.log('-----|-------|-----------|-------');

  for (const tool of result.tools) {
    const category = detectCategory(tool.name, tool.description);
    const intentQueries = INTENT_QUERIES[category];
    const score = scoreDescription(tool, intentQueries);
    const issueStr = score.issues.length > 0 ? score.issues[0] : '✓ OK';
    console.log(`${tool.name.padEnd(30)} | ${score.grade} | ${String(score.composite).padStart(3)} | ${issueStr}`);
  }

  const avgScore = result.tools.reduce((sum, tool) => {
    const cat = detectCategory(tool.name, tool.description);
    return sum + scoreDescription(tool, INTENT_QUERIES[cat]).composite;
  }, 0) / result.tools.length;

  console.log(`\nAverage score: ${Math.round(avgScore)}/100`);
  if (avgScore < 60) {
    console.log(`\n⚡ Run: twig optimize ${url}`);
  }
}

async function runOptimize(url: string, category?: string): Promise<void> {
  if (!url) { console.error('Usage: twig optimize <url>'); process.exit(1); }

  console.log(`\n⚡ Optimizing: ${url}\n`);

  const isAgentCard = url.includes('agent.json') || flags['agent-card'];
  const result = isAgentCard ? await fetchAgentCard(url) : await fetchMCPTools(url);

  if (result.error || result.tools.length === 0) {
    console.error(`❌ ${result.error ?? 'No tools found'}`);
    process.exit(1);
  }

  const optimizations = result.tools.map(tool => {
    const detected = detectCategory(tool.name, tool.description);
    const cat: Category = (category && Object.keys(INTENT_QUERIES).includes(category))
      ? (category as Category)
      : detected;
    const score = scoreDescription(tool, INTENT_QUERIES[cat]);
    return generateOptimizedDescriptions(tool, score, cat);
  });

  const report = renderOptimizationReport(optimizations);
  console.log(report);
}

async function runMeasure(wallet: string, flags: Record<string, unknown>): Promise<void> {
  if (!wallet) { console.error('Usage: twig measure <wallet>'); process.exit(1); }

  const days = parseInt(String(flags['days'] ?? '7'));
  console.log(`\n📊 Measuring revenue for ${wallet} (${days} days)\n`);

  const snapshot = await measureRevenue(wallet, days);
  console.log(`Transactions: ${snapshot.transactions}`);
  console.log(`Unique payers: ${snapshot.uniquePayers}`);
  console.log(`USDC received: $${snapshot.totalUSDC}`);

  if (flags['baseline']) {
    saveBaseline(snapshot);
    console.log(`\n✅ Baseline saved. Run after optimization with: twig measure ${wallet} --compare`);
  } else if (flags['compare']) {
    const baseline = loadBaseline(wallet);
    if (!baseline) {
      console.error('No baseline found. Run: twig measure <wallet> --baseline');
      process.exit(1);
    }
    const comparison = compareToBaseline(snapshot, baseline);
    const report = renderRevenueReport(comparison);
    console.log('\n' + report);
  }
}

async function runReport(wallet: string, flags: Record<string, unknown>): Promise<void> {
  const days = parseInt(String(flags['period']?.toString().replace('d', '') ?? '30'));
  const snapshot = await measureRevenue(wallet, days);
  const baseline = loadBaseline(wallet);

  if (!baseline) {
    console.error('No baseline found. Run: twig measure <wallet> --baseline first.');
    process.exit(1);
  }

  const comparison = compareToBaseline(snapshot, baseline);
  console.log(renderRevenueReport(comparison));
}

async function runMonitorCmd(url: string, flags: Record<string, unknown>): Promise<void> {
  if (!url) {
    process.stderr.write('Usage: twig monitor <url>\n');
    process.exit(1);
  }

  process.stderr.write(`\n🔭 Monitoring: ${url}\n\n`);

  const txHash = typeof flags['tx'] === 'string' ? flags['tx'] : undefined;

  let result;
  try {
    result = await runMonitor(url, { txHash, skipCompetitive: false });
  } catch (err) {
    process.stderr.write(`❌ ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  if (result.blocked) {
    const amount = getPaymentAmount();
    process.stderr.write(`\n💳 Payment required: $${amount} USDC on Base\n`);
    if (result.paymentRequest) {
      process.stderr.write(`   Send to: ${result.paymentRequest.walletAddress}\n`);
      process.stderr.write(`   Amount:   ${amount} USDC\n`);
      process.stderr.write(`\n   After sending, re-run with: twig monitor ${url} --tx <txHash>\n\n`);
    } else {
      process.stderr.write(`   Set TWIG_PAYMENT_ADDRESS env var to enable payments.\n\n`);
    }
    process.exit(1);
  }

  const prefix = result.paymentUnverified ? '[PAYMENT UNVERIFIED] ' : '';
  process.stdout.write(`${prefix}Monitor run: ${result.run.timestamp}\n`);
  process.stdout.write(`Average score: ${result.run.averageComposite}/100\n`);

  if (result.isFirstRun) {
    process.stdout.write(`\n✅ First run — baseline stored. Future runs are $${getPaymentAmount()} USDC.\n`);
  }

  if (result.diff) {
    process.stdout.write(`\n📊 Score diff vs previous run:\n`);
    process.stdout.write(`   Average delta: ${result.diff.averageDelta > 0 ? '+' : ''}${result.diff.averageDelta}\n`);
    process.stdout.write(`   Improved: ${result.diff.improved} | Regressed: ${result.diff.regressed} | Unchanged: ${result.diff.unchanged}\n`);

    for (const d of result.diff.diffs) {
      const delta = d.compositeDelta > 0 ? `+${d.compositeDelta}` : String(d.compositeDelta);
      process.stdout.write(`   ${d.toolName}: ${d.before.composite} → ${d.after.composite} (${delta})`);
      if (d.gradeChanged) process.stdout.write(` [grade: ${d.before.grade} → ${d.after.grade}]`);
      process.stdout.write('\n');
      for (const issue of d.resolvedIssues) process.stdout.write(`     ✅ Resolved: ${issue}\n`);
      for (const issue of d.newIssues) process.stdout.write(`     ❗ New issue: ${issue}\n`);
    }
  }

  if (result.competitive) {
    const c = result.competitive;
    process.stdout.write(`\n🏆 Competitive position: rank ${c.rank}/${c.totalPeers} (${c.percentile}th percentile)\n`);
  } else if (!result.isFirstRun) {
    process.stdout.write(`\n⚠️  Competitive data unavailable (catalog unreachable)\n`);
  }
}

async function runMonitorHistory(url: string): Promise<void> {
  if (!url) {
    process.stderr.write('Usage: twig monitor --history <url>\n');
    process.exit(1);
  }

  const normalized = normalizeUrl(url);
  const history = loadHistory(normalized);

  if (history.length === 0) {
    process.stdout.write(`No history found for ${url}\n`);
    process.stdout.write(`Run: twig monitor ${url}\n`);
    return;
  }

  process.stdout.write(`\n📋 Monitor history for ${url}\n\n`);
  process.stdout.write(`Date                  | Score | Grade | Verified\n`);
  process.stdout.write(`----------------------|-------|-------|----------\n`);

  for (const run of history) {
    const date = run.timestamp.slice(0, 19).replace('T', ' ');
    const avgGrade = run.tools.length > 0 ? run.tools[0]!.score.grade : '?';
    const verified = run.paymentVerified ? '✅' : (run.tools.length > 0 ? '🆓' : '❓');
    process.stdout.write(
      `${date} | ${String(run.averageComposite).padStart(5)} | ${avgGrade.padEnd(5)} | ${verified}\n`
    );
  }
  process.stdout.write('\n');
}

async function runCompetitiveCmd(url: string): Promise<void> {
  if (!url) { console.error('Usage: twig competitive <url>'); process.exit(1); }

  console.log(`\n🏆 Competitive analysis: ${url}\n`);

  const result = await runCompetitive(url);

  if (result.note) {
    console.log(`⚠️  ${result.note}`);
    console.log(`\nCategory: ${result.category} | Your rank: ${result.rank}/${result.total} (${result.percentile}th percentile)\n`);
    return;
  }

  // Print table header
  const COL_RANK = 4;
  const COL_NAME = 30;
  const COL_SCORE = 7;
  const COL_URL = 50;

  const header = [
    '   ' + 'Rank'.padEnd(COL_RANK),
    'Name'.padEnd(COL_NAME),
    'Score'.padEnd(COL_SCORE),
    'URL',
  ].join(' ');
  const divider = '-'.repeat(header.length);

  console.log(header);
  console.log(divider);

  const ourUrlNorm = url.replace(/\/$/, '').toLowerCase();

  for (const peer of result.peers) {
    const isOurs = peer.url.replace(/\/$/, '').toLowerCase() === ourUrlNorm;
    const arrow = isOurs ? '→' : ' ';
    const rank = String(peer.rank).padEnd(COL_RANK);
    const name = peer.name.substring(0, COL_NAME - 1).padEnd(COL_NAME);
    const score = String(peer.score).padEnd(COL_SCORE);
    const peerUrl = peer.url.substring(0, COL_URL);
    console.log(`${arrow}  ${rank} ${name} ${score} ${peerUrl}`);
  }

  console.log(divider);
  console.log(`\nCategory: ${result.category} | Your rank: ${result.rank}/${result.total} (${result.percentile}th percentile)\n`);
}

function printHelp(): void {
  process.stdout.write(`
Twig — MCP description optimizer for the agent economy

USAGE:
  twig analyze <url>              Score current descriptions (1-100)
  twig optimize <url>             Generate optimized variants
  twig measure <wallet>           Measure x402 revenue
  twig measure <wallet> --baseline   Save baseline for comparison
  twig measure <wallet> --compare    Compare to saved baseline
  twig report <wallet>            Full revenue report
  twig monitor <url>              Run continuous monitoring (first run free)
  twig monitor --history <url>    Show all prior monitor runs

OPTIONS:
  --category <cat>    Force category: crypto-defi, research, media, data-feeds
  --days <n>          Measurement period (default: 7)
  --period <n>d       Report period (default: 30d)
  --tx <hash>         Provide payment tx hash for monitor command

ENV:
  TWIG_PAYMENT_ADDRESS   Your Base wallet address (required for payments)
  TWIG_MONITOR_PRICE     Payment amount in USDC (default: 0.50)

EXAMPLES:
  twig analyze https://myservice.com/.well-known/agent.json
  twig optimize https://myservice.com/mcp --category crypto-defi
  twig measure 0xYourWallet --baseline
  twig report 0xYourWallet --period 30d
  twig monitor https://myservice.com/.well-known/agent.json
  twig monitor --history https://myservice.com/.well-known/agent.json
`);
}

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

main().catch(console.error);
