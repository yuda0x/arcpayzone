'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';

function PrivyWalletButtonContent() {
  const { authenticated, ready } = usePrivy();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useLogin({
    onComplete: () => setConnecting(false),
    onError: (loginError) => {
      setConnecting(false);
      setError(typeof loginError === 'string' ? loginError : 'Wallet connection failed.');
    }
  });

  if (!ready) {
    return (
      <Button type='button' variant='outline' size='sm' disabled title='Checking wallet session'>
        <Icons.spinner className='animate-spin' />
        Connect Wallet
      </Button>
    );
  }

  if (authenticated) {
    return (
      <Button type='button' variant='outline' size='sm' disabled title='Wallet connected'>
        <Icons.check />
        Wallet Connected
      </Button>
    );
  }

  return (
    <div className='relative'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          setError(null);
          setConnecting(true);
          login({ loginMethods: ['wallet'], walletChainType: 'ethereum-only' });
        }}
        disabled={connecting}
        title='Connect an EVM wallet'
      >
        {connecting ? <Icons.spinner className='animate-spin' /> : <Icons.creditCard />}
        Connect Wallet
      </Button>
      {error ? <span className='text-destructive absolute top-full right-0 mt-2 w-56 text-right text-xs'>{error}</span> : null}
    </div>
  );
}

export default function PrivyWalletButton() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim()) {
    return null;
  }

  return <PrivyWalletButtonContent />;
}
