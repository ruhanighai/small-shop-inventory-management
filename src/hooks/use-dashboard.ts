import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CategoryRevenueRow, KpiRow, RevenueSeriesRow, TopProductRow } from '@/types';

export function useDashboardKpis(rangeDays: number) {
  return useQuery({
    queryKey: ['dashboard', 'kpis', rangeDays] as const,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_kpis', {
        p_range_days: rangeDays,
      });
      if (error) throw error;
      return (data ?? []) as unknown as KpiRow[];
    },
  });
}

export function useRevenueSeries(rangeDays: number) {
  return useQuery({
    queryKey: ['dashboard', 'revenue-series', rangeDays] as const,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_revenue_series', {
        p_range_days: rangeDays,
      });
      if (error) throw error;
      return (data ?? []) as unknown as RevenueSeriesRow[];
    },
  });
}

export function useTopProducts(rangeDays: number, limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'top-products', rangeDays, limit] as const,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_top_products', {
        p_range_days: rangeDays,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as unknown as TopProductRow[];
    },
  });
}

export function useRevenueByCategory(rangeDays: number) {
  return useQuery({
    queryKey: ['dashboard', 'category-revenue', rangeDays] as const,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_revenue_by_category', {
        p_range_days: rangeDays,
      });
      if (error) throw error;
      return (data ?? []) as unknown as CategoryRevenueRow[];
    },
  });
}
