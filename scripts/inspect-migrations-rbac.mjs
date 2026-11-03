import fs from 'fs';

function inspectMigration(file) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('='.repeat(70));
  console.log(`FILE: ${file}`);
  console.log('='.repeat(70));
  content.split('\n').forEach((l, i) => {
    if (l.includes('FUNCTION') || l.includes('CREATE POLICY') || l.includes('staff_profiles') || l.includes('super_admin')) {
      console.log(`${i+1}: ${l.trim()}`);
    }
  });
}

inspectMigration('supabase/migrations/20261029120000_stage3a_staff_auth_enhancements.sql');
inspectMigration('supabase/migrations/20261029120001_stage3a_step_b_rbac_enhancements.sql');
