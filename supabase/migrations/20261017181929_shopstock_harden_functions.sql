/*
# Harden ShopStock functions

1. Revoke EXECUTE from the `anon` role on all SECURITY DEFINER functions so
   unauthenticated callers cannot invoke them via the REST API. EXECUTE was
   already granted to `authenticated`; anon had the default PUBLIC grant.
2. Set an explicit `search_path` on the `set_updated_at` trigger function to
   resolve the "mutable search_path" lint warning.

No table or column changes. No data affected.
*/

revoke execute on function record_sale(uuid, integer, numeric, timestamptz) from public, anon;
revoke execute on function delete_sale(uuid) from public, anon;
revoke execute on function load_demo_data() from public, anon;
revoke execute on function dashboard_revenue_series(int) from public, anon;
revoke execute on function dashboard_top_products(int, int) from public, anon;
revoke execute on function dashboard_revenue_by_category(int) from public, anon;
revoke execute on function dashboard_kpis(int) from public, anon;

grant execute on function record_sale(uuid, integer, numeric, timestamptz) to authenticated;
grant execute on function delete_sale(uuid) to authenticated;
grant execute on function load_demo_data() to authenticated;
grant execute on function dashboard_revenue_series(int) to authenticated;
grant execute on function dashboard_top_products(int, int) to authenticated;
grant execute on function dashboard_revenue_by_category(int) to authenticated;
grant execute on function dashboard_kpis(int) to authenticated;

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
