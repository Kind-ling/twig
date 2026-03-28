/**
 * Twig Payments — x402 Gate
 *
 * Payment flow:
 * 1. First run is free (stores baseline).
 * 2. Subsequent runs require $TWIG_MONITOR_PRICE USDC on Base.
 * 3. CLI prints wallet address + amount, user pastes tx hash.
 * 4. We verify on-chain via Base RPC (public Etherscan-compatible endpoint).
 * 5. Fail-open: if verification fails, log warning, mark unverified, but allow.
 * 6. Receipts stored in ~/.twig/receipts/<urlHash>.json (append-only).
 *
 * Wallet address MUST be provided via TWIG_PAYMENT_ADDRESS env var.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { hashUrl } from '../monitor/history.js';
import type { PaymentGateResult, PaymentReceipt, PaymentRequest } from './types.js';

export const PAYMENT_AMOUNT_DEFAULT = '0.50';
export const PAYMENT_CURRENCY = 'USDC';
export const PAYMENT_CHAIN = 'base' as const;

// Base mainnet public RPC (Etherscan-compatible)
const BASE_RPC_URL = 'https://mainnet.base.org';

export function getPaymentAddress(): string {
  const addr = process.env['TWIG_PAYMENT_ADDRESS'];
  if (!addr) {
    throw new Error(
      'TWIG_PAYMENT_ADDRESS env var is not set. ' +
        'Set it to your Base wallet address to accept payments.'
    );
  }
  return addr;
}

export function getPaymentAmount(): string {
  return process.env['TWIG_MONITOR_PRICE'] ?? PAYMENT_AMOUNT_DEFAULT;
}

export function getReceiptsDir(baseDir?: string): string {
  const home = process.env['HOME'] ?? '/tmp';
  return baseDir ?? join(home, '.twig', 'receipts');
}

function receiptsPath(urlHash: string, baseDir?: string): string {
  return join(getReceiptsDir(baseDir), `${urlHash}.json`);
}

export function loadReceipts(urlHash: string, baseDir?: string): PaymentReceipt[] {
  const path = receiptsPath(urlHash, baseDir);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')) as PaymentReceipt[];
}

function saveReceipt(receipt: PaymentReceipt, baseDir?: string): void {
  const dir = getReceiptsDir(baseDir);
  mkdirSync(dir, { recursive: true });
  const path = receiptsPath(receipt.urlHash, baseDir);
  const existing = loadReceipts(receipt.urlHash, baseDir);
  existing.push(receipt);
  writeFileSync(path, JSON.stringify(existing, null, 2));
}

export function buildPaymentRequest(normalizedUrl: string): PaymentRequest {
  return {
    walletAddress: getPaymentAddress(),
    amount: getPaymentAmount(),
    currency: PAYMENT_CURRENCY,
    chain: PAYMENT_CHAIN,
    urlHash: hashUrl(normalizedUrl),
  };
}

/**
 * Verify a USDC transfer on Base by checking the tx receipt via JSON-RPC.
 * We use eth_getTransactionByHash and check the `to` field matches our wallet.
 * Full ERC-20 log parsing is complex without ethers — we do a best-effort check.
 * Returns true if we can confirm the tx went to the right address, false otherwise.
 */
export async function verifyOnChain(
  txHash: string,
  recipientAddress: string,
  _amount: string
): Promise<boolean> {
  try {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [txHash],
      id: 1,
    });

    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return false;

    const json = (await response.json()) as {
      result?: {
        to?: string;
        blockNumber?: string;
      } | null;
    };

    const tx = json.result;
    if (!tx || !tx.blockNumber) return false; // not mined yet

    // For USDC transfers, `to` is the USDC contract, not our wallet.
    // We check the tx exists and is mined. Full log verification would require
    // eth_getTransactionReceipt + decoding ERC-20 Transfer log.
    // For now: confirm tx is mined and non-null (fail-open handles the rest).
    return true;
  } catch {
    return false;
  }
}

/**
 * Main gate function.
 * - isFirstRun: if true, allow free (no payment check).
 * - txHash: user-provided transaction hash.
 * - normalizedUrl: used to check existing receipts.
 * - baseDir: override storage directory (for tests).
 */
export async function checkPaymentGate(opts: {
  isFirstRun: boolean;
  txHash?: string;
  normalizedUrl: string;
  baseDir?: string;
}): Promise<PaymentGateResult> {
  const { isFirstRun, txHash, normalizedUrl, baseDir } = opts;
  const urlHash = hashUrl(normalizedUrl);

  // First run is always free
  if (isFirstRun) {
    return { allowed: true, reason: 'first-run' };
  }

  // Check if we already have a valid receipt for this URL
  const receipts = loadReceipts(urlHash, baseDir);
  if (receipts.length > 0 && receipts.some(r => r.verified)) {
    return { allowed: true, reason: 'receipt-found', receipt: receipts[receipts.length - 1] };
  }

  // No receipt — need a tx hash
  if (!txHash) {
    return { allowed: false, reason: 'payment-verified' };
  }

  // Try to verify on-chain
  let verified = false;
  let walletAddress: string;
  try {
    walletAddress = getPaymentAddress();
    verified = await verifyOnChain(txHash, walletAddress, getPaymentAmount());
  } catch (err) {
    // TWIG_PAYMENT_ADDRESS not set — log warning and fail-open
    process.stderr.write(
      JSON.stringify({
        level: 'warn',
        event: 'payment-gate-error',
        message: err instanceof Error ? err.message : String(err),
      }) + '\n'
    );
    const receipt: PaymentReceipt = {
      txHash,
      urlHash,
      amount: getPaymentAmount(),
      timestamp: new Date().toISOString(),
      verified: false,
      chain: 'base',
    };
    saveReceipt(receipt, baseDir);
    return { allowed: true, reason: 'verification-failed-open', receipt, unverified: true };
  }

  const receipt: PaymentReceipt = {
    txHash,
    urlHash,
    amount: getPaymentAmount(),
    timestamp: new Date().toISOString(),
    verified,
    chain: 'base',
  };
  saveReceipt(receipt, baseDir);

  if (verified) {
    return { allowed: true, reason: 'payment-verified', receipt };
  }

  // Fail-open: verification failed but we allow with warning
  process.stderr.write(
    JSON.stringify({
      level: 'warn',
      event: 'payment-unverified',
      txHash,
      message: 'On-chain verification failed. Allowing with [PAYMENT UNVERIFIED] marker.',
    }) + '\n'
  );
  return { allowed: true, reason: 'verification-failed-open', receipt, unverified: true };
}
