/**
 * Santhaya Associates — Server-Side Staff Authentication & Session Guards
 * File: src/lib/auth/session.ts
 *
 * Provides cryptographic session verification and active staff authorization checks.
 * Enforces dual-barrier security: Supabase Auth Session + Active Staff Profile.
 *
 * SECURITY RULES:
 * 1. An authenticated Supabase Auth user is NOT authorized unless public.staff_profiles
 *    contains a matching record with is_active = true.
 * 2. Never exposes service-role keys or privileged credentials to browser code.
 * 3. Always verifies session server-side; does not rely on middleware alone.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database, StaffRole } from '@/types/database';
import { redirect } from 'next/navigation';
import type { User, SupabaseClient } from '@supabase/supabase-js';

export type StaffProfile = Database['public']['Tables']['staff_profiles']['Row'];

export interface StaffAuthResult {
  isAuthenticated: boolean;
  isActiveStaff: boolean;
  user: User | null;
  profile: StaffProfile | null;
  error: 'NO_SESSION' | 'NO_STAFF_PROFILE' | 'STAFF_INACTIVE' | null;
}

/**
 * Retrieves the current authenticated user and validates their active staff profile.
 * Non-throwing query for inspectable security checks.
 */
export async function getStaffAuth(
  supabaseClient?: SupabaseClient<Database>
): Promise<StaffAuthResult> {
  const supabase = supabaseClient || createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      isAuthenticated: false,
      isActiveStaff: false,
      user: null,
      profile: null,
      error: 'NO_SESSION',
    };
  }

  // Verify staff profile in database
  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      isAuthenticated: true,
      isActiveStaff: false,
      user,
      profile: null,
      error: 'NO_STAFF_PROFILE',
    };
  }

  if (!profile.is_active) {
    return {
      isAuthenticated: true,
      isActiveStaff: false,
      user,
      profile,
      error: 'STAFF_INACTIVE',
    };
  }

  return {
    isAuthenticated: true,
    isActiveStaff: true,
    user,
    profile,
    error: null,
  };
}

/**
 * Server-side guard that enforces an active staff session.
 * Throws a Next.js redirect if unauthenticated, profile missing, or inactive.
 */
export async function requireStaffSession(
  supabaseClient?: SupabaseClient<Database>
): Promise<{ user: User; profile: StaffProfile }> {
  const auth = await getStaffAuth(supabaseClient);

  if (!auth.isAuthenticated || !auth.user) {
    redirect('/staff/login');
  }

  if (!auth.isActiveStaff || !auth.profile) {
    if (auth.error === 'STAFF_INACTIVE') {
      redirect('/staff/login?error=inactive');
    }
    redirect('/staff/login?error=unauthorized');
  }

  return {
    user: auth.user,
    profile: auth.profile,
  };
}

/**
 * Checks whether the staff profile has one of the required roles.
 */
export function hasRequiredRole(
  profile: StaffProfile | null,
  allowedRoles: StaffRole[]
): boolean {
  if (!profile || !profile.is_active) return false;
  return allowedRoles.includes(profile.role);
}

