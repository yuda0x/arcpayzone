import { ARC_TESTNET_CHAIN_ID } from '@/lib/arc-config';

export { ARC_TESTNET_CHAIN_ID } from '@/lib/arc-config';
export const ARC_TESTNET_USDC = '0x3600000000000000000000000000000000000000';
export const ARC_NATIVE_USDC_EMITTER = '0xfffffffffffffffffffffffffffffffffffffffe';
export const ARC_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface ArcHistoryProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface ArcHistoryTransaction {
  hash: string;
  direction: 'Sent' | 'Received';
  amount: number;
  status: 'Confirmed' | 'Failed';
  timestamp: string;
  from: string;
  to: string;
  counterparty: string;
}

interface ArcHistoryLog {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string;
  logIndex: string;
}

function topicAddress(address: string): string {
  return `0x${address.slice(2).padStart(64, '0')}`;
}

function topicToAddress(topic: string | undefined): string | null {
  return topic?.length === 66 ? `0x${topic.slice(-40)}` : null;
}

function parseAmount(log: ArcHistoryLog): number {
  const decimals = log.address.toLowerCase() === ARC_NATIVE_USDC_EMITTER ? 18 : 6;
  return Number(BigInt(log.data)) / 10 ** decimals;
}

export async function loadArcTestnetTransactions(
  provider: ArcHistoryProvider,
  walletAddress: string
): Promise<ArcHistoryTransaction[]> {
  const latest = await provider.request({ method: 'eth_blockNumber' });
  if (typeof latest !== 'string') throw new Error('Invalid latest block');
  const fromBlock = `0x${Math.max(0, Number.parseInt(latest, 16) - 5000).toString(16)}`;
  const walletTopic = topicAddress(walletAddress);
  const filters = [
    { address: ARC_TESTNET_USDC, topics: [ARC_TRANSFER_TOPIC, walletTopic] },
    { address: ARC_TESTNET_USDC, topics: [ARC_TRANSFER_TOPIC, null, walletTopic] },
    { address: ARC_NATIVE_USDC_EMITTER, topics: [ARC_TRANSFER_TOPIC, walletTopic] },
    { address: ARC_NATIVE_USDC_EMITTER, topics: [ARC_TRANSFER_TOPIC, null, walletTopic] }
  ];
  const results = await Promise.all(filters.map((filter) => provider.request({ method: 'eth_getLogs', params: [{ ...filter, fromBlock, toBlock: 'latest' }] })));
  const logs = results.flatMap((result) => Array.isArray(result) ? result : []).filter((log): log is ArcHistoryLog => typeof log === 'object' && log !== null && 'address' in log && 'topics' in log && 'data' in log && 'transactionHash' in log && 'blockNumber' in log && 'logIndex' in log);
  const unique = new Map<string, ArcHistoryLog>();
  // Use a copied array for browser compatibility; some injected-wallet browsers do not expose toSorted().
  // eslint-disable-next-line unicorn/no-array-sort -- copied-array sort keeps compatibility with older wallet browsers
  [...logs].sort((a, b) => Number(a.address.toLowerCase() !== ARC_TESTNET_USDC) - Number(b.address.toLowerCase() !== ARC_TESTNET_USDC)).forEach((log) => unique.set(log.transactionHash, log));
  const transactions = await Promise.all([...unique.values()].map(async (log): Promise<ArcHistoryTransaction | null> => {
    const from = topicToAddress(log.topics[1]);
    const to = topicToAddress(log.topics[2]);
    if (!from || !to) return null;
    const [receipt, block] = await Promise.all([
      provider.request({ method: 'eth_getTransactionReceipt', params: [log.transactionHash] }),
      provider.request({ method: 'eth_getBlockByNumber', params: [log.blockNumber, false] })
    ]);
    const timestamp = typeof block === 'object' && block !== null && 'timestamp' in block && typeof block.timestamp === 'string' ? new Date(Number.parseInt(block.timestamp, 16) * 1000).toLocaleString() : 'Unknown time';
    const receiptStatus = typeof receipt === 'object' && receipt !== null && 'status' in receipt ? receipt.status : null;
    if (receiptStatus !== '0x0' && receiptStatus !== '0x1') return null;
    const sent = from.toLowerCase() === walletAddress.toLowerCase();
    return { hash: log.transactionHash, direction: sent ? 'Sent' : 'Received', amount: parseAmount(log), status: receiptStatus === '0x0' ? 'Failed' : 'Confirmed', timestamp, from, to, counterparty: sent ? to : from };
  }));
  return transactions.filter((transaction): transaction is ArcHistoryTransaction => transaction !== null);
}
