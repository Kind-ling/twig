/**
 * Twig Payments — Domain Types
 */

export interface PaymentReceipt {
  txHash: string;
  urlHash: string;
  amount: string;
  timestamp: string; // ISO 8601
  verified: boolean;
  chain: 'base';
}

export interface PaymentGateResult {
  allowed: boolean;
  reason: 'first-run' | 'receipt-found' | 'payment-verified' | 'verification-failed-open';
  receipt?: PaymentReceipt;
  unverified?: boolean;
}

export interface PaymentRequest {
  walletAddress: string;
  amount: string; // e.g. "0.50"
  currency: 'USDC';
  chain: 'base';
  urlHash: string;
}
