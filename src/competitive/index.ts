/**
 * Twig Competitive Analysis
 * Ranks a tool against peers in its category from the x402 discovery catalog.
 */

import { fetchMCPTools } from '../analyzer/fetcher.js';
import { scoreDescription } from '../analyzer/scorer.js';
import { detectCategory, INTENT_QUERIES } from '../analyzer/intent-corpus.js';
import type { Category } from '../analyzer/intent-corpus.js';
import { fetchCatalog } from './catalog.js';
import type { CatalogEntry } from './catalog.js';

export interface CompetitiveResult {
  url: string;
  category: string;
  rank: number;        // 1-based
  total: number;
  percentile: number;  // 0-100
  score: number;       // our tool's score
  peers: PeerResult[];
  note?: string;
}

export interface PeerResult {
  url: string;
  name: string;
  score: number;
  rank: number;
}

const DEFAULT_CATALOG_URL = process.env['TWIG_CATALOG_URL'] ?? 'https://x402.org/discovery';

export async function runCompetitive(url: string, catalogUrl?: string): Promise<CompetitiveResult> {
  // Score our tool first
  const ourScore = await scoreUrl(url);
  const ourCategory = ourScore.category;

  // Fetch catalog
  const { entries, error } = await fetchCatalog(catalogUrl ?? DEFAULT_CATALOG_URL);

  if (error || entries.length === 0) {
    return {
      url,
      category: ourCategory,
      rank: 1,
      total: 1,
      percentile: 100,
      score: ourScore.composite,
      peers: [],
      note: error ?? 'Catalog returned no entries — running solo.',
    };
  }

  // Find peers in same category (including our tool if listed)
  const peers = entries.filter(e => e.category === ourCategory);

  // Score all peers
  const scoredPeers = await Promise.all(
    peers.map(async (entry): Promise<PeerResult> => {
      // If same URL as ours, use our score directly
      const normalizedEntry = normalizeUrl(entry.url);
      const normalizedOurs = normalizeUrl(url);
      if (normalizedEntry === normalizedOurs) {
        return { url: entry.url, name: entry.name, score: ourScore.composite, rank: 0 };
      }
      const s = await scoreCatalogEntry(entry);
      return { url: entry.url, name: entry.name, score: s, rank: 0 };
    })
  );

  // Check if our URL was already in the peers list
  const ourUrlNormalized = normalizeUrl(url);
  const ourPeerIndex = scoredPeers.findIndex(p => normalizeUrl(p.url) === ourUrlNormalized);

  // Add our tool if not already present
  const ourName = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (ourPeerIndex === -1) {
    scoredPeers.push({ url, name: ourName, score: ourScore.composite, rank: 0 });
  }

  // Sort descending by score
  scoredPeers.sort((a, b) => b.score - a.score);

  // Assign ranks (1-based, ties get same rank)
  let currentRank = 1;
  for (let i = 0; i < scoredPeers.length; i++) {
    if (i > 0 && scoredPeers[i]!.score < scoredPeers[i - 1]!.score) {
      currentRank = i + 1;
    }
    scoredPeers[i]!.rank = currentRank;
  }

  const ourEntry = scoredPeers.find(p => normalizeUrl(p.url) === ourUrlNormalized);
  const ourRank = ourEntry?.rank ?? scoredPeers.length;
  const total = scoredPeers.length;
  const percentile = total === 1 ? 100 : Math.round(((total - ourRank) / (total - 1)) * 100);

  return {
    url,
    category: ourCategory,
    rank: ourRank,
    total,
    percentile,
    score: ourScore.composite,
    peers: scoredPeers,
  };
}

interface ScoredUrl {
  composite: number;
  category: Category;
}

async function scoreUrl(url: string): Promise<ScoredUrl> {
  try {
    const result = await fetchMCPTools(url);
    if (result.tools.length > 0) {
      const tool = result.tools[0]!;
      const category = detectCategory(tool.name, tool.description);
      const intentQueries = INTENT_QUERIES[category];
      const scored = scoreDescription(tool, intentQueries);
      return { composite: scored.composite, category };
    }
  } catch {
    // fall through
  }
  return { composite: 0, category: 'general' };
}

async function scoreCatalogEntry(entry: CatalogEntry): Promise<number> {
  try {
    const result = await fetchMCPTools(entry.url);
    if (result.tools.length > 0) {
      const tool = result.tools[0]!;
      const category = detectCategory(tool.name, tool.description);
      const intentQueries = INTENT_QUERIES[category];
      const scored = scoreDescription(tool, intentQueries);
      return scored.composite;
    }
  } catch {
    // fall through
  }
  // Fall back to scoring the catalog description if live fetch fails
  const fakeTool = { name: entry.name, description: entry.description };
  const category = entry.category;
  const intentQueries = INTENT_QUERIES[category];
  const scored = scoreDescription(fakeTool, intentQueries);
  return scored.composite;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '').toLowerCase();
}
