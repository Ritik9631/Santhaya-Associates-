import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { InviteStaffForm } from './InviteStaffForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Invite Staff Member | Santhaya Associates ERP',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InviteStaffPage() {
  const { profile } = await requireStaffSession();

  // Role ceiling: only super_admin and admin can invite staff
  if (profile.role !== 'super_admin' && profile.role !== 'admin') {
    redirect('/staff/team');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/staff/team"
          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Staff Directory</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <UserPlus className="w-6 h-6 text-gold-500" />
          <span>Provision New Staff Member</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Create an internal authentication identity and assign enterprise role permissions.
        </p>
      </div>

      <InviteStaffForm callerRole={profile.role} />
    </div>
  );
}

