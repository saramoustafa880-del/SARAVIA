export interface PiPaymentStatus {
  developer_approved: boolean;
  transaction_verified: boolean;
  developer_completed: boolean;
  canceled: boolean;
  Pioneer_cancelled: boolean;
}

export interface PiTransactionDetails {
  txid: string;
  verified: boolean;
  _link?: string;
}

export interface PiPaymentDto {
  identifier: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  to_address?: string;
  created_at?: string;
  user_uid?: string;
  pioneer_uid?: string;
  Pioneer_uid?: string;
  status: PiPaymentStatus;
  transaction: PiTransactionDetails | null;
}

export interface TransactionAggregate {
  id: string;
  paymentIntentId: string;
  piPaymentId?: string | null;
  pioneerUid: string;
  bookingReference: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  txid?: string | null;
  status: string;
  developerApproved: boolean;
  transactionVerified: boolean;
  developerCompleted: boolean;
  cancelled: boolean;
  pioneerCancelled: boolean;
}
