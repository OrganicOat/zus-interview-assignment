import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RefundModal } from '@/components/RefundModal/RefundModal';
import { useOrder } from '@/hooks';
import { useOrderStore, useRefundStore } from '@/store';
import { OrderHeader } from './OrderHeader';
import { OrderItemsList } from './OrderItemsList';
import { RefundHistoryCard } from './RefundHistoryCard';

export function OrderPage() {
  const { order, orderTotals, fetchStatus, fetchError, refundHistory, reloadOrder } = useOrder();

  const { notification, clearNotification } = useOrderStore(
    useShallow((state) => ({
      notification: state.notification,
      clearNotification: state.clearNotification,
    }))
  );

  const openModal = useRefundStore((state) => state.openModal);
  const isModalOpen = useRefundStore((state) => state.modalStage !== 'closed');

  useEffect(() => {
    if (!notification) {
      return undefined;
    }
    const timer = window.setTimeout(clearNotification, 5000);
    return () => window.clearTimeout(timer);
  }, [notification, clearNotification]);

  return (
    <div className="min-h-screen bg-ice-tint py-6 sm:py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex flex-col gap-5">
          {fetchStatus === 'loading' && !order && (
            <div className="flex flex-col gap-4">
              <div className="h-44 animate-pulse rounded-xl bg-ice-blue/60" />
              <div className="h-80 animate-pulse rounded-xl bg-ice-blue/60" />
            </div>
          )}

          {fetchStatus === 'failed' && !order && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 rounded-xl border border-error-text/20 bg-error-bg px-4 py-3 text-sm text-error-text"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{fetchError ?? 'Failed to load order.'}</span>
              </div>
              <button
                type="button"
                onClick={reloadOrder}
                className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-error-text hover:bg-white cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {order && orderTotals && (
            <>
              <OrderHeader order={order} orderTotals={orderTotals} onStartRefund={openModal} />
              <OrderItemsList order={order} />
              <RefundHistoryCard records={refundHistory} />
            </>
          )}
        </div>
      </div>

      {isModalOpen && <RefundModal />}

      {notification && (
        <div
          role="status"
          className={`fixed right-4 bottom-4 z-50 flex max-w-md items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            notification.severity === 'success'
              ? 'bg-success-text'
              : notification.severity === 'error'
                ? 'bg-error-text'
                : 'bg-cobalt'
          }`}
        >
          {notification.severity === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : notification.severity === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <Info className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{notification.text}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={clearNotification}
            className="rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
