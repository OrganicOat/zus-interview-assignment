export enum RefundReasonId {
  WRONG_ITEM = 'WRONG_ITEM',
  MISSING_ITEM = 'MISSING_ITEM',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  LATE_DELIVERY = 'LATE_DELIVERY',
  OTHER = 'OTHER',
}

export const RefundReasonDescription: Record<RefundReasonId, string> = {
  [RefundReasonId.WRONG_ITEM]: 'Wrong item',
  [RefundReasonId.MISSING_ITEM]: 'Missing item',
  [RefundReasonId.QUALITY_ISSUE]: 'Quality issue',
  [RefundReasonId.LATE_DELIVERY]: 'Late delivery',
  [RefundReasonId.OTHER]: 'Other',
};

export enum RefundChannelId {
  ORIGINAL_PAYMENT_METHOD = 'original_payment_method',
  IN_APP_CREDIT = 'in_app_credit',
}

export const RefundChannelLabel: Record<RefundChannelId, string> = {
  [RefundChannelId.ORIGINAL_PAYMENT_METHOD]: 'Original payment method',
  [RefundChannelId.IN_APP_CREDIT]: 'In-app credit',
};

export const RefundChannelDescription: Record<RefundChannelId, string> = {
  [RefundChannelId.ORIGINAL_PAYMENT_METHOD]:
    'Returns funds to the card, FPX, or e-wallet used for checkout.',
  [RefundChannelId.IN_APP_CREDIT]:
    'Credits customer wallet immediately for future orders.',
};
