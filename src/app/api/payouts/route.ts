import { NextResponse } from 'next/server';
import { getArcTransactions } from '@/lib/arc-transactions';

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 });
  try {
    const transactions = await getArcTransactions(address);
    return NextResponse.json({ chainId: 5042002, payouts: transactions.filter((record) => record.direction === 'Sent') });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown Arc payout error';
    console.error('Arc payouts failed:', detail);
    return NextResponse.json({ error: 'Unable to load Arc Testnet payouts.', detail }, { status: 502 });
  }
}
