import { TransactionStatus } from '@prisma/client';
import { PaymentsService } from '../payments.service';

describe('PaymentsService', () => {
  const repository = {
    createIntent: jest.fn(),
    findByPaymentIntentId: jest.fn(),
    findByPiPaymentId: jest.fn(),
    updateByPaymentIntentId: jest.fn(),
    updateByPiPaymentId: jest.fn()
  };

  const piNetworkService = {
    getPayment: jest.fn(),
    approvePayment: jest.fn(),
    completePayment: jest.fn()
  };

  const auditService = { log: jest.fn() };
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'app.piReceiverAddress') {
        return 'GBEBA3NTGV75G4KKD7H6BLYMTJQ6NGC5KLH5YWPQYF4SKFKAKSCNYUQJ';
      }
      if (key === 'app.webhookSecret') {
        return 'secret';
      }
      if (key === 'app.webhookReplayTtlSeconds') {
        return 600;
      }
      return 'secret';
    })
  };
  const queue = { enqueue: jest.fn() };
  const redis = { setex: jest.fn(), get: jest.fn(), set: jest.fn() };

  const service = new PaymentsService(
    repository as never,
    piNetworkService as never,
    auditService as never,
    configService as never,
    queue as never,
    redis as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a payment intent for the authenticated pioneer', async () => {
    repository.createIntent.mockResolvedValue({ id: 'db-id', bookingReference: 'SV-PAR-20260615' });

    const result = await service.createIntent(
      { uid: 'pi-user-1' },
      {
        uid: 'pi-user-1',
        bookingReference: 'SV-PAR-20260615',
        amount: 500,
        memo: 'SARA VIA luxury stay in Paris',
        metadata: { suite: 'Eiffel View' }
      }
    );

    expect(repository.createIntent).toHaveBeenCalledTimes(1);
    expect(result.bookingReference).toBe('SV-PAR-20260615');
    expect(result.treasuryWallet).toContain('GBEBA3NT');
  });

  it('approves a Pi payment after matching amount, memo pioneer uid and receiver wallet', async () => {
    repository.findByPaymentIntentId.mockResolvedValue({
      id: 'db-id',
      pioneerUid: 'pi-user-1',
      amount: 500,
      memo: 'SARA VIA luxury stay in Paris'
    });

    piNetworkService.getPayment.mockResolvedValue({
      identifier: 'pi-payment-1',
      amount: 500,
      memo: 'SARA VIA luxury stay in Paris',
      metadata: {},
      pioneer_uid: 'pi-user-1',
      to_address: 'GBEBA3NTGV75G4KKD7H6BLYMTJQ6NGC5KLH5YWPQYF4SKFKAKSCNYUQJ',
      status: {
        developer_approved: false,
        transaction_verified: false,
        developer_completed: false,
        canceled: false,
        Pioneer_cancelled: false
      },
      transaction: null
    });

    piNetworkService.approvePayment.mockResolvedValue({
      identifier: 'pi-payment-1',
      amount: 500,
      memo: 'SARA VIA luxury stay in Paris',
      metadata: {},
      pioneer_uid: 'pi-user-1',
      to_address: 'GBEBA3NTGV75G4KKD7H6BLYMTJQ6NGC5KLH5YWPQYF4SKFKAKSCNYUQJ',
      status: {
        developer_approved: true,
        transaction_verified: false,
        developer_completed: false,
        canceled: false,
        Pioneer_cancelled: false
      },
      transaction: null
    });

    repository.updateByPaymentIntentId.mockResolvedValue({ id: 'db-id' });

    const result = await service.approvePayment(
      { uid: 'pi-user-1' },
      { paymentId: 'pi-payment-1', paymentIntentId: 'bd654f00-8634-4ca1-b4e7-e471ec1df8df' }
    );

    expect(result.ok).toBe(true);
    expect(repository.updateByPaymentIntentId).toHaveBeenCalledWith(
      'bd654f00-8634-4ca1-b4e7-e471ec1df8df',
      expect.objectContaining({ status: TransactionStatus.APPROVED, piPaymentId: 'pi-payment-1' })
    );
  });
});
