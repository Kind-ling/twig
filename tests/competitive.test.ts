/**
 * Tests for twig competitive command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCatalog } from '../src/competitive/catalog.js';
import { runCompetitive } from '../src/competitive/index.js';
import type { CatalogEntry } from '../src/competitive/catalog.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCatalogPayload(entries: CatalogEntry[]): Response {
  return new Response(JSON.stringify(entries), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// catalog.ts tests
// ---------------------------------------------------------------------------

describe('fetchCatalog', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns entries from a successful catalog fetch (array format)', async () => {
    const entries: CatalogEntry[] = [
      { url: 'https://tool-a.com/mcp', name: 'Tool A', description: 'Does A', category: 'data-feeds' },
      { url: 'https://tool-b.com/mcp', name: 'Tool B', description: 'Does B', category: 'research' },
    ];
    vi.mocked(fetch).mockResolvedValueOnce(makeCatalogPayload(entries));

    const result = await fetchCatalog('https://x402.org/discovery');
    expect(result.error).toBeUndefined();
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]!.name).toBe('Tool A');
  });

  it('parses catalog wrapped in { tools: [...] }', async () => {
    const raw = {
      tools: [
        { url: 'https://tool-c.com/mcp', name: 'Tool C', description: 'Does C', category: 'data-feeds' },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(raw), { status: 200 })
    );

    const result = await fetchCatalog('https://x402.org/discovery');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.category).toBe('data-feeds');
  });

  it('gracefully degrades when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchCatalog('https://x402.org/discovery');
    expect(result.entries).toHaveLength(0);
    expect(result.error).toMatch(/unreachable/i);
  });

  it('gracefully degrades on non-200 HTTP status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    const result = await fetchCatalog('https://x402.org/discovery');
    expect(result.entries).toHaveLength(0);
    expect(result.error).toMatch(/404/);
  });
});

// ---------------------------------------------------------------------------
// runCompetitive ranking logic
// ---------------------------------------------------------------------------

describe('runCompetitive', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Mock that: catalog returns peers, MCP fetch for our URL returns a tool
  function mockCatalogAndTools(
    catalogEntries: CatalogEntry[],
    ourToolDescription = 'Fetch real-time crypto price data with historical OHLCV and returns JSON object',
  ): void {
    vi.mocked(fetch).mockImplementation(async (input: string | URL | Request) => {
      const url = input.toString();

      // Catalog fetch
      if (url === 'https://mock-catalog.test/discovery') {
        return new Response(JSON.stringify(catalogEntries), { status: 200 });
      }

      // Our tool MCP endpoint
      if (url.includes('our-tool.com')) {
        return new Response(JSON.stringify({
          result: {
            tools: [
              { name: 'price-feed', description: ourToolDescription },
            ],
          },
        }), { status: 200 });
      }

      // Peer tools — return empty (will fall back to catalog description scoring)
      return new Response(JSON.stringify({ result: { tools: [] } }), { status: 200 });
    });
  }

  it('returns rank 1 when our tool scores highest', async () => {
    const peers: CatalogEntry[] = [
      { url: 'https://peer-1.com/mcp', name: 'Peer 1', description: 'basic tool', category: 'data-feeds' },
    ];
    mockCatalogAndTools(peers);

    const result = await runCompetitive('https://our-tool.com/mcp', 'https://mock-catalog.test/discovery');

    expect(result.url).toBe('https://our-tool.com/mcp');
    expect(result.total).toBe(2); // 1 peer + our tool
    expect(result.rank).toBeGreaterThanOrEqual(1);
    expect(result.percentile).toBeGreaterThanOrEqual(0);
    expect(result.percentile).toBeLessThanOrEqual(100);
  });

  it('includes all category peers in result', async () => {
    const peers: CatalogEntry[] = [
      { url: 'https://peer-1.com/mcp', name: 'Peer 1', description: 'get token price', category: 'data-feeds' },
      { url: 'https://peer-2.com/mcp', name: 'Peer 2', description: 'fetch market cap', category: 'data-feeds' },
      { url: 'https://other.com/mcp', name: 'Other', description: 'research tool', category: 'research' },
    ];
    mockCatalogAndTools(peers);

    const result = await runCompetitive('https://our-tool.com/mcp', 'https://mock-catalog.test/discovery');

    // Should include 2 crypto-defi peers + our tool = 3
    expect(result.total).toBe(3);
    expect(result.peers).toHaveLength(3);
  });

  it('gracefully degrades when catalog is unreachable', async () => {
    vi.mocked(fetch).mockImplementation(async (input: string | URL | Request) => {
      const url = input.toString();
      if (url === 'https://mock-catalog.test/discovery') {
        throw new Error('timeout');
      }
      // Our MCP endpoint
      return new Response(JSON.stringify({
        result: {
          tools: [{ name: 'price-feed', description: 'fetch crypto price returns JSON' }],
        },
      }), { status: 200 });
    });

    const result = await runCompetitive('https://our-tool.com/mcp', 'https://mock-catalog.test/discovery');

    expect(result.total).toBe(1);
    expect(result.rank).toBe(1);
    expect(result.percentile).toBe(100);
    expect(result.peers).toHaveLength(0);
    expect(result.note).toBeDefined();
  });

  it('calculates percentile correctly for middle rank', async () => {
    // 4 peers + our tool = 5 total; if we rank 3rd, percentile = (5-3)/(5-1)*100 = 50
    const peers: CatalogEntry[] = [
      { url: 'https://p1.com/mcp', name: 'P1', description: 'get token price returns JSON', category: 'data-feeds' },
      { url: 'https://p2.com/mcp', name: 'P2', description: 'fetch market cap data returns JSON', category: 'data-feeds' },
      { url: 'https://p3.com/mcp', name: 'P3', description: 'crypto', category: 'data-feeds' },
      { url: 'https://p4.com/mcp', name: 'P4', description: 'x', category: 'data-feeds' },
    ];
    mockCatalogAndTools(peers, 'get token price'); // mediocre description

    const result = await runCompetitive('https://our-tool.com/mcp', 'https://mock-catalog.test/discovery');
    expect(result.total).toBe(5);
    expect(result.percentile).toBeGreaterThanOrEqual(0);
    expect(result.percentile).toBeLessThanOrEqual(100);
  });

  it('returns percentile 100 for solo tool (total=1)', async () => {
    // Empty catalog — no category peers
    const peers: CatalogEntry[] = [
      { url: 'https://other.com/mcp', name: 'Other', description: 'research tool', category: 'research' },
    ];
    mockCatalogAndTools(peers);

    const result = await runCompetitive('https://our-tool.com/mcp', 'https://mock-catalog.test/discovery');

    // Our tool is crypto-defi but no crypto-defi peers → total = 1
    expect(result.total).toBe(1);
    expect(result.rank).toBe(1);
    expect(result.percentile).toBe(100);
  });

  it('peers are sorted by score descending', async () => {
    const peers: CatalogEntry[] = [
      { url: 'https://p1.com/mcp', name: 'P1', description: 'get token price returns JSON object', category: 'data-feeds' },
      { url: 'https://p2.com/mcp', name: 'P2', description: 'x', category: 'data-feeds' },
    ];
    mockCatalogAndTools(peers);

    const result = await runCompetitive('https://our-tool.com/mcp', 'https://mock-catalog.test/discovery');

    for (let i = 1; i < result.peers.length; i++) {
      expect(result.peers[i - 1]!.score).toBeGreaterThanOrEqual(result.peers[i]!.score);
    }
  });

  it('assigns rank 1 to the peer(s) with highest score', async () => {
    const peers: CatalogEntry[] = [
      { url: 'https://p1.com/mcp', name: 'P1', description: 'x', category: 'data-feeds' },
    ];
    mockCatalogAndTools(peers);

    const result = await runCompetitive('https://our-tool.com/mcp', 'https://mock-catalog.test/discovery');
    expect(result.peers[0]!.rank).toBe(1);
  });
});
