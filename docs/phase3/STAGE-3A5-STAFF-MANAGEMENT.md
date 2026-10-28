# Santhaya Associates — Stage 3A-5 Staff Management Interface & Operations Architecture
Document Version: 1.0.0
Status: Implementation Verified (Automated Tests & Production Build Passed)
Environment: Development (`bkqneudnnhvvwmtggorz`)

---

## 1. Overview & Purpose

Stage 3A-5 provides the internal management interface and server-side operations for authorized Santhaya Associates administrators to manage company personnel, provision invitations, assign role permissions, and control account activation states.

---

## 2. Route Architecture

All staff management routes are deployed in Next.js App Router under the protected `/staff/*` path hierarchy:

| Route Path | Type | Access Level | Description |
|---|:---:|---|---|
| `/staff` | SSR Server Component | All Active Staff | Master Staff ERP dashboard overview, metrics, inline name editing, and ERP launchpad. |
| `/staff/team` | SSR Server Component | All Active Staff | Comprehensive staff directory table with name, email, role badge, status, and join date. |
| `/staff/team/invite` | SSR + Interactive Form | Admin & Super Admin | Staff invitation form enforcing dynamic role ceilings and generating temporary credentials. |
| `/staff/team/[id]` | SSR + Interactive Client | Admin & Super Admin | Staff member detail view, role management dropdown (Super Admin only), account status toggle, and audit log history. |

---

## 3. Server Actions & Security Controls

All mutations are implemented as authenticated Next.js Server Actions in `src/lib/auth/staff-actions.ts`:

### 3.1 `inviteStaffAction`
- **Dual-Barrier Validation**: Verifies both authenticated Supabase session and active database profile (`is_active = true`).
- **Role Ceiling Enforcement**:
  - `super_admin`: Authorized to provision any role (`super_admin`, `admin`, `estimator`, `billing_manager`, `viewer`).
  - `admin`: Strictly limited to operational tiers (`estimator`, `billing_manager`, `viewer`). Attempting to invite an `admin` or `super_admin` raises an immediate `403 Forbidden` error.
  - Other roles: Blocked from invoking invitations.
- **Server-Side Auth Provisioning**: Uses `createAdminClient()` exclusively on the server to invoke `supabase.auth.admin.createUser()`.
- **Zero Real Email Policy**: In compliance with the non-destructive development invariants, automated email dispatch is withheld. Credentials are returned securely to the invoking administrator's terminal/UI for direct out-of-band delivery.
- **Failure Compensation**: If `staff_profiles` row creation fails, the newly provisioned Supabase Auth account is automatically deleted (`deleteUser()`) to prevent orphaned records.

### 3.2 `updateStaffRoleAction`
- **Caller Restriction**: Exclusively permitted for `super_admin`. Ordinary administrators cannot modify staff roles.
- **Anti-Self-Escalation**: A Super Administrator cannot modify their own role (`targetUserId === profile.id` rejected).
- **Sole Super Admin Lockout Guard**: Enforced at the database RPC layer using transaction-scoped advisory locking (`pg_advisory_xact_lock`) to serialize concurrent demotion attempts across all sessions.
- **Auditability**: Records `staff_role_updated` event in `public.audit_logs`.

### 3.3 `updateStaffStatusAction`
- **Caller Restriction**: Permitted for `super_admin` and `admin`.
- **Privilege Ceiling**: Ordinary administrators cannot suspend or activate an `admin` or `super_admin`.
- **Anti-Self-Deactivation**: Staff cannot deactivate their own account (`targetUserId === profile.id && !isActive` rejected).
- **Sole Super Admin Lockout Guard**: Deactivating the last active Super Administrator is prevented by database RPC logic.
- **Auditability**: Records `staff_status_updated` event in `public.audit_logs`.

### 3.4 `updateOwnProfileNameAction`
- Allows any active staff member to update their own legal/display name on `public.staff_profiles`.
- Enforces column-level security: only `full_name` and `updated_at` can be modified.

---

## 4. UI Components & User Experience

- **Responsive Sidebar (`StaffSidebar.tsx`)**: Desktop fixed navigation and mobile toggleable drawer with active state tracking.
- **Interactive Modals**: Confirmation dialogs required before committing sensitive role modifications or account suspensions.
- **Accessible Form Elements**: Clear labels, aria-labels, loading spinners, and inline feedback alerts.
- **Zero Marketing Site Leakage**: Public routes (`/`, `/services`, `/about`, `/request-quotation`) contain zero links to `/staff`, `/staff/team`, or `/staff/login`.
- **Anti-Cache Headers**: All staff routes emit `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0`, and `X-Robots-Tag: noindex, nofollow`.

---

## 5. Verification Results

- Automated test suite `scripts/test-phase3a5-staff.mjs`: **45 / 45 PASSED**.
- TypeScript typecheck (`tsc --noEmit`): **0 errors**.
- ESLint: **0 errors / 0 warnings**.
- Next.js Production Build (`next build`): **14 / 14 pages generated cleanly**.

