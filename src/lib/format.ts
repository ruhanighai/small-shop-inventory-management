import { CURRENCIES, type Currency } from '@/types';

export function formatCurrency(amount: number | null | undefined, currency: Currency = 'INR'): string {
  const value = amount ?? 0;
  const { locale, symbol } = CURRENCIES[currency];
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
  return `${symbol}${formatted}`;
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN').format(value ?? 0);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getStockStatus(quantity: number, threshold: number) {
  if (quantity <= 0) return 'out-of-stock' as const;
  if (quantity <= threshold) return 'low-stock' as const;
  return 'in-stock' as const;
}

export function stockStatusLabel(status: ReturnType<typeof getStockStatus>): string {
  switch (status) {
    case 'out-of-stock':
      return 'Out of stock';
    case 'low-stock':
      return 'Low stock';
    case 'in-stock':
      return 'In stock';
  }
}
