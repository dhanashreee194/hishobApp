import {getSupabase} from './client';
import {AppRole, useSyncStatus} from './status';

export async function refreshRole(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    useSyncStatus.getState().patch({role: 'owner'});
    return;
  }
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    useSyncStatus.getState().patch({role: 'owner'});
    return;
  }
  const {data, error} = await supabase.rpc('my_role');
  const role: AppRole = !error && data === 'assistant' ? 'assistant' : 'owner';
  useSyncStatus.getState().patch({role});
}

export async function inviteAssistant(phone: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('क्लाउड जोडणी सेट नाही.');
  }
  const {error} = await supabase.rpc('invite_assistant', {phone});
  if (error) {
    const message = error.message.includes('bad phone')
      ? 'दहा अंकी मोबाइल नंबर टाका.'
      : 'आमंत्रण जतन झाले नाही.';
    throw new Error(message);
  }
}

export async function acceptInvite(): Promise<AppRole> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('क्लाउड जोडणी सेट नाही.');
  }
  const {data, error} = await supabase.rpc('accept_my_invite');
  if (error) {
    throw new Error('आमंत्रण स्वीकारता आले नाही.');
  }
  const role: AppRole = data === 'assistant' ? 'assistant' : 'owner';
  useSyncStatus.getState().patch({role});
  return role;
}
