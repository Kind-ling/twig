/**
 * Twig Competitive Catalog Fetcher
 * Fetches the x402 discovery catalog for competitive analysis.
 */

import type { Category } from '../analyzer/intent-corpus.js';

export interface CatalogEntry {
  url: string;
  name: string;
  description: string;
  category: Category;
}

export interface CatalogResponse {
  entries: CatalogEntry[];
  error?: string;
}

const DEFAULT_CATALOG_URL = process.env['TWIG_CATALOG_URL'] ?? 'https://x402.org/discovery';

export async function fetchCatalog(url: string = DEFAULT_CATALOG_URL): Promise<CatalogResponse> {
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return { entries: [], error: `Catalog returned HTTP ${res.status}` };
    }

    const raw = await res.json() as unknown;

    const entries = parseCatalog(raw);
    return { entries };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { entries: [], error: `Catalog unreachable: ${message}` };
  }
}

function parseCatalog(raw: unknown): CatalogEntry[] {
  if (!raw || typeof raw !== 'object') return [];

  // Support { tools: [...] }, { entries: [...] }, or direct array
  const candidates: unknown[] =
    Array.isArray(raw) ? raw
    : Array.isArray((raw as Record<string, unknown>)['tools']) ? (raw as Record<string, unknown>)['tools'] as unknown[]
    : Array.isArray((raw as Record<string, unknown>)['entries']) ? (raw as Record<string, unknown>)['entries'] as unknown[]
    : [];

  const results: CatalogEntry[] = [];
  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const url = typeof entry['url'] === 'string' ? entry['url'] : '';
    const name = typeof entry['name'] === 'string' ? entry['name'] : url;
    const description = typeof entry['description'] === 'string' ? entry['description'] : '';
    const category = typeof entry['category'] === 'string' ? (entry['category'] as Category) : 'general';
    if (url) {
      results.push({ url, name, description, category });
    }
  }
  return results;
}
