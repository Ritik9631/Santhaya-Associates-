/**
 * Santhaya Associates — Application URL Resolver
 * File: src/lib/utils/app-url.ts
 *
 * Ensures canonical URL resolution for authentication redirects, password recovery,
 * and invitation links. Enforces the official domain in production.
 */

export function getAppUrl(): string {
  // If explicitly configured with a non-localhost, non-temporary domain
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured && !configured.includes('localhost') && !configured.includes('hostingersite.com')) {
    return configured;
  }

  // In production, the official company domain is always canonical
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.SUPABASE_ENV === 'production'
  ) {
    return 'https://santhayaassociates.com';
  }

  // Development fallback
  return configured || 'http://localhost:3000';
}

