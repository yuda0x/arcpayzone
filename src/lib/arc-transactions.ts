import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_RPC_URL
} from '@/lib/arc-config';

const ARC_TESTNET_USDC = '0x3600000000000000000000000000000000000000';
const ARC_NATIVE_USDC_EMITTER = '0xfffffffffffffffffffffffffffffffffffffffe';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const DEFAULT_LOOKBACK_BLOCKS = 5000;
const DEFAULT_PAGE_SIZE = 50;
const CACHE_TTL_MS = 15_000;
const INDEXER_API_URL = `${ARC_TESTNET_EXPLORER_URL}/api`;
const transactionCache = new Map<string, { expiresAt: number; records: ArcTransactionRecord[] }>();

interface RpcLog {
  address: string;
  topics: string[] | string;
  data: string;
  transactionHash: string;
  blockNumber: string;
  logIndex: string;
}

interface RpcReceipt {
  status?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

interface RpcBlock {
  timestamp?: string;
  blockTimestamp?: string;
}

interface IndexedTransaction {
  blockNumber?: string;
  from?: string;
  to?: string;
  gasUsed?: string;
  gasPrice?: string;
  hash?: string;
  isError?: string;
  timeStamp?: string;
  txreceipt_status?: string;
  value?: string;
}

interface IndexedTokenTransfer extends IndexedTransaction {
  contractAddress?: string;
  tokenDecimal?: string;
  tokenName?: string;
  tokenSymbol?: string;
}

interface IndexedResponse<T> {
  message?: string;
  result?: T | string;
  status?: string;
}

export interface ArcTransactionRecord {
  hash: string;
  blockNumber: number;
  timestamp: string | null;
  from: string;
  to: string;
  amount: number;
  asset: string;
  status: 'Confirmed' | 'Failed';
  chainId: number;
  gasUsed: string | null;
  gasFee: string | null;
  explorerUrl: string;
  direction: 'Sent' | 'Received';
}

interface RpcResponse<T> {
  result?: T;
  error?: { message?: string };
}

export interface ArcTransactionQuery {
  page?: number;
  offset?: number;
}

export interface ArcTransactionPage extends ArcTransactionQuery {
  hasMore: boolean;
  transactions: ArcTransactionRecord[];
}

function rpcUrl(): string {
  return process.env.ARC_TESTNET_RPC_URL || ARC_TESTNET_RPC_URL;
}

function lookbackBlocks(): number {
  const configured = Number.parseInt(process.env.ARC_TRANSACTION_LOOKBACK_BLOCKS || '', 10);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_LOOKBACK_BLOCKS;
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizedTopics(topics: RpcLog['topics']): string[] {
  return Array.isArray(topics) ? topics : topics.trim().split(/\s+/);
}

function topicAddress(address: string): string {
  return `0x${address.slice(2).padStart(64, '0')}`;
}

function topicToAddress(topic: string | undefined): string | null {
  return topic?.length === 66 ? `0x${topic.slice(-40)}` : null;
}

function amountFromLog(log: RpcLog): number {
  const decimals = log.address.toLowerCase() === ARC_NATIVE_USDC_EMITTER ? 18 : 6;
  return Number(BigInt(log.data)) / 10 ** decimals;
}

function indexedNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function indexedStatus(transaction: IndexedTransaction): 'Confirmed' | 'Failed' | null {
  if (transaction.isError === '1' || transaction.txreceipt_status === '0') return 'Failed';
  if (transaction.isError === '0' && transaction.txreceipt_status === '1') return 'Confirmed';
  return null;
}

function indexedGasFee(transaction: IndexedTransaction): string | null {
  if (!transaction.gasUsed || !transaction.gasPrice) return null;
  try {
    return (BigInt(transaction.gasUsed) * BigInt(transaction.gasPrice)).toString();
  } catch {
    return null;
  }
}

function indexedTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
}

function parseIndexedResult<T>(payload: IndexedResponse<T>): T[] {
  return Array.isArray(payload.result) ? payload.result : [];
}

async function fetchIndexed<T>(url: URL): Promise<T[]> {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Arc indexed API returned HTTP ${response.status}`);
  const payload = (await response.json()) as IndexedResponse<T>;
  if (payload.status === '0' && payload.message !== 'No transactions found') {
    throw new Error(payload.message || 'Arc indexed API request failed');
  }
  return parseIndexedResult(payload);
}

function indexedTransactionRecord(
  transaction: IndexedTransaction,
  address: string,
  amount: number,
  asset: string
): ArcTransactionRecord | null {
  if (!transaction.hash || !transaction.from || !transaction.to) return null;
  const status = indexedStatus(transaction);
  if (!status) return null;
  return {
    hash: transaction.hash,
    blockNumber: indexedNumber(transaction.blockNumber),
    timestamp: indexedTimestamp(transaction.timeStamp),
    from: transaction.from,
    to: transaction.to,
    amount,
    asset: asset || 'USDC',
    status,
    chainId: ARC_TESTNET_CHAIN_ID,
    gasUsed: transaction.gasUsed || null,
    gasFee: indexedGasFee(transaction),
    explorerUrl: `${ARC_TESTNET_EXPLORER_URL}/tx/${transaction.hash}`,
    direction: transaction.from.toLowerCase() === address.toLowerCase() ? 'Sent' : 'Received'
  };
}

async function getIndexedTransactions(address: string, page: number, offset: number): Promise<ArcTransactionPage> {
  const transactionUrl = new URL(INDEXER_API_URL);
  transactionUrl.searchParams.set('module', 'account');
  transactionUrl.searchParams.set('action', 'txlist');
  transactionUrl.searchParams.set('address', address);
  transactionUrl.searchParams.set('page', String(page));
  transactionUrl.searchParams.set('offset', String(offset));
  transactionUrl.searchParams.set('sort', 'desc');

  const tokenUrl = new URL(INDEXER_API_URL);
  tokenUrl.searchParams.set('module', 'account');
  tokenUrl.searchParams.set('action', 'tokentx');
  tokenUrl.searchParams.set('address', address);
  tokenUrl.searchParams.set('page', String(page));
  tokenUrl.searchParams.set('offset', String(offset));
  tokenUrl.searchParams.set('sort', 'desc');

  const [indexedTransactions, indexedTransfers] = await Promise.all([
    fetchIndexed<IndexedTransaction>(transactionUrl),
    fetchIndexed<IndexedTokenTransfer>(tokenUrl)
  ]);
  const records = new Map<string, ArcTransactionRecord>();

  for (const transfer of indexedTransfers) {
    const symbol = transfer.tokenSymbol || transfer.tokenName || 'USDC';
    if (!symbol.toUpperCase().includes('USDC') && transfer.contractAddress?.toLowerCase() !== ARC_TESTNET_USDC) continue;
    const decimals = indexedNumber(transfer.tokenDecimal, 6);
    const amount = Number(transfer.value || '0') / 10 ** decimals;
    const record = indexedTransactionRecord(transfer, address, amount, symbol);
    if (record) records.set(record.hash, record);
  }

  for (const transaction of indexedTransactions) {
    const amount = Number(transaction.value || '0') / 10 ** 18;
    if (amount <= 0) continue;
    const record = indexedTransactionRecord(transaction, address, amount, 'USDC');
    if (record && !records.has(record.hash)) records.set(record.hash, record);
  }

  const normalized = [...records.values()].sort((a, b) => b.blockNumber - a.blockNumber);
  return { page, offset, hasMore: indexedTransactions.length === offset || indexedTransfers.length === offset, transactions: normalized };
}

async function rpcRequest<T>(method: string, params: unknown[]): Promise<T> {
  let lastError = 'Arc RPC request failed';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(rpcUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 429) {
      lastError = 'Arc RPC rate limit exceeded';
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      continue;
    }
    if (!response.ok) throw new Error(`Arc RPC returned HTTP ${response.status}`);
    const payload = (await response.json()) as RpcResponse<T>;
    if (payload.error) throw new Error(payload.error.message || 'Arc RPC request failed');
    if (payload.result === undefined) throw new Error('Arc RPC returned no result');
    return payload.result;
  }
  throw new Error(lastError);
}

async function getRpcTransactions(address: string): Promise<ArcTransactionRecord[]> {
  const latest = await rpcRequest<string>('eth_blockNumber', []);
  const chainId = await rpcRequest<string>('eth_chainId', []);
  if (Number.parseInt(chainId, 16) !== ARC_TESTNET_CHAIN_ID) throw new Error(`Unexpected Arc chain ID: ${chainId}`);
  const latestNumber = Number.parseInt(latest, 16);
  const fromBlock = `0x${Math.max(0, latestNumber - lookbackBlocks()).toString(16)}`;
  const walletTopic = topicAddress(address);
  const filters = [
    { address: ARC_TESTNET_USDC, topics: [TRANSFER_TOPIC, walletTopic] },
    { address: ARC_TESTNET_USDC, topics: [TRANSFER_TOPIC, null, walletTopic] },
    { address: ARC_NATIVE_USDC_EMITTER, topics: [TRANSFER_TOPIC, walletTopic] },
    { address: ARC_NATIVE_USDC_EMITTER, topics: [TRANSFER_TOPIC, null, walletTopic] }
  ];
  const logs: RpcLog[] = [];
  for (const filter of filters) {
    const filterLogs = await rpcRequest<RpcLog[]>('eth_getLogs', [{ ...filter, fromBlock, toBlock: 'latest' }]);
    logs.push(...filterLogs);
  }
  const unique = new Map<string, RpcLog>();
  logs.forEach((log) => unique.set(log.transactionHash, log));
  const records = await Promise.all([...unique.values()].map(async (log): Promise<ArcTransactionRecord | null> => {
    const topics = normalizedTopics(log.topics);
    const from = topicToAddress(topics[1]);
    const to = topicToAddress(topics[2]);
    if (!from || !to) return null;
    const [receipt, block] = await Promise.all([
      rpcRequest<RpcReceipt | null>('eth_getTransactionReceipt', [log.transactionHash]),
      rpcRequest<RpcBlock | null>('eth_getBlockByNumber', [log.blockNumber, false])
    ]);
    const rawTimestamp = block?.timestamp || block?.blockTimestamp;
    const timestamp = rawTimestamp ? new Date(Number.parseInt(rawTimestamp, 16) * 1000).toISOString() : null;
    if (receipt?.status !== '0x0' && receipt?.status !== '0x1') return null;
    const gasFee = receipt?.gasUsed && receipt.effectiveGasPrice ? (BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice)).toString() : null;
    return {
      hash: log.transactionHash,
      blockNumber: Number.parseInt(log.blockNumber, 16),
      timestamp,
      from,
      to,
      amount: amountFromLog(log),
      asset: 'USDC',
      status: receipt.status === '0x0' ? 'Failed' : 'Confirmed',
      chainId: ARC_TESTNET_CHAIN_ID,
      gasUsed: receipt?.gasUsed || null,
      gasFee,
      explorerUrl: `${ARC_TESTNET_EXPLORER_URL}/tx/${log.transactionHash}`,
      direction: from.toLowerCase() === address.toLowerCase() ? 'Sent' : 'Received'
    };
  }));
  return records.filter((record): record is ArcTransactionRecord => record !== null).sort((a, b) => b.blockNumber - a.blockNumber);
}

export async function getArcTransactionsPage(address: string, query: ArcTransactionQuery = {}): Promise<ArcTransactionPage> {
  if (!isAddress(address)) throw new Error('Invalid wallet address');
  const page = Math.max(1, query.page || 1);
  const offset = Math.min(100, Math.max(1, query.offset || DEFAULT_PAGE_SIZE));
  const cacheKey = `${address.toLowerCase()}:${page}:${offset}`;
  const cached = transactionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { page, offset, hasMore: cached.records.length === offset, transactions: cached.records };

  try {
    const indexed = await getIndexedTransactions(address, page, offset);
    transactionCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, records: indexed.transactions });
    return indexed;
  } catch (indexedError) {
    try {
      const records = await getRpcTransactions(address);
      transactionCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, records });
      return { page, offset, hasMore: false, transactions: records };
    } catch (rpcError) {
      throw new Error(
        `Arc transaction history unavailable. Indexed: ${indexedError instanceof Error ? indexedError.message : 'unknown error'}. RPC: ${rpcError instanceof Error ? rpcError.message : 'unknown error'}`
      );
    }
  }
}

export async function getArcTransactions(address: string): Promise<ArcTransactionRecord[]> {
  const result = await getArcTransactionsPage(address);
  return result.transactions;
}
