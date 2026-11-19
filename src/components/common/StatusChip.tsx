import { OrderStatus, PaymentStatus } from '@/enums';

interface Props {
  status: PaymentStatus | OrderStatus;
  size?: 'small' | 'medium';
}

const STATUS_STYLE_MAP: Record<PaymentStatus | OrderStatus, { label: string; className: string }> = {
  [PaymentStatus.PAID]: {
    label: 'Paid',
    className: 'bg-success-bg text-success-text',
  },
  [PaymentStatus.REFUNDED]: {
    label: 'Refunded',
    className: 'bg-ice-blue text-ink-secondary',
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completed',
    className: 'bg-ice-hover text-cobalt',
  },
  [OrderStatus.PARTIALLY_REFUNDED]: {
    label: 'Partially Refunded',
    className: 'bg-warning-bg text-warning-text',
  },
};

export function StatusChip({ status, size = 'small' }: Props) {
  const config = STATUS_STYLE_MAP[status];
  const sizeClass = size === 'small' ? 'h-6 px-2.5 text-xs' : 'h-7 px-3 text-[13px]';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${sizeClass} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
