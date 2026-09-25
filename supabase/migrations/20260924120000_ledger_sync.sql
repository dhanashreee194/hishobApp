-- Maza Hishob cloud mirror of the WatermelonDB schema (src/db/schema.ts).
-- Apply in the Supabase SQL editor, or `supabase db push`.
-- Then enable Phone auth (Authentication → Providers → Phone).
--
-- Every business column matches the local table. Three columns are added so
-- sync and backup can be scoped and reconciled:
--   owner_id   the signed-in user (Row Level Security)
--   updated_at last-write-wins clock
--   deleted_at tombstone for the sync protocol's deleted ids
--
-- The client keeps working with no network. These functions are only called
-- while a session exists.

create or replace function public.assign_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.owner_id := auth.uid();
    else
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end;
$$;

create table public.businesses (
  id text primary key,
  name text not null,
  type text not null,
  active boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.users (
  id text primary key,
  name text not null,
  phone text not null,
  role text not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.vegetable_masters (
  id text primary key,
  name text not null,
  default_unit text not null,
  active boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.grain_masters (
  id text primary key,
  name text not null,
  default_unit text not null,
  active boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.rate_histories (
  id text primary key,
  master_type text not null,
  item_id text not null,
  rate double precision not null,
  effective_from double precision not null,
  effective_to double precision,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.vegetable_sales (
  id text primary key,
  date double precision not null,
  ownership_type text not null,
  total_amount double precision not null,
  notes text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.vegetable_sale_items (
  id text primary key,
  sale_id text not null,
  vegetable_id text not null,
  quantity double precision not null,
  unit text not null,
  sale_amount double precision not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.expense_categories (
  id text primary key,
  name text not null,
  business_type text not null,
  category_group text not null,
  active boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.expenses (
  id text primary key,
  date double precision not null,
  business_type text not null,
  category_id text,
  amount double precision not null,
  allocation_type text not null,
  notes text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.customers (
  id text primary key,
  name text not null,
  mobile text,
  address text,
  active boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.customer_ledger_entries (
  id text primary key,
  customer_id text not null,
  date double precision not null,
  type text not null,
  amount double precision not null,
  business_type text not null,
  reference_id text,
  notes text,
  payment_mode text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.flour_transactions (
  id text primary key,
  date double precision not null,
  customer_id text,
  total_amount double precision not null,
  paid_amount double precision not null,
  pending_amount double precision not null,
  notes text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.flour_items (
  id text primary key,
  transaction_id text not null,
  grain_id text not null,
  quantity double precision not null,
  unit text not null,
  applied_rate double precision not null,
  amount double precision not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.milk_entries (
  id text primary key,
  date double precision not null,
  supplier_id_or_name text not null,
  quantity_litres double precision not null,
  applied_rate double precision not null,
  amount double precision not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.partners (
  id text primary key,
  name text not null,
  share_percent double precision not null,
  active boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.partner_payments (
  id text primary key,
  partner_id text not null,
  date double precision not null,
  amount double precision not null,
  notes text,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.partner_settlements (
  id text primary key,
  period text not null,
  shared_sales double precision not null,
  shared_expenses double precision not null,
  net_shared double precision not null,
  partner_share double precision not null,
  paid double precision not null,
  remaining double precision not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create table public.backup_records (
  id text primary key,
  created_at double precision not null,
  file_name text not null,
  size double precision not null,
  checksum text not null,
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  owner_id uuid not null
);

create index businesses_owner_updated_idx on public.businesses (owner_id, updated_at);
create index users_owner_updated_idx on public.users (owner_id, updated_at);
create index vegetable_masters_owner_updated_idx on public.vegetable_masters (owner_id, updated_at);
create index grain_masters_owner_updated_idx on public.grain_masters (owner_id, updated_at);
create index rate_histories_owner_updated_idx on public.rate_histories (owner_id, updated_at);
create index vegetable_sales_owner_updated_idx on public.vegetable_sales (owner_id, updated_at);
create index vegetable_sale_items_owner_updated_idx on public.vegetable_sale_items (owner_id, updated_at);
create index expense_categories_owner_updated_idx on public.expense_categories (owner_id, updated_at);
create index expenses_owner_updated_idx on public.expenses (owner_id, updated_at);
create index customers_owner_updated_idx on public.customers (owner_id, updated_at);
create index customer_ledger_entries_owner_updated_idx on public.customer_ledger_entries (owner_id, updated_at);
create index flour_transactions_owner_updated_idx on public.flour_transactions (owner_id, updated_at);
create index flour_items_owner_updated_idx on public.flour_items (owner_id, updated_at);
create index milk_entries_owner_updated_idx on public.milk_entries (owner_id, updated_at);
create index partners_owner_updated_idx on public.partners (owner_id, updated_at);
create index partner_payments_owner_updated_idx on public.partner_payments (owner_id, updated_at);
create index partner_settlements_owner_updated_idx on public.partner_settlements (owner_id, updated_at);
create index backup_records_owner_updated_idx on public.backup_records (owner_id, updated_at);

create trigger businesses_assign_owner before insert or update on public.businesses
for each row execute function public.assign_owner();
create trigger users_assign_owner before insert or update on public.users
for each row execute function public.assign_owner();
create trigger vegetable_masters_assign_owner before insert or update on public.vegetable_masters
for each row execute function public.assign_owner();
create trigger grain_masters_assign_owner before insert or update on public.grain_masters
for each row execute function public.assign_owner();
create trigger rate_histories_assign_owner before insert or update on public.rate_histories
for each row execute function public.assign_owner();
create trigger vegetable_sales_assign_owner before insert or update on public.vegetable_sales
for each row execute function public.assign_owner();
create trigger vegetable_sale_items_assign_owner before insert or update on public.vegetable_sale_items
for each row execute function public.assign_owner();
create trigger expense_categories_assign_owner before insert or update on public.expense_categories
for each row execute function public.assign_owner();
create trigger expenses_assign_owner before insert or update on public.expenses
for each row execute function public.assign_owner();
create trigger customers_assign_owner before insert or update on public.customers
for each row execute function public.assign_owner();
create trigger customer_ledger_entries_assign_owner before insert or update on public.customer_ledger_entries
for each row execute function public.assign_owner();
create trigger flour_transactions_assign_owner before insert or update on public.flour_transactions
for each row execute function public.assign_owner();
create trigger flour_items_assign_owner before insert or update on public.flour_items
for each row execute function public.assign_owner();
create trigger milk_entries_assign_owner before insert or update on public.milk_entries
for each row execute function public.assign_owner();
create trigger partners_assign_owner before insert or update on public.partners
for each row execute function public.assign_owner();
create trigger partner_payments_assign_owner before insert or update on public.partner_payments
for each row execute function public.assign_owner();
create trigger partner_settlements_assign_owner before insert or update on public.partner_settlements
for each row execute function public.assign_owner();
create trigger backup_records_assign_owner before insert or update on public.backup_records
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
    'backup_records'
  ];
$$;

create or replace function public._sync_literal(p_type text, p_value jsonb)
returns text
language plpgsql
immutable
as $$
declare
  raw text;
begin
  if p_value is null or p_value = 'null'::jsonb then
    return 'null';
  end if;
  if p_type = 'boolean' then
    if jsonb_typeof(p_value) <> 'boolean' then
      raise exception 'bad boolean';
    end if;
    return case when p_value = 'true'::jsonb then 'true' else 'false' end;
  end if;
  if p_type in ('double precision', 'numeric', 'integer', 'bigint', 'real') then
    if jsonb_typeof(p_value) <> 'number' then
      raise exception 'bad number';
    end if;
    raw := p_value #>> '{}';
    if raw !~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then
      raise exception 'bad number';
    end if;
    return raw;
  end if;
  if jsonb_typeof(p_value) <> 'string' then
    raise exception 'bad text';
  end if;
  return quote_nullable(p_value #>> '{}');
end;
$$;

create or replace function public._sync_upsert(p_table text, p_row jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  col record;
  cols text[] := '{}';
  vals text[] := '{}';
  sets text[] := '{}';
  stmt text;
  updated_ms double precision;
  applied int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not p_table = any (public.sync_table_names()) then
    raise exception 'unknown table';
  end if;
  if coalesce(p_row->>'id', '') !~ '^[A-Za-z0-9]{1,32}$' then
    raise exception 'bad id';
  end if;

  updated_ms := coalesce((p_row->>'updated_at')::double precision, 0);
  -- A device clock far ahead would make every later pull replay the row.
  if updated_ms > extract(epoch from clock_timestamp()) * 1000 + 120000 then
    updated_ms := extract(epoch from clock_timestamp()) * 1000;
  end if;

  for col in
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table
      and column_name <> 'deleted_at'
    order by ordinal_position
  loop
    cols := cols || quote_ident(col.column_name);
    if col.column_name = 'owner_id' then
      vals := vals || 'auth.uid()';
    elsif col.column_name = 'updated_at' then
      vals := vals || format('to_timestamp(%s / 1000.0)', updated_ms);
    elsif col.column_name = 'id' then
      vals := vals || format('%L', p_row->>'id');
    else
      vals := vals || public._sync_literal(col.data_type, p_row -> (col.column_name));
    end if;
    if col.column_name not in ('id', 'owner_id') then
      sets := sets || format('%I = excluded.%I', col.column_name, col.column_name);
    end if;
  end loop;

  stmt := format(
    'insert into public.%I (%s) values (%s)
     on conflict (id) do update set %s
     where public.%I.owner_id = auth.uid()
       and public.%I.updated_at <= excluded.updated_at',
    p_table,
    array_to_string(cols, ', '),
    array_to_string(vals, ', '),
    array_to_string(sets, ', '),
    p_table,
    p_table
  );
  execute stmt;
  get diagnostics applied = row_count;
  return applied > 0;
end;
$$;

create or replace function public.pull_changes(last_pulled_at bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  since_ts timestamptz;
  now_ts timestamptz := clock_timestamp();
  now_ms bigint := floor(extract(epoch from now_ts) * 1000)::bigint;
  changes jsonb := '{}'::jsonb;
  updated_rows jsonb;
  deleted_ids jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  since_ts := to_timestamp(coalesce(last_pulled_at, 0) / 1000.0);

  foreach t in array public.sync_table_names()
  loop
    execute format(
      'select coalesce(jsonb_agg(
          (to_jsonb(r) - ''owner_id'' - ''deleted_at'' - ''updated_at'')
          || jsonb_build_object(
            ''updated_at'',
            floor(extract(epoch from r.updated_at) * 1000)::bigint
          )
        ), ''[]''::jsonb)
       from public.%I r
       where r.owner_id = auth.uid()
         and r.deleted_at is null
         and r.updated_at > $1
         and r.updated_at <= $2',
      t
    ) into updated_rows using since_ts, now_ts;

    execute format(
      'select coalesce(jsonb_agg(r.id), ''[]''::jsonb)
       from public.%I r
       where r.owner_id = auth.uid()
         and r.deleted_at is not null
         and r.deleted_at > $1
         and r.deleted_at <= $2',
      t
    ) into deleted_ids using since_ts, now_ts;

    changes := changes || jsonb_build_object(
      t,
      jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', updated_rows,
        'deleted', deleted_ids
      )
    );
  end loop;

  return jsonb_build_object('timestamp', now_ms, 'changes', changes);
end;
$$;

create or replace function public.push_changes(changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  rowj jsonb;
  del_id text;
  rejected jsonb := '{}'::jsonb;
  applied boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_typeof(changes) <> 'object' then
    raise exception 'changes must be an object';
  end if;

  foreach t in array public.sync_table_names()
  loop
    for rowj in
      select value
      from jsonb_array_elements(coalesce(changes -> t -> 'created', '[]'::jsonb))
      union all
      select value
      from jsonb_array_elements(coalesce(changes -> t -> 'updated', '[]'::jsonb))
    loop
      applied := public._sync_upsert(t, rowj);
      if not applied then
        rejected := jsonb_set(
          rejected,
          array[t],
          coalesce(rejected -> t, '[]'::jsonb) || to_jsonb(rowj->>'id'),
          true
        );
      end if;
    end loop;

    for del_id in
      select value
      from jsonb_array_elements_text(coalesce(changes -> t -> 'deleted', '[]'::jsonb))
    loop
      if del_id !~ '^[A-Za-z0-9]{1,32}$' then
        raise exception 'bad id';
      end if;
      execute format(
        'update public.%I
            set deleted_at = clock_timestamp(),
                updated_at = clock_timestamp()
          where id = $1
            and owner_id = auth.uid()
            and deleted_at is null
            and updated_at <= clock_timestamp()',
        t
      ) using del_id;
      if not found then
        rejected := jsonb_set(
          rejected,
          array[t],
          coalesce(rejected -> t, '[]'::jsonb) || to_jsonb(del_id),
          true
        );
      end if;
    end loop;
  end loop;

  return jsonb_build_object('rejected', rejected);
end;
$$;

revoke all on function public.assign_owner() from public, anon, authenticated;
revoke all on function public._sync_literal(text, jsonb) from public, anon, authenticated;
revoke all on function public._sync_upsert(text, jsonb) from public, anon, authenticated;
revoke all on function public.sync_table_names() from public, anon, authenticated;
revoke all on function public.pull_changes(bigint) from public, anon;
revoke all on function public.push_changes(jsonb) from public, anon;
create or replace function public.restore_snapshot(snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  rowj jsonb;
  now_ms double precision := floor(extract(epoch from clock_timestamp()) * 1000);
  stamped jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(snapshot->>'version', '') <> '1' then
    raise exception 'unknown backup version';
  end if;

  foreach t in array public.sync_table_names()
  loop
    execute format(
      'update public.%I
          set deleted_at = to_timestamp($1 / 1000.0),
              updated_at = to_timestamp($1 / 1000.0)
        where owner_id = auth.uid()
          and deleted_at is null',
      t
    ) using now_ms;

    for rowj in
      select value
      from jsonb_array_elements(coalesce(snapshot -> 'tables' -> t, '[]'::jsonb))
    loop
      stamped := rowj || jsonb_build_object('updated_at', now_ms + 1);
      if not public._sync_upsert(t, stamped) then
        raise exception 'restore rejected a row';
      end if;
      execute format(
        'update public.%I
            set deleted_at = null
          where id = $1
            and owner_id = auth.uid()',
        t
      ) using rowj->>'id';
    end loop;
  end loop;
end;
$$;

revoke all on function public.restore_snapshot(jsonb) from public, anon;
grant execute on function public.pull_changes(bigint) to authenticated;
grant execute on function public.push_changes(jsonb) to authenticated;
grant execute on function public.restore_snapshot(jsonb) to authenticated;

-- Security-definer helpers are called by push/pull, which already require auth.uid().
grant execute on function public.sync_table_names() to authenticated;
grant execute on function public._sync_literal(text, jsonb) to authenticated;
grant execute on function public._sync_upsert(text, jsonb) to authenticated;

alter table public.businesses enable row level security;
alter table public.businesses force row level security;
create policy businesses_select on public.businesses
for select to authenticated
using (owner_id = auth.uid());
create policy businesses_insert on public.businesses
for insert to authenticated
with check (owner_id = auth.uid());
create policy businesses_update on public.businesses
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy businesses_delete on public.businesses
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.businesses to authenticated;
alter table public.users enable row level security;
alter table public.users force row level security;
create policy users_select on public.users
for select to authenticated
using (owner_id = auth.uid());
create policy users_insert on public.users
for insert to authenticated
with check (owner_id = auth.uid());
create policy users_update on public.users
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy users_delete on public.users
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.users to authenticated;
alter table public.vegetable_masters enable row level security;
alter table public.vegetable_masters force row level security;
create policy vegetable_masters_select on public.vegetable_masters
for select to authenticated
using (owner_id = auth.uid());
create policy vegetable_masters_insert on public.vegetable_masters
for insert to authenticated
with check (owner_id = auth.uid());
create policy vegetable_masters_update on public.vegetable_masters
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy vegetable_masters_delete on public.vegetable_masters
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.vegetable_masters to authenticated;
alter table public.grain_masters enable row level security;
alter table public.grain_masters force row level security;
create policy grain_masters_select on public.grain_masters
for select to authenticated
using (owner_id = auth.uid());
create policy grain_masters_insert on public.grain_masters
for insert to authenticated
with check (owner_id = auth.uid());
create policy grain_masters_update on public.grain_masters
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy grain_masters_delete on public.grain_masters
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.grain_masters to authenticated;
alter table public.rate_histories enable row level security;
alter table public.rate_histories force row level security;
create policy rate_histories_select on public.rate_histories
for select to authenticated
using (owner_id = auth.uid());
create policy rate_histories_insert on public.rate_histories
for insert to authenticated
with check (owner_id = auth.uid());
create policy rate_histories_update on public.rate_histories
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy rate_histories_delete on public.rate_histories
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.rate_histories to authenticated;
alter table public.vegetable_sales enable row level security;
alter table public.vegetable_sales force row level security;
create policy vegetable_sales_select on public.vegetable_sales
for select to authenticated
using (owner_id = auth.uid());
create policy vegetable_sales_insert on public.vegetable_sales
for insert to authenticated
with check (owner_id = auth.uid());
create policy vegetable_sales_update on public.vegetable_sales
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy vegetable_sales_delete on public.vegetable_sales
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.vegetable_sales to authenticated;
alter table public.vegetable_sale_items enable row level security;
alter table public.vegetable_sale_items force row level security;
create policy vegetable_sale_items_select on public.vegetable_sale_items
for select to authenticated
using (owner_id = auth.uid());
create policy vegetable_sale_items_insert on public.vegetable_sale_items
for insert to authenticated
with check (owner_id = auth.uid());
create policy vegetable_sale_items_update on public.vegetable_sale_items
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy vegetable_sale_items_delete on public.vegetable_sale_items
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.vegetable_sale_items to authenticated;
alter table public.expense_categories enable row level security;
alter table public.expense_categories force row level security;
create policy expense_categories_select on public.expense_categories
for select to authenticated
using (owner_id = auth.uid());
create policy expense_categories_insert on public.expense_categories
for insert to authenticated
with check (owner_id = auth.uid());
create policy expense_categories_update on public.expense_categories
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy expense_categories_delete on public.expense_categories
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.expense_categories to authenticated;
alter table public.expenses enable row level security;
alter table public.expenses force row level security;
create policy expenses_select on public.expenses
for select to authenticated
using (owner_id = auth.uid());
create policy expenses_insert on public.expenses
for insert to authenticated
with check (owner_id = auth.uid());
create policy expenses_update on public.expenses
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy expenses_delete on public.expenses
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.expenses to authenticated;
alter table public.customers enable row level security;
alter table public.customers force row level security;
create policy customers_select on public.customers
for select to authenticated
using (owner_id = auth.uid());
create policy customers_insert on public.customers
for insert to authenticated
with check (owner_id = auth.uid());
create policy customers_update on public.customers
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy customers_delete on public.customers
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.customers to authenticated;
alter table public.customer_ledger_entries enable row level security;
alter table public.customer_ledger_entries force row level security;
create policy customer_ledger_entries_select on public.customer_ledger_entries
for select to authenticated
using (owner_id = auth.uid());
create policy customer_ledger_entries_insert on public.customer_ledger_entries
for insert to authenticated
with check (owner_id = auth.uid());
create policy customer_ledger_entries_update on public.customer_ledger_entries
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy customer_ledger_entries_delete on public.customer_ledger_entries
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.customer_ledger_entries to authenticated;
alter table public.flour_transactions enable row level security;
alter table public.flour_transactions force row level security;
create policy flour_transactions_select on public.flour_transactions
for select to authenticated
using (owner_id = auth.uid());
create policy flour_transactions_insert on public.flour_transactions
for insert to authenticated
with check (owner_id = auth.uid());
create policy flour_transactions_update on public.flour_transactions
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy flour_transactions_delete on public.flour_transactions
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.flour_transactions to authenticated;
alter table public.flour_items enable row level security;
alter table public.flour_items force row level security;
create policy flour_items_select on public.flour_items
for select to authenticated
using (owner_id = auth.uid());
create policy flour_items_insert on public.flour_items
for insert to authenticated
with check (owner_id = auth.uid());
create policy flour_items_update on public.flour_items
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy flour_items_delete on public.flour_items
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.flour_items to authenticated;
alter table public.milk_entries enable row level security;
alter table public.milk_entries force row level security;
create policy milk_entries_select on public.milk_entries
for select to authenticated
using (owner_id = auth.uid());
create policy milk_entries_insert on public.milk_entries
for insert to authenticated
with check (owner_id = auth.uid());
create policy milk_entries_update on public.milk_entries
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy milk_entries_delete on public.milk_entries
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.milk_entries to authenticated;
alter table public.partners enable row level security;
alter table public.partners force row level security;
create policy partners_select on public.partners
for select to authenticated
using (owner_id = auth.uid());
create policy partners_insert on public.partners
for insert to authenticated
with check (owner_id = auth.uid());
create policy partners_update on public.partners
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy partners_delete on public.partners
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.partners to authenticated;
alter table public.partner_payments enable row level security;
alter table public.partner_payments force row level security;
create policy partner_payments_select on public.partner_payments
for select to authenticated
using (owner_id = auth.uid());
create policy partner_payments_insert on public.partner_payments
for insert to authenticated
with check (owner_id = auth.uid());
create policy partner_payments_update on public.partner_payments
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy partner_payments_delete on public.partner_payments
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.partner_payments to authenticated;
alter table public.partner_settlements enable row level security;
alter table public.partner_settlements force row level security;
create policy partner_settlements_select on public.partner_settlements
for select to authenticated
using (owner_id = auth.uid());
create policy partner_settlements_insert on public.partner_settlements
for insert to authenticated
with check (owner_id = auth.uid());
create policy partner_settlements_update on public.partner_settlements
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy partner_settlements_delete on public.partner_settlements
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.partner_settlements to authenticated;
alter table public.backup_records enable row level security;
alter table public.backup_records force row level security;
create policy backup_records_select on public.backup_records
for select to authenticated
using (owner_id = auth.uid());
create policy backup_records_insert on public.backup_records
for insert to authenticated
with check (owner_id = auth.uid());
create policy backup_records_update on public.backup_records
for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy backup_records_delete on public.backup_records
for delete to authenticated
using (owner_id = auth.uid());
grant select, insert, update, delete on public.backup_records to authenticated;

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

create policy backups_select on storage.objects
for select to authenticated
using (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy backups_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy backups_update on storage.objects
for update to authenticated
using (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy backups_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = auth.uid()::text
);
