/**
 * Twig Markdown Reporter
 * Generates before/after optimization reports.
 */

import type { OptimizationResult } from '../optimizer/generator.js';
import type { ComparisonResult } from '../measurer/baseline.js';

export function renderOptimizationReport(results: OptimizationResult[]): string {
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [
    `# Twig Optimization Report`,
    `Generated: ${date}`,
    `Tools analyzed: ${results.length}`,
    '',
  ];

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Tool | Grade | Intent | Specificity | Selectability | Composite |');
  lines.push('|------|-------|--------|-------------|---------------|-----------|');
  for (const r of results) {
    const s = r.original.scores;
    lines.push(`| \`${r.tool}\` | **${r.original.grade}** | ${s.intentMatch} | ${s.specificity} | ${s.selectability} | ${r.original.composite} |`);
  }
  lines.push('');

  // Detail for each tool
  for (const r of results) {
    lines.push(`## \`${r.tool}\``);
    lines.push('');
    lines.push('### Current Description');
    lines.push('');
    lines.push(`> ${r.original.description || '*(empty)*'}`);
    lines.push('');

    if (r.original.issues.length > 0) {
      lines.push('**Issues:**');
      for (const issue of r.original.issues) {
        lines.push(`- ❌ ${issue}`);
      }
      lines.push('');
    }

    lines.push('### Recommended Replacement');
    lines.push('');
    lines.push(`> ${r.recommended.description}`);
    lines.push('');
    lines.push(`*Style: ${r.recommended.style} | ${r.recommended.rationale}*`);
    lines.push('');

    if (r.variants.length > 1) {
      lines.push('<details>');
      lines.push('<summary>All variants</summary>');
      lines.push('');
      for (const v of r.variants) {
        lines.push(`**Variant ${v.variant} (${v.style}):**`);
        lines.push(`> ${v.description}`);
        lines.push('');
      }
      lines.push('</details>');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function renderRevenueReport(comparison: ComparisonResult): string {
  const lines: string[] = [
    `# Twig Revenue Report`,
    `Wallet: \`${comparison.wallet}\``,
    `Period: ${comparison.current.periodDays} days`,
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    '',
    '## Revenue Comparison',
    '',
    '| Metric | Baseline | Current | Change |',
    '|--------|----------|---------|--------|',
    `| Transactions | ${comparison.baseline.transactions} | ${comparison.current.transactions} | ${comparison.delta.transactions >= 0 ? '+' : ''}${comparison.delta.transactions} (${comparison.delta.transactionsPct}%) |`,
    `| Unique Payers | ${comparison.baseline.uniquePayers} | ${comparison.current.uniquePayers} | ${comparison.delta.uniquePayers >= 0 ? '+' : ''}${comparison.delta.uniquePayers} |`,
    `| USDC Revenue | $${comparison.baseline.totalUSDC} | $${comparison.current.totalUSDC} | ${parseFloat(comparison.delta.totalUSDC) >= 0 ? '+' : ''}$${comparison.delta.totalUSDC} (${comparison.delta.totalUSDCPct}%) |`,
    '',
  ];

  const deltaUSDC = parseFloat(comparison.delta.totalUSDC);
  if (deltaUSDC > 0) {
    lines.push('## Twig Fee');
    lines.push('');
    lines.push(`Revenue increase attributable to description optimization: **+$${comparison.delta.totalUSDC} USDC** (${comparison.delta.totalUSDCPct}%)`);
    lines.push('');
    lines.push(`| Rate | Amount |`);
    lines.push(`|------|--------|`);
    lines.push(`| 15% of improvement | **$${comparison.twigFee15pct} USDC** |`);
    lines.push(`| 10% of improvement | $${comparison.twigFee10pct} USDC |`);
    lines.push('');
    lines.push('*Twig fee is 0 if revenue did not increase. Pay nothing if it doesn\'t work.*');
  } else {
    lines.push('## Twig Fee');
    lines.push('');
    lines.push('**$0.00** — Revenue did not increase. No fee owed.');
  }

  return lines.join('\n');
}
