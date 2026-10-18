import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProduct, useUpdateProduct } from '@/hooks/use-products';
import type { Product } from '@/types';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required.'),
  sku: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater.'),
  cost_price: z.coerce.number().optional().nullable(),
  quantity: z.coerce.number().int().min(0, 'Quantity must be 0 or greater.'),
  low_stock_threshold: z.coerce.number().int().min(0, 'Threshold must be 0 or greater.'),
});

type ProductForm = z.infer<typeof productSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
};

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = !!product;
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      category: '',
      price: 0,
      cost_price: null,
      quantity: 0,
      low_stock_threshold: 5,
    },
  });

  // Reset form when dialog opens / product changes
  React.useEffect(() => {
    if (open) {
      reset({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        category: product?.category ?? '',
        price: product?.price ?? 0,
        cost_price: product?.cost_price ?? null,
        quantity: product?.quantity ?? 0,
        low_stock_threshold: product?.low_stock_threshold ?? 5,
      });
    }
  }, [open, product, reset]);

  const onSubmit = (values: ProductForm) => {
    const input = {
      name: values.name,
      sku: values.sku ?? '',
      category: values.category ?? '',
      price: values.price,
      cost_price: values.cost_price ? Number(values.cost_price) : null,
      quantity: values.quantity,
      low_stock_threshold: values.low_stock_threshold,
    };

    if (isEdit && product) {
      updateMut.mutate(
        { id: product.id, input },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMut.mutate(input, { onSuccess: () => onOpenChange(false) });
    }
  };

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'Add product'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the product details below.'
              : 'Fill in the details to add a new product to your inventory.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product name *</Label>
            <Input id="name" placeholder="e.g. Cotton T-Shirt" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" placeholder="SKU-001" {...register('sku')} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="e.g. Apparel" {...register('category')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('price')}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional"
                {...register('cost_price')}
              />
              {errors.cost_price && (
                <p className="text-xs text-destructive">{errors.cost_price.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                placeholder="0"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">Low stock threshold</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                min="0"
                placeholder="5"
                {...register('low_stock_threshold')}
              />
              {errors.low_stock_threshold && (
                <p className="text-xs text-destructive">{errors.low_stock_threshold.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
