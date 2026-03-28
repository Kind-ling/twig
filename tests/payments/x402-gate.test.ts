import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  checkPaymentGate,
  loadReceipts,
  getPaymentAmount,
  buildPaymentRequest,
} from '../../src/payments/x402-gate.js';
import { hashUrl, normalizeUrl } from '../../src/monitor/history.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'twig-gate-test-'));
  // Reset env
  delete process.env['TWIG_PAYMENT_ADDRESS'];
  delete process.env['TWIG_MONITOR_PRICE'];
  vi.restoreAllMocks();
});

describe('getPaymentAmount', () => {
  it('returns default $0.50 when env not set', () => {
    expect(getPaymentAmount()).toBe('0.50');
  });

  it('returns custom amount from env', () => {
    process.env['TWIG_MONITOR_PRICE'] = '1.00';
    expect(getPaymentAmount()).toBe('1.00');
    delete process.env['TWIG_MONITOR_PRICE'];
  });
});

describe('checkPaymentGate — first run', () => {
  it('allows first run without any payment', async () => {
    const url = normalizeUrl('https://example.com/mcp');
    const result = await checkPaymentGate({
      isFirstRun: true,
      normalizedUrl: url,
      baseDir: tmpDir,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('first-run');
  });
});

describe('checkPaymentGate — no receipt, no txHash', () => {
  it('blocks when not first run and no txHash provided', async () => {
    process.env['TWIG_PAYMENT_ADDRESS'] = '0xdeadbeef';
    const url = normalizeUrl('https://example.com/mcp');
    const result = await checkPaymentGate({
      isFirstRun: false,
      normalizedUrl: url,
      baseDir: tmpDir,
    });
    expect(result.allowed).toBe(false);
  });
});

describe('checkPaymentGate — existing verified receipt', () => {
  it('allows if a verified receipt already exists', async () => {
    process.env['TWIG_PAYMENT_ADDRESS'] = '0xdeadbeef';
    const url = normalizeUrl('https://example.com/mcp');
    const urlHash = hashUrl(url);

    // Manually inject a verified receipt
    const { mkdirSync, writeFileSync } = await import('fs');
    mkdirSync(join(tmpDir), { recursive: true });
    writeFileSync(
      join(tmpDir, `${urlHash}.json`),
      JSON.stringify([
        {
          txHash: '0xabc',
          urlHash,
          amount: '0.50',
          timestamp: '2024-01-01T00:00:00.000Z',
          verified: true,
          chain: 'base',
        },
      ])
    );

    const result = await checkPaymentGate({
      isFirstRun: false,
      normalizedUrl: url,
      baseDir: tmpDir,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('receipt-found');
  });
});

describe('checkPaymentGate — fail-open when TWIG_PAYMENT_ADDRESS not set', () => {
  it('allows with unverified marker when wallet address missing', async () => {
    // No TWIG_PAYMENT_ADDRESS set
    const url = normalizeUrl('https://example.com/mcp');
    const result = await checkPaymentGate({
      isFirstRun: false,
      txHash: '0xfakehash',
      normalizedUrl: url,
      baseDir: tmpDir,
    });
    expect(result.allowed).toBe(true);
    expect(result.unverified).toBe(true);
    expect(result.reason).toBe('verification-failed-open');
  });
});

describe('loadReceipts', () => {
  it('returns empty array when no file exists', () => {
    const urlHash = hashUrl('https://example.com');
    expect(loadReceipts(urlHash, tmpDir)).toEqual([]);
  });
});

describe('buildPaymentRequest', () => {
  it('throws when TWIG_PAYMENT_ADDRESS not set', () => {
    expect(() => buildPaymentRequest('https://example.com')).toThrow(
      'TWIG_PAYMENT_ADDRESS'
    );
  });

  it('builds request with correct fields', () => {
    process.env['TWIG_PAYMENT_ADDRESS'] = '0xabc123';
    const req = buildPaymentRequest('https://example.com');
    expect(req.walletAddress).toBe('0xabc123');
    expect(req.currency).toBe('USDC');
    expect(req.chain).toBe('base');
    expect(req.amount).toBe('0.50');
  });
});
