-- Optional owner / assistant access. A user with no membership stays the owner of
-- their own rows, which is the same rule the live app already uses.
-- Apply after the ledger sync migration. Then apply the stock migration.

create table if not exists public.business_members (
  user_id uuid primary key,
  owner_id uuid not null,
  role text not null check (role in ('assistant')),
  created_at timestamptz not null default clock_timestamp()
);

create table if not exists public.assistant_invites (
  owner_id uuid not null,
  phone text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (owner_id, phone)
);

create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  customer_id text not null,
  channel text not null,
  sent_at timestamptz not null default clock_timestamp()
);

create index if not exists reminder_log_recent
  on public.reminder_log (owner_id, customer_id, sent_at);

alter table public.business_members enable row level security;
alter table public.business_members force row level security;
alter table public.assistant_invites enable row level security;
alter table public.assistant_invites force row level security;
alter table public.reminder_log enable row level security;
alter table public.reminder_log force row level security;

drop policy if exists business_members_select on public.business_members;
create policy business_members_select on public.business_members
for select to authenticated
using (user_id = auth.uid() or owner_id = auth.uid());

drop policy if exists assistant_invites_select on public.assistant_invites;
create policy assistant_invites_select on public.assistant_invites
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists reminder_log_select on public.reminder_log;
create policy reminder_log_select on public.reminder_log
for select to authenticated
using (owner_id = auth.uid());

grant select on public.business_members to authenticated;
grant select on public.assistant_invites to authenticated;
grant select on public.reminder_log to authenticated;

create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null then null
    when regexp_replace(p, '\D', '', 'g') ~ '^[0-9]{10}$'
      then '+91' || regexp_replace(p, '\D', '', 'g')
    when regexp_replace(p, '\D', '', 'g') ~ '^91[0-9]{10}$'
      then '+' || regexp_replace(p, '\D', '', 'g')
    else null
  end;
$$;

create or replace function public.is_assistant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where user_id = auth.uid()
      and role = 'assistant'
  );
$$;

create or replace function public.acting_owner()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select owner_id
      from public.business_members
      where user_id = auth.uid()
        and role = 'assistant'
      limit 1
    ),
    auth.uid()
  );
$$;

create or replace function public.assistant_blocked(p_table text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_assistant()
    and p_table = any (array[
      'businesses',
      'users',
      'partners',
      'partner_payments',
      'partner_settlements',
      'backup_records'
    ]);
$$;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_assistant() then 'assistant' else 'owner' end;
$$;

create or replace function public.invite_assistant(phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if public.is_assistant() then
    raise exception 'assistant cannot invite';
  end if;
  normalized := public.normalize_phone(phone);
  if normalized is null then
    raise exception 'bad phone';
  end if;
  insert into public.assistant_invites (owner_id, phone)
  values (auth.uid(), normalized)
  on conflict (owner_id, phone) do nothing;
end;
$$;

create or replace function public.accept_my_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  found uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  normalized := public.normalize_phone(auth.jwt() ->> 'phone');
  if normalized is null then
    return public.my_role();
  end if;
  select owner_id into found
  from public.assistant_invites
  where phone = normalized
    and owner_id <> auth.uid()
  limit 1;
  if found is null then
    return public.my_role();
  end if;
  insert into public.business_members (user_id, owner_id, role)
  values (auth.uid(), found, 'assistant')
  on conflict (user_id) do update
    set owner_id = excluded.owner_id,
        role = 'assistant';
  return 'assistant';
end;
$$;

create or replace function public.assign_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.owner_id := public.acting_owner();
    else
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
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
  was_deleted boolean;
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
  if public.assistant_blocked(p_table) then
    return false;
  end if;

  if public.is_assistant()
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = p_table
         and column_name = 'is_deleted'
     )
     and coalesce(p_row->>'is_deleted', 'false') in ('true', 't')
  then
    execute format('select is_deleted from public.%I where id = $1', p_table)
      into was_deleted
      using p_row->>'id';
    if was_deleted is null or was_deleted = false then
      return false;
    end if;
  end if;

  updated_ms := coalesce((p_row->>'updated_at')::double precision, 0);
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
      vals := vals || 'public.acting_owner()';
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
     where public.%I.owner_id = public.acting_owner()
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
       where r.owner_id = public.acting_owner()
         and r.deleted_at is null
         and r.updated_at > $1
         and r.updated_at <= $2',
      t
    ) into updated_rows using since_ts, now_ts;

    execute format(
      'select coalesce(jsonb_agg(r.id), ''[]''::jsonb)
       from public.%I r
       where r.owner_id = public.acting_owner()
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
      if public.is_assistant() then
        rejected := jsonb_set(
          rejected,
          array[t],
          coalesce(rejected -> t, '[]'::jsonb) || to_jsonb(del_id),
          true
        );
        continue;
      end if;
      execute format(
        'update public.%I
            set deleted_at = clock_timestamp(),
                updated_at = clock_timestamp()
          where id = $1
            and owner_id = public.acting_owner()
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
  if public.is_assistant() then
    raise exception 'assistant cannot restore';
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
        where owner_id = public.acting_owner()
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
            and owner_id = public.acting_owner()',
        t
      ) using rowj->>'id';
    end loop;
  end loop;
end;
$$;

revoke all on function public.acting_owner() from public, anon, authenticated;
revoke all on function public.is_assistant() from public, anon, authenticated;
revoke all on function public.assistant_blocked(text) from public, anon, authenticated;
revoke all on function public.normalize_phone(text) from public, anon, authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.invite_assistant(text) to authenticated;
grant execute on function public.accept_my_invite() to authenticated;

do $$
declare
  t text;
  writable text[] := array[
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
    'milk_entries'
  ];
  readonly text[] := array[
    'businesses',
    'users',
    'partners',
    'partner_payments',
    'partner_settlements',
    'backup_records'
  ];
begin
  foreach t in array writable loop
    execute format('drop policy if exists %I on public.%I', t || '_select_assistant', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_assistant', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_assistant', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = public.acting_owner() and public.is_assistant())',
      t || '_select_assistant',
      t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (owner_id = public.acting_owner() and public.is_assistant())',
      t || '_insert_assistant',
      t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (owner_id = public.acting_owner() and public.is_assistant()) with check (owner_id = public.acting_owner() and public.is_assistant())',
      t || '_update_assistant',
      t
    );
  end loop;
  foreach t in array readonly loop
    execute format('drop policy if exists %I on public.%I', t || '_select_assistant', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = public.acting_owner() and public.is_assistant())',
      t || '_select_assistant',
      t
    );
  end loop;
end $$;
