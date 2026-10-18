import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Loader2,
  Trash2,
  Search,
  TrendingUp,
  Boxes,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ProductCombobox } from '@/components/product-combobox';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import {
  useProductsForSale,
  useRecordSale,
  useSales,
  useSalesTotals,
  useDeleteSale,
} from '@/hooks/use-sales';
import { useSettingsContext } from '@/hooks/use-settings-context';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Product } from '@/types';

const saleSchema = z.object({
  productId: z.string().min(1, 'Select a product.'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or greater.'),
  soldAt: z.string().min(1, 'Date is required.'),
});

type SaleForm = z.infer<typeof saleSchema>;

const PAGE_SIZE = 10;

export function SalesPage() {
  const { settings } = useSettingsContext();
  const recordMut = useRecordSale();
  const deleteMut = useDeleteSale();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: products, isLoading: productsLoading } = useProductsForSale();

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      unitPrice: 0,
      soldAt: new Date().toISOString().slice(0, 16),
    },
  });

  const watched = watch();
  const liveTotal = (Number(watched.quantity) || 0) * (Number(watched.unitPrice) || 0);
  const exceedsStock =
    selectedProduct && Number(watched.quantity) > selectedProduct.quantity;

  // Auto-fill unit price when product changes
  useEffect(() => {
    if (selectedProduct) {
      setValue('unitPrice', selectedProduct.price);
    }
  }, [selectedProduct, setValue]);

  const onSubmit = (values: SaleForm) => {
    if (exceedsStock) {
      toast.error('Quantity exceeds available stock.');
      return;
    }
    recordMut.mutate(
      {
        productId: values.productId,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        soldAt: new Date(values.soldAt).toISOString(),
      },
      {
        onSuccess: () => {
          reset({
            productId: '',
            quantity: 1,
            unitPrice: 0,
            soldAt: new Date().toISOString().slice(0, 16),
          });
          setSelectedProduct(null);
        },
      }
    );
  };

  // History
  const historyParams = useMemo(
    () => ({
      productId: historyProduct,
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate + 'T23:59:59').toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [historyProduct, fromDate, toDate, page]
  );

  const { data: salesData, isLoading: salesLoading, isError: salesError } = useSales(historyParams);
  const { data: totals } = useSalesTotals({
    productId: historyProduct,
    fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
    toDate: toDate ? new Date(toDate + 'T23:59:59').toISOString() : undefined,
  });

  const sales = salesData?.data ?? [];
  const totalSales = salesData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalSales / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [historyProduct, fromDate, toDate]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, { onSuccess: () => setDeleteOpen(false) });
  };

  return (
    <div className="space-y-6">
      {/* Record sale form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Record a sale
          </CardTitle>
          <CardDescription>
            Select a product and enter the sale details. Stock is updated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Controller
                  control={control}
                  name="productId"
                  render={({ field }) => (
                    <ProductCombobox
                      products={products ?? []}
                      value={field.value || null}
                      onChange={(id, prod) => {
                        field.onChange(id ?? '');
                        setSelectedProduct(prod ?? null);
                      }}
                      disabled={productsLoading}
                    />
                  )}
                />
                {errors.productId && (
                  <p className="text-xs text-destructive">{errors.productId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="soldAt">Date & time *</Label>
                <Input
                  id="soldAt"
                  type="datetime-local"
                  {...register('soldAt')}
                />
                {errors.soldAt && (
                  <p className="text-xs text-destructive">{errors.soldAt.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  {...register('quantity')}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                )}
                {exceedsStock && selectedProduct && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Only {selectedProduct.quantity} units in stock.
                  </p>
                )}
                {selectedProduct && !exceedsStock && (
                  <p className="text-xs text-muted-foreground">
                    {selectedProduct.quantity} units available.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit price *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('unitPrice')}
                />
                {errors.unitPrice && (
                  <p className="text-xs text-destructive">{errors.unitPrice.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Sale total: </span>
                <span className="text-lg font-semibold text-foreground">
                  {formatCurrency(liveTotal, settings.currency)}
                </span>
              </div>
              <Button
                type="submit"
                disabled={recordMut.isPending || !!exceedsStock}
                className="gap-2"
              >
                {recordMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Record sale
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sales history */}
      <div className="space-y-4">
        {/* Totals + filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Revenue
              </div>
              <p className="mt-1 text-lg font-semibold">
                {formatCurrency(totals?.revenue ?? 0, settings.currency)}
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Boxes className="h-3.5 w-3.5" />
                Units sold
              </div>
              <p className="mt-1 text-lg font-semibold">{totals?.units ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShoppingCart className="h-3.5 w-3.5" />
                Sales
              </div>
              <p className="mt-1 text-lg font-semibold">{totals?.count ?? 0}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Product</Label>
              <Select value={historyProduct} onValueChange={setHistoryProduct}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {(products ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            {(fromDate || toDate || historyProduct !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setHistoryProduct('all');
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <Card className="overflow-hidden">
          {salesError ? (
            <ErrorState message="Failed to load sales history." />
          ) : salesLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-5 w-5" />}
              title="No sales recorded yet"
              description="Record your first sale using the form above, or load demo data from Settings."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Product</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">Qty</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">Unit price</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">Total</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(s.sold_at)}
                      </TableCell>
                      <TableCell className="font-medium">{s.product_name}</TableCell>
                      <TableCell className="text-right">{s.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(s.unit_price, settings.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(s.total, settings.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => {
                            setDeleteTarget({ id: s.id, name: s.product_name });
                            setDeleteOpen(true);
                          }}
                          title="Delete sale"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                <p className="text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalSales)} of {totalSales}
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
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the sale of <span className="font-medium text-foreground">{deleteTarget?.name}</span> and restore the sold units back to stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
