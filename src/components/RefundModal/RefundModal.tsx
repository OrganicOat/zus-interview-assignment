import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { REFUND_STEP_LABELS } from '@/constants';
import { formatCurrency } from '@/domain';
import { useRefundCalculation, useRefundSubmission } from '@/hooks';
import { useOrderStore, useRefundStore } from '@/store';
import { ConfirmRefundDialog } from './ConfirmRefundDialog';
import { StepReviewDetails } from './StepReviewDetails';
import { StepSelectItems } from './StepSelectItems';

export function RefundModal() {
  const order = useOrderStore((state) => state.order);
  const summary = useRefundCalculation();
  const { submitRefund } = useRefundSubmission();

  const {
    modalStage,
    reason,
    channel,
    closeModal,
    goToReview,
    goBackToSelect,
    openConfirmDialog,
  } = useRefundStore(
    useShallow((state) => ({
      modalStage: state.modalStage,
      reason: state.reason,
      channel: state.channel,
      closeModal: state.closeModal,
      goToReview: state.goToReview,
      goBackToSelect: state.goBackToSelect,
      openConfirmDialog: state.openConfirmDialog,
    }))
  );

  const isOpen = modalStage !== 'closed';
  const isSubmitting = modalStage === 'submitting';
  const isConfirmOpen = modalStage === 'confirming' || modalStage === 'submitting';
  const activeStep = modalStage === 'selecting' ? 0 : 1;

  if (!order || !summary) {
    return null;
  }

  const canProceedToReview = summary.hasAnySelection && summary.totalMinor > 0;
  const canOpenConfirm = Boolean(
    reason && channel && summary.hasAnySelection && summary.totalMinor > 0
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting && !isConfirmOpen) {
      closeModal();
    }
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink-primary/40 backdrop-blur-[1px]" />
          <Dialog.Content
            onInteractOutside={(event) => {
              if (isSubmitting || isConfirmOpen) {
                event.preventDefault();
              }
            }}
            onEscapeKeyDown={(event) => {
              if (isSubmitting || isConfirmOpen) {
                event.preventDefault();
              }
            }}
            className="fixed inset-0 z-50 flex flex-col bg-surface outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-ice-blue sm:shadow-2xl"
          >
            <div className="border-b border-ice-blue px-5 pt-5 pb-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Dialog.Title className="font-heading text-lg font-bold text-ink-primary">
                    Refund Order {order.orderId}
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-ink-secondary">
                    Step {activeStep + 1} of 2 &middot; {REFUND_STEP_LABELS[activeStep]}
                  </Dialog.Description>
                </div>

                <button
                  type="button"
                  aria-label="Close refund dialog"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-full p-1.5 text-ink-secondary hover:bg-ice-hover hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <ol className="mt-4 flex items-center gap-3">
                {REFUND_STEP_LABELS.map((label, index) => {
                  const isCompleted = index < activeStep;
                  const isActive = index === activeStep;
                  return (
                    <li key={label} className="flex flex-1 items-center gap-2">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isCompleted || isActive
                            ? 'bg-cobalt text-white'
                            : 'bg-ice-blue text-ink-secondary'
                        }`}
                      >
                        {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : index + 1}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isActive || isCompleted ? 'text-ink-primary' : 'text-ink-secondary'
                        }`}
                      >
                        {label}
                      </span>
                      {index === 0 && <span className="h-px flex-1 bg-ice-blue" />}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {activeStep === 0 ? (
                <StepSelectItems order={order} summary={summary} />
              ) : (
                <StepReviewDetails order={order} summary={summary} />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ice-blue bg-ice-tint px-5 py-4 sm:rounded-b-2xl sm:px-6">
              <div>
                <span className="block text-xs text-ink-secondary">Total Refund Amount</span>
                <span className="font-heading text-lg font-bold tabular-nums text-cobalt">
                  {formatCurrency(summary.totalMinor, order.currency)}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {activeStep === 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-full px-5 text-sm font-semibold text-ink-secondary hover:bg-ice-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={goToReview}
                      disabled={!canProceedToReview}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-cobalt px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt-dark disabled:cursor-not-allowed disabled:bg-ice-blue disabled:text-ink-secondary cursor-pointer"
                    >
                      Next
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={goBackToSelect}
                      disabled={isSubmitting}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-ink-secondary hover:bg-ice-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={openConfirmDialog}
                      disabled={!canOpenConfirm || isSubmitting}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-cobalt px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt-dark disabled:cursor-not-allowed disabled:bg-ice-blue disabled:text-ink-secondary cursor-pointer"
                    >
                      Confirm
                    </button>
                  </>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmRefundDialog order={order} summary={summary} onConfirmSubmit={submitRefund} />
    </>
  );
}
