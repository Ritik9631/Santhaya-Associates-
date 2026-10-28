/**
 * Santhaya Associates — Open Redirect Prevention Utility
 * File: src/lib/auth/redirect.ts
 *
 * Validates and sanitizes redirectTo destinations for staff authentication.
 * Guarantees that only approved internal /staff paths are permitted.
 * Strictly rejects:
 * - External URLs (http://, https://, ftp://, etc.)
 * - Protocol-relative URLs (//example.com)
 * - Backslash bypasses (/\, \\)
 * - Data URLs and JavaScript URIs (javascript:, data:)
 * - Encoded bypass attempts (%2F%2F, %5C)
 * - Self-referential login loops (/staff/login)
 */

export function sanitizeStaffRedirect(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '/staff';
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '/staff';
  }

  // Reject protocol-relative or backslash paths
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) {
    return '/staff';
  }

  // Reject if it contains a protocol scheme (e.g. https:, javascript:, data:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return '/staff';
  }

  // Check URL decoding to catch %2f%2f or %5c bypasses
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      decoded.startsWith('//') ||
      decoded.startsWith('/\\') ||
      decoded.startsWith('\\') ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)
    ) {
      return '/staff';
    }
  } catch {
    // Malformed URL encoding
    return '/staff';
  }

  // Must strictly start with /staff
  if (!trimmed.startsWith('/staff')) {
    return '/staff';
  }

  // Prevent redirect loops back to login
  if (trimmed === '/staff/login' || trimmed.startsWith('/staff/login?')) {
    return '/staff';
  }

  // Path must be a valid relative pathname
  try {
    const parsed = new URL(trimmed, 'https://santhaya.local');
    if (parsed.origin !== 'https://santhaya.local') {
      return '/staff';
    }
    if (!parsed.pathname.startsWith('/staff')) {
      return '/staff';
    }
    if (parsed.pathname === '/staff/login') {
      return '/staff';
    }
    // Return relative path + search query
    return parsed.pathname + parsed.search;
  } catch {
    return '/staff';
  }
}

