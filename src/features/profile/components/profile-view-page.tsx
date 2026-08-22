'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCanonicalWallet } from '@/hooks/use-canonical-wallet';

export default function ProfileViewPage() {
  const { address: walletAddress, authenticated } = useCanonicalWallet();

  return (
    <div className='flex w-full flex-col p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Wallet Profile</CardTitle>
          <CardDescription>ArcPay account details managed through your connected wallet.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between rounded-lg border p-3'>
            <span className='text-muted-foreground'>Status</span>
            <span className='font-medium'>{authenticated ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className='flex items-center justify-between rounded-lg border p-3'>
            <span className='text-muted-foreground'>Wallet</span>
            <span className='max-w-[60%] truncate font-mono text-sm'>{walletAddress ?? 'Not connected'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
