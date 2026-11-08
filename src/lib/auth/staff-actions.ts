'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from './session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl } from '@/lib/utils/app-url';
import type { StaffRole } from '@/types/database';
import crypto from 'node:crypto';

export interface ActionResponse<T = Record<string, unknown>> {
  success?: boolean;
  error?: string;
  data?: T;
}

const ALLOWED_ROLES: StaffRole[] = ['super_admin', 'admin', 'estimator', 'billing_manager', 'viewer'];

/**
 * Server Action: Invite a new staff member
 * Role ceilings:
 * - super_admin: Can invite all roles (super_admin, admin, estimator, billing_manager, viewer)
 * - admin: Can invite estimator, billing_manager, viewer only
 * - other roles: Forbidden
 */
export async function inviteStaffAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ email: string; temporaryPassword: string; inviteLink: string | null; role: StaffRole; fullName: string }>> {
  try {
    const { user, profile } = await requireStaffSession();

    // 1. Authorization check
    if (profile.role !== 'super_admin' && profile.role !== 'admin') {
      return { error: 'Access denied: Only administrators can invite staff members.' };
    }

    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const fullName = (formData.get('fullName') as string)?.trim();
    const role = (formData.get('role') as string)?.trim() as StaffRole;

    // 2. Input validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Please enter a valid corporate email address.' };
    }
    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      return { error: 'Full name must be between 2 and 100 characters.' };
    }
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return { error: 'Please select a valid staff role.' };
    }

    // 3. Role ceiling enforcement
    if (profile.role === 'admin') {
      if (role === 'admin' || role === 'super_admin') {
        return { error: 'Privilege ceiling: Ordinary Administrators cannot invite Administrator or Super Administrator accounts.' };
      }
    }

    // 4. Generate high-entropy temporary password
    const tempPassword = `Santhaya#${crypto.randomBytes(6).toString('base64url')}!9`;

    // 5. Server-side Supabase Admin: create Auth user
    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        provisioned_by: profile.id,
        must_change_password: true,
      },
    });

    if (authError || !authData?.user) {
      if (authError?.message?.includes('already registered') || authError?.message?.includes('already exists')) {
        return { error: 'A user account with this email already exists in the system.' };
      }
      return { error: `Failed to create authentication account: ${authError?.message || 'Unknown error'}` };
    }

    const newUserId = authData.user.id;

    // Generate single-use secure invite link if supported by auth server
    let inviteLink: string | null = null;
    try {
      const appUrl = getAppUrl();
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: `${appUrl}/staff/auth/callback?next=/staff/reset-password`,
        },
      });
      if (linkData?.properties?.hashed_token) {
        inviteLink = `${appUrl}/staff/reset-password?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=invite`;
      } else if (linkData?.properties?.action_link) {
        inviteLink = linkData.properties.action_link;
      }
    } catch {
      // Graceful fallback: link generation is non-fatal in dev mode
    }

    // 6. Create Staff Profile via administrative RPC or adminClient
    const userClient = await createServerSupabaseClient();
    const { error: rpcError } = await userClient.rpc('admin_create_staff_profile', {
      p_user_id: newUserId,
      p_email: email,
      p_full_name: fullName,
      p_role: role,
    });

    if (rpcError) {
      // If RPC is not yet applied, fallback to admin client insertion with manual audit logging
      const { error: insertError } = await adminClient.from('staff_profiles').insert({
        id: newUserId,
        email,
        full_name: fullName,
        role,
        is_active: true,
      });

      if (insertError) {
        // Rollback created Auth user to prevent orphaned account
        await adminClient.auth.admin.deleteUser(newUserId);
        return { error: `Failed to create staff profile: ${insertError.message}. Authentication account rolled back.` };
      }

      await adminClient.from('audit_logs').insert({
        entity_type: 'staff_profiles',
        entity_id: newUserId,
        action: 'staff_created',
        actor_type: 'staff',
        actor_id: user.id,
        new_state: { email, full_name: fullName, role, is_active: true },
      });
    }

    revalidatePath('/staff');
    revalidatePath('/staff/team');

    return {
      success: true,
      data: {
        email,
        temporaryPassword: tempPassword,
        inviteLink,
        role,
        fullName,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during staff invitation.';
    return { error: message };
  }
}

/**
 * Server Action: Update a staff member's role
 * Only super_admin can change roles.
 * Prevents self-modification and sole super admin demotion.
 */
export async function updateStaffRoleAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { profile } = await requireStaffSession();

    if (profile.role !== 'super_admin') {
      return { error: 'Access denied: Only a Super Administrator can modify staff roles.' };
    }

    const targetUserId = formData.get('targetUserId') as string;
    const newRole = formData.get('newRole') as StaffRole;

    if (!targetUserId) {
      return { error: 'Target staff user ID is required.' };
    }
    if (!newRole || !ALLOWED_ROLES.includes(newRole)) {
      return { error: 'Invalid role selection.' };
    }
    if (targetUserId === profile.id) {
      return { error: 'Self-modification forbidden: You cannot change your own role.' };
    }

    const userClient = await createServerSupabaseClient();
    const { error: rpcError } = await userClient.rpc('admin_update_staff_role', {
      p_target_user_id: targetUserId,
      p_new_role: newRole,
    });

    if (rpcError) {
      return { error: rpcError.message };
    }

    revalidatePath('/staff/team');
    revalidatePath(`/staff/team/${targetUserId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update staff role.';
    return { error: message };
  }
}

/**
 * Server Action: Update a staff member's active status (Activate / Deactivate)
 * Enforces role hierarchy, anti-self-deactivation, and sole super admin lockout defense.
 */
export async function updateStaffStatusAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { profile } = await requireStaffSession();

    if (profile.role !== 'super_admin' && profile.role !== 'admin') {
      return { error: 'Access denied: Only administrators can modify staff status.' };
    }

    const targetUserId = formData.get('targetUserId') as string;
    const isActiveStr = formData.get('isActive') as string;
    const isActive = isActiveStr === 'true';

    if (!targetUserId) {
      return { error: 'Target staff user ID is required.' };
    }
    if (targetUserId === profile.id && !isActive) {
      return { error: 'Self-modification forbidden: You cannot deactivate your own account.' };
    }

    const userClient = await createServerSupabaseClient();
    const { error: rpcError } = await userClient.rpc('admin_update_staff_status', {
      p_target_user_id: targetUserId,
      p_is_active: isActive,
    });

    if (rpcError) {
      return { error: rpcError.message };
    }

    revalidatePath('/staff/team');
    revalidatePath(`/staff/team/${targetUserId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update staff account status.';
    return { error: message };
  }
}

/**
 * Server Action: Update own profile name
 * Any active staff member can update their own display name.
 */
export async function updateOwnProfileNameAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { profile } = await requireStaffSession();

    const fullName = (formData.get('fullName') as string)?.trim();
    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      return { error: 'Full name must be between 2 and 100 characters.' };
    }

    const userClient = await createServerSupabaseClient();
    const { error: updateError } = await userClient
      .from('staff_profiles')
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath('/staff');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile name.';
    return { error: message };
  }
}

/**
 * Server Action: Dispatch Password Reset Email to Staff Member
 * Super Admins can reset anyone. Admins can reset estimator, billing_manager, viewer.
 * Dispatches a password recovery link using Supabase Auth targeting /staff/auth/callback.
 */
export async function sendStaffPasswordResetAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { profile } = await requireStaffSession();

    if (profile.role !== 'super_admin' && profile.role !== 'admin') {
      return { error: 'Access denied: Only administrators can dispatch password reset links.' };
    }

    const targetUserId = formData.get('targetUserId') as string;
    if (!targetUserId) {
      return { error: 'Target staff user ID is required.' };
    }

    const adminClient = createAdminClient();
    const { data: targetProfile, error: profileErr } = await adminClient
      .from('staff_profiles')
      .select('id, email, role, full_name, is_active')
      .eq('id', targetUserId)
      .maybeSingle();

    if (profileErr || !targetProfile) {
      return { error: 'Target staff profile not found.' };
    }

    // Role ceiling: ordinary admin cannot reset super_admin or admin
    if (profile.role === 'admin') {
      if (targetProfile.role === 'admin' || targetProfile.role === 'super_admin') {
        return {
          error:
            'Privilege ceiling: Ordinary Administrators cannot reset passwords for Administrator or Super Administrator accounts.',
        };
      }
    }

    if (!targetProfile.is_active) {
      return {
        error: 'Cannot reset password for a deactivated staff account. Please activate the account first.',
      };
    }

    const appUrl = getAppUrl();
    const redirectTo = `${appUrl}/staff/auth/callback?next=/staff/reset-password`;

    // Attempt direct email dispatch via Supabase Auth
    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(targetProfile.email, {
      redirectTo,
    });

    if (resetError) {
      console.error('[Staff Actions] resetPasswordForEmail error:', resetError.message);
      return { error: `Failed to dispatch recovery email: ${resetError.message}` };
    }

    // Also generate single-use recovery link as a secure fallback
    let actionLink: string | null = null;
    try {
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: targetProfile.email,
        options: { redirectTo },
      });
      if (linkData?.properties?.hashed_token) {
        actionLink = `${appUrl}/staff/reset-password?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=recovery`;
      } else if (linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link;
      }
    } catch {
      // Non-fatal
    }

    // Record audit event
    await adminClient.from('audit_logs').insert({
      entity_type: 'staff_profiles',
      entity_id: targetUserId,
      action: 'staff_password_reset_dispatched',
      actor_type: 'staff',
      actor_id: profile.id,
      new_state: {
        target_email: targetProfile.email,
        target_role: targetProfile.role,
        dispatched_by: profile.id,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      data: {
        message: `Password reset email dispatched successfully to ${targetProfile.email}.`,
        link: actionLink,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to dispatch password reset.';
    return { error: message };
  }
}

/**
 * Server Action: Re-dispatch Staff Setup Invitation
 */
export async function resendStaffInviteAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { profile } = await requireStaffSession();

    if (profile.role !== 'super_admin' && profile.role !== 'admin') {
      return { error: 'Access denied: Only administrators can reinvite staff members.' };
    }

    const targetUserId = formData.get('targetUserId') as string;
    if (!targetUserId) {
      return { error: 'Target staff user ID is required.' };
    }

    const adminClient = createAdminClient();
    const { data: targetProfile, error: profileErr } = await adminClient
      .from('staff_profiles')
      .select('id, email, role, full_name, is_active')
      .eq('id', targetUserId)
      .maybeSingle();

    if (profileErr || !targetProfile) {
      return { error: 'Target staff profile not found.' };
    }

    if (profile.role === 'admin') {
      if (targetProfile.role === 'admin' || targetProfile.role === 'super_admin') {
        return {
          error:
            'Privilege ceiling: Ordinary Administrators cannot reinvite Administrator or Super Administrator accounts.',
        };
      }
    }

    const appUrl = getAppUrl();
    const redirectTo = `${appUrl}/staff/auth/callback?next=/staff/reset-password`;

    const { error: inviteErr } = await adminClient.auth.resetPasswordForEmail(targetProfile.email, {
      redirectTo,
    });

    if (inviteErr) {
      return { error: `Failed to re-dispatch invitation: ${inviteErr.message}` };
    }

    // Also generate single-use invite link as a secure fallback
    let actionLink: string | null = null;
    try {
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email: targetProfile.email,
        options: { redirectTo },
      });
      if (linkData?.properties?.hashed_token) {
        actionLink = `${appUrl}/staff/reset-password?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=recovery`;
      } else if (linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link;
      }
    } catch {
      // Non-fatal fallback
    }

    await adminClient.from('audit_logs').insert({
      entity_type: 'staff_profiles',
      entity_id: targetUserId,
      action: 'staff_invite_redispatched',
      actor_type: 'staff',
      actor_id: profile.id,
      new_state: {
        target_email: targetProfile.email,
        target_role: targetProfile.role,
        dispatched_by: profile.id,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      data: {
        message: `Invitation setup email re-dispatched successfully to ${targetProfile.email}.`,
        link: actionLink,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to re-dispatch invitation.';
    return { error: message };
  }
}
