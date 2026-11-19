import type { OrderStatus, PaymentStatus } from '@/enums';

export interface IOrderAddon {
  addonId: string;
  name: string;
  unitPrice: number;
  status: PaymentStatus;
}

export interface IOrderUnit {
  unitId: string;
  status: PaymentStatus;
  addons: IOrderAddon[];
}

export interface IOrderItem {
  lineId: string;
  name: string;
  unitPrice: number;
  units: IOrderUnit[];
}

export interface IOrder {
  orderId: string;
  status: OrderStatus;
  currency: string;
  deliveryFee: number;
  deliveryFeeStatus: PaymentStatus;
  items: IOrderItem[];
  version: number;
}

export interface IOrderTotals {
  originalTotalMinor: number;
  refundedTotalMinor: number;
  remainingTotalMinor: number;
  hasRefundableItems: boolean;
}
