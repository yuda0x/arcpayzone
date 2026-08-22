'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import React from 'react';

const chartData = [
  { month: 'Mar 01', payments: 18600, refunds: 920 },
  { month: 'Mar 08', payments: 22400, refunds: 1180 },
  { month: 'Mar 15', payments: 19800, refunds: 760 },
  { month: 'Mar 22', payments: 27300, refunds: 1420 },
  { month: 'Mar 29', payments: 24900, refunds: 980 },
  { month: 'Apr 05', payments: 31200, refunds: 1680 },
  { month: 'Apr 12', payments: 28600, refunds: 1240 },
  { month: 'Apr 19', payments: 34800, refunds: 1850 }
];

const chartConfig = {
  payments: {
    label: 'Payment volume',
    color: 'var(--chart-1)'
  },
  refunds: {
    label: 'Refunds',
    color: 'var(--chart-2)'
  }
} satisfies ChartConfig;

export function AreaGraph() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Payment volume
          <Badge variant='outline'>
            <Icons.trendingUp />
            +18.4%
          </Badge>
        </CardTitle>
        <CardDescription>Gross payment volume and refunds over the last 8 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${Number(value) / 1000}k`}
            />
            <XAxis
              dataKey='month'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <DottedBackgroundPattern config={chartConfig} />
            </defs>
            <Area
              dataKey='refunds'
              type='natural'
              fill='url(#dotted-background-pattern-refunds)'
              fillOpacity={0.4}
              stroke='var(--color-refunds)'
              stackId='a'
              strokeWidth={0.8}
            />
            <Area
              dataKey='payments'
              type='natural'
              fill='url(#dotted-background-pattern-payments)'
              fillOpacity={0.4}
              stroke='var(--color-payments)'
              stackId='a'
              strokeWidth={0.8}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const DottedBackgroundPattern = ({ config }: { config: ChartConfig }) => {
  const items = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value.color])
  );
  return (
    <>
      {Object.entries(items).map(([key, value]) => (
        <pattern
          key={key}
          id={`dotted-background-pattern-${key}`}
          x='0'
          y='0'
          width='7'
          height='7'
          patternUnits='userSpaceOnUse'
        >
          <circle cx='5' cy='5' r='1.5' fill={value} opacity={0.5}></circle>
        </pattern>
      ))}
    </>
  );
};
