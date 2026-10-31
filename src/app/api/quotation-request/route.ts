/**
 * Santhaya Associates — Public Quotation Request API Gateway
 * File: src/app/api/quotation-request/route.ts
 *
 * Implements server-side intake with:
 * 1. Zod input validation strictly matching database constraints.
 * 2. Anti-spam honeypot defense (_company_fax).
 * 3. Rapid submission timing analysis (< 2.5s -> rapid_submission).
 * 4. Salted IP hashing & atomic token bucket rate limiting.
 * 5. SHA-256 payload normalization and idempotency verification.
 * 6. Atomic database persistence via privileged service_role client.
 * 7. Zero credentials or secret keys exposed in responses or client bundles.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseEnv } from '@/lib/supabase/env';
import {
  quotationApiSchema,
  normalizeServiceCategory,
  hashClientIp,
  computePayloadHash,
  extractClientIp,
  type QuotationApiInput,
} from '@/lib/quotation/validation';

export async function POST(req: NextRequest) {
  try {
    // 1. Content-Type Check
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    // 2. Schema Validation via Zod
    const parseResult = quotationApiSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const err of parseResult.error.errors) {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed for one or more fields.',
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // 3. Anti-Spam: Honeypot check
    // Real users will never fill _company_fax as it is hidden via CSS/ARIA
    if (data._company_fax && data._company_fax.trim() !== '') {
      // Silently reject or simulate delay to disincentivize bot scrapers
      return NextResponse.json(
        { success: false, error: 'Submission rejected due to anti-automation policy.' },
        { status: 400 }
      );
    }

    // 4. Anti-Spam: Rapid Submission Detection
    let riskFlag = 'none';
    if (data._form_render_ts && typeof data._form_render_ts === 'number') {
      const elapsedMs = Date.now() - data._form_render_ts;
      if (elapsedMs < 2500) {
        // Less than 2.5 seconds to fill 10+ fields indicates bot or automated autofill
        riskFlag = 'rapid_submission';
      }
    }

    // 5. IP & Salt Extraction
    const { ip: clientIp } = extractClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { rateLimitSalt, isServerConfigured } = getSupabaseEnv();
    const ipHash = hashClientIp(clientIp, rateLimitSalt);

    // 6. Idempotency Key & Payload Hash
    const idempotencyKey = data.idempotencyKey && data.idempotencyKey.trim() !== ''
      ? data.idempotencyKey.trim()
      : crypto.randomUUID();
    const payloadHash = computePayloadHash(data);

    // If server environment is not configured (e.g. initial dev or isolated static build)
    if (!isServerConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_NOT_CONFIGURED: Supabase service role is not configured.',
        },
        { status: 503 }
      );
    }

    const adminClient = createAdminClient();

    // 7. Atomic Token Bucket Rate Limiting (5 tokens max, 60s refill, cost 1)
    const rateLimitKey = `quotation_req:ip:${ipHash}`;
    const { data: rlData, error: rlError } = await adminClient.rpc('check_rate_limit', {
      p_key: rateLimitKey,
      p_max_tokens: 5,
      p_refill_seconds: 60,
      p_cost: 1,
    });

    if (rlError) {
      console.error('[Quotation API] Rate limit check error:', rlError.message);
      // Non-blocking fallback if rate limiter fails
    } else if (rlData && rlData.length > 0) {
      const { allowed, retry_after } = rlData[0];
      if (!allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED: Too many quotation requests from your network. Please wait.',
            retryAfterSeconds: retry_after,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retry_after),
            },
          }
        );
      }
    }

    // 8. Atomic Database Persistence
    const adminNotificationEmail =
      process.env.INTERNAL_NOTIFICATION_EMAIL || 'inquiries@santhaya.local';

    // Attempt Phase 2D atomic RPC first
    const { data: atomicResult, error: atomicError } = await adminClient.rpc(
      'submit_quotation_request_atomic',
      {
        p_idempotency_key: idempotencyKey,
        p_request_payload_hash: payloadHash,
        p_business_name: data.businessName.trim(),
        p_contact_person: data.contactPerson.trim(),
        p_email: data.email && data.email.trim() !== '' ? data.email.trim().toLowerCase() : null,
        p_phone: data.phone && data.phone.trim() !== '' ? data.phone.trim() : null,
        p_gstin: data.gstin ? data.gstin.trim().toUpperCase() : null,
        p_service_category: normalizeServiceCategory(data.serviceCategory),
        p_requirement_details: data.requirementDetails.trim(),
        p_quantity: data.quantity ? data.quantity.trim() : null,
        p_technical_specs: data.technicalSpecs ? data.technicalSpecs.trim() : null,
        p_delivery_location: data.deliveryLocation.trim(),
        p_notes: data.notes ? data.notes.trim() : null,
        p_privacy_consent: true,
        p_submission_ip_hash: ipHash,
        p_user_agent: userAgent,
        p_risk_flag: riskFlag,
        p_admin_notification_email: adminNotificationEmail,
      }
    );

    if (!atomicError && atomicResult && atomicResult.length > 0) {
      const record = atomicResult[0];
      const isReplayed = record.result_status === 'replayed';

      // Phase 4: Enqueue client confirmation email if email is provided and not a replayed submission
      if (!isReplayed && data.email && data.email.trim() !== '') {
        const customerEmail = data.email.trim().toLowerCase();
        try {
          await adminClient.from('email_outbox').insert({
            recipient_email: customerEmail,
            subject: `Quotation Request Received — Santhaya Associates [Ref: ${record.reference_number}]`,
            email_type: 'enquiry_confirmation_customer',
            related_entity_type: 'quotation_request',
            payload: {
              referenceNumber: record.reference_number,
              businessName: data.businessName.trim(),
              contactPerson: data.contactPerson.trim(),
              serviceCategory: data.serviceCategory,
              submittedAt: new Date(record.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            },
          });
        } catch (enqueueErr) {
          console.warn('[Quotation API] Non-fatal customer confirmation enqueue error:', enqueueErr);
        }
      }

      return NextResponse.json(
        {
          success: true,
          referenceNumber: record.reference_number,
          createdAt: record.created_at,
          status: record.result_status,
          outboxId: record.outbox_id,
        },
        { status: isReplayed ? 200 : 201 }
      );
    }

    // Fallback: If submit_quotation_request_atomic is not yet applied, call Phase 2B RPC
    const { data: fallbackResult, error: fallbackError } = await adminClient.rpc(
      'submit_quotation_request',
      {
        p_idempotency_key: idempotencyKey,
        p_request_payload_hash: payloadHash,
        p_business_name: data.businessName.trim(),
        p_contact_person: data.contactPerson.trim(),
        p_email: data.email ? data.email.trim().toLowerCase() : '',
        p_phone: data.phone ? data.phone.trim() : '',
        p_gstin: data.gstin ? data.gstin.trim().toUpperCase() : null,
        p_service_category: normalizeServiceCategory(data.serviceCategory),
        p_requirement_details: data.requirementDetails.trim(),
        p_quantity: data.quantity ? data.quantity.trim() : null,
        p_technical_specs: data.technicalSpecs ? data.technicalSpecs.trim() : null,
        p_delivery_location: data.deliveryLocation.trim(),
        p_notes: data.notes ? data.notes.trim() : null,
        p_privacy_consent: true,
        p_submission_ip_hash: ipHash,
        p_user_agent: userAgent,
        p_risk_flag: riskFlag,
      }
    );

    if (fallbackError) {
      if (fallbackError.message.includes('CONFLICT_PAYLOAD_MISMATCH')) {
        return NextResponse.json(
          {
            success: false,
            error: 'CONFLICT: This idempotency key was previously submitted with differing data.',
          },
          { status: 409 }
        );
      }

      console.error('[Quotation API] Database RPC error:', fallbackError.message);
      return NextResponse.json(
        {
          success: false,
          error: `Database ingestion failed: ${fallbackError.message}`,
        },
        { status: 500 }
      );
    }

    if (!fallbackResult || fallbackResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Database RPC returned empty response.' },
        { status: 500 }
      );
    }

    const record = fallbackResult[0];
    const isReplayed = record.result_status === 'replayed';

    return NextResponse.json(
      {
        success: true,
        referenceNumber: record.reference_number,
        createdAt: record.created_at,
        status: record.result_status,
      },
      { status: isReplayed ? 200 : 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Quotation API] Unhandled server error:', message);
    return NextResponse.json(
      { success: false, error: 'An unexpected internal error occurred.' },
      { status: 500 }
    );
  }
}
