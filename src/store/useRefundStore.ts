import { create } from 'zustand';
import { EMPTY_REFUND_SELECTION, MAX_REASON_NOTE_LENGTH } from '@/constants';
import {
  toggleAddonSelection,
  toggleAllItemsSelection,
  toggleUnitSelection,
} from '@/domain';
import { RefundReasonId } from '@/enums';
import type { RefundChannelId } from '@/enums';
import type {
  TRefundModalStage,
  IRefundStoreState,
  IRefundSubmitError,
} from '@/types';

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rfd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const INITIAL_DRAFT_STATE = {
  modalStage: 'closed' as TRefundModalStage,
  selection: EMPTY_REFUND_SELECTION,
  reason: '' as RefundReasonId | '',
  reasonNote: '',
  channel: '' as RefundChannelId | '',
  idempotencyKey: null as string | null,
  submitError: null as IRefundSubmitError | null,
};

export const useRefundStore = create<IRefundStoreState>((set, get) => ({
  ...INITIAL_DRAFT_STATE,

  openModal: () => {
    set({
      ...INITIAL_DRAFT_STATE,
      modalStage: 'selecting',
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  closeModal: () => {
    if (get().modalStage === 'submitting') {
      return;
    }
    set({ ...INITIAL_DRAFT_STATE });
  },

  toggleUnit: (order, unitId) => {
    set((state) => ({
      selection: toggleUnitSelection(order, state.selection, unitId),
      idempotencyKey: generateIdempotencyKey(),
      submitError: null,
    }));
  },

  toggleAddon: (order, unitId, addonId) => {
    set((state) => ({
      selection: toggleAddonSelection(order, state.selection, unitId, addonId),
      idempotencyKey: generateIdempotencyKey(),
      submitError: null,
    }));
  },

  toggleAllItems: (order) => {
    set((state) => ({
      selection: toggleAllItemsSelection(order, state.selection),
      idempotencyKey: generateIdempotencyKey(),
      submitError: null,
    }));
  },

  setRefundDeliveryFee: (include) => {
    set((state) => ({
      selection: {
        ...state.selection,
        refundDeliveryFee: include,
      },
      idempotencyKey: generateIdempotencyKey(),
      submitError: null,
    }));
  },

  setReason: (reason) => {
    set((state) => ({
      reason,
      reasonNote: reason === RefundReasonId.OTHER ? state.reasonNote : '',
      idempotencyKey: generateIdempotencyKey(),
      submitError: null,
    }));
  },

  setReasonNote: (note) => {
    set({
      reasonNote: note.slice(0, MAX_REASON_NOTE_LENGTH),
      idempotencyKey: generateIdempotencyKey(),
      submitError: null,
    });
  },

  setChannel: (channel) => {
    set({
      channel,
      idempotencyKey: generateIdempotencyKey(),
      submitError: null,
    });
  },

  goToReview: () => {
    set((state) => {
      const isDeliveryFeeOnly =
        state.selection.refundDeliveryFee &&
        Object.keys(state.selection.selectedUnits).length === 0 &&
        Object.keys(state.selection.selectedAddons).length === 0;

      return {
        modalStage: 'reviewing',
        reason: state.reason || (isDeliveryFeeOnly ? RefundReasonId.LATE_DELIVERY : ''),
        submitError: null,
      };
    });
  },

  goBackToSelect: () => {
    set({ modalStage: 'selecting', submitError: null });
  },

  openConfirmDialog: () => {
    set({ modalStage: 'confirming', submitError: null });
  },

  cancelConfirmDialog: () => {
    if (get().modalStage === 'submitting') {
      return;
    }
    set({ modalStage: 'reviewing' });
  },

  startSubmitting: () => {
    const existingKey = get().idempotencyKey ?? generateIdempotencyKey();
    set({
      modalStage: 'submitting',
      idempotencyKey: existingKey,
      submitError: null,
    });
    return existingKey;
  },

  failSubmitting: (code, message) => {
    set({
      modalStage: 'reviewing',
      submitError: { code, message },
    });
  },

  completeSubmitting: () => {
    set({ ...INITIAL_DRAFT_STATE });
  },
}));
