/**
 * Santhaya Associates — Secure Authenticated Environment Diagnostic
 * File: src/app/api/health/env/route.ts
 *
 * Gated behind CRON_SECRET / OUTBOX_WORKER_SECRET bearer authentication.
 * Returns sanitized environment inspection metrics to verify production configuration.
 *
 * CRITICAL SECURITY INSTRUCTIONS:
 * 1. NEVER return or log plaintext API keys, tokens, or secrets.
 * 2. Only return sanitized verification metadata (ref, role, length, whitespace flags).
 * 3. Enforces constant-time authentication against CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseEnv } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function parseJwtMeta(jwt?: string | null) {
  if (!jwt || typeof jwt !== 'string') return null;
  const parts = jwt.trim().replace(/^["']|["']$/g, '').split('.');
  if (parts.length !== 3) return { validFormat: false };
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return {
      validFormat: true,
      iss: payload.iss,
      ref: payload.ref,
      role: payload.role,
      hasExp: typeof payload.exp === 'number',
    };
  } catch {
    return { validFormat: false, error: 'JSON parse error' };
  }
}

export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET || process.env.OUTBOX_WORKER_SECRET;
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!expectedSecret || !token || !secureCompare(token, expectedSecret)) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED: Missing or invalid worker authentication secret.' },
      { status: 401 }
    );
  }

  const rawUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['SUPABASE_URL'] || '';
  const rawAnon = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env['SUPABASE_ANON_KEY'] || '';
  const rawService = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
  const rawSalt = process.env['RATE_LIMIT_SALT'] || '';

  const { url, anonKey, isConfigured, isServerConfigured } = getSupabaseEnv();

  const urlMatch = rawUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  const projectRef = urlMatch ? urlMatch[1] : (rawUrl.includes('placeholder') ? 'placeholder' : 'unknown');

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: {
      isDefined: Boolean(rawUrl),
      projectRef,
      hasQuotes: rawUrl.startsWith('"') || rawUrl.startsWith("'") || rawUrl.endsWith('"') || rawUrl.endsWith("'"),
      hasWhitespace: rawUrl !== rawUrl.trim(),
      hasTrailingSlash: rawUrl.trim().endsWith('/'),
      isPlaceholder: rawUrl.includes('placeholder.supabase.co'),
    },
    anonKey: {
      isDefined: Boolean(rawAnon),
      hasQuotes: rawAnon.startsWith('"') || rawAnon.startsWith("'") || rawAnon.endsWith('"') || rawAnon.endsWith("'"),
      hasWhitespace: rawAnon !== rawAnon.trim(),
      isPlaceholder: rawAnon.includes('placeholder'),
      jwt: parseJwtMeta(rawAnon),
    },
    serviceRoleKey: {
      isDefined: Boolean(rawService),
      hasQuotes: rawService.startsWith('"') || rawService.startsWith("'") || rawService.endsWith('"') || rawService.endsWith("'"),
      hasWhitespace: rawService !== rawService.trim(),
      jwt: parseJwtMeta(rawService),
    },
    rateLimitSalt: {
      isDefined: Boolean(rawSalt),
      isDefaultFallback: rawSalt === 'development-fallback-salt-change-in-production' || !rawSalt,
    },
    envGuard: {
      isConfigured,
      isServerConfigured,
      resolvedUrlRef: url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || 'non-standard',
    },
  });
}

