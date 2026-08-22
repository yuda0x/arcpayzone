import { NextResponse } from 'next/server';
import { getArcTransactions } from '@/lib/arc-transactions';

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 });
  try {
    const transactions = await getArcTransactions(address);
    const confirmed = transactions.filter((record) => record.status === 'Confirmed');
    return NextResponse.json({ chainId: 5042002, transactions, analytics: {
      paymentCount: transactions.length,
      paymentVolume: confirmed.reduce((sum, record) => sum + record.amount, 0),
      incomingVolume: confirmed.filter((record) => record.direction === 'Received').reduce((sum, record) => sum + record.amount, 0),
      outgoingVolume: confirmed.filter((record) => record.direction === 'Sent').reduce((sum, record) => sum + record.amount, 0),
      successful: confirmed.length,
      failed: transactions.filter((record) => record.status === 'Failed').length,
      averagePayment: confirmed.length ? confirmed.reduce((sum, record) => sum + record.amount, 0) / confirmed.length : 0
    }});
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown Arc analytics error';
    console.error('Arc payment analytics failed:', detail);
    return NextResponse.json({ error: 'Unable to load Arc Testnet analytics.', detail }, { status: 502 });
  }
}
