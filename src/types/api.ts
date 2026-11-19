import type {
  ApiErrorCode,
  OrderStatus,
  PaymentStatus,
  RefundChannelId,
  RefundReasonId,
} from '@/enums';

export interface IOrderAddonResponse {
  addon_id: string;
  name: string;
  unit_price: number;
  status: PaymentStatus;
}

export interface IOrderUnitResponse {
  unit_id: string;
  status: PaymentStatus;
  addons: IOrderAddonResponse[];
}

export interface IOrderItemResponse {
  line_id: string;
  name: string;
  unit_price: number;
  units: IOrderUnitResponse[];
}

export interface IOrderResponse {
  order_id: string;
  status: OrderStatus;
  currency: string;
  delivery_fee: number;
  delivery_fee_status: PaymentStatus;
  items: IOrderItemResponse[];
  version: number;
}

export interface IRefundAddonRefRequest {
  unit_id: string;
  addon_id: string;
}

export interface ICreateRefundRequest {
  order_id: string;
  order_version: number;
  unit_ids: string[];
  addon_refs: IRefundAddonRefRequest[];
  refund_delivery_fee: boolean;
  expected_amount_minor: number;
  currency: string;
  reason: RefundReasonId;
  reason_note?: string;
  channel: RefundChannelId;
}

export interface ICreateRefundResponse {
  refund_id: string;
  idempotency_key: string;
  deduplicated: boolean;
  amount_minor: number;
  currency: string;
  created_at: string;
  order: IOrderResponse;
}

export interface ISimulationConfig {
  latencyMs: number;
  failureRate: number;
  nextFailure: ApiErrorCode | 'NONE';
}
