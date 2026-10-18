import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Package,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  PackagePlus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductFormDialog } from '@/components/product-form-dialog';
import { RestockDialog } from '@/components/restock-dialog';
import { StockStatusBadge } from '@/components/stock-status-badge';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import {
  useProducts,
  useCategories,
  useDeleteProduct,
} from '@/hooks/use-products';
import { useSettingsContext } from '@/hooks/use-settings-context';
import { formatCurrency, getStockStatus } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

const PAGE_SIZE = 10;
const SORT_COLUMNS: { key: keyof Product; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price' },
  { key: 'quantity', label: 'Qty' },
  { key: 'low_stock_threshold', label: 'Threshold' },
];

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettingsContext();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | 'low-stock' | 'in-stock' | 'out-of-stock'>('all');
  const [sortBy, setSortBy] = useState<keyof Product>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMut = useDeleteProduct();

  // Read low-stock filter from URL query param (bell click)
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'low-stock') {
      setStatus('low-stock');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filters = useMemo(
    () => ({ search, category, status, sortBy, sortDir, page, pageSize: PAGE_SIZE }),
    [search, category, status, sortBy, sortDir, page]
  );

  const { data, isLoading, isError, refetch } = useProducts(filters);
  const { data: categories } = useCategories();

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleSort = (col: keyof Product) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };
  const openRestock = (p: Product) => {
    setRestockTarget(p);
    setRestockOpen(true);
  };
  const openDelete = (p: Product) => {
    setDeleteTarget(p);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, { onSuccess: () => setDeleteOpen(false) });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in-stock">In stock</SelectItem>
              <SelectItem value="low-stock">Low stock only</SelectItem>
              <SelectItem value="out-of-stock">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isError ? (
          <ErrorState message="Failed to load products. Please try again." />
        ) : isLoading ? (
          <ProductsTableSkeleton />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title={search || category !== 'all' || status !== 'all' ? 'No products match your filters' : 'No products yet'}
            description={
              search || category !== 'all' || status !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Add your first product to start tracking your inventory.'
            }
            action={
              !search && category === 'all' && status === 'all' ? (
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add product
                </Button>
              ) : (
                <Button variant="outline" onClick={() => { setSearch(''); setCategory('all'); setStatus('all'); }}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {SORT_COLUMNS.map((col) => (
                    <TableHead key={col.key} className="h-11 px-3">
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      >
                        {col.label}
                        {sortBy === col.key ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const stockStatus = getStockStatus(p.quantity, p.low_stock_threshold);
                  const isLow = stockStatus !== 'in-stock';
                  return (
                    <TableRow
                      key={p.id}
                      className={cn(isLow && 'bg-warning/5 hover:bg-warning/10')}
                    >
                      <TableCell className="px-3 py-3 font-medium">{p.name}</TableCell>
                      <TableCell className="px-3 py-3 text-muted-foreground">
                        {p.sku || '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-muted-foreground">
                        {p.category || '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        {formatCurrency(p.price, settings.currency)}
                      </TableCell>
                      <TableCell className="px-3 py-3 font-medium">{p.quantity}</TableCell>
                      <TableCell className="px-3 py-3 text-muted-foreground">
                        {p.low_stock_threshold}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <StockStatusBadge quantity={p.quantity} threshold={p.low_stock_threshold} />
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openRestock(p)}
                            title="Restock"
                          >
                            <PackagePlus className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(p)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            onClick={() => openDelete(p)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="px-2 text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
      />
      <RestockDialog
        product={restockTarget}
        open={restockOpen}
        onOpenChange={setRestockOpen}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>.
              Existing sales for this product will be kept but the product link will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductsTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
