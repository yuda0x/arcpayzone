'use client';

import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useCanonicalWallet } from '@/hooks/use-canonical-wallet';
import { ARC_CHAIN_ID, getArcReadProvider } from '@/features/payzone/contracts';
import { useAudcStakingPosition } from '@/features/payzone/hooks/use-audc-staking-position';

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_AUDC_STAKING_ADDRESS || '';
const AUDC_ADDRESS = process.env.NEXT_PUBLIC_AUDC_TOKEN_ADDRESS || '';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000';
const EURC_ADDRESS = process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
const STAKING_ABI = [
  'function stake(uint256 poolId,uint256 amount)',
  'function withdraw(uint256 poolId,uint256 amount)',
  'function claimRewards(uint256 poolId) returns (uint256)',
  'function earned(uint256 poolId,address account) view returns (uint256)',
  'function getPool(uint256 poolId) view returns (address stakingToken,uint8 stakingTokenDecimals,uint256 rewardRate,uint256 totalStaked,uint256 lastUpdateTime,uint256 rewardPerTokenStored,bool active)',
  'function getUserInfo(uint256 poolId,address account) view returns (uint256 amount,uint256 rewardPerTokenPaid,uint256 rewards,uint256 startedAt)',
  'function availableRewardBalance() view returns (uint256)'
];
const TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner,address spender) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)'
];

type Asset = 'USDC' | 'EURC';

interface AudcStakingPanelProps {
  theme: 'dark' | 'light';
}

function formatToken(value: bigint, decimals = 6): string {
  return Number(ethers.formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6
  });
}

function formatAudc(value: bigint): string {
  return Number(ethers.formatUnits(value, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 6
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Transaction failed or was rejected.';
}

export function AudcStakingPanel({ theme }: AudcStakingPanelProps) {
  const { address, chainId, provider: walletProvider } = useCanonicalWallet();
  const [asset, setAsset] = useState<Asset>('USDC');
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState<bigint>(BigInt(0));
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const [earned, setEarned] = useState<bigint>(BigInt(0));
  const [rewardRate, setRewardRate] = useState<bigint>(BigInt(0));
  const [rewardPool, setRewardPool] = useState<bigint>(BigInt(0));
  const [poolActive, setPoolActive] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const configured = ethers.isAddress(STAKING_ADDRESS) && ethers.isAddress(AUDC_ADDRESS);
  const poolId = asset === 'USDC' ? 0 : 1;
  const { amount: staked, startedAt } = useAudcStakingPosition(poolId, refreshKey);
  const tokenAddress = asset === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS;
  const tokenLabel = asset;
  const inputAmount = useMemo(() => {
    try {
      return amount ? ethers.parseUnits(amount, 6) : BigInt(0);
    } catch {
      return BigInt(0);
    }
  }, [amount]);
  const elapsed = startedAt > 0 ? Math.max(0, now - startedAt) : 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setWalletBalance(BigInt(0));
    setAllowance(BigInt(0));
    setEarned(BigInt(0));
    setRewardRate(BigInt(0));
    setRewardPool(BigInt(0));
    setPoolActive(false);

    async function refresh() {
      if (!address || !configured) {
        if (!cancelled) {
          setWalletBalance(BigInt(0));
          setAllowance(BigInt(0));
          setEarned(BigInt(0));
          setRewardRate(BigInt(0));
          setRewardPool(BigInt(0));
          setPoolActive(false);
        }
        return;
      }
      try {
        const readProvider = getArcReadProvider();
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, readProvider);
        const token = new ethers.Contract(tokenAddress, TOKEN_ABI, readProvider);
        const [balance, currentAllowance, pool, currentEarned, available] = await Promise.all([
          token.balanceOf(address),
          token.allowance(address, STAKING_ADDRESS),
          staking.getPool(poolId),
          staking.earned(poolId, address),
          staking.availableRewardBalance()
        ]);
        if (cancelled) return;
        setWalletBalance(balance);
        setAllowance(currentAllowance);
        setEarned(currentEarned);
        setRewardRate(pool.rewardRate);
        setRewardPool(available);
        setPoolActive(pool.active);
      } catch (error) {
        if (!cancelled) setStatus(`Unable to read AUDC staking state: ${errorMessage(error)}`);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address, asset, configured, poolId, tokenAddress]);

  async function submit(action: 'stake' | 'withdraw' | 'claim') {
    if (!address) {
      setStatus('Connect your wallet first.');
      return;
    }
    if (chainId !== ARC_CHAIN_ID) {
      setStatus('Switch your wallet to Arc Testnet first.');
      return;
    }
    if (!configured || !walletProvider) {
      setStatus('AUDC staking is not deployed/configured yet.');
      return;
    }
    if (action !== 'claim' && inputAmount === BigInt(0)) {
      setStatus('Enter an amount greater than zero.');
      return;
    }
    if (action === 'stake' && inputAmount > walletBalance) {
      setStatus(`Insufficient ${tokenLabel} wallet balance.`);
      return;
    }
    if (action === 'stake' && !poolActive) {
      setStatus(`${tokenLabel} staking pool is paused.`);
      return;
    }
    if (action === 'withdraw' && inputAmount > staked) {
      setStatus('Withdrawal exceeds your staked balance.');
      return;
    }

    setLoading(true);
    try {
      const browserProvider = new ethers.BrowserProvider(walletProvider);
      const signer = await browserProvider.getSigner();
      const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
      if (action === 'stake') {
        const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
        if (allowance < inputAmount) {
          setStatus(`Approve ${tokenLabel} for staking...`);
          const approval = await token.approve(STAKING_ADDRESS, inputAmount);
          const approvalReceipt = await approval.wait();
          if (!approvalReceipt || approvalReceipt.status !== 1) throw new Error('Token approval failed.');
        }
        setStatus(`Staking ${tokenLabel}...`);
        const transaction = await staking.stake(poolId, inputAmount);
        const receipt = await transaction.wait();
        if (!receipt || receipt.status !== 1) throw new Error('Staking transaction failed.');
      } else if (action === 'withdraw') {
        setStatus(`Unstaking ${tokenLabel}...`);
        const transaction = await staking.withdraw(poolId, inputAmount);
        const receipt = await transaction.wait();
        if (!receipt || receipt.status !== 1) throw new Error('Unstaking transaction failed.');
      } else {
        if (earned === BigInt(0)) {
          setStatus('No AUDC rewards are currently accrued.');
          return;
        }
        setStatus('Claiming AUDC rewards...');
        const transaction = await staking.claimRewards(poolId);
        const receipt = await transaction.wait();
        if (!receipt || receipt.status !== 1) throw new Error('Claim transaction failed.');
      }
      setAmount('');
      setRefreshKey((value) => value + 1);
      setStatus(`${action === 'claim' ? 'AUDC rewards claimed' : `${tokenLabel} ${action === 'stake' ? 'staked' : 'unstaked'}`} successfully.`);
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const cardClass = theme === 'dark'
    ? 'border-amber-400/40 bg-slate-950 text-slate-50'
    : 'border-amber-300 bg-white text-slate-900';
  const mutedClass = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const controlClass = theme === 'dark'
    ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 hover:bg-slate-800'
    : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-500 hover:bg-slate-50';
  const metricClass = theme === 'dark'
    ? 'border-slate-700 bg-slate-900/80 text-slate-100'
    : 'border-slate-200 bg-slate-50 text-slate-900';

  return (
    <section className={`rounded-3xl border p-6 md:p-8 shadow-xl ${cardClass}`}>
      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${mutedClass}`}>Controlled staking</div>
          <h2 className='mt-2 text-2xl font-black'>Stake for AUDC</h2>
          <p className={`mt-2 max-w-2xl text-sm ${mutedClass}`}>
            Stake USDC or EURC in the project-owned pool. Rewards accrue by elapsed time and are paid from funded AUDC liquidity.
          </p>
        </div>
        <div className={`flex gap-1 rounded-xl border p-1 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
          {(['USDC', 'EURC'] as Asset[]).map((option) => (
            <button
              key={option}
              type='button'
              onClick={() => setAsset(option)}
              className={`rounded-lg px-4 py-2 text-xs font-black transition-colors ${asset === option ? 'bg-amber-500 text-white' : controlClass}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {!configured ? (
        <div className='rounded-2xl border border-dashed border-current/20 p-4 text-sm'>
          AUDC staking is awaiting deployment configuration. The legacy external vault is not used by this panel.
        </div>
      ) : (
        <>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <Metric className={metricClass} label={`${asset} wallet`} value={`${formatToken(walletBalance)} ${asset}`} />
            <Metric className={metricClass} label={`${asset} allowance`} value={`${formatToken(allowance)} ${asset}`} />
            <Metric className={metricClass} label={`${asset} staked`} value={`${formatToken(staked)} ${asset}`} />
            <Metric className={metricClass} label='AUDC accrued' value={`${formatAudc(earned)} AUDC`} />
            <Metric className={metricClass} label='AUDC pool' value={`${formatAudc(rewardPool)} AUDC`} />
          </div>
          <div className={`mt-4 grid gap-2 text-xs ${mutedClass} sm:grid-cols-3`}>
            <span>Pool: {poolActive ? 'Active' : 'Paused'}</span>
            <span>Rate: {formatAudc(rewardRate)} AUDC / {asset} / sec</span>
            <span>Elapsed: {elapsed}s</span>
            <span>Position starts: {startedAt ? new Date(startedAt * 1000).toLocaleString() : 'Not staked'}</span>
          </div>
          <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode='decimal'
              placeholder={`Amount of ${asset}`}
              className={`min-w-0 flex-1 rounded-xl border px-4 py-3 font-bold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 ${controlClass}`}
            />
            <button type='button' onClick={() => setAmount(formatToken(walletBalance))} className={`rounded-xl border px-4 py-3 text-xs font-black ${controlClass}`}>MAX STAKE</button>
            <button type='button' onClick={() => setAmount(formatToken(staked))} className={`rounded-xl border px-4 py-3 text-xs font-black ${controlClass}`}>MAX UNSTAKE</button>
          </div>
          <div className='mt-3 flex flex-wrap gap-3'>
            <button type='button' disabled={loading || !poolActive} onClick={() => void submit('stake')} className='rounded-xl bg-amber-500 px-5 py-3 text-xs font-black text-white hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-100'>STAKE {asset}</button>
            <button type='button' disabled={loading} onClick={() => void submit('withdraw')} className={`rounded-xl border px-5 py-3 text-xs font-black disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 ${controlClass}`}>UNSTAKE {asset}</button>
            <button type='button' disabled={loading || earned === BigInt(0) || earned > rewardPool} onClick={() => void submit('claim')} className='rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-100'>CLAIM AUDC</button>
          </div>
        </>
      )}
      {status && <p className={`mt-4 text-xs ${mutedClass}`}>{status}</p>}
    </section>
  );
}

function Metric({ className, label, value }: { className: string; label: string; value: string }) {
  return <div className={`rounded-2xl border p-4 ${className}`}><div className='text-[10px] font-black uppercase tracking-widest opacity-70'>{label}</div><div className='mt-2 font-black'>{value}</div></div>;
}
