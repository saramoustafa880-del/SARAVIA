'use client';

import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/api';

interface CreateIntentInput {
  uid: string;
  bookingReference: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

interface PaymentIntentResponse {
  internalId: string;
  bookingReference: string;
  paymentIntentId: string;
  treasuryWallet: string;
}

export function usePiPayment(jwt: string | null) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);
  const [treasuryWallet, setTreasuryWallet] = useState<string | null>(null);

  const createLuxuryPayment = useCallback(
    async (input: CreateIntentInput) => {
      if (!window.Pi) {
        throw new Error('Pi SDK is not available in this browser context.');
      }
      if (!jwt) {
        throw new Error('JWT session is required before creating a Pi payment.');
      }

      setStatus('creating-intent');
      setError(null);

      const intent = await apiFetch<PaymentIntentResponse>('/payments/pi/intents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(input)
      });

      setTreasuryWallet(intent.treasuryWallet);
      setStatus('awaiting-wallet');

      await window.Pi.createPayment(
        {
          amount: input.amount,
          memo: input.memo,
          metadata: {
            ...input.metadata,
            bookingReference: input.bookingReference,
            paymentIntentId: intent.paymentIntentId,
            treasuryWallet: intent.treasuryWallet
          }
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            setStatus('server-approval');
            await apiFetch('/payments/pi/approve', {
              method: 'POST',
              headers: { Authorization: `Bearer ${jwt}` },
              body: JSON.stringify({ paymentId, paymentIntentId: intent.paymentIntentId })
            });
            setStatus('wallet-confirmation');
          },
          onReadyForServerCompletion: async (paymentId, txid) => {
            setStatus('server-completion');
            await apiFetch('/payments/pi/complete', {
              method: 'POST',
              headers: { Authorization: `Bearer ${jwt}` },
              body: JSON.stringify({ paymentId, txid })
            });
            setStatus('completed');
          },
          onCancel: () => {
            setStatus('cancelled');
          },
          onError: (caught) => {
            setStatus('failed');
            setError(caught.message);
          },
          onIncompletePaymentFound: async (payment) => {
            await apiFetch(`/payments/pi/${payment.identifier}/verify`, {
              method: 'GET',
              headers: { Authorization: `Bearer ${jwt}` }
            });
          }
        }
      );

      return intent;
    },
    [jwt]
  );

  return { status, error, treasuryWallet, createLuxuryPayment };
}
