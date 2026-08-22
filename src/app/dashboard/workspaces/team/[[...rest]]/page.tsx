'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { teamInfoContent } from '@/config/infoconfig';

const teamMembers = [
  { name: 'Operations Lead', role: 'Admin' },
  { name: 'Treasury Analyst', role: 'Reviewer' },
  { name: 'Compliance', role: 'Approver' }
];

export default function TeamPage() {
  return (
    <PageContainer
      pageTitle='Team Management'
      pageDescription='Manage your workspace permissions and team structure.'
      infoContent={teamInfoContent}
    >
      <div className='grid gap-4 md:grid-cols-3'>
        {teamMembers.map((member) => (
          <Card key={member.name}>
            <CardHeader>
              <CardTitle>{member.name}</CardTitle>
              <CardDescription>{member.role}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-sm text-muted-foreground'>Role-based workspace access is managed in your application configuration rather than Clerk organizations.</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
