export type Product = {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  price: number;
  cost_price: number | null;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  sold_at: string;
  created_at: string;
};

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export type ProductInput = {
  name: string;
  sku: string;
  category: string;
  price: number;
  cost_price: number | null;
  quantity: number;
  low_stock_threshold: number;
};

export type RevenueSeriesRow = {
  day: string;
  revenue: number;
  units: number;
};

export type TopProductRow = {
  product_id: string;
  product_name: string;
  units: number;
  revenue: number;
};

export type CategoryRevenueRow = {
  category: string;
  revenue: number;
  units: number;
};

export type KpiRow = {
  today_revenue: number;
  range_revenue: number;
  total_products: number;
  low_stock_count: number;
};

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export const CURRENCIES: Record<Currency, { symbol: string; label: string; locale: string }> = {
  INR: { symbol: '₹', label: 'Indian Rupee', locale: 'en-IN' },
  USD: { symbol: '$', label: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', label: 'Euro', locale: 'en-IE' },
  GBP: { symbol: '£', label: 'British Pound', locale: 'en-GB' },
  JPY: { symbol: '¥', label: 'Japanese Yen', locale: 'ja-JP' },
};
