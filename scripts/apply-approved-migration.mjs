/**
 * Santhaya Associates — Safe Approved Migration Execution Runner
 * File: scripts/apply-approved-migration.mjs
 *
 * Enforces:
 * 1. Allowlist lock: Strictly locked to bkqneudnnhvvwmtggorz.
 * 2. Token protection: Never prints, logs, or exposes the access token.
 * 3. File restriction: Only accepts explicitly specified migration files within supabase/migrations/.
 * 4. Atomic execution: Sends exact SQL to Supabase Management API query endpoint.
 */

import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_DEV_REF = 'bkqneudnnhvvwmtggorz';

// 1. Load .env.local
const envLocalPath = path.resolve('.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('\n❌ ERROR: .env.local not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envLocalPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const projectRef = process.env.DEV_SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (projectRef !== EXPECTED_DEV_REF) {
  console.error(`\n🚨 SAFETY ABORT: Target project ref (${projectRef}) does not match approved development project (${EXPECTED_DEV_REF}).`);
  process.exit(1);
}

if (!accessToken || !accessToken.startsWith('sbp_')) {
  console.error('\n❌ ERROR: Valid SUPABASE_ACCESS_TOKEN (starting with sbp_) not found in environment or .env.local.');
  console.error('Please save your Supabase Personal Access Token as SUPABASE_ACCESS_TOKEN=sbp_... in .env.local.\n');
  process.exit(1);
}

// 2. Validate Target File Argument
const migrationArg = process.argv[2];
if (!migrationArg) {
  console.error('\n❌ ERROR: No migration file specified.');
  console.error('Usage: node scripts/apply-approved-migration.mjs <path-to-sql-file>\n');
  process.exit(1);
}

const resolvedPath = path.resolve(migrationArg);
if (!fs.existsSync(resolvedPath)) {
  console.error(`\n❌ ERROR: Migration file not found: ${migrationArg}`);
  process.exit(1);
}

const normalized = resolvedPath.replace(/\\/g, '/');
if (!normalized.includes('/supabase/migrations/')) {
  console.error('\n🚨 SAFETY ABORT: Migration file must reside inside supabase/migrations/');
  process.exit(1);
}

const sqlContent = fs.readFileSync(resolvedPath, 'utf8');

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — APPROVED MIGRATION EXECUTOR');
console.log('='.repeat(70));
console.log(`Target Project Reference: ${projectRef}`);
console.log(`Target Migration File:    ${path.basename(resolvedPath)}`);
console.log(`SQL Content Size:         ${sqlContent.length} bytes`);
console.log(`Access Token Status:      Configured & Masked (Zero characters exposed)`);

async function runMigration() {
  // Step A: Verify project accessibility via Management API
  console.log('\n[1/3] Verifying Management API project access...');
  const projectCheckRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'Santhaya-Migration-Runner/1.0',
    },
  });

  if (!projectCheckRes.ok) {
    const errText = await projectCheckRes.text();
    console.error(`❌ Access Denied: Management API returned HTTP ${projectCheckRes.status} for project ${projectRef}.`);
    console.error(`Details: ${errText}`);
    process.exit(1);
  }

  const projectData = await projectCheckRes.json();
  console.log(`  ✓ Project verified: "${projectData.name}" (Status: ${projectData.status}, Region: ${projectData.region})`);

  // Step B: Send Migration SQL Query
  console.log('\n[2/3] Executing SQL batch via Supabase Management Query Engine...');
  const queryRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Santhaya-Migration-Runner/1.0',
    },
    body: JSON.stringify({ query: sqlContent }),
  });

  if (!queryRes.ok) {
    const errText = await queryRes.text();
    console.error(`\n❌ SQL EXECUTION FAILED: HTTP ${queryRes.status}`);
    console.error(`Response details: ${errText}`);
    process.exit(1);
  }

  const responseText = await queryRes.text();
  console.log('  ✓ SQL execution succeeded. Response status: HTTP ' + queryRes.status + ' OK.');

  // Step C: Execution Confirmation
  console.log('\n[3/3] Migration Applied Successfully:');
  console.log(`  File: ${path.basename(resolvedPath)}`);
  console.log('='.repeat(70));
}

runMigration().catch((err) => {
  console.error('\n❌ Execution Exception:', err.message);
  process.exit(1);
});

