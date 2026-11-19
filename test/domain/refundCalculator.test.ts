import { describe, expect, it } from 'vitest';
import { INITIAL_ORDER_RESPONSE, mapOrderResponseToOrder } from '@/api';
import { EMPTY_REFUND_SELECTION } from '@/constants';
import {
  calculateOrderTotals,
  calculateRefundSummary,
  extractSelectionPayload,
  formatCurrency,
  makeAddonKey,
  toMinorUnits,
  toggleAddonSelection,
  toggleAllItemsSelection,
  toggleUnitSelection,
} from '@/domain';
import { PaymentStatus } from '@/enums';
import type { IOrder, IRefundSelection } from '@/types';

function createFixtureOrder(): IOrder {
  return mapOrderResponseToOrder(structuredClone(INITIAL_ORDER_RESPONSE));
}

describe('money helpers', () => {
  it('converts decimal prices to exact integer minor units', () => {
    expect(toMinorUnits(13.9, 'MYR')).toBe(1390);
    expect(toMinorUnits(11.9, 'MYR')).toBe(1190);
    expect(toMinorUnits(7.9, 'MYR')).toBe(790);
    expect(toMinorUnits(15000, 'IDR')).toBe(15000);
  });

  it('avoids floating-point drift across summed items', () => {
    const sumMinor =
      toMinorUnits(13.9, 'MYR') +
      toMinorUnits(11.9, 'MYR') +
      toMinorUnits(7.9, 'MYR') +
      toMinorUnits(1.5, 'MYR') +
      toMinorUnits(1.0, 'MYR');

    expect(sumMinor).toBe(3620);
    expect(formatCurrency(sumMinor, 'MYR')).toContain('36.20');
  });
});

describe('refundCalculator', () => {
  it('computes original, refunded, and remaining order totals accurately', () => {
    const order = createFixtureOrder();
    const totals = calculateOrderTotals(order);

    expect(totals.originalTotalMinor).toBe(8930);
    expect(totals.refundedTotalMinor).toBe(2780);
    expect(totals.remainingTotalMinor).toBe(6150);
    expect(totals.hasRefundableItems).toBe(true);
  });

  it('ignores attempts to select already-refunded units or add-ons', () => {
    const order = createFixtureOrder();

    const afterUnit = toggleUnitSelection(order, EMPTY_REFUND_SELECTION, 'L1-1');
    const afterAddon = toggleAddonSelection(order, afterUnit, 'L1-1', 'A1');
    const summary = calculateRefundSummary(order, afterAddon);

    expect(summary.totalMinor).toBe(0);
    expect(summary.hasAnySelection).toBe(false);
  });

  it('auto-selects paid main drink when its add-on is selected', () => {
    const order = createFixtureOrder();

    const selection = toggleAddonSelection(order, EMPTY_REFUND_SELECTION, 'L1-2', 'A1');
    const summary = calculateRefundSummary(order, selection);

    expect(selection.selectedUnits['L1-2']).toBe(true);
    expect(selection.selectedAddons[makeAddonKey('L1-2', 'A1')]).toBe(true);
    expect(summary.itemsSubtotalMinor).toBe(1590);
    expect(summary.totalMinor).toBe(1590);
  });

  it('auto-selects paid add-ons when paid main drink is selected, and allows unchecking an add-on', () => {
    const order = createFixtureOrder();

    // Selecting main drink L2-1 auto-selects its paid add-ons A2 & A3 (11.90 + 1.50 + 1.00 = 14.40)
    let selection = toggleUnitSelection(order, EMPTY_REFUND_SELECTION, 'L2-1');
    expect(selection.selectedUnits['L2-1']).toBe(true);
    expect(selection.selectedAddons[makeAddonKey('L2-1', 'A2')]).toBe(true);
    expect(selection.selectedAddons[makeAddonKey('L2-1', 'A3')]).toBe(true);
    expect(calculateRefundSummary(order, selection).totalMinor).toBe(1440);

    // Staff can still uncheck an individual add-on while keeping the main drink selected
    selection = toggleAddonSelection(order, selection, 'L2-1', 'A3');
    expect(selection.selectedUnits['L2-1']).toBe(true);
    expect(selection.selectedAddons[makeAddonKey('L2-1', 'A3')]).toBeUndefined();
    expect(calculateRefundSummary(order, selection).totalMinor).toBe(1340);

    // Unchecking the main drink clears all remaining add-ons
    selection = toggleUnitSelection(order, selection, 'L2-1');
    const summary = calculateRefundSummary(order, selection);
    expect(selection.selectedUnits['L2-1']).toBeUndefined();
    expect(selection.selectedAddons[makeAddonKey('L2-1', 'A2')]).toBeUndefined();
    expect(summary.totalMinor).toBe(0);
  });

  it('allows refunding paid add-ons on L2-2 whose main drink is already refunded', () => {
    const order = createFixtureOrder();

    let selection = toggleAddonSelection(order, EMPTY_REFUND_SELECTION, 'L2-2', 'A2');
    selection = toggleAddonSelection(order, selection, 'L2-2', 'A3');
    const summary = calculateRefundSummary(order, selection);

    expect(selection.selectedUnits['L2-2']).toBeUndefined();
    expect(summary.selectedUnitCount).toBe(0);
    expect(summary.selectedAddonCount).toBe(2);
    expect(summary.totalMinor).toBe(250);
  });

  it('never counts a paid add-on if its paid main drink is missing from raw selection', () => {
    const order = createFixtureOrder();
    const malformedSelection: IRefundSelection = {
      selectedUnits: {},
      selectedAddons: {
        [makeAddonKey('L1-2', 'A1')]: true,
      },
      refundDeliveryFee: false,
    };

    const summary = calculateRefundSummary(order, malformedSelection);
    const payload = extractSelectionPayload(order, malformedSelection);

    expect(summary.totalMinor).toBe(0);
    expect(payload.addonRefs).toHaveLength(0);
  });

  it('selects and clears all remaining refundable items with exact totals', () => {
    const order = createFixtureOrder();

    const selectedAll = toggleAllItemsSelection(order, EMPTY_REFUND_SELECTION);
    const allSummary = calculateRefundSummary(order, selectedAll);

    expect(allSummary.isAllItemsSelected).toBe(true);
    expect(allSummary.isFullRefund).toBe(true);
    expect(allSummary.isIndeterminate).toBe(false);
    expect(allSummary.selectedUnitCount).toBe(5);
    expect(allSummary.selectedAddonCount).toBe(5);
    expect(allSummary.itemsSubtotalMinor).toBe(5650);
    expect(allSummary.totalMinor).toBe(5650);

    const withDelivery: IRefundSelection = { ...selectedAll, refundDeliveryFee: true };
    const withDeliverySummary = calculateRefundSummary(order, withDelivery);
    expect(withDeliverySummary.deliveryFeeMinor).toBe(500);
    expect(withDeliverySummary.totalMinor).toBe(6150);

    const cleared = toggleAllItemsSelection(order, withDelivery);
    const clearedSummary = calculateRefundSummary(order, cleared);
    expect(clearedSummary.selectedUnitCount).toBe(0);
    expect(clearedSummary.selectedAddonCount).toBe(0);
    // Delivery fee toggle stays independent
    expect(clearedSummary.deliveryFeeMinor).toBe(500);
  });

  it('ignores delivery fee when it has already been refunded', () => {
    const order = createFixtureOrder();
    order.deliveryFeeStatus = PaymentStatus.REFUNDED;

    const summary = calculateRefundSummary(order, {
      ...EMPTY_REFUND_SELECTION,
      refundDeliveryFee: true,
    });

    expect(summary.hasRefundableDeliveryFee).toBe(false);
    expect(summary.deliveryFeeMinor).toBe(0);
    expect(summary.totalMinor).toBe(0);
  });
});
