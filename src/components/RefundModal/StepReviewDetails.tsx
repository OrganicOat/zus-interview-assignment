import * as RadioGroup from '@radix-ui/react-radio-group';
import * as Select from '@radix-ui/react-select';
import { AlertCircle, Check, ChevronDown, CreditCard, Wallet } from 'lucide-react';
import { useId } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MAX_REASON_NOTE_LENGTH } from '@/constants';
import { formatCurrency } from '@/domain';
import {
  ApiErrorCode,
  RefundChannelDescription,
  RefundChannelId,
  RefundChannelLabel,
  RefundReasonDescription,
  RefundReasonId,
} from '@/enums';
import { useRefundStore } from '@/store';
import type { IOrder, IRefundSummary } from '@/types';

const REFUND_REASON_IDS = Object.values(RefundReasonId);
const REFUND_CHANNEL_IDS = Object.values(RefundChannelId);

interface Props {
  order: IOrder;
  summary: IRefundSummary;
}

export function StepReviewDetails({ order, summary }: Props) {
  const reasonLabelId = useId();
  const noteInputId = useId();
  const channelLabelId = useId();

  const { reason, reasonNote, channel, submitError, setReason, setReasonNote, setChannel } =
    useRefundStore(
      useShallow((state) => ({
        reason: state.reason,
        reasonNote: state.reasonNote,
        channel: state.channel,
        submitError: state.submitError,
        setReason: state.setReason,
        setReasonNote: state.setReasonNote,
        setChannel: state.setChannel,
      }))
    );

  return (
    <div className="space-y-5">
      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-error-text/20 bg-error-bg px-4 py-3 text-error-text"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Refund could not be completed</p>
            <p>{submitError.message}</p>
            {(submitError.code === ApiErrorCode.NETWORK_TIMEOUT ||
              submitError.code === ApiErrorCode.SERVER_ERROR) && (
              <p className="mt-1 text-xs">
                Please try again — this refund will not be processed twice.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-ice-blue bg-surface">
        <div className="border-b border-ice-blue bg-ice-hover px-5 py-3">
          <h3 className="text-sm font-bold text-ink-primary">
            Refund Preview ({summary.isFullRefund ? 'Full Item Refund' : 'Partial Refund'})
          </h3>
        </div>

        <div className="divide-y divide-ice-blue px-5 py-1.5">
          {summary.selectedPreviews.map((preview) => (
            <div key={preview.unitId} className="py-2.5">
              <div className="flex justify-between gap-4">
                <div>
                  <span className="block text-sm font-semibold text-ink-primary">
                    {preview.itemName}
                    {preview.unitCount > 1
                      ? ` (Unit ${preview.unitNumber} of ${preview.unitCount})`
                      : ''}
                  </span>
                  {!preview.includeBaseUnit && (
                    <span className="text-xs text-ink-secondary">
                      Add-ons only (main drink previously refunded)
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-primary">
                  {preview.includeBaseUnit
                    ? formatCurrency(preview.basePriceMinor, order.currency)
                    : '—'}
                </span>
              </div>

              {preview.selectedAddons.length > 0 && (
                <div className="mt-1.5 space-y-1 pl-4">
                  {preview.selectedAddons.map((addon) => (
                    <div
                      key={`${preview.unitId}::${addon.addonId}`}
                      className="flex justify-between gap-4 text-xs text-ink-secondary"
                    >
                      <span>+ {addon.name}</span>
                      <span className="tabular-nums">
                        {formatCurrency(addon.priceMinor, order.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {summary.deliveryFeeMinor > 0 && (
            <div className="flex justify-between py-2.5 text-sm font-semibold text-ink-primary">
              <span>Delivery Fee</span>
              <span className="tabular-nums">
                {formatCurrency(summary.deliveryFeeMinor, order.currency)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 pb-2">
            <span className="text-base font-bold text-ink-primary">Final Refund Amount</span>
            <span className="font-heading text-lg font-bold tabular-nums text-cobalt">
              {formatCurrency(summary.totalMinor, order.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label
            id={reasonLabelId}
            className="mb-1.5 block text-sm font-semibold text-ink-primary"
          >
            Refund Reason <span className="text-error-text">*</span>
          </label>
          <Select.Root
            value={reason}
            onValueChange={(value) => setReason(value as RefundReasonId)}
          >
            <Select.Trigger
              aria-labelledby={reasonLabelId}
              className="flex h-11 w-full items-center justify-between rounded-lg border border-ice-blue bg-white px-3.5 text-sm text-ink-primary outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 cursor-pointer"
            >
              <Select.Value placeholder="Select a reason" />
              <Select.Icon>
                <ChevronDown className="h-4 w-4 text-ink-secondary" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                sideOffset={4}
                className="z-[60] max-h-60 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-ice-blue bg-white p-1 shadow-lg"
              >
                <Select.Viewport>
                  {REFUND_REASON_IDS.map((reasonId) => (
                    <Select.Item
                      key={reasonId}
                      value={reasonId}
                      className="relative flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-primary outline-none select-none data-[highlighted]:bg-ice-hover cursor-pointer"
                    >
                      <Select.ItemText>{RefundReasonDescription[reasonId]}</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="h-4 w-4 text-cobalt" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {reason === RefundReasonId.OTHER && (
          <div>
            <label
              htmlFor={noteInputId}
              className="mb-1.5 block text-sm font-semibold text-ink-primary"
            >
              Additional note (optional)
            </label>
            <textarea
              id={noteInputId}
              rows={2}
              maxLength={MAX_REASON_NOTE_LENGTH}
              placeholder="Brief context for audit log"
              value={reasonNote}
              onChange={(event) => setReasonNote(event.target.value)}
              className="w-full rounded-lg border border-ice-blue bg-white px-3.5 py-2 text-sm text-ink-primary outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20"
            />
            <span className="mt-1 block text-xs text-ink-secondary">
              {reasonNote.length}/{MAX_REASON_NOTE_LENGTH} characters
            </span>
          </div>
        )}

        <fieldset>
          <legend
            id={channelLabelId}
            className="mb-2 block text-sm font-semibold text-ink-primary"
          >
            Refund Channel <span className="text-error-text">*</span>
          </legend>
          <RadioGroup.Root
            aria-labelledby={channelLabelId}
            value={channel}
            onValueChange={(value) => setChannel(value as RefundChannelId)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {REFUND_CHANNEL_IDS.map((channelId) => {
              const isSelected = channel === channelId;
              return (
                <div
                  key={channelId}
                  onClick={() => setChannel(channelId)}
                  className={`flex items-start gap-2.5 rounded-xl border p-3.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-2 border-cobalt bg-ice-hover'
                      : 'border-ice-blue bg-surface hover:bg-ice-hover/50'
                  }`}
                >
                  <RadioGroup.Item
                    value={channelId}
                    aria-label={RefundChannelLabel[channelId]}
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ink-secondary bg-white data-[state=checked]:border-cobalt cursor-pointer"
                  >
                    <RadioGroup.Indicator className="h-2 w-2 rounded-full bg-cobalt" />
                  </RadioGroup.Item>
                  <div>
                    <div className="flex items-center gap-1.5">
                      {channelId === RefundChannelId.ORIGINAL_PAYMENT_METHOD ? (
                        <CreditCard className="h-4 w-4 text-cobalt" />
                      ) : (
                        <Wallet className="h-4 w-4 text-cobalt" />
                      )}
                      <span className="text-sm font-bold text-ink-primary">
                        {RefundChannelLabel[channelId]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {RefundChannelDescription[channelId]}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup.Root>
        </fieldset>
      </div>
    </div>
  );
}
