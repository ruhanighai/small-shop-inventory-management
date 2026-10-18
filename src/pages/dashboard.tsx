import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingBag,
  PackagePlus,
  ArrowRight,
  Calendar,
  BarChart3,
  PieChart as PieIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/empty-state';
import { StockStatusBadge } from '@/components/stock-status-badge';
import {
  useDashboardKpis,
  useRevenueSeries,
  useTopProducts,
  useRevenueByCategory,
} from '@/hooks/use-dashboard';
import { useLowStockProducts, useRestockProduct } from '@/hooks/use-products';
import { useSettingsContext } from '@/hooks/use-settings-context';
import { formatCurrency, formatNumber } from '@/lib/format';
import { RestockDialog } from '@/components/restock-dialog';
import type { Product } from '@/types';

const RANGE_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { settings } = useSettingsContext();
  const [rangeDays, setRangeDays] = useState(30);
  const [seriesMode, setSeriesMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);

  const { data: kpis, isLoading: kpisLoading } = useDashboardKpis(rangeDays);
  const { data: series, isLoading: seriesLoading } = useRevenueSeries(rangeDays);
  const { data: topProducts, isLoading: topLoading } = useTopProducts(rangeDays, 5);
  const { data: categoryRevenue, isLoading: catLoading } = useRevenueByCategory(rangeDays);
  const { data: lowStock, isLoading: lowStockLoading } = useLowStockProducts();

  const kpi = kpis?.[0];

  // Aggregate series into weekly/monthly buckets
  const aggregatedSeries = useMemo(() => {
    if (!series || series.length === 0) return [];
    if (seriesMode === 'daily') return series;

    const buckets = new Map<string, { revenue: number; units: number }>();
    for (const row of series) {
      const d = new Date(row.day);
      let key: string;
      if (seriesMode === 'weekly') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      const existing = buckets.get(key) ?? { revenue: 0, units: 0 };
      existing.revenue += Number(row.revenue);
      existing.units += Number(row.units);
      buckets.set(key, existing);
    }

    return Array.from(buckets.entries())
      .map(([key, val]) => ({
        day: key,
        revenue: Number(val.revenue.toFixed(2)),
        units: val.units,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [series, seriesMode]);

  const topProductsData = (topProducts ?? []).map((p) => ({
    name: p.product_name,
    units: Number(p.units),
    revenue: Number(p.revenue),
  }));

  const categoryData = (categoryRevenue ?? []).map((c) => ({
    name: c.category,
    value: Number(c.revenue),
    units: Number(c.units),
  }));

  const restockMut = useRestockProduct();

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Time range</span>
        </div>
        <Tabs value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
          <TabsList>
            {RANGE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.days} value={String(opt.days)}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Today's revenue"
          value={formatCurrency(kpi?.today_revenue ?? 0, settings.currency)}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={kpisLoading}
          accent="primary"
        />
        <KpiCard
          title={`${rangeDays}d revenue`}
          value={formatCurrency(kpi?.range_revenue ?? 0, settings.currency)}
          icon={<ShoppingBag className="h-4 w-4" />}
          loading={kpisLoading}
          accent="chart2"
        />
        <KpiCard
          title="Total products"
          value={formatNumber(kpi?.total_products ?? 0)}
          icon={<Package className="h-4 w-4" />}
          loading={kpisLoading}
          accent="chart4"
        />
        <KpiCard
          title="Low-stock items"
          value={formatNumber(kpi?.low_stock_count ?? 0)}
          icon={<AlertTriangle className="h-4 w-4" />}
          loading={kpisLoading}
          accent="warning"
        />
      </div>

      {/* Low stock alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Low stock alerts
            </CardTitle>
            <CardDescription>
              Products at or below their threshold, sorted by urgency.
            </CardDescription>
          </div>
          {(lowStock ?? []).length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/products?filter=low-stock')}>
              View all
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {lowStockLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (lowStock ?? []).length === 0 ? (
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title="All products are well stocked"
              description="No items are currently at or below their low-stock threshold."
            />
          ) : (
            <div className="space-y-2">
              {(lowStock ?? []).slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-warning/5 px-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.quantity} in stock · threshold {p.low_stock_threshold}
                      </span>
                    </div>
                    <StockStatusBadge quantity={p.quantity} threshold={p.low_stock_threshold} />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => {
                      setRestockTarget(p);
                      setRestockOpen(true);
                    }}
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    Restock
                  </Button>
                </div>
              ))}
              {(lowStock ?? []).length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/products?filter=low-stock')}
                >
                  See {(lowStock ?? []).length} low-stock products
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Revenue over time
            </CardTitle>
            <CardDescription>Revenue trend for the selected range.</CardDescription>
          </div>
          <Tabs value={seriesMode} onValueChange={(v) => setSeriesMode(v as typeof seriesMode)}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {seriesLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : aggregatedSeries.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-5 w-5" />}
              title="No sales data for this range"
              description="Record sales or load demo data from Settings to see charts here."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={aggregatedSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => {
                    const date = new Date(d);
                    return seriesMode === 'monthly'
                      ? date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
                      : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                  }}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(Number(v), settings.currency).replace(/\.\d+$/, '')}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, settings.currency), 'Revenue']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Two-column charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Top selling products
            </CardTitle>
            <CardDescription>By units sold in the selected range.</CardDescription>
          </CardHeader>
          <CardContent>
            {topLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : topProductsData.length === 0 ? (
              <EmptyState
                icon={<Package className="h-5 w-5" />}
                title="No sales data yet"
                description="Top products will appear here once you record sales."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProductsData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} units`, 'Units sold']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="units" radius={[0, 4, 4, 0]}>
                    {topProductsData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-primary" />
              Revenue by category
            </CardTitle>
            <CardDescription>Share of revenue across product categories.</CardDescription>
          </CardHeader>
          <CardContent>
            {catLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : categoryData.length === 0 ? (
              <EmptyState
                icon={<PieIcon className="h-5 w-5" />}
                title="No category data yet"
                description="Revenue by category will appear here once you record sales."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, props) => [
                      formatCurrency(value, settings.currency),
                      props.payload.name,
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <RestockDialog
        product={restockTarget}
        open={restockOpen}
        onOpenChange={setRestockOpen}
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  loading,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading: boolean;
  accent: 'primary' | 'chart2' | 'chart4' | 'warning';
}) {
  const accentClasses = {
    primary: 'bg-primary/10 text-primary',
    chart2: 'bg-chart-2/10 text-chart-2',
    chart4: 'bg-chart-4/10 text-chart-4',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <Card className="animate-slide-up">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <span className="text-2xl font-semibold tracking-tight">{value}</span>
            )}
          </div>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
