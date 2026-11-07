/**
 * Supabase Environment Configuration Guard
 * File: src/lib/supabase/env.ts
 *
 * Provides typed, sanitized access to required Supabase environment variables.
 * Enforces:
 * 1. Runtime Dynamic Resolution: Uses process.env['...'] on the server to prevent
 *    Webpack/Next.js from statically baking build-time placeholders into server runtime.
 * 2. Automatic Sanitization: Trims surrounding whitespace and accidental quotes.
 * 3. URL Normalization: Automatically strips trailing slashes to prevent GoTrue 400s.
 * 4. Production Fail-Closed Security: Detects missing or placeholder credentials
 *    at runtime and fails closed with actionable diagnostic guidance.
 */

function cleanEnvValue(val?: string | null): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function getSupabaseEnv() {
  // Read runtime environment variables dynamically on the server:
  // Bracket notation `process.env['...']` prevents Webpack/Next.js from inlining at build time on the server,
  // allowing server actions and SSR to pick up live environment variables injected by Hostinger!
  const runtimeUrl = typeof process !== 'undefined'
    ? (process.env['SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL'])
    : undefined;
  const runtimeAnonKey = typeof process !== 'undefined'
    ? (process.env['SUPABASE_ANON_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
    : undefined;

  const url = cleanEnvValue(runtimeUrl || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, '');
  const anonKey = cleanEnvValue(runtimeAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = cleanEnvValue(typeof process !== 'undefined' ? process.env['SUPABASE_SERVICE_ROLE_KEY'] : undefined);
  const rateLimitSalt = cleanEnvValue(typeof process !== 'undefined' ? process.env['RATE_LIMIT_SALT'] : undefined) || 'development-fallback-salt-change-in-production';

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('placeholder.supabase.co') &&
    !anonKey.includes('placeholder')
  );

  const isServerConfigured = Boolean(
    url &&
    serviceRoleKey &&
    !url.includes('placeholder.supabase.co')
  );

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (typeof process !== 'undefined' && process.env['SUPABASE_ENV'] === 'production');

  // Fail-closed guard in production server runtime
  // (Enforced when handling actual runtime requests on server, not during static page pre-rendering)
  if (isProduction && typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
    if (!url || url.includes('placeholder.supabase.co')) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: Supabase URL is not configured or using placeholder fallback in production. ' +
        'Please verify NEXT_PUBLIC_SUPABASE_URL in Hostinger environment settings.'
      );
    }
    if (!anonKey || anonKey.includes('placeholder')) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: Supabase Anon Key is not configured or using placeholder fallback in production. ' +
        'Please verify NEXT_PUBLIC_SUPABASE_ANON_KEY in Hostinger environment settings.'
      );
    }
  }

  return {
    url: url || 'https://placeholder.supabase.co',
    anonKey: anonKey || 'placeholder-anon-key',
    serviceRoleKey: serviceRoleKey || undefined,
    rateLimitSalt,
    isConfigured,
    isServerConfigured,
  };
}
