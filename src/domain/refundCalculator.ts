import { PaymentStatus } from '@/enums';
import { toMinorUnits } from './money';
import type {
  IOrder,
  IOrderAddon,
  IOrderTotals,
  IOrderUnit,
  IRefundAddonRefRequest,
  IRefundSelection,
  IRefundSummary,
  IRefundUnitPreview,
} from '@/types';

export function makeAddonKey(unitId: string, addonId: string): string {
  return `${unitId}::${addonId}`;
}

export function flattenOrderUnits(order: IOrder) {
  return order.items.flatMap((item) =>
    item.units.map((unit, index) => ({
      lineId: item.lineId,
      itemName: item.name,
      unitPrice: item.unitPrice,
      unitPriceMinor: toMinorUnits(item.unitPrice, order.currency),
      unit,
      unitNumber: index + 1,
      unitCount: item.units.length,
    }))
  );
}

export function isUnitRefundable(unit: IOrderUnit): boolean {
  return unit.status === PaymentStatus.PAID;
}

export function isAddonRefundable(addon: IOrderAddon): boolean {
  return addon.status === PaymentStatus.PAID;
}

export function isDeliveryFeeRefundable(order: IOrder): boolean {
  return order.deliveryFee > 0 && order.deliveryFeeStatus === PaymentStatus.PAID;
}

function findUnitInOrder(order: IOrder, unitId: string): IOrderUnit | undefined {
  for (const item of order.items) {
    const unit = item.units.find((entry) => entry.unitId === unitId);
    if (unit) {
      return unit;
    }
  }
  return undefined;
}

export function toggleUnitSelection(
  order: IOrder,
  selection: IRefundSelection,
  unitId: string
): IRefundSelection {
  const unit = findUnitInOrder(order, unitId);
  if (!unit || !isUnitRefundable(unit)) {
    return selection;
  }

  const nextUnits = { ...selection.selectedUnits };
  const nextAddons = { ...selection.selectedAddons };
  const isCurrentlySelected = Boolean(nextUnits[unitId]);

  if (isCurrentlySelected) {
    delete nextUnits[unitId];
    for (const addon of unit.addons) {
      delete nextAddons[makeAddonKey(unitId, addon.addonId)];
    }
  } else {
    nextUnits[unitId] = true;
    for (const addon of unit.addons) {
      if (isAddonRefundable(addon)) {
        nextAddons[makeAddonKey(unitId, addon.addonId)] = true;
      }
    }
  }

  return {
    ...selection,
    selectedUnits: nextUnits,
    selectedAddons: nextAddons,
  };
}

export function toggleAddonSelection(
  order: IOrder,
  selection: IRefundSelection,
  unitId: string,
  addonId: string
): IRefundSelection {
  const unit = findUnitInOrder(order, unitId);
  if (!unit) {
    return selection;
  }

  const addon = unit.addons.find((entry) => entry.addonId === addonId);
  if (!addon || !isAddonRefundable(addon)) {
    return selection;
  }

  const key = makeAddonKey(unitId, addonId);
  const nextUnits = { ...selection.selectedUnits };
  const nextAddons = { ...selection.selectedAddons };

  if (nextAddons[key]) {
    delete nextAddons[key];
  } else {
    nextAddons[key] = true;
    if (unit.status === PaymentStatus.PAID) {
      nextUnits[unitId] = true;
    }
  }

  return {
    ...selection,
    selectedUnits: nextUnits,
    selectedAddons: nextAddons,
  };
}

export function toggleAllItemsSelection(
  order: IOrder,
  selection: IRefundSelection
): IRefundSelection {
  const currentSummary = calculateRefundSummary(order, selection);

  if (currentSummary.isAllItemsSelected) {
    return {
      ...selection,
      selectedUnits: {},
      selectedAddons: {},
    };
  }

  const nextUnits: Record<string, boolean> = {};
  const nextAddons: Record<string, boolean> = {};

  for (const item of order.items) {
    for (const unit of item.units) {
      if (isUnitRefundable(unit)) {
        nextUnits[unit.unitId] = true;
      }
      for (const addon of unit.addons) {
        if (isAddonRefundable(addon)) {
          nextAddons[makeAddonKey(unit.unitId, addon.addonId)] = true;
        }
      }
    }
  }

  return {
    ...selection,
    selectedUnits: nextUnits,
    selectedAddons: nextAddons,
  };
}

export function calculateRefundSummary(
  order: IOrder,
  selection: IRefundSelection
): IRefundSummary {
  let itemsSubtotalMinor = 0;
  let selectedUnitCount = 0;
  let selectedAddonCount = 0;
  let refundableUnitCount = 0;
  let refundableAddonCount = 0;
  const selectedPreviews: IRefundUnitPreview[] = [];

  for (const item of order.items) {
    const unitPriceMinor = toMinorUnits(item.unitPrice, order.currency);
    const unitCount = item.units.length;

    item.units.forEach((unit, unitIndex) => {
      const unitRefundable = isUnitRefundable(unit);
      if (unitRefundable) {
        refundableUnitCount += 1;
      }

      const includeBaseUnit = unitRefundable && Boolean(selection.selectedUnits[unit.unitId]);
      if (includeBaseUnit) {
        selectedUnitCount += 1;
        itemsSubtotalMinor += unitPriceMinor;
      }

      const selectedAddons: IRefundUnitPreview['selectedAddons'] = [];
      let addonsMinorForUnit = 0;

      for (const addon of unit.addons) {
        const addonRefundable = isAddonRefundable(addon);
        if (addonRefundable) {
          refundableAddonCount += 1;
        }

        const addonKey = makeAddonKey(unit.unitId, addon.addonId);
        // Paid drink must be selected for its add-on to count
        const parentSatisfied = unit.status === PaymentStatus.REFUNDED || includeBaseUnit;

        if (addonRefundable && parentSatisfied && selection.selectedAddons[addonKey]) {
          const addonPriceMinor = toMinorUnits(addon.unitPrice, order.currency);
          selectedAddonCount += 1;
          addonsMinorForUnit += addonPriceMinor;
          itemsSubtotalMinor += addonPriceMinor;
          selectedAddons.push({
            addonId: addon.addonId,
            name: addon.name,
            priceMinor: addonPriceMinor,
          });
        }
      }

      if (includeBaseUnit || selectedAddons.length > 0) {
        const basePriceMinor = includeBaseUnit ? unitPriceMinor : 0;
        selectedPreviews.push({
          lineId: item.lineId,
          unitId: unit.unitId,
          unitNumber: unitIndex + 1,
          unitCount,
          itemName: item.name,
          includeBaseUnit,
          basePriceMinor,
          selectedAddons,
          unitTotalMinor: basePriceMinor + addonsMinorForUnit,
        });
      }
    });
  }

  const hasRefundableDeliveryFee = isDeliveryFeeRefundable(order);
  const deliveryFeeMinor =
    hasRefundableDeliveryFee && selection.refundDeliveryFee
      ? toMinorUnits(order.deliveryFee, order.currency)
      : 0;

  const totalMinor = itemsSubtotalMinor + deliveryFeeMinor;
  const totalRefundableEntries = refundableUnitCount + refundableAddonCount;
  const totalSelectedEntries = selectedUnitCount + selectedAddonCount;
  const isAllItemsSelected =
    totalRefundableEntries > 0 && totalSelectedEntries === totalRefundableEntries;
  const isIndeterminate = totalSelectedEntries > 0 && !isAllItemsSelected;
  const hasAnySelection = totalSelectedEntries > 0 || deliveryFeeMinor > 0;
  const isFullRefund = isAllItemsSelected;

  return {
    itemsSubtotalMinor,
    deliveryFeeMinor,
    totalMinor,
    selectedUnitCount,
    selectedAddonCount,
    refundableUnitCount,
    refundableAddonCount,
    hasRefundableDeliveryFee,
    hasAnySelection,
    isAllItemsSelected,
    isIndeterminate,
    isFullRefund,
    selectedPreviews,
  };
}

export function calculateOrderTotals(order: IOrder): IOrderTotals {
  let originalTotalMinor = 0;
  let refundedTotalMinor = 0;
  let hasRefundableItems = false;

  for (const item of order.items) {
    const unitPriceMinor = toMinorUnits(item.unitPrice, order.currency);

    for (const unit of item.units) {
      originalTotalMinor += unitPriceMinor;
      if (unit.status === PaymentStatus.REFUNDED) {
        refundedTotalMinor += unitPriceMinor;
      } else {
        hasRefundableItems = true;
      }

      for (const addon of unit.addons) {
        const addonPriceMinor = toMinorUnits(addon.unitPrice, order.currency);
        originalTotalMinor += addonPriceMinor;
        if (addon.status === PaymentStatus.REFUNDED) {
          refundedTotalMinor += addonPriceMinor;
        } else {
          hasRefundableItems = true;
        }
      }
    }
  }

  const deliveryFeeMinor = toMinorUnits(order.deliveryFee, order.currency);
  originalTotalMinor += deliveryFeeMinor;
  if (order.deliveryFeeStatus === PaymentStatus.REFUNDED) {
    refundedTotalMinor += deliveryFeeMinor;
  } else if (deliveryFeeMinor > 0) {
    hasRefundableItems = true;
  }

  return {
    originalTotalMinor,
    refundedTotalMinor,
    remainingTotalMinor: originalTotalMinor - refundedTotalMinor,
    hasRefundableItems,
  };
}

export function extractSelectionPayload(
  order: IOrder,
  selection: IRefundSelection
): {
  unitIds: string[];
  addonRefs: IRefundAddonRefRequest[];
  refundDeliveryFee: boolean;
} {
  const unitIds: string[] = [];
  const addonRefs: IRefundAddonRefRequest[] = [];

  for (const item of order.items) {
    for (const unit of item.units) {
      const unitSelected = isUnitRefundable(unit) && Boolean(selection.selectedUnits[unit.unitId]);
      if (unitSelected) {
        unitIds.push(unit.unitId);
      }

      const parentSatisfied = unit.status === PaymentStatus.REFUNDED || unitSelected;
      for (const addon of unit.addons) {
        const key = makeAddonKey(unit.unitId, addon.addonId);
        if (isAddonRefundable(addon) && parentSatisfied && selection.selectedAddons[key]) {
          addonRefs.push({ unit_id: unit.unitId, addon_id: addon.addonId });
        }
      }
    }
  }

  return {
    unitIds,
    addonRefs,
    refundDeliveryFee: isDeliveryFeeRefundable(order) && selection.refundDeliveryFee,
  };
}
