'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { billingInfoContent } from '@/config/infoconfig';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    description: 'For personal wallet usage and basic ArcPay testing.',
    features: ['Wallet connectivity', 'Basic analytics', 'Standard support']
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For growing payment flows and advanced automation.',
    features: ['All Starter features', 'Priority support', 'Advanced reporting']
  },
  {
    name: 'Business',
    price: '$99',
    description: 'For teams and higher-volume payment operations.',
    features: ['All Pro features', 'Team workflows', 'Custom onboarding']
  }
];

export default function BillingPage() {
  return (
    <PageContainer
      infoContent={billingInfoContent}
      pageTitle='Billing & Plans'
      pageDescription='Manage your ArcPay subscription and service tiers.'
    >
      <div className='space-y-6'>
        <Alert>
          <Icons.info className='h-4 w-4' />
          <AlertDescription>
            ArcPay billing is configured through the app’s service layer. Use the plan tiers below as the current product structure while your backend billing provider is integrated.
          </AlertDescription>
        </Alert>

        <div className='grid gap-6 lg:grid-cols-3'>
          {plans.map((plan) => (
            <Card key={plan.name} className='flex h-full flex-col'>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className='mt-auto space-y-4'>
                <div className='text-3xl font-bold'>{plan.price}<span className='text-base font-normal text-muted-foreground'>/mo</span></div>
                <ul className='space-y-2 text-sm'>
                  {plan.features.map((feature) => (
                    <li key={feature} className='flex items-center gap-2'>
                      <Icons.check className='h-4 w-4 text-emerald-500' />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
