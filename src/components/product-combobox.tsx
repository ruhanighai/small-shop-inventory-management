import { useState } from 'react';
import { Check, ChevronsUpDown, Search, Package } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useSettingsContext } from '@/hooks/use-settings-context';
import type { Product } from '@/types';

type Props = {
  products: Product[];
  value: string | null;
  onChange: (id: string | null, product?: Product) => void;
  disabled?: boolean;
};

export function ProductCombobox({ products, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettingsContext();
  const selected = products.find((p) => p.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className="truncate">{selected.name}</span>
              <span className="text-muted-foreground text-xs">
                ({selected.quantity} in stock)
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a product...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products..." />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-1 py-4 text-muted-foreground">
                <Package className="h-5 w-5" />
                <span className="text-xs">No products found.</span>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {products.map((product) => {
                const out = product.quantity <= 0;
                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.sku ?? ''}`}
                    onSelect={() => {
                      onChange(product.id === value ? null : product.id, product);
                      setOpen(false);
                    }}
                    disabled={out}
                    className="flex items-center justify-between gap-2"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value === product.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm">{product.name}</span>
                        {product.sku && (
                          <span className="text-xs text-muted-foreground">{product.sku}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-xs',
                            out ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {out ? 'Out of stock' : `${product.quantity} left`}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {formatCurrency(product.price, settings.currency)}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
