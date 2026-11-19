import type { IRefundSelection } from '@/types';

export const DEFAULT_ORDER_ID = 'ORD-10482';

export const REFUND_STEP_LABELS = ['Select items', 'Review & details'] as const;

export const MAX_REASON_NOTE_LENGTH = 250;

export const ZERO_DECIMAL_CURRENCIES = new Set(['IDR', 'JPY', 'KRW', 'VND']);

export const EMPTY_REFUND_SELECTION: IRefundSelection = {
  selectedUnits: {},
  selectedAddons: {},
  refundDeliveryFee: false,
};
