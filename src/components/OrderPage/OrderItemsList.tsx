import { CornerDownRight, Truck } from 'lucide-react';
import { StatusChip } from '@/components/common/StatusChip';
import { flattenOrderUnits, formatCurrency, toMinorUnits } from '@/domain';
import { PaymentStatus } from '@/enums';
import type { IOrder } from '@/types';

interface Props {
  order: IOrder;
}

export function OrderItemsList({ order }: Props) {
  const unitRows = flattenOrderUnits(order);
  const deliveryFeeMinor = toMinorUnits(order.deliveryFee, order.currency);

  return (
    <section className="overflow-hidden rounded-xl border border-ice-blue bg-surface shadow-[0_2px_10px_rgba(39,56,128,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ice-blue bg-ice-hover px-5 py-3.5 sm:px-6">
        <h2 className="text-base font-semibold text-ink-primary">
          Order Items ({unitRows.length} units)
        </h2>
        <span className="text-xs text-ink-secondary">
          Displayed per unit for individual refund tracking
        </span>
      </div>

      <div className="divide-y divide-ice-blue">
        {unitRows.map((row) => {
          const isUnitRefunded = row.unit.status === PaymentStatus.REFUNDED;

          return (
            <div
              key={row.unit.unitId}
              className={`px-5 py-4 sm:px-6 ${isUnitRefunded ? 'bg-surface-muted' : 'bg-surface'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-base font-semibold ${
                        isUnitRefunded ? 'text-ink-secondary line-through' : 'text-ink-primary'
                      }`}
                    >
                      {row.itemName}
                    </span>
                    {row.unitCount > 1 && (
                      <span className="text-xs text-ink-secondary">
                        (Unit {row.unitNumber} of {row.unitCount})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink-secondary">Unit ID: {row.unit.unitId}</span>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <StatusChip status={row.unit.status} />
                  <span
                    className={`min-w-[92px] text-right text-base font-semibold tabular-nums ${
                      isUnitRefunded ? 'text-ink-secondary' : 'text-ink-primary'
                    }`}
                  >
                    {formatCurrency(row.unitPriceMinor, order.currency)}
                  </span>
                </div>
              </div>

              {row.unit.addons.length > 0 && (
                <div className="mt-3 space-y-2 pl-3 sm:pl-6">
                  {row.unit.addons.map((addon) => {
                    const isAddonRefunded = addon.status === PaymentStatus.REFUNDED;
                    const addonPriceMinor = toMinorUnits(addon.unitPrice, order.currency);

                    return (
                      <div
                        key={`${row.unit.unitId}-${addon.addonId}`}
                        className={`flex items-center justify-between gap-4 rounded-lg border border-ice-blue px-3 py-1.5 ${
                          isAddonRefunded ? 'bg-ice-tint' : 'bg-surface-muted'
                        }`}
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <CornerDownRight className="h-4 w-4 shrink-0 text-ink-secondary" />
                          <span
                            className={`text-sm ${
                              isAddonRefunded
                                ? 'text-ink-secondary line-through'
                                : 'text-ink-primary'
                            }`}
                          >
                            {addon.name}
                          </span>
                          {isUnitRefunded && !isAddonRefunded && (
                            <span className="text-xs font-medium text-warning-text">
                              (Drink refunded, add-on still refundable)
                            </span>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <StatusChip status={addon.status} />
                          <span
                            className={`min-w-[92px] text-right text-sm font-medium tabular-nums ${
                              isAddonRefunded ? 'text-ink-secondary' : 'text-ink-primary'
                            }`}
                          >
                            +{formatCurrency(addonPriceMinor, order.currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {order.deliveryFee > 0 && (
          <div
            className={`px-5 py-4 sm:px-6 ${
              order.deliveryFeeStatus === PaymentStatus.REFUNDED
                ? 'bg-surface-muted'
                : 'bg-ice-tint'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-ink-secondary" />
                <div>
                  <span
                    className={`block text-base font-semibold ${
                      order.deliveryFeeStatus === PaymentStatus.REFUNDED
                        ? 'text-ink-secondary line-through'
                        : 'text-ink-primary'
                    }`}
                  >
                    Delivery Fee
                  </span>
                  <span className="text-xs text-ink-secondary">Optional during refund</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusChip status={order.deliveryFeeStatus} />
                <span
                  className={`min-w-[92px] text-right text-base font-semibold tabular-nums ${
                    order.deliveryFeeStatus === PaymentStatus.REFUNDED
                      ? 'text-ink-secondary'
                      : 'text-ink-primary'
                  }`}
                >
                  {formatCurrency(deliveryFeeMinor, order.currency)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
