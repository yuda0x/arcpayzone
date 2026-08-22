'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function ExclusivePage() {
  return (
    <PageContainer pageTitle='Exclusive Area' pageDescription='Premium capabilities available to your ArcPay plan.'>
      <div className='space-y-6'>
        <Alert>
          <Icons.lock className='h-5 w-5 text-yellow-600' />
          <AlertDescription>
            <div className='mb-1 text-lg font-semibold'>Premium Access</div>
            <div className='text-muted-foreground'>
              Access is gated at the application layer for your deployment. Review your billing plan and upgrade from{' '}
              <Link className='underline' href='/dashboard/billing'>Billing &amp; Plans</Link>.
            </div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Exclusive Features</CardTitle>
            <CardDescription>Premium pathways remain available in the ArcPay platform when your deployment enables them.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-lg'>This page is available as a placeholder while plan-based access is managed outside Clerk.</div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
