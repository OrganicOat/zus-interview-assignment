import { useCallback, useMemo, useRef } from 'react';
import { RefundApiError, submitRefundApi } from '@/api';
import { calculateRefundSummary, extractSelectionPayload, formatCurrency } from '@/domain';
import { ApiErrorCode } from '@/enums';
import { useOrderStore, useRefundStore } from '@/store';
import type { IRefundSummary } from '@/types';

export function useRefundCalculation(): IRefundSummary | null {
  const order = useOrderStore((state) => state.order);
  const selection = useRefundStore((state) => state.selection);

  return useMemo(() => {
    if (!order) {
      return null;
    }
    return calculateRefundSummary(order, selection);
  }, [order, selection]);
}

export function useRefundSubmission() {
  const inFlightRef = useRef(false);

  const submitRefund = useCallback(async () => {
    // Block double-submit before state updates
    if (inFlightRef.current) {
      return;
    }

    const orderState = useOrderStore.getState();
    const refundState = useRefundStore.getState();

    const { order } = orderState;
    if (!order || refundState.modalStage === 'submitting') {
      return;
    }

    if (!refundState.reason || !refundState.channel) {
      refundState.failSubmitting(
        ApiErrorCode.INVALID_SELECTION,
        'Please select both a refund reason and a refund channel.'
      );
      return;
    }

    const summary = calculateRefundSummary(order, refundState.selection);
    if (!summary.hasAnySelection || summary.totalMinor <= 0) {
      refundState.failSubmitting(
        ApiErrorCode.INVALID_SELECTION,
        'Select at least one refundable item or delivery fee.'
      );
      return;
    }

    inFlightRef.current = true;
    const idempotencyKey = refundState.startSubmitting();

    try {
      const { unitIds, addonRefs, refundDeliveryFee } = extractSelectionPayload(
        order,
        refundState.selection
      );

      const trimmedNote = refundState.reasonNote.trim();
      const result = await submitRefundApi(
        {
          order_id: order.orderId,
          order_version: order.version,
          unit_ids: unitIds,
          addon_refs: addonRefs,
          refund_delivery_fee: refundDeliveryFee,
          expected_amount_minor: summary.totalMinor,
          currency: order.currency,
          reason: refundState.reason,
          reason_note: trimmedNote || undefined,
          channel: refundState.channel,
        },
        idempotencyKey
      );

      orderState.applyRefundSuccess(result.order, {
        refundId: result.refundId,
        idempotencyKey: result.idempotencyKey,
        orderId: order.orderId,
        amountMinor: result.amountMinor,
        currency: result.currency,
        reason: refundState.reason,
        reasonNote: trimmedNote,
        channel: refundState.channel,
        createdAt: result.createdAt,
        itemCount: summary.selectedUnitCount + summary.selectedAddonCount,
        includedDeliveryFee: refundDeliveryFee,
      });

      refundState.completeSubmitting();

      orderState.showNotification(
        'success',
        `Refund ${result.refundId} for ${formatCurrency(result.amountMinor, result.currency)} submitted successfully.`
      );
    } catch (error) {
      if (error instanceof RefundApiError) {
        refundState.failSubmitting(error.code, error.message);

        if (
          error.code === ApiErrorCode.CONFLICT_STALE_ORDER ||
          error.code === ApiErrorCode.AMOUNT_MISMATCH
        ) {
          void orderState.fetchOrder(order.orderId);
        }
      } else {
        const message =
          error instanceof Error ? error.message : 'Unexpected error while submitting refund.';
        refundState.failSubmitting('UNKNOWN', message);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  return { submitRefund };
}
