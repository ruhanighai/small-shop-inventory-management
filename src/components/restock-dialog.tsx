import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PackagePlus } from 'lucide-react';
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
import { useRestockProduct } from '@/hooks/use-products';
import { formatNumber } from '@/lib/format';
import type { Product } from '@/types';

const restockSchema = z.object({
  add: z.coerce.number().int().min(1, 'Add at least 1 unit.'),
});

type RestockForm = z.infer<typeof restockSchema>;

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RestockDialog({ product, open, onOpenChange }: Props) {
  const restockMut = useRestockProduct();
  const [newQtyPreview, setNewQtyPreview] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RestockForm>({
    resolver: zodResolver(restockSchema),
    defaultValues: { add: 10 },
  });

  const addValue = watch('add');
  React.useEffect(() => {
    if (product && typeof addValue === 'number' && !isNaN(addValue)) {
      setNewQtyPreview(product.quantity + addValue);
    } else {
      setNewQtyPreview(null);
    }
  }, [addValue, product]);

  React.useEffect(() => {
    if (open) reset({ add: 10 });
  }, [open, reset]);

  const onSubmit = (values: RestockForm) => {
    if (!product) return;
    restockMut.mutate(
      { id: product.id, add: values.add },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-primary" />
            Restock product
          </DialogTitle>
          <DialogDescription>
            Add units to <span className="font-medium text-foreground">{product?.name}</span>.
            Current stock: {formatNumber(product?.quantity ?? 0)} units.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add">Units to add</Label>
            <Input
              id="add"
              type="number"
              min="1"
              placeholder="10"
              {...register('add')}
            />
            {errors.add && <p className="text-xs text-destructive">{errors.add.message}</p>}
            {newQtyPreview !== null && product && (
              <p className="text-xs text-muted-foreground">
                New stock will be <span className="font-medium text-foreground">{newQtyPreview}</span> units.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={restockMut.isPending}>
              {restockMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
