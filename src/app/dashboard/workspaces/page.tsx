'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { workspacesInfoContent } from '@/config/infoconfig';

const workspaceCards = [
  { name: 'Arc Main', description: 'Primary payment operations and transaction overview.' },
  { name: 'Operations', description: 'Bridge, payments, and merchant configuration workflows.' },
  { name: 'Treasury', description: 'Liquidity, vault, and payout monitoring.' }
];

export default function WorkspacesPage() {
  return (
    <PageContainer
      pageTitle='Workspaces'
      pageDescription='Manage wallet-backed workspace views for your ArcPay deployment.'
      infoContent={workspacesInfoContent}
    >
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {workspaceCards.map((workspace) => (
          <Card key={workspace.name}>
            <CardHeader>
              <CardTitle>{workspace.name}</CardTitle>
              <CardDescription>{workspace.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-sm text-muted-foreground'>Workspace configuration is handled by your application layer instead of Clerk organizations.</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
