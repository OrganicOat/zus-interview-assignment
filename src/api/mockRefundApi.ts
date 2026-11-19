import { toMinorUnits } from '@/domain';
import { ApiErrorCode, OrderStatus, PaymentStatus } from '@/enums';
import type {
  ICreateRefundRequest,
  ICreateRefundResponse,
  IOrder,
  IOrderResponse,
  ISimulationConfig,
} from '@/types';
import { INITIAL_ORDER_RESPONSE } from './mockOrderData';

export class RefundApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.name = 'RefundApiError';
    this.code = code;
    this.status = status;
  }
}

let serverOrderState: IOrderResponse = structuredClone(INITIAL_ORDER_RESPONSE);
const idempotencyStore = new Map<string, ICreateRefundResponse>();
let refundCounter = 1000;

let simConfig: ISimulationConfig = {
  latencyMs: 650,
  failureRate: 0.15,
  nextFailure: 'NONE',
};

export function mapOrderResponseToOrder(dto: IOrderResponse): IOrder {
  return {
    orderId: dto.order_id,
    status: dto.status,
    currency: dto.currency,
    deliveryFee: dto.delivery_fee,
    deliveryFeeStatus: dto.delivery_fee_status,
    version: dto.version,
    items: dto.items.map((item) => ({
      lineId: item.line_id,
      name: item.name,
      unitPrice: item.unit_price,
      units: item.units.map((unit) => ({
        unitId: unit.unit_id,
        status: unit.status,
        addons: unit.addons.map((addon) => ({
          addonId: addon.addon_id,
          name: addon.name,
          unitPrice: addon.unit_price,
          status: addon.status,
        })),
      })),
    })),
  };
}

function delayWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Request aborted', 'AbortError'));
      return;
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    function handleAbort() {
      window.clearTimeout(timer);
      reject(new DOMException('Request aborted', 'AbortError'));
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function deriveOrderStatus(order: IOrderResponse): OrderStatus {
  let hasPaid = order.delivery_fee > 0 && order.delivery_fee_status === PaymentStatus.PAID;
  let hasRefunded = order.delivery_fee > 0 && order.delivery_fee_status === PaymentStatus.REFUNDED;

  for (const item of order.items) {
    for (const unit of item.units) {
      if (unit.status === PaymentStatus.PAID) {
        hasPaid = true;
      } else {
        hasRefunded = true;
      }

      for (const addon of unit.addons) {
        if (addon.status === PaymentStatus.PAID) {
          hasPaid = true;
        } else {
          hasRefunded = true;
        }
      }
    }
  }

  if (!hasPaid && hasRefunded) {
    return OrderStatus.REFUNDED;
  }
  if (hasRefunded) {
    return OrderStatus.PARTIALLY_REFUNDED;
  }
  return OrderStatus.COMPLETED;
}

export function updateApiSimulation(partial: Partial<ISimulationConfig>): ISimulationConfig {
  simConfig = { ...simConfig, ...partial };
  return { ...simConfig };
}

export function resetMockServer(): IOrder {
  serverOrderState = structuredClone(INITIAL_ORDER_RESPONSE);
  idempotencyStore.clear();
  refundCounter = 1000;
  simConfig = { ...simConfig, nextFailure: 'NONE' };
  return mapOrderResponseToOrder(structuredClone(serverOrderState));
}

export async function fetchOrderApi(orderId: string, signal?: AbortSignal): Promise<IOrder> {
  await delayWithAbort(Math.min(simConfig.latencyMs, 500), signal);

  if (orderId !== serverOrderState.order_id) {
    throw new RefundApiError(
      ApiErrorCode.INVALID_SELECTION,
      404,
      `Order ${orderId} was not found.`
    );
  }

  return mapOrderResponseToOrder(structuredClone(serverOrderState));
}

export async function submitRefundApi(
  payload: ICreateRefundRequest,
  idempotencyKey: string,
  signal?: AbortSignal
): Promise<{
  refundId: string;
  idempotencyKey: string;
  deduplicated: boolean;
  amountMinor: number;
  currency: string;
  createdAt: string;
  order: IOrder;
}> {
  if (!idempotencyKey.trim()) {
    throw new RefundApiError(ApiErrorCode.INVALID_SELECTION, 400, 'Missing Idempotency-Key header.');
  }

  await delayWithAbort(simConfig.latencyMs, signal);

  if (simConfig.nextFailure !== 'NONE') {
    const failure = simConfig.nextFailure;
    simConfig = { ...simConfig, nextFailure: 'NONE' };

    if (failure === ApiErrorCode.NETWORK_TIMEOUT) {
      throw new RefundApiError(
        ApiErrorCode.NETWORK_TIMEOUT,
        504,
        'The refund service timed out. You can safely retry with the same request.'
      );
    }
    if (failure === ApiErrorCode.SERVER_ERROR) {
      throw new RefundApiError(
        ApiErrorCode.SERVER_ERROR,
        500,
        'Temporary payment gateway error (500). Please retry.'
      );
    }
    if (failure === ApiErrorCode.CONFLICT_STALE_ORDER) {
      throw new RefundApiError(
        ApiErrorCode.CONFLICT_STALE_ORDER,
        409,
        'Order was updated by another operator. Please refresh and review items before refunding.'
      );
    }
    if (failure === ApiErrorCode.AMOUNT_MISMATCH) {
      throw new RefundApiError(
        ApiErrorCode.AMOUNT_MISMATCH,
        422,
        'Calculated refund total no longer matches server pricing. Please refresh the order.'
      );
    }
  }

  if (simConfig.failureRate > 0 && Math.random() < simConfig.failureRate) {
    throw new RefundApiError(
      ApiErrorCode.SERVER_ERROR,
      500,
      'Temporary payment gateway error (500). Please retry.'
    );
  }

  // Return cached response for duplicate idempotency key
  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    return {
      refundId: cached.refund_id,
      idempotencyKey: cached.idempotency_key,
      deduplicated: true,
      amountMinor: cached.amount_minor,
      currency: cached.currency,
      createdAt: cached.created_at,
      order: mapOrderResponseToOrder(structuredClone(cached.order)),
    };
  }

  if (payload.order_version !== serverOrderState.version) {
    throw new RefundApiError(
      ApiErrorCode.CONFLICT_STALE_ORDER,
      409,
      'Order data is stale because another refund occurred. Refreshing latest order state.'
    );
  }

  const requestedUnits = new Set(payload.unit_ids);
  const requestedAddons = new Set(
    payload.addon_refs.map((ref) => `${ref.unit_id}::${ref.addon_id}`)
  );

  if (requestedUnits.size === 0 && requestedAddons.size === 0 && !payload.refund_delivery_fee) {
    throw new RefundApiError(
      ApiErrorCode.INVALID_SELECTION,
      400,
      'Select at least one item, add-on, or delivery fee to refund.'
    );
  }

  const nextOrder: IOrderResponse = structuredClone(serverOrderState);
  let serverAmountMinor = 0;

  for (const item of nextOrder.items) {
    const unitPriceMinor = toMinorUnits(item.unit_price, nextOrder.currency);

    for (const unit of item.units) {
      const refundingUnit = requestedUnits.has(unit.unit_id);

      if (refundingUnit) {
        if (unit.status === PaymentStatus.REFUNDED) {
          throw new RefundApiError(
            ApiErrorCode.CONFLICT_STALE_ORDER,
            409,
            `Unit ${unit.unit_id} has already been refunded.`
          );
        }
        unit.status = PaymentStatus.REFUNDED;
        serverAmountMinor += unitPriceMinor;
      }

      for (const addon of unit.addons) {
        const key = `${unit.unit_id}::${addon.addon_id}`;
        if (!requestedAddons.has(key)) {
          continue;
        }

        if (addon.status === PaymentStatus.REFUNDED) {
          throw new RefundApiError(
            ApiErrorCode.CONFLICT_STALE_ORDER,
            409,
            `Add-on ${addon.name} on ${unit.unit_id} has already been refunded.`
          );
        }

        // Add-on requires main drink to be refunded
        if (unit.status !== PaymentStatus.REFUNDED) {
          throw new RefundApiError(
            ApiErrorCode.INVALID_SELECTION,
            400,
            `Add-on ${addon.name} cannot be refunded unless its main drink (${unit.unit_id}) is also refunded.`
          );
        }

        addon.status = PaymentStatus.REFUNDED;
        serverAmountMinor += toMinorUnits(addon.unit_price, nextOrder.currency);
      }
    }
  }

  if (payload.refund_delivery_fee) {
    if (
      nextOrder.delivery_fee <= 0 ||
      nextOrder.delivery_fee_status === PaymentStatus.REFUNDED
    ) {
      throw new RefundApiError(
        ApiErrorCode.CONFLICT_STALE_ORDER,
        409,
        'Delivery fee is not eligible for refund.'
      );
    }
    nextOrder.delivery_fee_status = PaymentStatus.REFUNDED;
    serverAmountMinor += toMinorUnits(nextOrder.delivery_fee, nextOrder.currency);
  }

  // Reject if client total mismatches server total
  if (serverAmountMinor !== payload.expected_amount_minor) {
    throw new RefundApiError(
      ApiErrorCode.AMOUNT_MISMATCH,
      422,
      'Displayed refund total does not match authoritative server calculation.'
    );
  }

  nextOrder.version += 1;
  nextOrder.status = deriveOrderStatus(nextOrder);
  serverOrderState = nextOrder;

  refundCounter += 1;
  const responseDto: ICreateRefundResponse = {
    refund_id: `RFD-${refundCounter}`,
    idempotency_key: idempotencyKey,
    deduplicated: false,
    amount_minor: serverAmountMinor,
    currency: nextOrder.currency,
    created_at: new Date().toISOString(),
    order: structuredClone(nextOrder),
  };

  idempotencyStore.set(idempotencyKey, responseDto);

  return {
    refundId: responseDto.refund_id,
    idempotencyKey: responseDto.idempotency_key,
    deduplicated: false,
    amountMinor: responseDto.amount_minor,
    currency: responseDto.currency,
    createdAt: responseDto.created_at,
    order: mapOrderResponseToOrder(structuredClone(nextOrder)),
  };
}
