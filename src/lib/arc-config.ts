export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_CHAIN_HEX = '0x4CEF52';
export const ARC_TESTNET_CHAIN_CAIP2 = `eip155:${ARC_TESTNET_CHAIN_ID}` as const;
export const ARC_TESTNET_RPC_URL = 'https://rpc.testnet.arc.io';
export const ARC_TESTNET_EXPLORER_URL = 'https://testnet.arcscan.app';

export function parseArcChainId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = value.startsWith('eip155:') ? value.slice('eip155:'.length) : value;
  const parsed = Number.parseInt(normalized, normalized.startsWith('0x') ? 16 : 10);
  return Number.isFinite(parsed) ? parsed : null;
}
