import { create } from 'zustand';
import { fetchOrderApi } from '@/api';
import type { IOrderStoreState } from '@/types';

export const useOrderStore = create<IOrderStoreState>((set) => ({
  order: null,
  fetchStatus: 'idle',
  fetchError: null,
  refundHistory: [],
  notification: null,

  fetchOrder: async (orderId, signal) => {
    set({ fetchStatus: 'loading', fetchError: null });
    try {
      const order = await fetchOrderApi(orderId, signal);
      set({ order, fetchStatus: 'succeeded', fetchError: null });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const message = error instanceof Error ? error.message : 'Unable to load order details.';
      set({ fetchStatus: 'failed', fetchError: message });
    }
  },

  applyRefundSuccess: (updatedOrder, record) => {
    set((state) => ({
      order: updatedOrder,
      fetchStatus: 'succeeded',
      fetchError: null,
      refundHistory: [record, ...state.refundHistory],
    }));
  },

  showNotification: (severity, text) => {
    set({ notification: { severity, text } });
  },

  clearNotification: () => {
    set({ notification: null });
  },
}));
