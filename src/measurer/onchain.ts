/**
 * Twig On-Chain Revenue Measurer
 * Tracks x402 payment volume for a wallet address.
 * Used to measure revenue before/after Twig optimization.
 */

const BASE_RPC = 'https://base.llamarpc.com';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export interface RevenueSnapshot {
  wallet: string;
  chain: 'base';
  periodDays: number;
  startBlock: number;
  endBlock: number;
  transactions: number;
  uniquePayers: number;
  totalUSDC: string;     // human-readable, e.g. "47.23"
  capturedAt: string;   // ISO timestamp
}

export async function measureRevenue(
  wallet: string,
  periodDays: number = 7
): Promise<RevenueSnapshot> {
  const endBlock = await getLatestBlock();
  // Approx: Base produces ~2 blocks/second, 172800 blocks/day
  const blocksPerDay = 172800;
  const startBlock = endBlock - Math.floor(blocksPerDay * periodDays);

  const transfers = await getUSDCTransfers(wallet, startBlock, endBlock);

  const uniquePayers = new Set(transfers.map(t => t.from)).size;
  const totalRaw = transfers.reduce((sum, t) => sum + BigInt(t.value), 0n);
  const totalUSDC = (Number(totalRaw) / 1e6).toFixed(2);

  return {
    wallet,
    chain: 'base',
    periodDays,
    startBlock,
    endBlock,
    transactions: transfers.length,
    uniquePayers,
    totalUSDC,
    capturedAt: new Date().toISOString(),
  };
}

interface Transfer {
  from: string;
  value: string;
  blockNumber: number;
  txHash: string;
}

async function getUSDCTransfers(wallet: string, fromBlock: number, toBlock: number): Promise<Transfer[]> {
  // ERC-20 Transfer(address,address,uint256) topic
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  // Pad wallet address to 32 bytes
  const paddedWallet = '0x' + wallet.slice(2).toLowerCase().padStart(64, '0');

  try {
    const res = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          address: USDC_BASE,
          topics: [transferTopic, null, paddedWallet], // to = wallet
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: '0x' + toBlock.toString(16),
        }],
        id: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const data = await res.json() as { result?: Array<{ topics: string[]; data: string; blockNumber: string; transactionHash: string }> };
    const logs = data.result ?? [];

    return logs.map(log => ({
      from: '0x' + log.topics[1]!.slice(26),
      value: BigInt(log.data).toString(),
      blockNumber: parseInt(log.blockNumber, 16),
      txHash: log.transactionHash,
    }));
  } catch {
    return [];
  }
}

async function getLatestBlock(): Promise<number> {
  try {
    const res = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { result: string };
    return parseInt(data.result, 16);
  } catch {
    return 0;
  }
}
