'use client';

import { LabelList, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

const chartData = [
  { method: 'cards', volume: 8240, fill: 'var(--color-cards)' },
  { method: 'ach', volume: 2910, fill: 'var(--color-ach)' },
  { method: 'wallets', volume: 1680, fill: 'var(--color-wallets)' },
  { method: 'other', volume: 642, fill: 'var(--color-other)' }
];

const chartConfig = {
  volume: {
    label: 'Volume'
  },
  cards: {
    label: 'Cards',
    color: 'var(--chart-1)'
  },
  ach: {
    label: 'ACH',
    color: 'var(--chart-2)'
  },
  wallets: {
    label: 'Digital wallets',
    color: 'var(--chart-3)'
  },
  other: {
    label: 'Other',
    color: 'var(--chart-4)'
  }
} satisfies ChartConfig;

export function PieGraph() {
  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <CardTitle>
          Payment methods
          <Badge variant='outline'>
            <Icons.trendingUp />
            4 channels
          </Badge>
        </CardTitle>
        <CardDescription>Today's processed volume by method</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <ChartContainer
          config={chartConfig}
          className='[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[300px] min-h-[250px]'
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey='volume' hideLabel />} />
            <Pie
              data={chartData}
              innerRadius={30}
              dataKey='volume'
              radius={10}
              cornerRadius={8}
              paddingAngle={4}
            >
              <LabelList
                dataKey='volume'
                stroke='none'
                fontSize={12}
                fontWeight={500}
                fill='currentColor'
                formatter={(value) => String(value ?? '')}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
