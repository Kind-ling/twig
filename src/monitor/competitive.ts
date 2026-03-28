/**
 * Twig Monitor — Competitive Position
 * Fetches x402-discovery catalog and scores category peers.
 * Gracefully degrades if catalog unavailable.
 */

import { fetchMCPTools, fetchAgentCard } from '../analyzer/fetcher.js';
import { scoreDescription } from '../analyzer/scorer.js';
import { detectCategory, INTENT_QUERIES } from '../analyzer/intent-corpus.js';
import type { CompetitorEntry, CompetitivePosition } from './types.js';

// x402-discovery public catalog endpoint (read-only, no auth)
const DISCOVERY_CATALOG_URL =
  'https://x402-discovery.kindling.ai/v1/catalog';

export interface CatalogEntry {
  url: string;
  category?: string;
}

/**
 * Fetch peer catalog. Returns empty array on failure (graceful degradation).
 */
export async function fetchCatalog(
  overrideUrl?: string
): Promise<CatalogEntry[]> {
  const url = overrideUrl ?? DISCOVERY_CATALOG_URL;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const json = (await response.json()) as { entries?: CatalogEntry[] };
    return json.entries ?? [];
  } catch {
    return [];
  }
}

/**
 * Score a single catalog entry. Returns null if the URL can't be fetched.
 */
async function scoreEntry(entry: CatalogEntry): Promise<CompetitorEntry | null> {
  try {
    const isAgentCard =
      entry.url.includes('agent.json') || entry.url.includes('.well-known');
    const result = isAgentCard
      ? await fetchAgentCard(entry.url)
      : await fetchMCPTools(entry.url);

    if (result.error || result.tools.length === 0) return null;

    const scores = result.tools.map(tool => {
      const cat = detectCategory(tool.name, tool.description);
      return scoreDescription(tool, INTENT_QUERIES[cat]).composite;
    });

    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return {
      url: entry.url,
      averageComposite: Math.round(avg),
      toolCount: result.tools.length,
    };
  } catch {
    return null;
  }
}

/**
 * Compute competitive position for a subject URL.
 * Fetches up to `maxPeers` entries from the catalog, scores them,
 * and ranks the subject.
 */
export async function getCompetitivePosition(
  subjectUrl: string,
  subjectScore: number,
  opts?: {
    maxPeers?: number;
    catalogOverrideUrl?: string;
  }
): Promise<CompetitivePosition | null> {
  const maxPeers = opts?.maxPeers ?? 10;
  const catalog = await fetchCatalog(opts?.catalogOverrideUrl);

  if (catalog.length === 0) return null;

  // Score up to maxPeers entries (excluding subject itself)
  const peers: CompetitorEntry[] = [];
  for (const entry of catalog.slice(0, maxPeers * 2)) {
    if (entry.url === subjectUrl) continue;
    if (peers.length >= maxPeers) break;
    const scored = await scoreEntry(entry);
    if (scored) peers.push(scored);
  }

  if (peers.length === 0) return null;

  // Rank: how many peers does subject beat?
  const rank = peers.filter(p => subjectScore > p.averageComposite).length + 1;
  const totalPeers = peers.length;
  const percentile = Math.round(((totalPeers - rank + 1) / totalPeers) * 100);

  return {
    url: subjectUrl,
    subjectScore,
    peers,
    rank,
    percentile,
    totalPeers,
  };
}
