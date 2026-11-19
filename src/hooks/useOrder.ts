import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DEFAULT_ORDER_ID } from '@/constants';
import { calculateOrderTotals } from '@/domain';
import { useOrderStore } from '@/store';

export function useOrder(orderId: string = DEFAULT_ORDER_ID) {
  const { order, fetchStatus, fetchError, refundHistory, fetchOrder } = useOrderStore(
    useShallow((state) => ({
      order: state.order,
      fetchStatus: state.fetchStatus,
      fetchError: state.fetchError,
      refundHistory: state.refundHistory,
      fetchOrder: state.fetchOrder,
    }))
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchOrder(orderId, controller.signal);
    return () => {
      controller.abort();
    };
  }, [orderId, fetchOrder]);

  const reloadOrder = useCallback(() => {
    void fetchOrder(orderId);
  }, [orderId, fetchOrder]);

  const orderTotals = useMemo(() => {
    if (!order) {
      return null;
    }
    return calculateOrderTotals(order);
  }, [order]);

  return {
    order,
    orderTotals,
    fetchStatus,
    fetchError,
    refundHistory,
    reloadOrder,
  };
}
