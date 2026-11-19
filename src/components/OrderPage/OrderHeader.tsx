import * as Tooltip from '@radix-ui/react-tooltip';
import { ReceiptText, RotateCcw } from 'lucide-react';
import { StatusChip } from '@/components/common/StatusChip';
import { formatCurrency } from '@/domain';
import type { IOrder, IOrderTotals } from '@/types';

interface Props {
  order: IOrder;
  orderTotals: IOrderTotals;
  onStartRefund: () => void;
}

export function OrderHeader({ order, orderTotals, onStartRefund }: Props) {
  const canRefund = orderTotals.hasRefundableItems;

  return (
    <section className="rounded-xl border border-ice-blue border-t-4 border-t-cobalt bg-surface p-5 shadow-[0_2px_10px_rgba(39,56,128,0.04)] sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cobalt text-white">
              <ReceiptText className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-cobalt sm:text-2xl">
              Order {order.orderId}
            </h1>
            <StatusChip status={order.status} size="medium" />
          </div>
          <p className="text-sm text-ink-secondary">
            Currency: <strong className="text-ink-primary">{order.currency}</strong> &middot;
            Revision v{order.version}
          </p>
        </div>

        <Tooltip.Root open={canRefund ? false : undefined}>
          <Tooltip.Trigger asChild>
            <span tabIndex={canRefund ? undefined : 0}>
              <button
                type="button"
                onClick={onStartRefund}
                disabled={!canRefund}
                className="inline-flex min-h-[42px] min-w-[148px] items-center justify-center gap-2 rounded-full bg-cobalt px-5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-dark disabled:cursor-not-allowed disabled:bg-ice-blue disabled:text-ink-secondary cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Refund
              </button>
            </span>
          </Tooltip.Trigger>
          {!canRefund && (
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={6}
                className="z-50 rounded-lg bg-ink-primary px-3 py-1.5 text-xs text-white shadow-md"
              >
                All items and fees on this order have already been refunded
              </Tooltip.Content>
            </Tooltip.Portal>
          )}
        </Tooltip.Root>
      </div>

      <hr className="my-5 border-ice-blue" />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-lg border border-ice-blue bg-surface-muted p-3.5">
          <span className="block text-xs text-ink-secondary">Original Order Total</span>
          <span className="mt-0.5 block font-heading text-lg font-bold tabular-nums text-ink-primary">
            {formatCurrency(orderTotals.originalTotalMinor, order.currency)}
          </span>
        </div>

        <div className="rounded-lg border border-ice-blue bg-surface-muted p-3.5">
          <span className="block text-xs text-ink-secondary">Already Refunded</span>
          <span className="mt-0.5 block font-heading text-lg font-bold tabular-nums text-ink-secondary">
            {formatCurrency(orderTotals.refundedTotalMinor, order.currency)}
          </span>
        </div>

        <div className="rounded-lg border border-ice-blue bg-ice-hover p-3.5">
          <span className="block text-xs font-semibold text-cobalt">Remaining Refundable</span>
          <span className="mt-0.5 block font-heading text-lg font-bold tabular-nums text-cobalt">
            {formatCurrency(orderTotals.remainingTotalMinor, order.currency)}
          </span>
        </div>
      </div>
    </section>
  );
}
