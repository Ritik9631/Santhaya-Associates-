import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { getSupabaseEnv } from './env';

/**
 * Creates a Supabase client for Server Components, Server Actions,
 * and Route Handlers with cookie-based session handling.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // The `set` method can fail in Server Components where cookies cannot be mutated.
          // This is expected and handled by middleware when refreshing sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Expected in Server Components.
        }
      },
    },
  });
}
