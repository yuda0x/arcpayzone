import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

const salesData = [
  {
    name: 'Arcade Supply Co.',
    email: 'txn_8F2K91',
    method: 'Visa •••• 4242',
    status: 'Successful',
    amount: '$1,240.00'
  },
  {
    name: 'Northstar Studio',
    email: 'txn_8F2K88',
    method: 'ACH transfer',
    status: 'Pending',
    amount: '$860.50'
  },
  {
    name: 'Morrow Market',
    email: 'txn_8F2K84',
    method: 'Mastercard •••• 1189',
    status: 'Failed',
    amount: '$320.00'
  },
  {
    name: 'Brightline Goods',
    email: 'txn_8F2K79',
    method: 'Visa •••• 9012',
    status: 'Refunded',
    amount: '$145.00'
  },
  {
    name: 'Pine & Parcel',
    email: 'txn_8F2K73',
    method: 'Apple Pay',
    status: 'Successful',
    amount: '$78.25'
  }
];

export function RecentSales() {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
        <CardDescription>Your latest payment activity in USD</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col gap-5'>
          {salesData.map((sale) => (
            <div key={sale.email} className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                {sale.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm leading-none font-medium'>{sale.name}</p>
                <p className='text-muted-foreground mt-1 truncate text-xs'>
                  {sale.email} · {sale.method}
                </p>
              </div>
              <div className='flex shrink-0 flex-col items-end gap-1'>
                <span className='font-medium tabular-nums'>{sale.amount}</span>
                <Badge variant='outline' className='text-[11px]'>{sale.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
