#!/usr/bin/env node
/**
 * Twig CLI
 * twig analyze <url>
 * twig optimize <url> [--category crypto-defi]
 * twig measure <wallet> [--baseline] [--compare] [--days 7]
 * twig report <wallet> [--period 30d]
 */

import { fetchMCPTools, fetchAgentCard } from './analyzer/fetcher.js';
import { scoreDescription } from './analyzer/scorer.js';
import { detectCategory, INTENT_QUERIES, type Category } from './analyzer/intent-corpus.js';
import { generateOptimizedDescriptions } from './optimizer/generator.js';
import { measureRevenue } from './measurer/onchain.js';
import { saveBaseline, loadBaseline, compareToBaseline } from './measurer/baseline.js';
import { renderOptimizationReport, renderRevenueReport } from './reporter/markdown.js';

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

function printHelp(): void {
  console.log(`
Twig — MCP description optimizer for the agent economy

USAGE:
  twig analyze <url>              Score current descriptions (1-100)
  twig optimize <url>             Generate optimized variants
  twig measure <wallet>           Measure x402 revenue
  twig measure <wallet> --baseline   Save baseline for comparison
  twig measure <wallet> --compare    Compare to saved baseline
  twig report <wallet>            Full revenue report

OPTIONS:
  --category <cat>    Force category: crypto-defi, research, media, data-feeds
  --days <n>          Measurement period (default: 7)
  --period <n>d       Report period (default: 30d)

EXAMPLES:
  twig analyze https://myservice.com/.well-known/agent.json
  twig optimize https://myservice.com/mcp --category crypto-defi
  twig measure 0xYourWallet --baseline
  twig report 0xYourWallet --period 30d
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
