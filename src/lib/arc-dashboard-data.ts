import { getArcTransactions, type ArcTransactionRecord } from '@/lib/arc-transactions';

export async function getArcDashboardData(address: string): Promise<ArcTransactionRecord[]> {
  return getArcTransactions(address);
}

export function getIncoming(records: ArcTransactionRecord[]): ArcTransactionRecord[] {
  return records.filter((record) => record.direction === 'Received' && record.status === 'Confirmed');
}

export function getOutgoing(records: ArcTransactionRecord[]): ArcTransactionRecord[] {
  return records.filter((record) => record.direction === 'Sent' && record.status === 'Confirmed');
}

export function getFailed(records: ArcTransactionRecord[]): ArcTransactionRecord[] {
  return records.filter((record) => record.status === 'Failed');
}

export function getVolume(records: ArcTransactionRecord[]): number {
  return records.filter((record) => record.status === 'Confirmed').reduce((sum, record) => sum + record.amount, 0);
}
