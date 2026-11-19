import { beforeEach, describe, expect, it } from 'vitest';
import {
  RefundApiError,
  resetMockServer,
  submitRefundApi,
  updateApiSimulation,
} from '@/api';
import { ApiErrorCode, RefundChannelId, RefundReasonId } from '@/enums';
import { useRefundStore } from '@/store';

describe('mockRefundApi duplicate & integrity guards', () => {
  beforeEach(() => {
    resetMockServer();
    updateApiSimulation({ latencyMs: 0, failureRate: 0, nextFailure: 'NONE' });
    useRefundStore.getState().completeSubmitting();
  });

  it('deduplicates repeated requests sharing the same idempotency key', async () => {
    const payload = {
      order_id: 'ORD-10482',
      order_version: 1,
      unit_ids: ['L3-1'],
      addon_refs: [],
      refund_delivery_fee: false,
      expected_amount_minor: 790,
      currency: 'MYR',
      reason: RefundReasonId.MISSING_ITEM,
      channel: RefundChannelId.IN_APP_CREDIT,
    };

    const first = await submitRefundApi(payload, 'idem-key-001');
    const second = await submitRefundApi(payload, 'idem-key-001');

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(second.refundId).toBe(first.refundId);
    expect(second.amountMinor).toBe(790);
    expect(second.order.version).toBe(2);
  });

  it('rejects stale order versions with 409 conflict', async () => {
    await expect(
      submitRefundApi(
        {
          order_id: 'ORD-10482',
          order_version: 99,
          unit_ids: ['L3-1'],
          addon_refs: [],
          refund_delivery_fee: false,
          expected_amount_minor: 790,
          currency: 'MYR',
          reason: RefundReasonId.WRONG_ITEM,
          channel: RefundChannelId.ORIGINAL_PAYMENT_METHOD,
        },
        'idem-key-stale'
      )
    ).rejects.toMatchObject({
      code: ApiErrorCode.CONFLICT_STALE_ORDER,
      status: 409,
    });
  });

  it('rejects mismatched client total with 422 amount mismatch', async () => {
    await expect(
      submitRefundApi(
        {
          order_id: 'ORD-10482',
          order_version: 1,
          unit_ids: ['L3-1'],
          addon_refs: [],
          refund_delivery_fee: false,
          expected_amount_minor: 999,
          currency: 'MYR',
          reason: RefundReasonId.QUALITY_ISSUE,
          channel: RefundChannelId.IN_APP_CREDIT,
        },
        'idem-key-mismatch'
      )
    ).rejects.toBeInstanceOf(RefundApiError);
  });

  it('preserves idempotency key across failed retry and rotates when selection changes', () => {
    const order = resetMockServer();
    const store = useRefundStore.getState();

    store.openModal();
    store.toggleUnit(order, 'L3-1');
    const firstKey = useRefundStore.getState().startSubmitting();

    useRefundStore.getState().failSubmitting(ApiErrorCode.NETWORK_TIMEOUT, 'Timed out');
    const retryKey = useRefundStore.getState().startSubmitting();
    expect(retryKey).toBe(firstKey);

    useRefundStore.getState().failSubmitting(ApiErrorCode.SERVER_ERROR, 'Failed');
    useRefundStore.getState().toggleUnit(order, 'L3-2');
    const rotatedKey = useRefundStore.getState().idempotencyKey;
    expect(rotatedKey).not.toBe(firstKey);
  });

  it('defaults reason to Late delivery when only delivery fee is selected', () => {
    const store = useRefundStore.getState();

    store.openModal();
    store.setRefundDeliveryFee(true);
    store.goToReview();

    expect(useRefundStore.getState().reason).toBe(RefundReasonId.LATE_DELIVERY);
  });
});
