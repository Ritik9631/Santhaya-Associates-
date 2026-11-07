import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { getSupabaseEnv } from './env';

/**
 * Creates a Supabase client for Server Components, Server Actions,
 * and Route Handlers with modern chunk-safe cookie handling.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method can fail in Server Components where cookies cannot be mutated.
          // This is expected and handled by middleware when refreshing sessions.
        }
      },
    },
  });
}
