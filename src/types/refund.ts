import type { ApiErrorCode, RefundChannelId, RefundReasonId } from '@/enums';

export type TRefundModalStage =
  | 'closed'
  | 'selecting'
  | 'reviewing'
  | 'confirming'
  | 'submitting';

export interface IRefundSelection {
  selectedUnits: Record<string, boolean>;
  selectedAddons: Record<string, boolean>;
  refundDeliveryFee: boolean;
}

export interface IRefundUnitPreview {
  lineId: string;
  unitId: string;
  unitNumber: number;
  unitCount: number;
  itemName: string;
  includeBaseUnit: boolean;
  basePriceMinor: number;
  selectedAddons: Array<{
    addonId: string;
    name: string;
    priceMinor: number;
  }>;
  unitTotalMinor: number;
}

export interface IRefundSummary {
  itemsSubtotalMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  selectedUnitCount: number;
  selectedAddonCount: number;
  refundableUnitCount: number;
  refundableAddonCount: number;
  hasRefundableDeliveryFee: boolean;
  hasAnySelection: boolean;
  isAllItemsSelected: boolean;
  isIndeterminate: boolean;
  isFullRefund: boolean;
  selectedPreviews: IRefundUnitPreview[];
}

export interface IRefundRecord {
  refundId: string;
  idempotencyKey: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  reason: RefundReasonId;
  reasonNote: string;
  channel: RefundChannelId;
  createdAt: string;
  itemCount: number;
  includedDeliveryFee: boolean;
}

export interface IRefundSubmitError {
  code: ApiErrorCode | 'UNKNOWN';
  message: string;
}
