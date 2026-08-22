import { NextResponse } from 'next/server';
import { getArcTransactions } from '@/lib/arc-transactions';

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 });
  try {
    const transactions = await getArcTransactions(address);
    const customers = new Map<string, { address: string; count: number; volume: number; lastActivity: string | null }>();
    transactions.filter((record) => record.status === 'Confirmed').forEach((record) => {
      const customerAddress = record.direction === 'Sent' ? record.to : record.from;
      if (customerAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') return;
      const current = customers.get(customerAddress) ?? { address: customerAddress, count: 0, volume: 0, lastActivity: null };
      current.count += 1;
      current.volume += record.amount;
      current.lastActivity = record.timestamp;
      customers.set(customerAddress, current);
    });
    return NextResponse.json({ chainId: 5042002, customers: [...customers.values()] });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown Arc customer error';
    console.error('Arc customers failed:', detail);
    return NextResponse.json({ error: 'Unable to load Arc Testnet customers.', detail }, { status: 502 });
  }
}
