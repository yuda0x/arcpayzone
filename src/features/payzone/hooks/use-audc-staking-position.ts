'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { getArcReadProvider } from '@/features/payzone/contracts';
import { useCanonicalWallet } from '@/hooks/use-canonical-wallet';

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_AUDC_STAKING_ADDRESS || '';
const STAKING_ABI = [
  'function getUserInfo(uint256 poolId,address account) view returns (uint256 amount,uint256 rewardPerTokenPaid,uint256 rewards,uint256 startedAt)'
];

export function useAudcStakingPosition(poolId: number, refreshKey = 0) {
  const { address } = useCanonicalWallet();
  const [amount, setAmount] = useState<bigint>(BigInt(0));
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setAmount(BigInt(0));
    setStartedAt(0);

    async function refresh() {
      if (!address || !ethers.isAddress(STAKING_ADDRESS)) {
        if (!cancelled) {
          setAmount(BigInt(0));
          setStartedAt(0);
        }
        return;
      }

      try {
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, getArcReadProvider());
        const position = await staking.getUserInfo(poolId, address);
        if (!cancelled) {
          setAmount(position.amount);
          setStartedAt(Number(position.startedAt));
        }
      } catch {
        if (!cancelled) {
          setAmount(BigInt(0));
          setStartedAt(0);
        }
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address, poolId, refreshKey]);

  return { amount, startedAt };
}
