// Reminds customers whose oldest unpaid udhari is at least N days old.
// Deploy with `supabase functions deploy udhari-reminder`.
// Secrets stay here, never in the app:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM
//   TWILIO_WHATSAPP_FROM (whatsapp:+...)
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
// The signed-in owner is the only caller. Assistants are rejected.

import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const BATCH = 30;

type Customer = {id: string; name: string; mobile: string | null};
type Entry = {customer_id: string; date: number; type: string; amount: number};
type Lot = {date: number; remaining: number};

Deno.serve(async request => {
  if (request.method !== 'POST') {
    return json({error: 'POST हवा आहे.'}, 405);
  }
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!url || !anon || !serviceKey || !authorization?.startsWith('Bearer ')) {
    return json({error: 'क्लाउड जोडणी अपुरी आहे.'}, 500);
  }

  const userClient = createClient(url, anon, {
    global: {headers: {Authorization: authorization}},
    auth: {persistSession: false, autoRefreshToken: false},
  });
  const user = await userClient.auth.getUser();
  if (user.error || !user.data.user) {
    return json({error: 'प्रवेश तपासा.'}, 401);
  }

  const admin = createClient(url, serviceKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  });
  const member = await admin
    .from('business_members')
    .select('owner_id')
    .eq('user_id', user.data.user.id)
    .eq('role', 'assistant')
    .maybeSingle();
  if (member.error) {
    return json({error: 'भूमिका तपासता आली नाही.'}, 500);
  }
  if (member.data?.owner_id) {
    return json({error: 'स्मरण संदेश फक्त मालक पाठवू शकतो.'}, 403);
  }

  const body = await request.json().catch(() => ({}));
  const days = clampDays(body.days);
  const channel = body.channel === 'whatsapp' ? 'whatsapp' : body.channel === 'sms' ? 'sms' : null;
  if (!channel) {
    return json({error: 'SMS किंवा WhatsApp निवडा.'}, 400);
  }
  const transport = channel === 'whatsapp' ? whatsappTransport() : smsTransport();
  if (!transport) {
    return json(
      {
        error:
          channel === 'whatsapp'
            ? 'WhatsApp गुपिते फंक्शनमध्ये सेट नाहीत. संदेश गेले नाहीत.'
            : 'Twilio SMS गुपिते फंक्शनमध्ये सेट नाहीत. संदेश गेले नाहीत.',
      },
      400,
    );
  }

  const ownerId = user.data.user.id;
  const customers = await admin
    .from('customers')
    .select('id,name,mobile')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .eq('is_deleted', false);
  const entries = await admin
    .from('customer_ledger_entries')
    .select('customer_id,date,type,amount')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .eq('is_deleted', false);
  if (customers.error || entries.error) {
    return json({error: 'उधारी यादी वाचता आली नाही.'}, 500);
  }

  const due = overdue(
    (customers.data ?? []) as Customer[],
    (entries.data ?? []) as Entry[],
    days,
    Date.now(),
  );
  let sent = 0;
  let skipped = 0;
  let missingPhone = 0;
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  for (const customer of due) {
    if (sent >= BATCH) {
      skipped += 1;
      continue;
    }
    const phone = e164(customer.mobile ?? '');
    if (!phone) {
      missingPhone += 1;
      continue;
    }
    const recent = await admin
      .from('reminder_log')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('customer_id', customer.id)
      .gte('sent_at', since)
      .limit(1);
    if (recent.error) {
      return json({error: 'स्मरण नोंद वाचता आली नाही.'}, 500);
    }
    if ((recent.data ?? []).length > 0) {
      skipped += 1;
      continue;
    }
    const text = `नमस्कार ${customer.name}, माझा हिशोब: तुमची बाकी ₹${rupees(customer.balance)} आहे. कृपया लवकर जमा करा.`;
    const delivered = await transport(phone, text);
    if (!delivered) {
      skipped += 1;
      continue;
    }
    const logged = await admin.from('reminder_log').insert({
      owner_id: ownerId,
      customer_id: customer.id,
      channel,
    });
    if (logged.error) {
      return json({error: 'संदेश गेला, नोंद जतन झाली नाही.'}, 500);
    }
    sent += 1;
  }

  return json({sent, skipped, missingPhone});
});

function overdue(customers: Customer[], entries: Entry[], days: number, now: number): Array<Customer & {balance: number}> {
  const byCustomer = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = byCustomer.get(entry.customer_id) ?? [];
    list.push(entry);
    byCustomer.set(entry.customer_id, list);
  }
  const today = startOfDay(now);
  const due: Array<Customer & {balance: number}> = [];
  for (const customer of customers) {
    const lots = unpaidLots(byCustomer.get(customer.id) ?? []);
    const open = lots.filter(lot => lot.remaining > 0);
    if (open.length === 0) {
      continue;
    }
    const age = Math.floor((today - startOfDay(open[0].date)) / 86400000);
    if (age < days) {
      continue;
    }
    due.push({...customer, balance: open.reduce((sum, lot) => sum + lot.remaining, 0)});
  }
  return due;
}

function unpaidLots(entries: Entry[]): Lot[] {
  const ordered = [...entries].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date - right.date;
    }
    return left.type === 'payment' ? 1 : right.type === 'payment' ? -1 : 0;
  });
  const lots: Lot[] = [];
  for (const entry of ordered) {
    const amount = paise(entry.amount);
    if (amount <= 0) {
      continue;
    }
    if (entry.type === 'payment') {
      let left = amount;
      for (const lot of lots) {
        if (left <= 0) {
          break;
        }
        if (lot.remaining <= left) {
          left -= lot.remaining;
          lot.remaining = 0;
        } else {
          lot.remaining -= left;
          left = 0;
        }
      }
    } else {
      lots.push({date: entry.date, remaining: amount});
    }
  }
  return lots;
}

function paise(value: number): number {
  const text = String(value);
  const negative = text.startsWith('-');
  const [whole, frac = ''] = text.replace('-', '').split('.');
  const digits = Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2));
  return negative ? -digits : digits;
}

function rupees(value: number): string {
  const whole = Math.floor(value / 100);
  const frac = String(value % 100).padStart(2, '0');
  return `${whole}.${frac}`;
}

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function clampDays(value: unknown): number {
  const days = Number(value);
  if (!Number.isFinite(days)) {
    return 15;
  }
  return Math.min(365, Math.max(1, Math.floor(days)));
}

function e164(mobile: string): string | null {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (mobile.trim().startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

function smsTransport(): ((phone: string, text: string) => Promise<boolean>) | null {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_SMS_FROM');
  if (!sid || !token || !from) {
    return null;
  }
  return (phone, text) => twilio(sid, token, from, phone, text);
}

function whatsappTransport(): ((phone: string, text: string) => Promise<boolean>) | null {
  const metaToken = Deno.env.get('WHATSAPP_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (metaToken && phoneNumberId) {
    return (phone, text) => metaWhatsApp(metaToken, phoneNumberId, phone, text);
  }
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM');
  if (!sid || !token || !from) {
    return null;
  }
  return (phone, text) => twilio(sid, token, from, `whatsapp:${phone}`, text);
}

async function twilio(sid: string, token: string, from: string, to: string, text: string): Promise<boolean> {
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({To: to, From: from, Body: text}),
  });
  return response.ok;
}

async function metaWhatsApp(token: string, phoneNumberId: string, phone: string, text: string): Promise<boolean> {
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone.replace('+', ''),
      type: 'text',
      text: {body: text},
    }),
  });
  return response.ok;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json'},
  });
}
