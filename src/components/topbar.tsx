import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAllProductsForAlerts } from '@/hooks/use-products';
import { getStockStatus } from '@/lib/format';
import { useSettingsContext } from '@/hooks/use-settings-context';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/sales': 'Sales',
  '/settings': 'Settings',
};

export function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: products } = useAllProductsForAlerts();
  const { settings, update } = useSettingsContext();

  const lowStockCount = (products ?? []).filter(
    (p) => getStockStatus(p.quantity, p.low_stock_threshold) !== 'in-stock'
  ).length;

  const path = location.pathname;
  const title = PAGE_TITLES[path] || (path.startsWith('/products') ? 'Products' : 'ShopStock');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <div className="flex items-center gap-3 pl-10 lg:pl-0">
        <h1 className="text-base font-semibold tracking-tight lg:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/products?filter=low-stock')}
          aria-label={`Low stock alerts: ${lowStockCount}`}
        >
          <Bell className="h-4 w-4" />
          {lowStockCount > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
                lowStockCount > 0 ? 'bg-destructive' : 'bg-muted-foreground'
              )}
            >
              {lowStockCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
