import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getStockStatus, stockStatusLabel } from '@/lib/format';

export function StockStatusBadge({ quantity, threshold }: { quantity: number; threshold: number }) {
  const status = getStockStatus(quantity, threshold);
  const label = stockStatusLabel(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-medium',
        status === 'in-stock' &&
          'border-success/30 bg-success/10 text-success',
        status === 'low-stock' &&
          'border-warning/30 bg-warning/10 text-warning',
        status === 'out-of-stock' &&
          'border-destructive/30 bg-destructive/10 text-destructive'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'in-stock' && 'bg-success',
          status === 'low-stock' && 'bg-warning',
          status === 'out-of-stock' && 'bg-destructive'
        )}
      />
      {label}
    </Badge>
  );
}
