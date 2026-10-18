/*
# Fix load_demo_data: multi-row RETURNING INTO error

The previous version used `INSERT ... RETURNING id INTO v_product_ids` with 12
rows, which fails with P0003 "query returned more than one row" because PL/pgSQL
`INTO` expects a single row. This rewrite inserts products one at a time in a
loop, collecting each id into the array. Function signature unchanged.
*/

create or replace function load_demo_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_product_ids uuid[] := '{}';
  v_pid uuid;
  v_i integer;
  v_qty integer;
  v_price numeric(10,2);
  v_day integer;
  v_sold_at timestamptz;
  v_prod integer;
  v_demo_products text[][] := array[
    ['Cotton T-Shirt',    'SKU-001', 'Apparel',     '499',   '220', '24', '5'],
    ['Denim Jeans',       'SKU-002', 'Apparel',     '1299',  '620', '7',  '5'],
    ['Running Shoes',     'SKU-003', 'Footwear',    '1899',  '950', '12', '4'],
    ['Leather Wallet',    'SKU-004', 'Accessories', '699',   '280', '3',  '5'],
    ['Wireless Earbuds',  'SKU-005', 'Electronics', '2499',  '1400','18', '6'],
    ['Phone Charger',     'SKU-006', 'Electronics', '349',   '120', '40', '10'],
    ['Backpack',          'SKU-007', 'Accessories', '1099',  '540', '0',  '5'],
    ['Coffee Mug',        'SKU-008', 'Home',        '199',   '70',  '30', '8'],
    ['Water Bottle',      'SKU-009', 'Home',        '299',   '110', '22', '6'],
    ['Notebook',          'SKU-010', 'Stationery',  '89',    '35',  '55', '15'],
    ['Pen Set',           'SKU-011', 'Stationery',  '149',   '60',  '4',  '8'],
    ['Sunglasses',        'SKU-012', 'Accessories', '899',   '380', '9',  '4']
  ];
begin
  if v_uid is null then
    raise exception 'You must be signed in to load demo data.';
  end if;

  delete from sales where user_id = v_uid;
  delete from products where user_id = v_uid;

  -- Insert products one at a time, collecting ids into the array
  for v_i in 1..array_length(v_demo_products, 1) loop
    insert into products (user_id, name, sku, category, price, cost_price, quantity, low_stock_threshold)
    values (
      v_uid,
      v_demo_products[v_i][1],
      v_demo_products[v_i][2],
      v_demo_products[v_i][3],
      v_demo_products[v_i][4]::numeric,
      v_demo_products[v_i][5]::numeric,
      v_demo_products[v_i][6]::int,
      v_demo_products[v_i][7]::int
    )
    returning id into v_pid;
    v_product_ids := array_append(v_product_ids, v_pid);
  end loop;

  -- Generate ~60 sales across last 30 days
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

revoke execute on function load_demo_data() from public, anon;
grant execute on function load_demo_data() to authenticated;
