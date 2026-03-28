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
  const raw = readFileSync(path, 'utf8');
  try {
    return JSON.parse(raw) as PaymentReceipt[];
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        level: 'warn',
        event: 'receipts-parse-error',
        path,
        message: err instanceof Error ? err.message : String(err),
      }) + '\n'
    );
    return [];
  }
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
 *
 * TODO: Implement real on-chain verification:
 *   1. Call eth_getTransactionReceipt with txHash via BASE_RPC_URL
 *   2. Decode the ERC-20 Transfer log (topic0 = keccak256("Transfer(address,address,uint256)"))
 *   3. Verify log.topics[2] (to address) == recipientAddress (checksummed)
 *   4. Verify log.data (value) >= expectedAmount (in USDC base units, 6 decimals)
 *   5. Verify the log's contract address == USDC contract on Base
 *
 * Until implemented, returns false. The fail-open path in checkPaymentGate
 * handles false correctly by allowing with an [PAYMENT UNVERIFIED] marker.
 */
export async function verifyOnChain(
  _txHash: string,
  _recipientAddress: string,
  _amount: string
): Promise<boolean> {
  return false;
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
    return { allowed: false, reason: 'payment-required' };
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
