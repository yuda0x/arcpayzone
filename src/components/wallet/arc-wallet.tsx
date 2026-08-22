'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  ARC_TESTNET_CHAIN_HEX,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_RPC_URL
} from '@/lib/arc-config';
import { useCanonicalWallet } from '@/hooks/use-canonical-wallet';

const ARC_TESTNET_USDC = '0x3600000000000000000000000000000000000000';
const ARC_NATIVE_USDC_EMITTER = '0xfffffffffffffffffffffffffffffffffffffffe';
const USDC_BALANCE_OF_SELECTOR = '70a08231';
const USDC_TRANSFER_SELECTOR = 'a9059cbb';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ARC_TESTNET_CHAIN = {
  chainId: ARC_TESTNET_CHAIN_HEX,
  chainName: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: [ARC_TESTNET_RPC_URL],
  blockExplorerUrls: [ARC_TESTNET_EXPLORER_URL]
} as const;

interface ArcTransfer {
  hash: string;
  direction: 'Sent' | 'Received';
  amount: string;
  status: 'Pending' | 'Confirmed' | 'Failed';
  timestamp: string;
  counterparty: string;
}

interface ArcLog {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string;
  logIndex: string;
}

interface ArcReceipt {
  status?: string;
}

interface ArcBlock {
  timestamp?: string;
}

function isAddress(value: unknown): value is string {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUsdcBalance(rawBalance: bigint): string {
  const decimals = BigInt(1_000_000);
  const whole = rawBalance / decimals;
  const fraction = (rawBalance % decimals).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole.toLocaleString('en-US')}.${fraction}` : whole.toLocaleString('en-US');
}

function balanceOfCallData(address: string): string {
  return `0x${USDC_BALANCE_OF_SELECTOR}${address.slice(2).padStart(64, '0')}`;
}

function transferCallData(recipient: string, amount: bigint): string {
  return `0x${USDC_TRANSFER_SELECTOR}${recipient.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
}

function parseUsdcAmount(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, '0') || '0');
}

function getRpcErrorMessage(cause: unknown): string {
  if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 4001) {
    return 'Transaction rejected in wallet.';
  }
  const message = cause instanceof Error ? cause.message.toLowerCase() : '';
  if (message.includes('insufficient') || message.includes('funds'))
    return 'Insufficient USDC balance or network fee.';
  return 'Transaction submission failed.';
}

function topicAddress(address: string): string {
  return `0x${address.slice(2).padStart(64, '0')}`;
}

function parseTransferAmount(log: ArcLog, decimals: number): string {
  const raw = BigInt(log.data);
  const scale = BigInt(10 ** decimals);
  const whole = raw / scale;
  const fraction = (raw % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole.toLocaleString('en-US')}.${fraction}` : whole.toLocaleString('en-US');
}

function logAddress(topic: string | undefined): string | null {
  return topic && topic.length === 66 ? `0x${topic.slice(-40)}` : null;
}

export function ArcWallet() {
  const canonicalWallet = useCanonicalWallet();
  const address = canonicalWallet.address;
  const chainId = canonicalWallet.chainId;
  const getProvider = React.useCallback(() => canonicalWallet.provider, [canonicalWallet.provider]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [balance, setBalance] = React.useState<string | null>(null);
  const [rawBalance, setRawBalance] = React.useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = React.useState(false);
  const [balanceError, setBalanceError] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [sendReview, setSendReview] = React.useState(false);
  const [recipient, setRecipient] = React.useState('');
  const [sendAmount, setSendAmount] = React.useState('');
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [sendBusy, setSendBusy] = React.useState(false);
  const [submittedHash, setSubmittedHash] = React.useState<string | null>(null);
  const [transfers, setTransfers] = React.useState<ArcTransfer[]>([]);
  const [transfersLoading, setTransfersLoading] = React.useState(false);
  const [transfersError, setTransfersError] = React.useState(false);

  const loadBalance = React.useCallback(
    async (walletAddress: string, walletChainId: number | null) => {
      const provider = getProvider();
      if (!provider || walletChainId !== ARC_TESTNET_CHAIN_ID) {
        setBalance(null);
        setRawBalance(null);
        setBalanceLoading(false);
        setBalanceError(false);
        return;
      }

      setBalanceLoading(true);
      setBalanceError(false);
      try {
        const rawBalance = await provider.request({
          method: 'eth_call',
          params: [{ to: ARC_TESTNET_USDC, data: balanceOfCallData(walletAddress) }, 'latest']
        });
        if (typeof rawBalance !== 'string' || !/^0x[0-9a-fA-F]+$/.test(rawBalance)) {
          throw new Error('Invalid USDC balance response');
        }
        const parsedBalance = BigInt(rawBalance);
        setRawBalance(parsedBalance);
        setBalance(formatUsdcBalance(parsedBalance));
      } catch {
        setBalance(null);
        setRawBalance(null);
        setBalanceError(true);
      } finally {
        setBalanceLoading(false);
      }
    },
    [getProvider]
  );

  const loadTransfers = React.useCallback(async (walletAddress: string, walletChainId: number | null) => {
    const provider = getProvider();
    if (!provider || walletChainId !== ARC_TESTNET_CHAIN_ID) {
      setTransfers([]);
      setTransfersLoading(false);
      setTransfersError(false);
      return;
    }
    setTransfersLoading(true);
    setTransfersError(false);
    try {
      const latest = await provider.request({ method: 'eth_blockNumber' });
      if (typeof latest !== 'string') throw new Error('Invalid block number');
      const fromBlock = `0x${Math.max(0, Number.parseInt(latest, 16) - 5000).toString(16)}`;
      const addressTopic = topicAddress(walletAddress);
      const filters = [
        { address: ARC_TESTNET_USDC, topics: [TRANSFER_TOPIC, addressTopic] },
        { address: ARC_TESTNET_USDC, topics: [TRANSFER_TOPIC, null, addressTopic] },
        { address: ARC_NATIVE_USDC_EMITTER, topics: [TRANSFER_TOPIC, addressTopic] },
        { address: ARC_NATIVE_USDC_EMITTER, topics: [TRANSFER_TOPIC, null, addressTopic] }
      ];
      const logs = (await Promise.all(filters.map((filter) => provider.request({ method: 'eth_getLogs', params: [{ ...filter, fromBlock, toBlock: 'latest' }] }))))
        .flatMap((result) => Array.isArray(result) ? result : [])
        .filter((log): log is ArcLog => typeof log === 'object' && log !== null && 'transactionHash' in log && 'topics' in log && 'data' in log && 'address' in log && 'blockNumber' in log && 'logIndex' in log);
      const unique = new Map<string, ArcLog>();
      logs.forEach((log) => unique.set(`${log.transactionHash}:${log.logIndex}`, log));
      const parsed = await Promise.all([...unique.values()].map(async (log): Promise<ArcTransfer | null> => {
        const from = logAddress(log.topics[1]);
        const to = logAddress(log.topics[2]);
        if (!from || !to) return null;
        const isSent = from.toLowerCase() === walletAddress.toLowerCase();
        const [block, receipt] = await Promise.all([
          provider.request({ method: 'eth_getBlockByNumber', params: [log.blockNumber, false] }),
          provider.request({ method: 'eth_getTransactionReceipt', params: [log.transactionHash] })
        ]);
        const blockData = typeof block === 'object' && block !== null ? block as ArcBlock : {};
        const receiptData = typeof receipt === 'object' && receipt !== null ? receipt as ArcReceipt : {};
        if (receiptData.status !== '0x0' && receiptData.status !== '0x1') return null;
        const timestamp = typeof blockData.timestamp === 'string' ? new Date(Number.parseInt(blockData.timestamp, 16) * 1000).toLocaleString() : 'Unknown time';
        return { hash: log.transactionHash, direction: isSent ? 'Sent' : 'Received', amount: parseTransferAmount(log, log.address.toLowerCase() === ARC_NATIVE_USDC_EMITTER ? 18 : 6), status: receiptData.status === '0x0' ? 'Failed' : 'Confirmed', timestamp, counterparty: isSent ? to : from };
      }));
      const deduped = new Map<string, ArcTransfer>();
      parsed.filter((transfer): transfer is ArcTransfer => transfer !== null).forEach((transfer) => deduped.set(transfer.hash, transfer));
      setTransfers([...deduped.values()].slice(0, 25));
    } catch {
      setTransfers([]);
      setTransfersError(true);
    } finally {
      setTransfersLoading(false);
    }
  }, [getProvider]);

  React.useEffect(() => {
    if (address && chainId !== null && canonicalWallet.provider) {
      // eslint-disable-next-line react/set-state-in-effect
      void loadBalance(address, chainId);
      void loadTransfers(address, chainId);
    }
  }, [address, canonicalWallet.provider, chainId, loadBalance, loadTransfers]);

  function connectWallet(): void {
    setError(null);
    canonicalWallet.connect();
  }

  async function switchToArc(): Promise<void> {
    const provider = getProvider();
    if (!provider) return;

    setBusy(true);
    setError(null);
    try {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_TESTNET_CHAIN_HEX }]
        });
      } catch (cause) {
        const code =
          typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : null;
        if (code !== 4902) throw cause;
        await provider.request({ method: 'wallet_addEthereumChain', params: [ARC_TESTNET_CHAIN] });
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_TESTNET_CHAIN_HEX }]
        });
      }
      if (address) {
        void loadBalance(address, ARC_TESTNET_CHAIN_ID);
        void loadTransfers(address, ARC_TESTNET_CHAIN_ID);
      }
      toast.success('Switched to Arc Testnet');
    } catch (cause) {
      const code =
        typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : null;
      setError(code === 4001 ? 'Network switch was rejected.' : 'Unable to switch to Arc Testnet.');
    } finally {
      setBusy(false);
    }
  }

  function disconnectWallet(): void {
    void canonicalWallet.disconnect();
    setBalance(null);
    setRawBalance(null);
    setTransfers([]);
    setTransfersError(false);
    setBalanceError(false);
    setError(null);
    toast.success('Wallet disconnected from ARC Pay');
  }

  function resetSendState(): void {
    setSendOpen(false);
    setSendReview(false);
    setRecipient('');
    setSendAmount('');
    setSendError(null);
    setSubmittedHash(null);
    setSendBusy(false);
  }

  function getSendValidationError(): string | null {
    if (!onArcTestnet) return 'Switch to Arc Testnet before sending.';
    if (!isAddress(recipient)) return 'Enter a valid EVM recipient address.';
    const amountUnits = parseUsdcAmount(sendAmount);
    if (amountUnits === null || amountUnits <= BigInt(0)) return 'Enter a USDC amount greater than 0.';
    if (rawBalance === null) return 'USDC balance is not available yet.';
    if (amountUnits > rawBalance) return 'Amount exceeds your available USDC balance.';
    return null;
  }

  function openSend(): void {
    setSendError(null);
    setSubmittedHash(null);
    setSendReview(false);
    setSendOpen(true);
  }

  async function confirmSend(): Promise<void> {
    const provider = getProvider();
    const validationError = getSendValidationError();
    const amountUnits = parseUsdcAmount(sendAmount);
    if (!provider || !address || !amountUnits || validationError) {
      setSendError(validationError ?? 'Wallet is unavailable.');
      return;
    }

    setSendBusy(true);
    setSendError(null);
    try {
      const result = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: ARC_TESTNET_USDC,
          data: transferCallData(recipient, amountUnits),
          value: '0x0'
        }]
      });
      if (typeof result !== 'string' || !result.startsWith('0x')) {
        throw new Error('Wallet did not return a transaction hash.');
      }
      setSubmittedHash(result);
      setSendReview(false);
      void loadBalance(address, chainId);
      void loadTransfers(address, chainId);
      toast.success('Transaction submitted');
    } catch (cause) {
      setSendError(getRpcErrorMessage(cause));
    } finally {
      setSendBusy(false);
    }
  }

  if (!address) {
    return (
      <div className='flex flex-col items-end gap-1'>
        <Button
          type='button'
          variant='default'
          size='lg'
          className='min-w-40 justify-center px-5 text-sm font-semibold shadow-sm sm:min-w-48'
          disabled={busy || !canonicalWallet.ready}
          onClick={() => void connectWallet()}
        >
          <Icons.creditCard data-icon='inline-start' />
          {busy ? 'Connecting...' : 'Connect Wallet'}
        </Button>
        {error && (
          <span className='text-destructive max-w-52 text-right text-[11px]' role='alert'>
            {error}
          </span>
        )}
      </div>
    );
  }

  const onArcTestnet = chainId === ARC_TESTNET_CHAIN_ID;
  const visibleTransfers = submittedHash && !transfers.some((transfer) => transfer.hash === submittedHash)
    ? [{ hash: submittedHash, direction: 'Sent' as const, amount: sendAmount || '0', status: 'Pending' as const, timestamp: 'Submitted from this session', counterparty: recipient }]
    : transfers;
  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type='button'
            variant='outline'
            size='lg'
            className='min-w-44 justify-center gap-2 px-4 shadow-sm sm:min-w-56'
            aria-label='Open wallet menu'
          />
        }
      >
        <span
          className={`size-2 rounded-full ${onArcTestnet ? 'bg-emerald-400' : 'bg-amber-400'}`}
        />
        <span className='font-mono'>{shortenAddress(address)}</span>
        <span className='hidden text-xs text-muted-foreground sm:inline'>
          {onArcTestnet ? 'Arc Testnet' : 'Wrong Network'}
        </span>
        <Icons.chevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <div className='px-2 py-2'>
          <p className='text-muted-foreground text-xs'>Connected wallet</p>
          <p className='mt-1 truncate font-mono text-xs'>{address}</p>
          <Badge
            variant='outline'
            className={`mt-2 ${onArcTestnet ? 'text-emerald-400' : 'text-amber-400'}`}
          >
            {onArcTestnet ? 'Arc Testnet' : 'Wrong Network'}
          </Badge>
          {onArcTestnet && (
            <div className='mt-3 border-t pt-3'>
              <p className='text-muted-foreground text-xs'>USDC balance</p>
              {balanceLoading ? (
                <p className='mt-1 text-sm'>Loading balance...</p>
              ) : balanceError ? (
                <div className='mt-1 flex items-center justify-between gap-2'>
                  <span className='text-destructive text-xs'>Unable to load balance</span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    onClick={() => void loadBalance(address, chainId)}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <p className='mt-1 text-lg font-semibold tabular-nums'>{balance ?? '—'} USDC</p>
              )}
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='mt-2 w-full justify-start'
                disabled={balanceLoading}
                onClick={() => void loadBalance(address, chainId)}
              >
                <Icons.trendingUp data-icon='inline-start' />
                Refresh balance
              </Button>
              <div className='mt-3 border-t pt-3'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-muted-foreground text-xs'>Recent Arc Testnet activity</p>
                  <Button type='button' variant='ghost' size='xs' disabled={transfersLoading} onClick={() => void loadTransfers(address, chainId)}>Refresh</Button>
                </div>
                {transfersLoading ? <p className='mt-2 text-xs'>Loading transactions...</p> : transfersError ? <div className='mt-2 flex items-center justify-between gap-2'><span className='text-destructive text-xs'>Unable to load transaction activity</span><Button type='button' variant='ghost' size='xs' onClick={() => void loadTransfers(address, chainId)}>Retry</Button></div> : visibleTransfers.length === 0 ? <p className='text-muted-foreground mt-2 text-xs'>No Arc Testnet transactions yet.</p> : <div className='mt-2 grid gap-2'>{visibleTransfers.map((transfer) => <div key={transfer.hash} className='rounded-md border p-2 text-xs'><div className='flex items-center justify-between gap-2'><span className='font-medium'>{transfer.direction} {transfer.amount} USDC</span><Badge variant='outline' className={transfer.status === 'Confirmed' ? 'text-emerald-400' : transfer.status === 'Pending' ? 'text-amber-400' : 'text-red-400'}>{transfer.status}</Badge></div><p className='text-muted-foreground mt-1 truncate font-mono'>{transfer.hash}</p><p className='text-muted-foreground mt-1'>{transfer.timestamp}</p><p className='text-muted-foreground mt-1 truncate'>{transfer.direction === 'Sent' ? 'To' : 'From'}: {transfer.counterparty}</p><a className='text-primary mt-1 inline-block underline underline-offset-2' href={`https://testnet.arcscan.app/tx/${transfer.hash}`} target='_blank' rel='noreferrer'>View on Arc Testnet Explorer</a></div>)}</div>}
              </div>
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        {onArcTestnet && (
          <DropdownMenuItem onClick={openSend}>
            <Icons.arrowRight />
            Send USDC
          </DropdownMenuItem>
        )}
        {!onArcTestnet && (
          <DropdownMenuItem disabled={busy} onClick={() => void switchToArc()}>
            <Icons.arrowRight />
            Switch to Arc Testnet
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={disconnectWallet}>
          <Icons.logout />
          Disconnect wallet
        </DropdownMenuItem>
        {error && (
          <p className='text-destructive px-2 py-1 text-xs' role='alert'>
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={sendOpen} onOpenChange={(open) => open ? setSendOpen(true) : resetSendState()}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{submittedHash ? 'Transaction submitted' : sendReview ? 'Review USDC Transfer' : 'Send USDC'}</DialogTitle>
          <DialogDescription>
            {submittedHash ? 'The wallet submitted this Arc Testnet transaction. Confirmation is not being assumed.' : 'Testnet-only USDC transfer using your connected browser wallet.'}
          </DialogDescription>
        </DialogHeader>
        {submittedHash ? (
          <div className='grid gap-4 text-sm'>
            <div className='rounded-lg border bg-muted/30 p-3'><p className='text-muted-foreground text-xs'>Transaction hash</p><p className='mt-1 break-all font-mono text-xs'>{submittedHash}</p></div>
            <div className='grid gap-2'><p><span className='text-muted-foreground'>Amount:</span> {sendAmount} USDC</p><p><span className='text-muted-foreground'>Recipient:</span> <span className='break-all font-mono text-xs'>{recipient}</span></p><p><span className='text-muted-foreground'>Network:</span> Arc Testnet</p></div>
            <a className='text-primary text-sm underline underline-offset-4' href={`${ARC_TESTNET_EXPLORER_URL}/tx/${submittedHash}`} target='_blank' rel='noreferrer'>View on Arc Testnet Explorer</a>
          </div>
        ) : sendReview ? (
          <div className='grid gap-4'>
            <div className='grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm'><div className='flex justify-between gap-3'><span className='text-muted-foreground'>Recipient</span><span className='max-w-[65%] break-all text-right font-mono text-xs'>{recipient}</span></div><div className='flex justify-between gap-3'><span className='text-muted-foreground'>Amount</span><span className='font-medium'>{sendAmount} USDC</span></div><div className='flex justify-between gap-3'><span className='text-muted-foreground'>Network</span><span className='font-medium'>Arc Testnet</span></div><div className='flex justify-between gap-3'><span className='text-muted-foreground'>Estimated network fee</span><span className='text-muted-foreground'>Calculated by wallet</span></div></div>
            {sendError && <p className='text-destructive text-sm' role='alert'>{sendError}</p>}
          </div>
        ) : (
          <div className='grid gap-4'>
            <div className='rounded-lg border bg-muted/30 p-3 text-sm'><span className='text-muted-foreground'>Available balance</span><p className='mt-1 font-semibold'>{balanceLoading ? 'Loading balance...' : `${balance ?? 'Unavailable'} USDC`}</p></div>
            <div className='grid gap-2'><label htmlFor='arc-recipient' className='text-sm font-medium'>Recipient address</label><Input id='arc-recipient' value={recipient} onChange={(event) => { setRecipient(event.target.value); setSendError(null); }} placeholder='0x...' aria-invalid={Boolean(recipient) && !isAddress(recipient)} /></div>
            <div className='grid gap-2'><label htmlFor='arc-send-amount' className='text-sm font-medium'>Amount (USDC)</label><Input id='arc-send-amount' inputMode='decimal' value={sendAmount} onChange={(event) => { setSendAmount(event.target.value); setSendError(null); }} placeholder='0.00' aria-invalid={Boolean(sendAmount) && parseUsdcAmount(sendAmount) === null} /></div>
            {sendError && <p className='text-destructive text-sm' role='alert'>{sendError}</p>}
          </div>
        )}
        <DialogFooter>
          {submittedHash ? <Button type='button' onClick={resetSendState}>Close</Button> : sendReview ? <><Button type='button' variant='outline' onClick={() => setSendReview(false)} disabled={sendBusy}>Back</Button><Button type='button' onClick={() => void confirmSend()} disabled={sendBusy}>{sendBusy ? 'Waiting for wallet...' : 'Confirm & Send'}</Button></> : <><Button type='button' variant='outline' onClick={resetSendState}>Cancel</Button><Button type='button' onClick={() => { const validationError = getSendValidationError(); if (validationError) setSendError(validationError); else setSendReview(true); }} disabled={balanceLoading}>Review transfer</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
