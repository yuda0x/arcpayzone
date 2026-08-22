'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Authentication could not be completed. Please try again.';
}

function PrivyAuthPanel() {
  const router = useRouter();
  const { authenticated, ready } = usePrivy();
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const { login } = useLogin({
    onComplete: () => {
      setConnecting(false);
      router.replace('/dashboard/overview');
    },
    onError: (loginError) => {
      setConnecting(false);
      setError(getErrorMessage(loginError));
    }
  });

  useEffect(() => {
    if (ready && authenticated) {
      router.replace('/dashboard/overview');
    }
  }, [authenticated, ready, router]);

  if (!ready) {
    return (
      <div className='text-muted-foreground flex min-h-40 items-center justify-center text-sm'>
        <Icons.spinner className='mr-2 size-4 animate-spin' />
        Checking your session...
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className='text-muted-foreground flex min-h-40 items-center justify-center text-sm'>
        Opening ArcPay...
      </div>
    );
  }

  function handleWallet(): void {
    setError(null);
    setConnecting(true);
    login({ loginMethods: ['wallet'], walletChainType: 'ethereum-only' });
  }

  return (
    <div className='w-full max-w-md space-y-6'>
      <div className='space-y-2 text-center'>
        <div className='bg-primary text-primary-foreground mx-auto flex size-11 items-center justify-center rounded-xl'>
          <Icons.creditCard className='size-5' />
        </div>
        <h1 className='text-3xl font-semibold tracking-tight'>Welcome to ArcPay</h1>
        <p className='text-muted-foreground text-sm'>Sign in to manage your Arc payments.</p>
      </div>

      <div className='space-y-3'>
        <Button type='button' variant='outline' className='h-11 w-full' onClick={handleWallet} disabled={connecting}>
          {connecting ? <Icons.spinner className='animate-spin' /> : null}
          Connect Wallet
        </Button>
      </div>

      {error ? <p className='text-destructive text-center text-sm'>{error}</p> : null}
      <p className='text-muted-foreground text-center text-xs'>By continuing, you agree to use ArcPay securely.</p>
    </div>
  );
}

export default function PrivyAuthView() {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

  if (!privyAppId) {
    return (
      <div className='text-destructive w-full max-w-md space-y-2 text-center'>
        <h1 className='text-xl font-semibold'>Authentication is unavailable</h1>
        <p className='text-sm'>Privy is not configured for this environment.</p>
      </div>
    );
  }

  return <PrivyAuthPanel />;
}
