// Scheduled snapshot, independent of the live Watermelon sync.
// Deploy with `supabase functions deploy nightly-backup`.
// Schedule from config.toml (18:00 UTC, 23:30 IST) or the dashboard cron.
// Only the service role may run this. A signed-in business cannot dump anyone else's rows.

import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const TABLES = [
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
  'backup_records',
];

function roleOf(authorization: string | null): string | null {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.slice('Bearer '.length);
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}

Deno.serve(async request => {
  if (roleOf(request.headers.get('Authorization')) !== 'service_role') {
    return new Response('unauthorized', {status: 401});
  }
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return new Response('missing service configuration', {status: 500});
  }
  const admin = createClient(url, serviceKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  });
  const users = await admin.auth.admin.listUsers({perPage: 1000});
  if (users.error) {
    return new Response(users.error.message, {status: 500});
  }

  const createdAt = Date.now();
  let written = 0;
  for (const user of users.data.users) {
    const tables: Record<string, unknown[]> = {};
    for (const table of TABLES) {
      const rows = await admin
        .from(table)
        .select('*')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      if (rows.error) {
        return new Response(`${table}: ${rows.error.message}`, {status: 500});
      }
      tables[table] = rows.data ?? [];
    }
    const body = JSON.stringify({version: 1, createdAt, tables});
    const path = `${user.id}/backup-${createdAt}.json`;
    const upload = await admin.storage.from('backups').upload(path, body, {
      contentType: 'application/json',
      upsert: false,
    });
    if (upload.error) {
      return new Response(upload.error.message, {status: 500});
    }
    written += 1;
  }
  return new Response(JSON.stringify({written, createdAt}), {
    headers: {'content-type': 'application/json'},
  });
});
