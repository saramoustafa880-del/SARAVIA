export interface PiUser {
  uid: string;
  username?: string;
  accessToken?: string;
}

export interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void | Promise<void>;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void | Promise<void>;
  onCancel?: (paymentId: string) => void;
  onError?: (error: Error, payment?: { identifier?: string }) => void;
  onIncompletePaymentFound?: (payment: { identifier: string }) => void;
}

export interface PiPaymentData {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

declare global {
  interface Window {
    Pi?: {
      init: (options: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound?: PiPaymentCallbacks['onIncompletePaymentFound']
      ) => Promise<PiUser & { accessToken: string }>;
      createPayment: (paymentData: PiPaymentData, callbacks: PiPaymentCallbacks) => Promise<void>;
    };
  }
}

export {};
