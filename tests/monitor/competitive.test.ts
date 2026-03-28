import { describe, it, expect, vi } from 'vitest';
import { getCompetitivePosition } from '../../src/monitor/competitive.js';

// Mock fetch globally for tests
const createFetchMock = (entries: Array<{ url: string }>) => {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ entries }),
  });
};

describe('getCompetitivePosition', () => {
  it('returns null when catalog is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    const result = await getCompetitivePosition('https://subject.com', 70, {
      catalogOverrideUrl: 'https://mock-catalog.invalid',
    });
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const result = await getCompetitivePosition('https://subject.com', 70, {
      catalogOverrideUrl: 'https://mock-catalog.invalid',
    });
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it('excludes subject url from peers', async () => {
    // Catalog contains only the subject URL — no peers to score
    const subjectUrl = 'https://subject.com';
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          // catalog fetch
          ok: true,
          json: async () => ({ entries: [{ url: subjectUrl }] }),
        })
    );
    const result = await getCompetitivePosition(subjectUrl, 70, {
      catalogOverrideUrl: 'https://mock-catalog.invalid',
      maxPeers: 5,
    });
    // Subject is filtered out, no peers remain
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it('computes correct rank when subject outperforms all peers', async () => {
    // We mock catalog, then mock peer tool fetches
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (callCount === 0) {
        callCount++;
        // catalog
        return {
          ok: true,
          json: async () => ({
            entries: [
              { url: 'https://peer1.com/mcp' },
              { url: 'https://peer2.com/mcp' },
            ],
          }),
        };
      }
      // Each peer tool endpoint — return empty (can't parse) so scoreEntry returns null
      callCount++;
      return { ok: false, json: async () => ({}) };
    }));

    const result = await getCompetitivePosition('https://subject.com', 80, {
      catalogOverrideUrl: 'https://mock-catalog.invalid',
      maxPeers: 10,
    });
    // All peers returned null from scoreEntry, so no peers → null result
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });
});
