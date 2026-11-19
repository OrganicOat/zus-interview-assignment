import { History } from 'lucide-react';
import { formatCurrency } from '@/domain';
import { RefundChannelLabel, RefundReasonDescription } from '@/enums';
import type { IRefundRecord } from '@/types';

interface Props {
  records: IRefundRecord[];
}

export function RefundHistoryCard({ records }: Props) {
  if (records.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ice-blue bg-surface shadow-[0_2px_10px_rgba(39,56,128,0.04)]">
      <div className="flex items-center gap-2 border-b border-ice-blue bg-ice-hover px-5 py-3.5 sm:px-6">
        <History className="h-4 w-4 text-ink-secondary" />
        <h2 className="text-base font-semibold text-ink-primary">
          Refund Activity ({records.length})
        </h2>
      </div>

      <div className="divide-y divide-ice-blue">
        {records.map((record) => (
          <div key={record.refundId} className="px-5 py-3.5 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink-primary">{record.refundId}</span>
                  <span className="rounded-full border border-ice-blue bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-primary">
                    {RefundReasonDescription[record.reason]}
                  </span>
                  <span className="rounded-full border border-ice-blue bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-primary">
                    {RefundChannelLabel[record.channel]}
                  </span>
                </div>
                {record.reasonNote && (
                  <p className="mt-1 text-xs text-ink-secondary">Note: {record.reasonNote}</p>
                )}
                <p className="mt-0.5 text-xs text-ink-secondary">
                  Refund ID: <strong className="text-ink-primary">{record.refundId}</strong>{' '}
                  &middot; {new Date(record.createdAt).toLocaleString()}
                </p>
              </div>

              <span className="shrink-0 font-heading text-base font-bold tabular-nums text-cobalt">
                {formatCurrency(record.amountMinor, record.currency)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
