import type { ApiErrorCode, RefundChannelId, RefundReasonId } from '@/enums';
import type { IOrder } from './order';
import type {
  IRefundRecord,
  IRefundSelection,
  IRefundSubmitError,
  TRefundModalStage,
} from './refund';

export type TFetchStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface INotificationBanner {
  severity: 'success' | 'info' | 'error';
  text: string;
}

export interface IOrderStoreState {
  order: IOrder | null;
  fetchStatus: TFetchStatus;
  fetchError: string | null;
  refundHistory: IRefundRecord[];
  notification: INotificationBanner | null;

  fetchOrder: (orderId: string, signal?: AbortSignal) => Promise<void>;
  applyRefundSuccess: (updatedOrder: IOrder, record: IRefundRecord) => void;
  showNotification: (severity: INotificationBanner['severity'], text: string) => void;
  clearNotification: () => void;
}

export interface IRefundStoreState {
  modalStage: TRefundModalStage;
  selection: IRefundSelection;
  reason: RefundReasonId | '';
  reasonNote: string;
  channel: RefundChannelId | '';
  idempotencyKey: string | null;
  submitError: IRefundSubmitError | null;

  openModal: () => void;
  closeModal: () => void;
  toggleUnit: (order: IOrder, unitId: string) => void;
  toggleAddon: (order: IOrder, unitId: string, addonId: string) => void;
  toggleAllItems: (order: IOrder) => void;
  setRefundDeliveryFee: (include: boolean) => void;
  setReason: (reason: RefundReasonId) => void;
  setReasonNote: (note: string) => void;
  setChannel: (channel: RefundChannelId) => void;
  goToReview: () => void;
  goBackToSelect: () => void;
  openConfirmDialog: () => void;
  cancelConfirmDialog: () => void;
  startSubmitting: () => string;
  failSubmitting: (code: ApiErrorCode | 'UNKNOWN', message: string) => void;
  completeSubmitting: () => void;
}
