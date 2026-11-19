import { ZERO_DECIMAL_CURRENCIES } from '@/constants';

export function getMinorUnitFactor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
}

export function toMinorUnits(amount: number, currency: string): number {
  const factor = getMinorUnitFactor(currency);
  return Math.round(amount * factor);
}

export function formatCurrency(amountMinor: number, currency: string): string {
  const factor = getMinorUnitFactor(currency);
  const decimals = factor === 1 ? 0 : 2;
  const majorAmount = amountMinor / factor;

  try {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(majorAmount);
  } catch {
    return `${currency} ${majorAmount.toFixed(decimals)}`;
  }
}
