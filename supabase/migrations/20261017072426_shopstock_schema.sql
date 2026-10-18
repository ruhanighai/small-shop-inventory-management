/*
# ShopStock — initial schema

Creates the core data model for the ShopStock inventory management app:
products and sales tables, owner-scoped Row Level Security, helper functions
for recording and deleting sales (with stock movement), an updated_at trigger,
and aggregation RPC functions for the dashboard charts.

## 1. New Tables
- `products`  — shop inventory items (name, sku, category, price, cost, qty, threshold)
- `sales`     — sales records with product snapshot, qty, unit price, total, sold_at

## 2. Functions
- record_sale(product_id, quantity, unit_price, sold_at) — atomic stock check + insert + decrement
- delete_sale(sale_id) — restores stock then deletes sale
- set_updated_at() — trigger fn for products.updated_at
- load_demo_data() — seeds ~12 products + ~60 sales for the calling user
- dashboard_revenue_series / top_products / revenue_by_category / kpis — aggregations

## 3. Security
- RLS enabled on products and sales; 4 policies each scoped to auth.uid() = user_id
- SECURITY DEFINER functions executable by authenticated only

## 4. Notes
- SKU uniqueness is per-user via a partial unique index on (user_id, sku)
- Owner columns default to auth.uid() so client inserts omitting user_id still pass WITH CHECK
*/

create extension if not exists "pgcrypto";

-- products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  price numeric(10,2) not null default 0 check (price >= 0),
  cost_price numeric(10,2) check (cost_price is null or cost_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products enable row level security;

drop index if exists products_user_sku_idx;
create unique index products_user_sku_idx
  on products(user_id, sku)
  where sku is not null and sku <> '';

drop index if exists products_user_id_idx;
create index products_user_id_idx on products(user_id);

drop policy if exists "select_own_products" on products;
create policy "select_own_products" on products for select
  to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_products" on products;
create policy "insert_own_products" on products for insert
  to authenticated with check (auth.uid() = user_id);
drop policy if exists "update_own_products" on products;
create policy "update_own_products" on products for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete_own_products" on products;
create policy "delete_own_products" on products for delete
  to authenticated using (auth.uid() = user_id);

-- sales
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total numeric(10,2) not null,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table sales enable row level security;

drop index if exists sales_user_id_idx;
create index sales_user_id_idx on sales(user_id);
drop index if exists sales_sold_at_idx;
create index sales_sold_at_idx on sales(user_id, sold_at desc);
drop index if exists sales_product_id_idx;
create index sales_product_id_idx on sales(product_id);

drop policy if exists "select_own_sales" on sales;
create policy "select_own_sales" on sales for select
  to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_sales" on sales;
create policy "insert_own_sales" on sales for insert
  to authenticated with check (auth.uid() = user_id);
drop policy if exists "update_own_sales" on sales;
create policy "update_own_sales" on sales for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete_own_sales" on sales;
create policy "delete_own_sales" on sales for delete
  to authenticated using (auth.uid() = user_id);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- record_sale
create or replace function record_sale(
  p_product_id uuid,
  p_quantity integer,
  p_unit_price numeric(10,2),
  p_sold_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_product products%rowtype;
  v_total numeric(10,2);
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be signed in to record a sale.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than 0.';
  end if;
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'Unit price must be 0 or greater.';
  end if;

  select * into v_product from products where id = p_product_id and user_id = v_uid;
  if not found then
    raise exception 'Product not found.';
  end if;

  if v_product.quantity < p_quantity then
    raise exception 'Insufficient stock. Available: %, requested: %.',
      v_product.quantity, p_quantity;
  end if;

  v_total := round((p_quantity * p_unit_price)::numeric, 2);

  insert into sales (user_id, product_id, product_name, quantity, unit_price, total, sold_at)
  values (v_uid, p_product_id, v_product.name, p_quantity, p_unit_price, v_total, coalesce(p_sold_at, now()))
  returning id into v_sale_id;

  update products
    set quantity = quantity - p_quantity
    where id = p_product_id and user_id = v_uid;

  return v_sale_id;
end;
$$;

-- delete_sale (restores stock)
create or replace function delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale sales%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be signed in to delete a sale.';
  end if;

  select * into v_sale from sales where id = p_sale_id and user_id = v_uid;
  if not found then
    raise exception 'Sale not found.';
  end if;

  if v_sale.product_id is not null then
    update products
      set quantity = quantity + v_sale.quantity
      where id = v_sale.product_id and user_id = v_uid;
  end if;

  delete from sales where id = p_sale_id and user_id = v_uid;
end;
$$;

grant execute on function record_sale(uuid, integer, numeric, timestamptz) to authenticated;
grant execute on function delete_sale(uuid) to authenticated;

-- load_demo_data
create or replace function load_demo_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_product_ids uuid[];
  v_i integer;
  v_qty integer;
  v_price numeric(10,2);
  v_day integer;
  v_sold_at timestamptz;
  v_prod integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in to load demo data.';
  end if;

  delete from sales where user_id = v_uid;
  delete from products where user_id = v_uid;

  insert into products (user_id, name, sku, category, price, cost_price, quantity, low_stock_threshold)
  values
    (v_uid, 'Cotton T-Shirt',      'SKU-001', 'Apparel',      499.00, 220.00, 24, 5),
    (v_uid, 'Denim Jeans',         'SKU-002', 'Apparel',      1299.00, 620.00, 7, 5),
    (v_uid, 'Running Shoes',       'SKU-003', 'Footwear',     1899.00, 950.00, 12, 4),
    (v_uid, 'Leather Wallet',      'SKU-004', 'Accessories',  699.00, 280.00, 3, 5),
    (v_uid, 'Wireless Earbuds',    'SKU-005', 'Electronics',  2499.00, 1400.00, 18, 6),
    (v_uid, 'Phone Charger',       'SKU-006', 'Electronics',  349.00, 120.00, 40, 10),
    (v_uid, 'Backpack',            'SKU-007', 'Accessories',  1099.00, 540.00, 0, 5),
    (v_uid, 'Coffee Mug',          'SKU-008', 'Home',         199.00, 70.00, 30, 8),
    (v_uid, 'Water Bottle',        'SKU-009', 'Home',         299.00, 110.00, 22, 6),
    (v_uid, 'Notebook',            'SKU-010', 'Stationery',   89.00, 35.00, 55, 15),
    (v_uid, 'Pen Set',             'SKU-011', 'Stationery',   149.00, 60.00, 4, 8),
    (v_uid, 'Sunglasses',          'SKU-012', 'Accessories',  899.00, 380.00, 9, 4)
  returning id into v_product_ids;

  for v_i in 1..60 loop
    v_day := floor(random() * 30)::int;
    v_prod := floor(random() * 12)::int + 1;
    v_qty := floor(random() * 4)::int + 1;
    v_sold_at := now() - (v_day || ' days')::interval - (floor(random()*24)::int || ' hours')::interval;
    select price into v_price from products where id = v_product_ids[v_prod] and user_id = v_uid;
    insert into sales (user_id, product_id, product_name, quantity, unit_price, total, sold_at)
    values (v_uid, v_product_ids[v_prod],
            (select name from products where id = v_product_ids[v_prod]),
            v_qty, v_price, round((v_qty * v_price)::numeric, 2), v_sold_at);
    update products set quantity = greatest(quantity - v_qty, 0)
      where id = v_product_ids[v_prod] and user_id = v_uid;
  end loop;

  return 12;
end;
$$;

grant execute on function load_demo_data() to authenticated;

-- Aggregation RPC functions
create or replace function dashboard_revenue_series(p_range_days int default 30)
returns table(day date, revenue numeric, units integer)
language sql security definer set search_path = public as $$
  select date_trunc('day', sold_at at time zone 'utc')::date as day,
         round(sum(total)::numeric, 2) as revenue,
         sum(quantity)::int as units
  from sales
  where user_id = auth.uid()
    and sold_at >= now() - ((coalesce(p_range_days,30)) || ' days')::interval
  group by day
  order by day;
$$;

create or replace function dashboard_top_products(p_range_days int default 30, p_limit int default 5)
returns table(product_id uuid, product_name text, units integer, revenue numeric)
language sql security definer set search_path = public as $$
  select product_id,
         max(product_name) as product_name,
         sum(quantity)::int as units,
         round(sum(total)::numeric, 2) as revenue
  from sales
  where user_id = auth.uid()
    and sold_at >= now() - ((coalesce(p_range_days,30)) || ' days')::interval
  group by product_id
  order by units desc
  limit coalesce(p_limit, 5);
$$;

create or replace function dashboard_revenue_by_category(p_range_days int default 30)
returns table(category text, revenue numeric, units integer)
language sql security definer set search_path = public as $$
  select coalesce(p.category, 'Uncategorized') as category,
         round(sum(s.total)::numeric, 2) as revenue,
         sum(s.quantity)::int as units
  from sales s
  left join products p on p.id = s.product_id
  where s.user_id = auth.uid()
    and s.sold_at >= now() - ((coalesce(p_range_days,30)) || ' days')::interval
  group by category
  order by revenue desc;
$$;

create or replace function dashboard_kpis(p_range_days int default 30)
returns table(today_revenue numeric, range_revenue numeric, total_products integer, low_stock_count integer)
language sql security definer set search_path = public as $$
  with r as (
    select
      coalesce(sum(total) filter (where sold_at >= date_trunc('day', now())), 0)::numeric as today_revenue,
      coalesce(sum(total) filter (where sold_at >= now() - ((coalesce(p_range_days,30)) || ' days')::interval), 0)::numeric as range_revenue
    from sales where user_id = auth.uid()
  ),
  p as (
    select count(*)::int as total_products,
           count(*) filter (where quantity <= low_stock_threshold)::int as low_stock_count
    from products where user_id = auth.uid()
  )
  select round(r.today_revenue, 2), round(r.range_revenue, 2), p.total_products, p.low_stock_count
  from r, p;
$$;

grant execute on function dashboard_revenue_series(int) to authenticated;
grant execute on function dashboard_top_products(int, int) to authenticated;
grant execute on function dashboard_revenue_by_category(int) to authenticated;
grant execute on function dashboard_kpis(int) to authenticated;
