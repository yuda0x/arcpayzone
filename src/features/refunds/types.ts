export type RefundStatus = 'Pending' | 'Confirmed';

export interface ApplicationRefund {
  id: string;
  ownerAddress: string;
  invoiceId: string;
  originalTransactionHash: string;
  refundTransactionHash: string;
  amount: string;
  customer: string;
  recipient: string;
  payerAddress?: string;
  asset: 'USDC';
  status: RefundStatus;
  createdAt: string;
  confirmedAt?: string;
}
