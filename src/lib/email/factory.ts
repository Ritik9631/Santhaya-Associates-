/**
 * Santhaya Associates — Email Provider Factory
 * File: src/lib/email/factory.ts
 *
 * Instantiates the appropriate IEmailProvider based on environment configuration.
 * In development or testing with no API keys, falls back to MockEmailProvider.
 */

import type { IEmailProvider } from './types';
import { ResendEmailProvider } from './providers/resend-provider';
import { MockEmailProvider } from './providers/mock-provider';

let cachedProvider: IEmailProvider | null = null;
let mockInstance: MockEmailProvider | null = null;

export function getEmailProvider(): IEmailProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = process.env.EMAIL_PROVIDER || 'resend';
  const resendApiKey = process.env.RESEND_API_KEY;

  if (process.env.NODE_ENV === 'test' || providerType === 'mock' || !resendApiKey) {
    if (!mockInstance) {
      mockInstance = new MockEmailProvider();
    }
    return mockInstance;
  }

  cachedProvider = new ResendEmailProvider();
  return cachedProvider;
}

export function setTestEmailProvider(provider: IEmailProvider | null): void {
  cachedProvider = provider;
}
