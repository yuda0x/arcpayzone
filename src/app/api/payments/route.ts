import { NextResponse } from 'next/server';
import { getArcTransactions } from '@/lib/arc-transactions';

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 });
  try {
    const transactions = await getArcTransactions(address);
    return NextResponse.json({ chainId: 5042002, payments: transactions });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown Arc payment error';
    console.error('Arc payments failed:', detail);
    return NextResponse.json({ error: 'Unable to load Arc Testnet payments.', detail }, { status: 502 });
  }
}
