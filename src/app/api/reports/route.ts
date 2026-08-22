import { NextResponse } from 'next/server';
import { getArcTransactions } from '@/lib/arc-transactions';

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 });
  try {
    const transactions = await getArcTransactions(address);
    const confirmed = transactions.filter((record) => record.status === 'Confirmed');
    return NextResponse.json({ chainId: 5042002, transactions, summary: {
      transactionCount: transactions.length,
      totalVolume: confirmed.reduce((sum, record) => sum + record.amount, 0),
      incomingVolume: confirmed.filter((record) => record.direction === 'Received').reduce((sum, record) => sum + record.amount, 0),
      outgoingVolume: confirmed.filter((record) => record.direction === 'Sent').reduce((sum, record) => sum + record.amount, 0),
      successful: confirmed.length,
      failed: transactions.filter((record) => record.status === 'Failed').length,
      activeWallets: new Set(transactions.flatMap((record) => [record.from.toLowerCase(), record.to.toLowerCase()])).size
    }});
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown Arc report error';
    console.error('Arc reports failed:', detail);
    return NextResponse.json({ error: 'Unable to load Arc Testnet report data.', detail }, { status: 502 });
  }
}
