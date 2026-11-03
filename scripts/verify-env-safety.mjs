import fs from 'node:fs';
import path from 'node:path';

const envLocalPath = path.resolve('.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('❌ .env.local not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envLocalPath, 'utf8');
const map = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEV_SUPABASE_PROJECT_REF',
  'SUPABASE_ENV',
  'ALLOW_TEST_ENV',
  'NEXT_PUBLIC_SITE_URL',
  'RATE_LIMIT_SALT',
  'INTERNAL_NOTIFICATION_EMAIL',
  'EMAIL_PROVIDER',
  'EMAIL_FROM_ADDRESS',
  'CRON_SECRET',
  'OUTBOX_WORKER_SECRET'
];

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — ENVIRONMENT INTEGRITY & CONFINEMENT AUDIT');
console.log('='.repeat(70) + '\n');

let allOk = true;
for (const req of required) {
  const val = map[req];
  if (val === undefined || val === '') {
    console.log(`❌ [MISSING] ${req} is missing or empty in .env.local`);
    allOk = false;
  } else {
    let detail = `Present (${val.length} chars)`;
    if (['SUPABASE_ENV', 'ALLOW_TEST_ENV', 'EMAIL_PROVIDER', 'DEV_SUPABASE_PROJECT_REF', 'INTERNAL_NOTIFICATION_EMAIL', 'EMAIL_FROM_ADDRESS', 'NEXT_PUBLIC_SITE_URL'].includes(req)) {
      detail = val;
    } else if (req === 'NEXT_PUBLIC_SUPABASE_URL') {
      const match = val.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
      detail = `Supabase Project: ${match ? match[1] : 'custom'}`;
    }
    console.log(`✅ [OK] ${req}: ${detail}`);
  }
}

console.log('\n--- SAFETY CONDITIONS CHECK ---');
const safetyChecks = [
  { key: 'DEV_SUPABASE_PROJECT_REF', expected: 'bkqneudnnhvvwmtggorz' },
  { key: 'SUPABASE_ENV', expected: 'development' },
  { key: 'ALLOW_TEST_ENV', expected: 'true' },
  { key: 'EMAIL_PROVIDER', expected: 'mock' }
];

for (const sc of safetyChecks) {
  if (map[sc.key] === sc.expected) {
    console.log(`🛡️  [CONFIRMED] ${sc.key} === ${sc.expected}`);
  } else {
    console.log(`❌ [DANGER] ${sc.key} is "${map[sc.key]}", expected "${sc.expected}"`);
    allOk = false;
  }
}

// Verify URL project matches DEV_SUPABASE_PROJECT_REF
const urlRefMatch = (map['NEXT_PUBLIC_SUPABASE_URL'] || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (urlRefMatch && urlRefMatch[1] === 'bkqneudnnhvvwmtggorz') {
  console.log(`🛡️  [CONFIRMED] NEXT_PUBLIC_SUPABASE_URL points to sandbox bkqneudnnhvvwmtggorz`);
} else {
  console.log(`❌ [DANGER] NEXT_PUBLIC_SUPABASE_URL does not match bkqneudnnhvvwmtggorz`);
  allOk = false;
}

if (!allOk) {
  console.error('\nEnvironment audit failed. See items above.');
  process.exit(1);
} else {
  console.log('\n' + '='.repeat(70));
  console.log('ENVIRONMENT VERIFICATION PASSED — ZERO SECRET EXPOSURE');
  console.log('='.repeat(70));
}

