/**
 * Supabase Environment Configuration Guard
 *
 * Provides typed access to required Supabase environment variables.
 * In development and CI build environments where variables might not yet be configured,
 * safe placeholder fallbacks are used to prevent compilation crashes during Next.js static prerendering.
 */

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rateLimitSalt = process.env.RATE_LIMIT_SALT || 'development-fallback-salt-change-in-production';

  return {
    url,
    anonKey,
    serviceRoleKey,
    rateLimitSalt,
    isConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    isServerConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  };
}
