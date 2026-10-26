import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { getSupabaseEnv } from './env';

/**
 * Creates a Supabase client for browser (client-side) usage.
 * Uses the anonymous key with Row Level Security enforced.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
