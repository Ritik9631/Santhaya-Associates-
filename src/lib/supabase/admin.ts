import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { getSupabaseEnv } from './env';

/**
 * Creates a privileged Supabase administrative client using the SERVICE_ROLE key.
 *
 * CRITICAL SECURITY INSTRUCTIONS:
 * 1. NEVER import or execute this utility in client-side code or browser bundles.
 * 2. Only use for server-only background processes, administrative maintenance,
 *    and system-level tasks.
 * 3. Bypasses all Row Level Security policies.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL SECURITY VIOLATION: createAdminClient invoked in browser environment.');
  }

  const { url, serviceRoleKey } = getSupabaseEnv();

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in the server environment.');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
