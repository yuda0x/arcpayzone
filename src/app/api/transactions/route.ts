import { NextResponse } from 'next/server';

import { getArcTransactionsPage } from '@/lib/arc-transactions';

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const address = searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 });
  }

  try {
    const page = Number(searchParams.get('page') || 1);
    const offset = Number(searchParams.get('offset') || 50);
    const result = await getArcTransactionsPage(address, { page, offset });
    return NextResponse.json({
      chainId: 5042002,
      transactions: result.transactions,
      pagination: {
        page: result.page,
        offset: result.offset,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Arc transaction history error';
    console.error('Arc transaction history failed:', message, error);
    return NextResponse.json({ error: 'Unable to load Arc Testnet transactions.', detail: message }, { status: 502 });
  }
}
