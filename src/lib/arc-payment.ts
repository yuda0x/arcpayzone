import { ARC_TESTNET_CHAIN_ID } from '@/lib/arc-config';

export { ARC_TESTNET_CHAIN_ID } from '@/lib/arc-config';
export const ARC_TESTNET_USDC = '0x3600000000000000000000000000000000000000';
export const USDC_TRANSFER_SELECTOR = 'a9059cbb';

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

interface TransactionReceipt {
  status?: string;
}

export function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function parseUsdcAmount(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, '0') || '0');
}

function transferCallData(recipient: string, amount: bigint): string {
  return `0x${USDC_TRANSFER_SELECTOR}${recipient.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
}

function getProvider(): Eip1193Provider {
  const provider =
    typeof window !== 'undefined'
      ? (window as Window & { ethereum?: Eip1193Provider }).ethereum
      : undefined;
  if (!provider) throw new Error('No injected wallet detected.');
  return provider;
}

function getErrorMessage(cause: unknown): string {
  if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 4001) {
    return 'Transaction rejected in wallet.';
  }
  const message = cause instanceof Error ? cause.message.toLowerCase() : '';
  if (message.includes('insufficient') || message.includes('funds')) {
    return 'Insufficient USDC balance or network fee.';
  }
  return cause instanceof Error ? cause.message : 'Transaction submission failed.';
}

async function waitForReceipt(
  provider: Eip1193Provider,
  hash: string
): Promise<TransactionReceipt> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [hash]
    });
    if (receipt && typeof receipt === 'object') {
      const transactionReceipt = receipt as TransactionReceipt;
      if (typeof transactionReceipt.status === 'string') return transactionReceipt;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 3000));
  }
  throw new Error('Transaction confirmation timed out. Check the transaction on ArcScan.');
}

export async function sendConfirmedUsdcPayment(
  from: string,
  recipient: string,
  amount: string,
  onSubmitted?: (hash: string) => void
): Promise<string> {
  if (!isEvmAddress(from) || !isEvmAddress(recipient))
    throw new Error('Enter valid EVM wallet addresses.');
  const amountUnits = parseUsdcAmount(amount);
  if (amountUnits === null || amountUnits <= BigInt(0))
    throw new Error('Enter a USDC amount greater than 0.');

  const provider = getProvider();
  const chainId = await provider.request({ method: 'eth_chainId' });
  const parsedChainId =
    typeof chainId === 'string'
      ? Number.parseInt(chainId, chainId.startsWith('0x') ? 16 : 10)
      : null;
  if (parsedChainId !== ARC_TESTNET_CHAIN_ID)
    throw new Error('Switch your wallet to Arc Testnet before paying.');

  try {
    const result = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to: ARC_TESTNET_USDC,
          data: transferCallData(recipient, amountUnits),
          value: '0x0'
        }
      ]
    });
    if (typeof result !== 'string' || !result.startsWith('0x'))
      throw new Error('Wallet did not return a transaction hash.');
    onSubmitted?.(result);
    const receipt = await waitForReceipt(provider, result);
    if (receipt.status !== '0x1') throw new Error('The Arc Testnet payment failed.');
    return result;
  } catch (cause) {
    throw new Error(getErrorMessage(cause), { cause });
  }
}
