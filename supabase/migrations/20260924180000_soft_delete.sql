-- Recoverable deletes and audit columns for financial rows.
-- created_at is epoch milliseconds, matching the Watermelon number column.

alter table public.vegetable_sales
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

alter table public.vegetable_sale_items
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

alter table public.expenses
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

alter table public.customer_ledger_entries
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

alter table public.flour_transactions
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

alter table public.flour_items
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

alter table public.milk_entries
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

alter table public.partner_payments
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

alter table public.partner_settlements
  add column if not exists is_deleted boolean not null default false,
  add column if not exists created_at double precision not null default 0,
  add column if not exists created_by text;

update public.vegetable_sales set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;
update public.vegetable_sale_items set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;
update public.expenses set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;
update public.customer_ledger_entries set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;
update public.flour_transactions set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;
update public.flour_items set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;
update public.milk_entries set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;
update public.partner_payments set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;
update public.partner_settlements set created_at = extract(epoch from updated_at) * 1000, created_by = coalesce(created_by, 'owner') where created_at = 0;

create index if not exists customers_name_idx on public.customers (name);
create index if not exists grain_masters_name_idx on public.grain_masters (name);
create index if not exists vegetable_masters_name_idx on public.vegetable_masters (name);
create index if not exists customer_ledger_entries_customer_date_idx on public.customer_ledger_entries (customer_id, date);
create index if not exists flour_transactions_customer_date_idx on public.flour_transactions (customer_id, date);
create index if not exists flour_items_grain_idx on public.flour_items (grain_id);
create index if not exists vegetable_sales_date_idx on public.vegetable_sales (date);
create index if not exists milk_entries_date_idx on public.milk_entries (date);
create index if not exists expenses_date_idx on public.expenses (date);
create index if not exists vegetable_sales_is_deleted_idx on public.vegetable_sales (is_deleted);
create index if not exists expenses_is_deleted_idx on public.expenses (is_deleted);
create index if not exists customer_ledger_entries_is_deleted_idx on public.customer_ledger_entries (is_deleted);
create index if not exists flour_transactions_is_deleted_idx on public.flour_transactions (is_deleted);
create index if not exists milk_entries_is_deleted_idx on public.milk_entries (is_deleted);
create index if not exists partner_payments_is_deleted_idx on public.partner_payments (is_deleted);
