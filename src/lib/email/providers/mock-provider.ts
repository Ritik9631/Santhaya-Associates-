/**
 * Santhaya Associates — Mock Email Provider (Testing & Local Simulation)
 * File: src/lib/email/providers/mock-provider.ts
 */

import type { EmailDispatchResult, EmailMessage, IEmailProvider } from '../types';

export class MockEmailProvider implements IEmailProvider {
  public readonly name = 'mock';
  public sentMessages: EmailMessage[] = [];
  public shouldFail = false;
  public failureCode = 'MOCK_ERROR';
  public failureMessage = 'Simulated email provider network failure';
  public failureRetryable = true;

  async sendEmail(message: EmailMessage): Promise<EmailDispatchResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: {
          code: this.failureCode,
          message: this.failureMessage,
          retryable: this.failureRetryable,
        },
      };
    }

    this.sentMessages.push(message);
    const mockId = `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      success: true,
      providerMessageId: mockId,
    };
  }

  clear(): void {
    this.sentMessages = [];
    this.shouldFail = false;
  }
}
