/**
 * Santhaya Associates — Transactional Email Subsystem Types
 * File: src/lib/email/types.ts
 *
 * Provider-independent definitions for email delivery, durable outbox jobs,
 * and attachment processing.
 */

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded or string content
  contentType: string;
}

export interface EmailMessage {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  tags?: Record<string, string>;
  idempotencyKey?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  providerMessageId?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface IEmailProvider {
  readonly name: string;
  sendEmail(message: EmailMessage): Promise<EmailDispatchResult>;
}

export type EmailStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'dead_letter';

export interface OutboxJob {
  id: string;
  recipient_email: string;
  subject: string;
  email_type: string;
  payload: Record<string, unknown>;
  status: EmailStatus;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  provider_message_id?: string | null;
  error_message?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  created_at: string;
  processed_at?: string | null;
}

export interface AdminEnquiryPayload {
  referenceNumber: string;
  businessName: string;
  contactPerson: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  serviceCategory: string;
  requirementDetails: string;
  quantity?: string | null;
  technicalSpecs?: string | null;
  deliveryLocation: string;
  notes?: string | null;
  riskFlag: string;
  submittedAt: string;
}

export interface OutboxWorkerResult {
  processed: number;
  succeeded: number;
  failed: number;
  recovered: number;
  skippedDueToLimit: number;
  limitReached: boolean;
  limitType?: 'daily' | 'monthly';
  dailySent?: number;
  monthlySent?: number;
}

