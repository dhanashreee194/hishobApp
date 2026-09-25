/**
 * Project URL and anon key from the Supabase dashboard (Project Settings → API).
 * The anon key is public. Row Level Security keeps each business in its own rows.
 * Leave both empty to run the ledger fully offline.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export function isCloudConfigured(): boolean {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
}
