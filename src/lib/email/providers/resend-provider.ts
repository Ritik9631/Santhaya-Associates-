/**
 * Santhaya Associates — Resend Transactional Email Provider Adapter
 * File: src/lib/email/providers/resend-provider.ts
 *
 * Implements IEmailProvider via Resend's REST API.
 * Uses native fetch with timeout guards, error mapping, and idempotency headers.
 * Safe in development and CI: gracefully flags missing API keys without crashing.
 */

import type { EmailDispatchResult, EmailMessage, IEmailProvider } from '../types';

export interface ResendProviderOptions {
  apiKey?: string;
  defaultFrom?: string;
}

export class ResendEmailProvider implements IEmailProvider {
  public readonly name = 'resend';
  private readonly apiKey: string;
  private readonly defaultFrom: string;

  constructor(options?: ResendProviderOptions) {
    this.apiKey = options?.apiKey || process.env.RESEND_API_KEY || '';
    this.defaultFrom =
      options?.defaultFrom ||
      process.env.EMAIL_FROM_ADDRESS ||
      'Santhaya Associates <onboarding@resend.dev>';
  }

  async sendEmail(message: EmailMessage): Promise<EmailDispatchResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'RESEND_API_KEY is not configured in server environment.',
          retryable: false,
        },
      };
    }

    const payload: Record<string, unknown> = {
      from: message.from || this.defaultFrom,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    };

    if (message.replyTo) {
      payload.reply_to = message.replyTo;
    }

    if (message.attachments && message.attachments.length > 0) {
      payload.attachments = message.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      }));
    }

    if (message.tags) {
      payload.tags = Object.entries(message.tags).map(([name, value]) => ({
        name,
        value,
      }));
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (message.idempotencyKey) {
      headers['Idempotency-Key'] = message.idempotencyKey;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        const statusCode = response.status;
        const errorMessage =
          typeof data.message === 'string' ? data.message : `HTTP ${statusCode} Error from Resend`;
        const isRetryable = statusCode === 429 || statusCode >= 500;

        return {
          success: false,
          error: {
            code: `RESEND_HTTP_${statusCode}`,
            message: errorMessage,
            retryable: isRetryable,
          },
        };
      }

      const messageId = typeof data.id === 'string' ? data.id : undefined;

      return {
        success: true,
        providerMessageId: messageId,
      };
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const message = isAbort
        ? 'Resend API request timed out after 10000ms'
        : err instanceof Error
        ? err.message
        : 'Unknown network error';

      return {
        success: false,
        error: {
          code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
          message,
          retryable: true,
        },
      };
    }
  }
}
