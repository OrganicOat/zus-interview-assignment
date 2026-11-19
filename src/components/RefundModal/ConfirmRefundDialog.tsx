import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { formatCurrency } from '@/domain';
import { RefundChannelLabel, RefundReasonDescription } from '@/enums';
import { useRefundStore } from '@/store';
import type { IOrder, IRefundSummary } from '@/types';

interface Props {
  order: IOrder;
  summary: IRefundSummary;
  onConfirmSubmit: () => void;
}

export function ConfirmRefundDialog({ order, summary, onConfirmSubmit }: Props) {
  const { modalStage, reason, channel, cancelConfirmDialog } = useRefundStore(
    useShallow((state) => ({
      modalStage: state.modalStage,
      reason: state.reason,
      channel: state.channel,
      cancelConfirmDialog: state.cancelConfirmDialog,
    }))
  );

  const open = modalStage === 'confirming' || modalStage === 'submitting';
  const isSubmitting = modalStage === 'submitting';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) {
      cancelConfirmDialog();
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[70] bg-ink-primary/45 backdrop-blur-[1px]" />
        <AlertDialog.Content
          onEscapeKeyDown={(event) => {
            if (isSubmitting) {
              event.preventDefault();
            }
          }}
          className="fixed top-1/2 left-1/2 z-[71] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-ice-blue bg-surface p-6 shadow-2xl outline-none"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-warning-text" />
            <AlertDialog.Title className="font-heading text-lg font-bold text-ink-primary">
              Confirm Refund
            </AlertDialog.Title>
          </div>

          <AlertDialog.Description className="mt-2 text-sm text-ink-secondary">
            Please verify the refund details for order{' '}
            <strong className="text-ink-primary">{order.orderId}</strong>. This action cannot be
            undone once processed.
          </AlertDialog.Description>

          <div className="mt-4 space-y-2 rounded-xl border border-ice-blue bg-surface-muted p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Refund Amount</span>
              <span className="font-heading text-base font-bold tabular-nums text-cobalt">
                {formatCurrency(summary.totalMinor, order.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Reason</span>
              <span className="font-semibold text-ink-primary">
                {reason ? RefundReasonDescription[reason] : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Channel</span>
              <span className="font-semibold text-ink-primary">
                {channel ? RefundChannelLabel[channel] : '—'}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={cancelConfirmDialog}
              disabled={isSubmitting}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full px-4 text-sm font-semibold text-ink-secondary hover:bg-ice-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmSubmit}
              disabled={isSubmitting}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full bg-cobalt px-5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-dark disabled:cursor-not-allowed disabled:bg-cobalt/60 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Processing...' : 'Confirm Refund'}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
