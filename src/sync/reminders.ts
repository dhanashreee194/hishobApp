import {getSupabase} from './client';

export type ReminderChannel = 'sms' | 'whatsapp';

export type ReminderResult = {
  sent: number;
  skipped: number;
  missingPhone: number;
};

export async function sendUdhariReminders(
  days: number,
  channel: ReminderChannel,
): Promise<ReminderResult> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('क्लाउड जोडणी सेट नाही. यादी दिसते, संदेश गेले नाहीत.');
  }
  const {data, error} = await supabase.functions.invoke('udhari-reminder', {
    body: {days, channel},
  });
  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail || 'संदेश गेले नाहीत. फंक्शन आणि Twilio किंवा WhatsApp गुपिते तपासा.');
  }
  const body = data as {sent?: number; skipped?: number; missingPhone?: number; error?: string} | null;
  if (body?.error) {
    throw new Error(body.error);
  }
  return {
    sent: body?.sent ?? 0,
    skipped: body?.skipped ?? 0,
    missingPhone: body?.missingPhone ?? 0,
  };
}

async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as {context?: {json?: () => Promise<{error?: string}>}}).context;
  if (!context?.json) {
    return '';
  }
  try {
    const body = await context.json();
    return body?.error ?? '';
  } catch {
    return '';
  }
}
