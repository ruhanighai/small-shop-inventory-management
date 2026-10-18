import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getStockStatus } from '@/lib/format';
import type { Product, ProductInput } from '@/types';

export const productKeys = {
  all: ['products'] as const,
  list: (filters: Record<string, unknown>) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  lowStock: ['products', 'low-stock'] as const,
};

type ListParams = {
  search?: string;
  category?: string;
  status?: 'all' | 'low-stock' | 'in-stock' | 'out-of-stock';
  sortBy?: keyof Product;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export function useProducts(params: ListParams = {}) {
  const {
    search = '',
    category = 'all',
    status = 'all',
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 10,
  } = params;

  return useQuery({
    queryKey: productKeys.list({ search, category, status, sortBy, sortDir, page, pageSize }),
    queryFn: async () => {
      let query = supabase.from('products').select('*', { count: 'exact' });

      if (search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`);
      }
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const ascending = sortDir === 'asc';
      query = query.order(sortBy, { ascending });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      let filtered = data ?? [];
      if (status !== 'all') {
        filtered = filtered.filter((p) => {
          const s = getStockStatus(p.quantity, p.low_stock_threshold);
          return s === status;
        });
      }

      return { data: filtered as Product[], total: count ?? 0 };
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['products', 'categories'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .neq('category', '');
      if (error) throw error;
      const unique = Array.from(new Set((data ?? []).map((d) => d.category as string)));
      return unique.sort();
    },
  });
}

export function useAllProductsForAlerts() {
  return useQuery({
    queryKey: productKeys.lowStock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('quantity', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock-filtered'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('quantity', { ascending: true });
      if (error) throw error;
      const products = (data ?? []) as Product[];
      return products
        .filter((p) => p.quantity <= p.low_stock_threshold)
        .sort((a, b) => {
          const aOut = a.quantity === 0 ? 0 : 1;
          const bOut = b.quantity === 0 ? 0 : 1;
          if (aOut !== bOut) return aOut - bOut;
          return a.quantity - b.quantity;
        });
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: input.name,
          sku: input.sku || null,
          category: input.category || null,
          price: input.price,
          cost_price: input.cost_price ?? null,
          quantity: input.quantity,
          low_stock_threshold: input.low_stock_threshold,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (err: Error) => {
      const msg = err.message.toLowerCase();
      if (msg.includes('products_user_sku_idx')) {
        toast.error('A product with this SKU already exists.');
      } else {
        toast.error(err.message || 'Failed to add product.');
      }
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ProductInput }) => {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: input.name,
          sku: input.sku || null,
          category: input.category || null,
          price: input.price,
          cost_price: input.cost_price ?? null,
          quantity: input.quantity,
          low_stock_threshold: input.low_stock_threshold,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      checkLowStockToast(updated);
    },
    onError: (err: Error) => {
      const msg = err.message.toLowerCase();
      if (msg.includes('products_user_sku_idx')) {
        toast.error('A product with this SKU already exists.');
      } else {
        toast.error(err.message || 'Failed to update product.');
      }
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success('Product deleted.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete product.'),
  });
}

export function useRestockProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, add }: { id: string; add: number }) => {
      const { data: product, error: fetchErr } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;
      const newQty = (product.quantity ?? 0) + add;
      const { data, error } = await supabase
        .from('products')
        .update({ quantity: newQty })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      checkLowStockToast(updated);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to restock product.'),
  });
}

function checkLowStockToast(product: Product) {
  const status = getStockStatus(product.quantity, product.low_stock_threshold);
  if (status === 'out-of-stock') {
    toast.warning(`${product.name} is out of stock.`);
  } else if (status === 'low-stock') {
    toast.warning(`${product.name} is low on stock (${product.quantity} left).`);
  }
}
