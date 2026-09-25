-- Own grain and finished flour stock. Separate from flour bills and udhari.
-- Apply after 20260924200000_roles.sql so assistant policies can use acting_owner().

create table public.stock_movements (
  id text primary key,
  date double precision not null,
  kind text not null,
  grain_id text not null,
  direction text not null,
  quantity double precision not null,
  unit text not null,
  notes text,
  is_deleted boolean not null default false,
  created_at double precision not null default 0,
  created_by text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create index stock_movements_grain on public.stock_movements (grain_id, kind);
create index stock_movements_date on public.stock_movements (date);

alter table public.stock_movements enable row level security;
alter table public.stock_movements force row level security;
create policy stock_movements_select on public.stock_movements
for select to authenticated
using (owner_id = auth.uid());
create policy stock_movements_insert on public.stock_movements
for insert to authenticated
with check (owner_id = auth.uid());
create policy stock_movements_update on public.stock_movements
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy stock_movements_delete on public.stock_movements
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.stock_movements to authenticated;

drop trigger if exists stock_movements_assign_owner on public.stock_movements;
create trigger stock_movements_assign_owner
before insert or update on public.stock_movements
for each row execute function public.assign_owner();

create policy stock_movements_select_assistant on public.stock_movements
for select to authenticated
using (owner_id = public.acting_owner() and public.is_assistant());
create policy stock_movements_insert_assistant on public.stock_movements
for insert to authenticated
with check (owner_id = public.acting_owner() and public.is_assistant());
create policy stock_movements_update_assistant on public.stock_movements
for update to authenticated
using (owner_id = public.acting_owner() and public.is_assistant())
with check (owner_id = public.acting_owner() and public.is_assistant());

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
    'backup_records'
  ];
$$;
