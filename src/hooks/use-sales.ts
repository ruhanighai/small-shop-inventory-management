import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getStockStatus } from '@/lib/format';
import { productKeys } from '@/hooks/use-products';
import type { Sale, Product } from '@/types';

export const salesKeys = {
  all: ['sales'] as const,
  list: (filters: Record<string, unknown>) => ['sales', 'list', filters] as const,
};

type SalesListParams = {
  productId?: string | 'all';
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

export function useSales(params: SalesListParams = {}) {
  const { productId = 'all', fromDate, toDate, page = 1, pageSize = 10 } = params;

  return useQuery({
    queryKey: salesKeys.list({ productId, fromDate, toDate, page, pageSize }),
    queryFn: async () => {
      let query = supabase.from('sales').select('*', { count: 'exact' });

      if (productId && productId !== 'all') {
        query = query.eq('product_id', productId);
      }
      if (fromDate) {
        query = query.gte('sold_at', fromDate);
      }
      if (toDate) {
        query = query.lte('sold_at', toDate);
      }

      query = query.order('sold_at', { ascending: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as Sale[], total: count ?? 0 };
    },
  });
}

export function useSalesTotals(params: Omit<SalesListParams, 'page' | 'pageSize'> = {}) {
  const { productId = 'all', fromDate, toDate } = params;

  return useQuery({
    queryKey: ['sales', 'totals', { productId, fromDate, toDate }] as const,
    queryFn: async () => {
      let query = supabase.from('sales').select('total, quantity');

      if (productId && productId !== 'all') {
        query = query.eq('product_id', productId);
      }
      if (fromDate) {
        query = query.gte('sold_at', fromDate);
      }
      if (toDate) {
        query = query.lte('sold_at', toDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const revenue = rows.reduce((sum, r) => sum + Number(r.total), 0);
      const units = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
      return { revenue, units, count: rows.length };
    },
  });
}

export function useProductsForSale() {
  return useQuery({
    queryKey: productKeys.lowStock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

export function useRecordSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      productId: string;
      quantity: number;
      unitPrice: number;
      soldAt: string;
    }) => {
      const { data, error } = await supabase.rpc('record_sale', {
        p_product_id: args.productId,
        p_quantity: args.quantity,
        p_unit_price: args.unitPrice,
        p_sold_at: args.soldAt,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: salesKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });

      // Low stock toast
      supabase
        .from('products')
        .select('*')
        .eq('id', variables.productId)
        .single()
        .then(({ data }) => {
          if (data) {
            const p = data as Product;
            const status = getStockStatus(p.quantity, p.low_stock_threshold);
            if (status === 'out-of-stock') {
              toast.warning(`${p.name} is now out of stock.`);
            } else if (status === 'low-stock') {
              toast.warning(`${p.name} is low on stock (${p.quantity} left).`);
            }
          }
        });

      toast.success('Sale recorded successfully.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to record sale.'),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase.rpc('delete_sale', { p_sale_id: saleId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: salesKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale deleted and stock restored.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete sale.'),
  });
}

export function useLoadDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('load_demo_data');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success('Demo data loaded! 12 products and 60 sales added.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to load demo data.'),
  });
}
