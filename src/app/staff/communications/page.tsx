import React from 'react';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import CommunicationsManager from './CommunicationsManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Communications & Outbox Hub | Santhaya Associates Staff ERP',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CommunicationsPage() {
  const session = await requireStaffSession();
  const adminClient = createAdminClient();

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  // 1. Fetch outbox jobs
  const { data: jobs } = await adminClient
    .from('email_outbox')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  // 2. Fetch daily sent count for quota tile
  const { count: dailySent } = await adminClient
    .from('email_outbox')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('processed_at', startOfDay);

  const dailyLimit = parseInt(process.env.EMAIL_DAILY_LIMIT || '80', 10);
  const providerName = process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'mock');

  // 3. Fetch quotation delivery logs
  const { data: quotationLogs } = await adminClient
    .from('quotation_delivery_logs')
    .select(`
      *,
      staff_profiles:recorded_by_staff_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <CommunicationsManager
      initialJobs={jobs || []}
      quotationLogs={quotationLogs || []}
      dailySent={dailySent || 0}
      dailyLimit={dailyLimit}
      providerName={providerName}
      currentUserRole={session.profile.role}
    />
  );
}

