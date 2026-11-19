import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, Info, Minus, Truck } from 'lucide-react';
import { useId } from 'react';
import { StatusChip } from '@/components/common/StatusChip';
import { flattenOrderUnits, formatCurrency, toMinorUnits } from '@/domain';
import { PaymentStatus } from '@/enums';
import { useRefundStore } from '@/store';
import type { IOrder, IRefundSummary } from '@/types';
import { RefundUnitRow } from './RefundUnitRow';

interface Props {
  order: IOrder;
  summary: IRefundSummary;
}

export function StepSelectItems({ order, summary }: Props) {
  const selectAllId = useId();
  const refundDeliveryFee = useRefundStore((state) => state.selection.refundDeliveryFee);
  const toggleAllItems = useRefundStore((state) => state.toggleAllItems);
  const setRefundDeliveryFee = useRefundStore((state) => state.setRefundDeliveryFee);

  const unitRows = flattenOrderUnits(order);
  const hasRefundableItems = summary.refundableUnitCount + summary.refundableAddonCount > 0;
  const deliveryFeeMinor = toMinorUnits(order.deliveryFee, order.currency);
  const isDeliveryRefunded = order.deliveryFeeStatus === PaymentStatus.REFUNDED;

  const selectAllState: boolean | 'indeterminate' = summary.isAllItemsSelected
    ? true
    : summary.isIndeterminate
      ? 'indeterminate'
      : false;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg bg-ice-hover px-3.5 py-2.5 text-sm text-ink-primary">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" />
        <span>
          Select the units and add-ons to refund. Add-ons require their main drink to be refunded
          as well. Already refunded items are locked.
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-ice-blue bg-surface">
        <div className="flex items-center justify-between gap-2 border-b border-ice-blue bg-ice-hover px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 select-none">
            <Checkbox.Root
              id={selectAllId}
              checked={selectAllState}
              disabled={!hasRefundableItems}
              onCheckedChange={() => toggleAllItems(order)}
              aria-label="Select all refundable items"
              className="flex h-5 w-5 items-center justify-center rounded border border-ink-secondary/60 bg-white data-[state=checked]:border-cobalt data-[state=checked]:bg-cobalt data-[state=checked]:text-white data-[state=indeterminate]:border-cobalt data-[state=indeterminate]:bg-cobalt data-[state=indeterminate]:text-white disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
            >
              <Checkbox.Indicator>
                {summary.isIndeterminate ? (
                  <Minus className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                )}
              </Checkbox.Indicator>
            </Checkbox.Root>
            <label
              htmlFor={selectAllId}
              className="text-sm font-semibold text-ink-primary cursor-pointer"
            >
              Select all refundable items
            </label>
          </div>

          {summary.hasAnySelection && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                summary.isFullRefund
                  ? 'bg-cobalt text-white'
                  : 'bg-ice-blue text-ink-primary'
              }`}
            >
              {summary.isFullRefund ? 'Full item refund' : 'Partial refund'}
            </span>
          )}
        </div>

        <div className="divide-y divide-ice-blue">
          {unitRows.map((row) => (
            <RefundUnitRow
              key={row.unit.unitId}
              order={order}
              itemName={row.itemName}
              unitPrice={row.unitPrice}
              unit={row.unit}
              unitNumber={row.unitNumber}
              unitCount={row.unitCount}
            />
          ))}
        </div>
      </div>

      {order.deliveryFee > 0 && (
        <div
          onClick={isDeliveryRefunded ? undefined : () => setRefundDeliveryFee(!refundDeliveryFee)}
          className={`rounded-xl border px-4 py-3.5 transition-colors sm:px-5 ${
            isDeliveryRefunded
              ? 'cursor-default border-ice-blue bg-surface-muted'
              : refundDeliveryFee
                ? 'cursor-pointer border-cobalt bg-ice-hover'
                : 'cursor-pointer border-ice-blue bg-surface hover:bg-ice-hover/50'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox.Root
                checked={refundDeliveryFee}
                disabled={isDeliveryRefunded}
                onCheckedChange={(checked) => setRefundDeliveryFee(checked === true)}
                onClick={(event) => event.stopPropagation()}
                aria-label="Include delivery fee in refund"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-ink-secondary/60 bg-white data-[state=checked]:border-cobalt data-[state=checked]:bg-cobalt data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
              >
                <Checkbox.Indicator>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <Truck className="h-4 w-4 shrink-0 text-ink-secondary" />
              <div>
                <span
                  className={`block text-base font-semibold ${
                    isDeliveryRefunded ? 'text-ink-secondary line-through' : 'text-ink-primary'
                  }`}
                >
                  Refund Delivery Fee
                </span>
                <span className="text-xs text-ink-secondary">
                  Optional — include delivery charge in this refund
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <StatusChip status={order.deliveryFeeStatus} />
              <span
                className={`min-w-[88px] text-right text-base font-semibold tabular-nums ${
                  isDeliveryRefunded ? 'text-ink-secondary' : 'text-ink-primary'
                }`}
              >
                {formatCurrency(deliveryFeeMinor, order.currency)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
