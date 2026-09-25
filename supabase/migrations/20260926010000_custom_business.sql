-- User-defined businesses, products, bulk moves, spends, partner scopes, and collaborators.
-- Apply after 20260926000000_partner_business.sql.

alter table public.businesses add column if not exists tracking text not null default 'resale';
alter table public.businesses add column if not exists buys boolean not null default true;
alter table public.businesses add column if not exists produces boolean not null default false;
alter table public.businesses add column if not exists sells boolean not null default true;
alter table public.businesses add column if not exists tracks_credit boolean not null default true;
alter table public.businesses add column if not exists tracks_billing boolean not null default true;

create table public.catalog_products (
  id text primary key,
  business_id text not null,
  name text not null,
  unit text not null,
  kind text not null,
  active boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.product_moves (
  id text primary key,
  date double precision not null,
  business_id text not null,
  product_id text not null,
  direction text not null,
  quantity double precision not null,
  unit text not null,
  amount double precision not null,
  paid_amount double precision not null,
  customer_id text,
  notes text,
  is_deleted boolean not null default false,
  created_at double precision not null default 0,
  created_by text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.business_expenses (
  id text primary key,
  date double precision not null,
  business_id text not null,
  kind text not null,
  amount double precision not null,
  notes text,
  is_deleted boolean not null default false,
  created_at double precision not null default 0,
  created_by text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.partner_scopes (
  id text primary key,
  partner_id text not null,
  business_id text not null,
  product_id text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.collaborators (
  id text primary key,
  name text not null,
  phone text not null,
  business_id text not null,
  product_id text,
  active boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

alter table public.catalog_products enable row level security;
alter table public.catalog_products force row level security;
create policy catalog_products_select on public.catalog_products
for select to authenticated
using (owner_id = auth.uid());
create policy catalog_products_insert on public.catalog_products
for insert to authenticated
with check (owner_id = auth.uid());
create policy catalog_products_update on public.catalog_products
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy catalog_products_delete on public.catalog_products
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.catalog_products to authenticated;

alter table public.product_moves enable row level security;
alter table public.product_moves force row level security;
create policy product_moves_select on public.product_moves
for select to authenticated
using (owner_id = auth.uid());
create policy product_moves_insert on public.product_moves
for insert to authenticated
with check (owner_id = auth.uid());
create policy product_moves_update on public.product_moves
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy product_moves_delete on public.product_moves
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.product_moves to authenticated;

alter table public.business_expenses enable row level security;
alter table public.business_expenses force row level security;
create policy business_expenses_select on public.business_expenses
for select to authenticated
using (owner_id = auth.uid());
create policy business_expenses_insert on public.business_expenses
for insert to authenticated
with check (owner_id = auth.uid());
create policy business_expenses_update on public.business_expenses
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy business_expenses_delete on public.business_expenses
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.business_expenses to authenticated;

alter table public.partner_scopes enable row level security;
alter table public.partner_scopes force row level security;
create policy partner_scopes_select on public.partner_scopes
for select to authenticated
using (owner_id = auth.uid());
create policy partner_scopes_insert on public.partner_scopes
for insert to authenticated
with check (owner_id = auth.uid());
create policy partner_scopes_update on public.partner_scopes
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy partner_scopes_delete on public.partner_scopes
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.partner_scopes to authenticated;

alter table public.collaborators enable row level security;
alter table public.collaborators force row level security;
create policy collaborators_select on public.collaborators
for select to authenticated
using (owner_id = auth.uid());
create policy collaborators_insert on public.collaborators
for insert to authenticated
with check (owner_id = auth.uid());
create policy collaborators_update on public.collaborators
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy collaborators_delete on public.collaborators
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.collaborators to authenticated;

drop trigger if exists catalog_products_assign_owner on public.catalog_products;
create trigger catalog_products_assign_owner
before insert or update on public.catalog_products
for each row execute function public.assign_owner();

drop trigger if exists product_moves_assign_owner on public.product_moves;
create trigger product_moves_assign_owner
before insert or update on public.product_moves
for each row execute function public.assign_owner();

drop trigger if exists business_expenses_assign_owner on public.business_expenses;
create trigger business_expenses_assign_owner
before insert or update on public.business_expenses
for each row execute function public.assign_owner();

drop trigger if exists partner_scopes_assign_owner on public.partner_scopes;
create trigger partner_scopes_assign_owner
before insert or update on public.partner_scopes
for each row execute function public.assign_owner();

drop trigger if exists collaborators_assign_owner on public.collaborators;
create trigger collaborators_assign_owner
before insert or update on public.collaborators
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
    'partner_payments',
    'partner_settlements',
    'stock_movements',
    'catalog_products',
    'product_moves',
    'business_expenses',
    'partner_scopes',
    'collaborators',
    'backup_records'
  ];
$$;
