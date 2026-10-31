/**
 * Santhaya Associates — Commercial Quotation Validation & Extraction Subsystem
 * File: src/lib/quotation/validation.ts
 *
 * Core pure-logic validations, Zod schemas, and client IP extraction utilities.
 * Completely decoupled from HTTP frameworks for cross-platform portability.
 */

import { z } from 'zod';
import crypto from 'node:crypto';
import type { ServiceCategory } from '@/types/database';

// 1. Zod Schema strictly matching database column limits & formats
export const quotationApiBaseSchema = z.object({
  businessName: z
    .string({ required_error: 'Business or enterprise name is required' })
    .trim()
    .min(2, 'Business name must be at least 2 characters')
    .max(200, 'Business name must not exceed 200 characters'),
  contactPerson: z
    .string({ required_error: 'Contact person name is required' })
    .trim()
    .min(2, 'Contact person must be at least 2 characters')
    .max(100, 'Contact person must not exceed 100 characters'),
  email: z
    .string()
    .trim()
    .max(254, 'Email must not exceed 254 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z
    .string({ required_error: 'Valid Indian mobile phone number is required' })
    .trim()
    .min(1, 'Valid Indian mobile phone number is required')
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)'),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format (15 characters)')
    .optional()
    .nullable()
    .or(z.literal('')),
  serviceCategory: z.enum([
    'construction-tenders',
    'construction-machinery',
    'manufacturing-machinery',
    'construction_tenders',
    'construction_machinery',
    'manufacturing_machinery',
  ]),
  requirementDetails: z
    .string({ required_error: 'Requirement details are required' })
    .trim()
    .min(10, 'Requirement details must be at least 10 characters')
    .max(5000, 'Requirement details must not exceed 5000 characters'),
  quantity: z.string().trim().max(200).optional().nullable().or(z.literal('')),
  technicalSpecs: z.string().trim().max(2000).optional().nullable().or(z.literal('')),
  deliveryLocation: z
    .string({ required_error: 'Delivery state or location is required' })
    .trim()
    .min(2, 'Delivery location must be at least 2 characters')
    .max(500, 'Delivery location must not exceed 500 characters'),
  notes: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: 'Privacy consent is mandatory to process quotation' }),
  }),
  idempotencyKey: z
    .string()
    .uuid('Idempotency key must be a valid UUID v4')
    .optional()
    .or(z.literal('')),
  _company_fax: z.string().optional().or(z.literal('')), // Honeypot field
  _form_render_ts: z.number().optional(), // Render timestamp for rapid-submission detection
});

export const quotationApiSchema = quotationApiBaseSchema.superRefine((data, ctx) => {
  const hasEmail = Boolean(data.email && data.email.trim() !== '');
  const hasPhone = Boolean(data.phone && data.phone.trim() !== '');

  // Email format check when supplied
  if (hasEmail) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(data.email!.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid business email format (e.g. name@company.com)',
        path: ['email'],
      });
    }
  }
});

export type QuotationApiInput = z.infer<typeof quotationApiSchema>;

/**
 * Normalizes service category string into valid database enum.
 */
export function normalizeServiceCategory(input: string): ServiceCategory {
  const mapping: Record<string, ServiceCategory> = {
    'construction-tenders': 'construction_tenders',
    construction_tenders: 'construction_tenders',
    'construction-machinery': 'construction_machinery',
    construction_machinery: 'construction_machinery',
    'manufacturing-machinery': 'manufacturing_machinery',
    manufacturing_machinery: 'manufacturing_machinery',
  };
  return mapping[input] || 'construction_tenders';
}

/**
 * Hashes client IP with server salt to avoid storing raw client IP addresses.
 */
export function hashClientIp(ip: string, salt: string): string {
  return crypto.createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}

/**
 * Computes deterministic SHA-256 hash of core payload for idempotency mismatch checks.
 */
export function computePayloadHash(data: QuotationApiInput): string {
  const normalized = {
    b: data.businessName.trim().toLowerCase(),
    c: data.contactPerson.trim().toLowerCase(),
    e: (data.email || '').trim().toLowerCase(),
    p: (data.phone || '').trim(),
    g: (data.gstin || '').trim().toUpperCase(),
    s: normalizeServiceCategory(data.serviceCategory),
    r: data.requirementDetails.trim(),
    d: data.deliveryLocation.trim().toLowerCase(),
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Safely extracts client IP address according to the declared hosting / reverse-proxy configuration.
 */
export function extractClientIp(
  headers: Headers,
  strategy: string = process.env.TRUSTED_PROXY_STRATEGY || 'safe_fallback'
): { ip: string; strategyUsed: string; isGuaranteedClean: boolean } {
  const vercelIp = headers.get('x-vercel-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');
  const realIp = headers.get('x-real-ip');
  const forwardedFor = headers.get('x-forwarded-for');

  if (strategy === 'vercel' && (vercelIp || realIp)) {
    return { ip: (vercelIp || realIp)!.trim(), strategyUsed: 'vercel', isGuaranteedClean: true };
  }

  if (strategy === 'cloudflare' && cfConnectingIp) {
    return { ip: cfConnectingIp.trim(), strategyUsed: 'cloudflare', isGuaranteedClean: true };
  }

  if (strategy === 'trusted_proxy' && forwardedFor) {
    const parts = forwardedFor.split(',').map((p) => p.trim()).filter(Boolean);
    const candidate = parts[parts.length - 1] || '127.0.0.1';
    return { ip: candidate, strategyUsed: 'trusted_proxy_rightmost', isGuaranteedClean: true };
  }

  if (realIp && (!forwardedFor || realIp === '127.0.0.1')) {
    return { ip: realIp.trim(), strategyUsed: 'real_ip_direct', isGuaranteedClean: false };
  }

  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((p) => p.trim()).filter(Boolean);
    const candidate = parts[parts.length - 1] || '127.0.0.1';
    return { ip: candidate, strategyUsed: 'fallback_rightmost_forwarded', isGuaranteedClean: false };
  }

  return {
    ip: realIp?.trim() || cfConnectingIp?.trim() || '127.0.0.1',
    strategyUsed: 'default_fallback',
    isGuaranteedClean: false,
  };
}
