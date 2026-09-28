-- A partner can be limited to products inside the one business already stored on partners.
-- No rows for a partner means the whole business.

create table public.partner_products (
  id text primary key,
  partner_id text not null,
  product_id text not null,
  updated_at double precision not null default 0,
  owner_id uuid not null
);

create index partner_products_partner on public.partner_products (partner_id);
create index partner_products_product on public.partner_products (product_id);

alter table public.partner_products enable row level security;
alter table public.partner_products force row level security;
create policy partner_products_select on public.partner_products
for select to authenticated
using (owner_id = auth.uid());
create policy partner_products_insert on public.partner_products
for insert to authenticated
with check (owner_id = auth.uid());
create policy partner_products_update on public.partner_products
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy partner_products_delete on public.partner_products
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.partner_products to authenticated;

drop trigger if exists partner_products_assign_owner on public.partner_products;
create trigger partner_products_assign_owner
before insert or update on public.partner_products
for each row execute function public.assign_owner();

create or replace function public.sync_table_names()
returns text[]
language sql
immutable
as $$
  select array[
    'businesses',
    'users',
    'vegetable_masters',
    'grain_masters',
    'rate_histories',
    'vegetable_sales',
    'vegetable_sale_items',
    'expense_categories',
    'expenses',
    'customers',
    'customer_ledger_entries',
    'flour_transactions',
    'flour_items',
    'milk_entries',
    'partners',
    'partner_products',
    'partner_payments',
    'partner_settlements',
    'stock_movements',
    'backup_records'
  ];
$$;
