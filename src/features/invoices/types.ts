export type InvoiceStatus = 'Pending' | 'Paid' | 'Overdue';
export type InvoiceRefundStatus = 'Pending' | 'Confirmed';

export interface ApplicationInvoice {
  id: string;
  ownerAddress: string;
  customer: string;
  recipient: string;
  payerAddress?: string;
  amount: string;
  asset: 'USDC';
  currency?: 'USDC';
  issueDate: string;
  dueDate: string;
  description: string;
  status: InvoiceStatus;
  transactionHash?: string;
  paidDate?: string;
  refundStatus?: InvoiceRefundStatus;
  refundedAmount?: string;
  refundTransactionHash?: string;
  refundDestination?: string;
  createdAt: string;
}
