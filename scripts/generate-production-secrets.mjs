/**
 * Santhaya Associates — Secure Production Secret Generator
 * File: scripts/generate-production-secrets.mjs
 *
 * Generates high-entropy cryptographic secrets and saves them to .env.production.local (gitignored).
 * In accordance with strict security rules, secret values are NEVER printed to stdout, console, or transcripts.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const targetPath = path.resolve('.env.production.local');

const cronSecret = crypto.randomBytes(32).toString('hex');
const outboxWorkerSecret = crypto.randomBytes(32).toString('hex');
const rateLimitSalt = crypto.randomBytes(32).toString('hex');

const content = `# Santhaya Associates — Generated Production Secrets (LOCAL ONLY — NEVER COMMIT TO GIT)
# Generated: ${new Date().toISOString()}

CRON_SECRET=${cronSecret}
OUTBOX_WORKER_SECRET=${outboxWorkerSecret}
RATE_LIMIT_SALT=${rateLimitSalt}
`;

fs.writeFileSync(targetPath, content, { mode: 0o600 });

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — SECURE PRODUCTION SECRETS GENERATOR');
console.log('='.repeat(70));
console.log('✓ Cryptographically secure 64-character hex secrets successfully generated.');
console.log(`✓ Secrets saved directly to gitignored file: ${targetPath}`);
console.log('✓ Security Compliance: Zero secret values printed to console or logs.');
console.log('✓ Action: Open .env.production.local to privately copy secrets into Hostinger hPanel.');
console.log('='.repeat(70));
