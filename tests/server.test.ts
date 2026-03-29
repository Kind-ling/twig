/**
 * Twig Server — Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/index.js';

const TEST_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12';
const app = createApp(TEST_ADDRESS);

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('exposes only last 4 chars of payment address', async () => {
    const res = await request(app).get('/health');
    expect(res.body.data.paymentAddress).toBe('0x...ef12');
    expect(res.body.data.paymentAddress).not.toContain(TEST_ADDRESS.slice(2, 10));
  });

  it('returns version', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.body.data.version).toBe('string');
    expect(res.body.data.version.length).toBeGreaterThan(0);
  });
});

describe('POST /analyze', () => {
  it('returns grade and score for a description', async () => {
    const res = await request(app).post('/analyze').send({
      description: 'Searches GitHub repositories by name and returns a list of matching repos with stars, forks, and description.',
      name: 'search_github',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.grade).toMatch(/^[A-F]$/);
    expect(typeof res.body.data.score).toBe('number');
    expect(Array.isArray(res.body.data.issues)).toBe(true);
    expect(Array.isArray(res.body.data.suggestions)).toBe(true);
  });

  it('returns dimensions object with expected keys', async () => {
    const res = await request(app).post('/analyze').send({
      description: 'Fetches weather data for a given city and returns temperature and conditions.',
      name: 'get_weather',
    });
    expect(res.status).toBe(200);
    const dims = res.body.data.dimensions;
    expect(typeof dims.intentMatch).toBe('number');
    expect(typeof dims.specificity).toBe('number');
    expect(typeof dims.selectability).toBe('number');
  });

  it('returns 400 if neither url nor description provided', async () => {
    const res = await request(app).post('/analyze').send({ name: 'tool' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/url or description/i);
  });
});

describe('POST /optimize', () => {
  it('returns variants array', async () => {
    const res = await request(app).post('/optimize').send({
      description: 'Get data.',
      name: 'get_data',
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.variants)).toBe(true);
    expect(res.body.data.variants.length).toBeGreaterThan(0);
  });

  it('each variant has style, description, score, grade', async () => {
    const res = await request(app).post('/optimize').send({
      description: 'Queries a database and returns records.',
      name: 'query_db',
    });
    expect(res.status).toBe(200);
    for (const v of res.body.data.variants) {
      expect(typeof v.style).toBe('string');
      expect(typeof v.description).toBe('string');
      expect(typeof v.score).toBe('number');
      expect(v.grade).toMatch(/^[A-F]$/);
    }
  });

  it('returns 400 if description missing', async () => {
    const res = await request(app).post('/optimize').send({ name: 'tool' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/description/i);
  });
});

describe('POST /monitor', () => {
  it('returns 402 with payment address when no txHash', async () => {
    const res = await request(app).post('/monitor').send({
      url: 'https://example.com/mcp',
    });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('payment-required');
    expect(res.body.error.payment.address).toBe(TEST_ADDRESS);
    expect(res.body.error.payment.currency).toBe('USDC');
    expect(res.body.error.payment.chain).toBe('base');
  });

  it('returns 402 payment with amount field', async () => {
    const res = await request(app).post('/monitor').send({
      url: 'https://example.com/mcp',
    });
    expect(res.status).toBe(402);
    expect(res.body.error.payment.amount).toBeDefined();
  });

  it('returns 400 if url missing', async () => {
    const res = await request(app).post('/monitor').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/url/i);
  });

  it('runs fail-open when txHash provided (network may fail)', async () => {
    // With a fake txHash on a URL that won't be reachable, the monitor
    // should either return a result (fail-open) or a network error,
    // but NOT a 402.
    const res = await request(app).post('/monitor').send({
      url: 'https://localhost:9999/mcp-nonexistent',
      txHash: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    });
    // Should not be 402
    expect(res.status).not.toBe(402);
  });
});

describe('Server startup', () => {
  it('createApp works without throwing when address provided', () => {
    expect(() => createApp('0xabcdef1234')).not.toThrow();
  });

  it('createApp exposes last-4 of address in health', async () => {
    const app2 = createApp('0x1234567890abcdef1234567890abcdef12345678');
    const res = await request(app2).get('/health');
    expect(res.body.data.paymentAddress).toBe('0x...5678');
  });
});
