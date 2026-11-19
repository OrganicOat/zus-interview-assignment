import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, CornerDownRight } from 'lucide-react';
import { memo, useCallback } from 'react';
import { StatusChip } from '@/components/common/StatusChip';
import { formatCurrency, makeAddonKey, toMinorUnits } from '@/domain';
import { PaymentStatus } from '@/enums';
import { useRefundStore } from '@/store';
import type { IOrder, IOrderUnit } from '@/types';

interface AddonRowProps {
  order: IOrder;
  unit: IOrderUnit;
  addonId: string;
  addonName: string;
  addonPrice: number;
  addonStatus: PaymentStatus;
  isUnitSelected: boolean;
}

const RefundAddonRow = memo(function RefundAddonRow({
  order,
  unit,
  addonId,
  addonName,
  addonPrice,
  addonStatus,
  isUnitSelected,
}: AddonRowProps) {
  const addonKey = makeAddonKey(unit.unitId, addonId);
  const isSelected = useRefundStore((state) => Boolean(state.selection.selectedAddons[addonKey]));
  const toggleAddon = useRefundStore((state) => state.toggleAddon);

  const isRefunded = addonStatus === PaymentStatus.REFUNDED;
  const addonPriceMinor = toMinorUnits(addonPrice, order.currency);

  const handleToggle = useCallback(() => {
    toggleAddon(order, unit.unitId, addonId);
  }, [toggleAddon, order, unit.unitId, addonId]);

  const helperText =
    !isRefunded && unit.status === PaymentStatus.PAID && !isUnitSelected
      ? 'Selecting also selects main drink'
      : !isRefunded && unit.status === PaymentStatus.REFUNDED
        ? 'Main drink already refunded'
        : null;

  return (
    <div
      onClick={isRefunded ? undefined : handleToggle}
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
        isRefunded
          ? 'cursor-default border-ice-blue bg-ice-tint'
          : isSelected
            ? 'cursor-pointer border-cobalt bg-ice-hover'
            : 'cursor-pointer border-ice-blue bg-surface-muted hover:bg-ice-hover/60'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <CornerDownRight className="h-4 w-4 shrink-0 text-ink-secondary" />
        <Checkbox.Root
          checked={isSelected}
          disabled={isRefunded}
          onCheckedChange={handleToggle}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select add-on ${addonName} for unit ${unit.unitId}`}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-ink-secondary/60 bg-white data-[state=checked]:border-cobalt data-[state=checked]:bg-cobalt data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
        >
          <Checkbox.Indicator>
            <Check className="h-3 w-3 stroke-[3]" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <div className="min-w-0">
          <span
            className={`block text-sm ${
              isRefunded ? 'text-ink-secondary line-through' : 'text-ink-primary'
            }`}
          >
            {addonName}
          </span>
          {helperText && <span className="block text-xs text-ink-secondary">{helperText}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {isRefunded && <StatusChip status={PaymentStatus.REFUNDED} />}
        <span
          className={`min-w-[84px] text-right text-sm font-medium tabular-nums ${
            isRefunded ? 'text-ink-secondary' : 'text-ink-primary'
          }`}
        >
          +{formatCurrency(addonPriceMinor, order.currency)}
        </span>
      </div>
    </div>
  );
});

interface Props {
  order: IOrder;
  itemName: string;
  unitPrice: number;
  unit: IOrderUnit;
  unitNumber: number;
  unitCount: number;
}

export const RefundUnitRow = memo(function RefundUnitRow({
  order,
  itemName,
  unitPrice,
  unit,
  unitNumber,
  unitCount,
}: Props) {
  const isUnitSelected = useRefundStore((state) =>
    Boolean(state.selection.selectedUnits[unit.unitId])
  );
  const toggleUnit = useRefundStore((state) => state.toggleUnit);

  const isUnitRefunded = unit.status === PaymentStatus.REFUNDED;
  const unitPriceMinor = toMinorUnits(unitPrice, order.currency);

  const handleToggleUnit = useCallback(() => {
    toggleUnit(order, unit.unitId);
  }, [toggleUnit, order, unit.unitId]);

  return (
    <div
      className={`px-4 py-3.5 transition-colors sm:px-5 ${
        isUnitRefunded
          ? 'bg-surface-muted'
          : isUnitSelected
            ? 'bg-ice-hover'
            : 'bg-surface'
      }`}
    >
      <div
        onClick={isUnitRefunded ? undefined : handleToggleUnit}
        className={`flex items-center justify-between gap-3 ${
          isUnitRefunded ? 'cursor-default' : 'cursor-pointer'
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <Checkbox.Root
            checked={isUnitSelected}
            disabled={isUnitRefunded}
            onCheckedChange={handleToggleUnit}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select ${itemName} unit ${unit.unitId}`}
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-ink-secondary/60 bg-white data-[state=checked]:border-cobalt data-[state=checked]:bg-cobalt data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
          >
            <Checkbox.Indicator>
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </Checkbox.Indicator>
          </Checkbox.Root>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-base font-semibold ${
                  isUnitRefunded ? 'text-ink-secondary line-through' : 'text-ink-primary'
                }`}
              >
                {itemName}
              </span>
              {unitCount > 1 && (
                <span className="text-xs text-ink-secondary">
                  (Unit {unitNumber} of {unitCount})
                </span>
              )}
            </div>
            <span className="text-xs text-ink-secondary">Unit ID: {unit.unitId}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <StatusChip status={unit.status} />
          <span
            className={`min-w-[88px] text-right text-base font-semibold tabular-nums ${
              isUnitRefunded ? 'text-ink-secondary' : 'text-ink-primary'
            }`}
          >
            {formatCurrency(unitPriceMinor, order.currency)}
          </span>
        </div>
      </div>

      {unit.addons.length > 0 && (
        <div className="mt-2.5 space-y-2 pl-5 sm:pl-10">
          {unit.addons.map((addon) => (
            <RefundAddonRow
              key={`${unit.unitId}::${addon.addonId}`}
              order={order}
              unit={unit}
              addonId={addon.addonId}
              addonName={addon.name}
              addonPrice={addon.unitPrice}
              addonStatus={addon.status}
              isUnitSelected={isUnitSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
});
