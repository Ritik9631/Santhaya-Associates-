# Santhaya Associates — Staff ERP Administrator & Operations Guide

> **Portal Address:** [https://santhayaassociates.com/staff/login](https://santhayaassociates.com/staff/login)  
> **Official Company Mailbox:** `santhayapvt.ltd@gmail.com`  
> **Audience:** Company Owners, Managing Directors, and Office Administrators

---

## 1. Executive Summary

The **Santhaya Associates Staff ERP** is a fully independent, secure business management system developed specifically for your firm. It enables you to handle:
- **Client Quotations & Estimates:** Create, customize, issue, and print PDF quotations with official company letterhead, round stamp, and authorized signatory.
- **GST Tax Invoices & Billing:** Generate compliant tax invoices, track payment milestones, and calculate CGST/SGST/IGST automatically.
- **Customer & Client Directory:** Maintain verified GSTIN records, contact directories, and past project history.
- **Website Enquiries:** Monitor, triage, and respond to incoming requests submitted through the official website.
- **Staff Access & Security:** Add employees, assign appropriate access levels, reset lost passwords, and suspend accounts when staff members depart.

**No technical knowledge or database access is ever required.** All day-to-day operations, employee invitations, and password resets are managed directly through the user-friendly web portal.

---

## 2. Accessing the Portal & Logging In

1. Open your web browser (Google Chrome, Microsoft Edge, Safari, or Firefox) on your computer, tablet, or mobile phone.
2. Navigate to:  
   **[https://santhayaassociates.com/staff/login](https://santhayaassociates.com/staff/login)**
3. Enter your corporate email address:
   - **Primary Company Super Administrator:** `santhayapvt.ltd@gmail.com`
   - **Backup Super Administrator:** `heistofeverything@gmail.com`
4. Enter your confidential password.
5. Click **"Sign In to Staff Portal"**.

> [!TIP]
> **Mobile App / PWA:** On Android or iPhone, tap your browser's menu (three dots or share button) and select **"Add to Home Screen"** or **"Install App"**. This installs the Santhaya Associates Staff Portal as a standalone application on your mobile device.

---

## 3. Password Recovery & Lost Credentials

If an employee or company administrator forgets their password, they can recover access independently in two ways:

### Method A: Self-Service Recovery (Direct from Website)
1. On the login screen ([https://santhayaassociates.com/staff/login](https://santhayaassociates.com/staff/login)), click **"Forgot Password?"**.
2. Enter your registered email address and click **"Send Reset Link"**.
3. Open your email inbox and click the secure, single-use link received.
4. On the **Reset Password** screen, enter a new password (minimum 8 characters, containing uppercase, lowercase, numbers, and symbols).
5. Click **"Update Password & Sign In"**. Your password is immediately updated and you can sign in.

### Method B: Administrator-Assisted Recovery (Via Team Directory)
If an employee cannot access their email or requests help from management:
1. Log in as a Super Admin or Admin.
2. In the navigation sidebar, click **"Staff Management"** (or **"Team"**).
3. Click on the employee's name to open their profile.
4. In the **"Security & Account Recovery"** card:
   - Click **"Send Password Reset Email"** to trigger a fresh recovery email to their inbox.
   - Alternatively, copy the generated **Single-Use Cryptographic Recovery Link** and send it directly to the employee via WhatsApp, Slack, or company chat.
5. When the employee clicks the link, they establish their new private password.

> [!IMPORTANT]
> **Zero Password Exposure:** Administrators never see or handle employee passwords in plaintext. The system generates secure single-use cryptographic links so that only the employee ever knows their password.

---

## 4. Staff Management & Role Permissions

You can invite new team members and assign them exact permission levels matching their company responsibilities.

### Available Roles & Capabilities

| Role | Primary Responsibility | Permissions & Access |
| :--- | :--- | :--- |
| **Super Administrator** | Company Owner / Managing Director | Full system control. Can invite any staff, change roles, suspend users, configure settings, and approve all transactions. |
| **Administrator** | General Manager / Senior Office Manager | Manages day-to-day operations. Can invite estimators, billing managers, and viewers. Can approve quotations and invoices. |
| **Billing & GST Manager** | Accountant / Accounts Department | Full access to Tax Invoices, GST calculations, payment logging, and customer ledgers. Read-only access to quotations. |
| **Tender Estimator** | Quantity Surveyor / Site Estimator | Drafts and prepares cost estimates, BOQ items, and quotations. Cannot issue final tax invoices. |
| **Auditor / Viewer** | External CA / Bank Auditor / Trainee | Read-only access across all records for review and compliance auditing. Cannot create, edit, or delete data. |

---

## 5. How to Onboard a New Employee

1. Navigate to **Staff Management** > click **"Invite Staff Member"** in the top right.
2. Fill in the employee's details:
   - **Full Name:** e.g., *Rajesh Kumar*
   - **Corporate Email:** e.g., *rajesh@santhayaassociates.com*
   - **Assign Role:** Select the appropriate role (e.g., *Tender Estimator*).
3. Click **"Create Staff Member"**.
4. The system will provision their account and display a **Single-Use Setup Link**.
5. Copy the link and deliver it to the employee, or have them check their inbox. Upon opening the link, they will create their password and immediately gain access to their authorized ERP screens.

---

## 6. How to Suspend or Reactivate a Staff Member

When an employee resigns or takes extended leave:
1. Go to **Staff Management** > click the employee's name.
2. Locate the **"Account Status & Access"** section.
3. Click **"Suspend Staff Account"** and confirm.
4. **Immediate Effect:** All active sessions for this employee are immediately terminated. They cannot log in, view quotations, or access client data.
5. If the employee returns, simply click **"Reactivate Staff Account"** to restore their access.

---

## 7. Email Delivery Setup (Workstream 4 Guide)

Your ERP features automated email dispatch for quotation deliveries, client enquiries, and staff recovery links. To ensure 100% inbox delivery under your official company domain (`santhayaassociates.com`):

### Option 1: Resend Domain Verification (Recommended for Production)
1. Log into your [Resend.com](https://resend.com) dashboard.
2. Navigate to **Domains** > **Add Domain** > enter `santhayaassociates.com`.
3. Add the 3 provided DNS records (SPF, DKIM, DMARC) in your Hostinger DNS Zone Editor for `santhayaassociates.com`.
4. Once verified (green checkmark), outgoing emails will be sent from `quotations@santhayaassociates.com` or `billing@santhayaassociates.com`.

### Option 2: Supabase Custom SMTP (For Auth & Password Resets)
For automatic password reset emails sent by the authentication gateway:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/flxhwgevmqvuqdjaejwa).
2. Go to **Project Settings** > **Authentication** > **SMTP Settings**.
3. Toggle **"Enable Custom SMTP"** to ON.
4. Enter your SMTP credentials:
   - **Sender Email:** `notifications@santhayaassociates.com` (or your company sender)
   - **Sender Name:** `Santhaya Associates`
   - **Host:** `smtp.resend.com` (Port `465` or `587`)
   - **Username:** `resend`
   - **Password:** *Your Resend API Key*
5. Save changes. Password reset emails will now be automatically dispatched directly from your company domain.

---

## 8. Summary Checklist for Management

- [x] Portal is live at **[https://santhayaassociates.com](https://santhayaassociates.com)**
- [x] Primary Super Admin account: `santhayapvt.ltd@gmail.com`
- [x] Backup Super Admin account: `heistofeverything@gmail.com`
- [x] Self-service password recovery is active at `/staff/forgot-password`
- [x] Zero password exposure policy enforced across all team management forms
- [x] Production database protected by automated immutable audit logs

*For assistance or additional ERP customizations, contact your engineering support team.*
