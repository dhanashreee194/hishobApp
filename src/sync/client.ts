import 'react-native-url-polyfill/auto';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {database} from '../db';
import {isCloudConfigured, SUPABASE_ANON_KEY, SUPABASE_URL} from './publicConfig';

let client: SupabaseClient | null = null;

function authStorage() {
  return {
    getItem: async (key: string): Promise<string | null> => {
      const value = await database.localStorage.get<string>(key);
      return value ?? null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      await database.localStorage.set(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      await database.localStorage.remove(key);
    },
  };
}

export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured()) {
    return null;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: authStorage(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
