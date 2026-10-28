import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import { StaffDetailManager } from './StaffDetailManager';
import type { StaffRole } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Manage Staff Member | Santhaya Associates ERP',
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { profile: callerProfile } = await requireStaffSession();

  // Role ceiling: only super_admin and admin can view/manage staff details
  if (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin') {
    redirect('/staff/team');
  }

  const supabase = await createServerSupabaseClient();

  // Fetch target profile
  const { data: targetProfile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('id, email, full_name, role, is_active, created_at, updated_at')
    .eq('id', params.id)
    .single();

  if (profileError || !targetProfile) {
    notFound();
  }

  // Fetch audit logs for this target
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('id, action, created_at, actor_id, previous_state, new_state')
    .eq('entity_type', 'staff_profiles')
    .eq('entity_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/staff/team"
        className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Staff Directory</span>
      </Link>

      <StaffDetailManager
        callerId={callerProfile.id}
        callerRole={callerProfile.role as StaffRole}
        target={targetProfile as any}
        auditLogs={(auditLogs || []) as any}
      />
    </div>
  );
}

