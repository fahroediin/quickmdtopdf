// src/lib/adminAuth.js
import { PUBLIC_ADMIN_EMAIL } from '$env/static/public';

/**
 * Returns an array of trimmed, lowercase admin email addresses defined in PUBLIC_ADMIN_EMAIL.
 * Supports single email or comma-separated list of emails.
 * e.g., "admin@quickmdtopdf.com, imam.fahrudin.work@gmail.com"
 * @returns {string[]}
 */
export function getAdminEmails() {
  const raw = PUBLIC_ADMIN_EMAIL || 'admin@quickmdtopdf.com';
  return raw
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
}

/**
 * Checks if the given email address has administrator privileges.
 * @param {string | null | undefined} email 
 * @returns {boolean}
 */
export function isAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.trim().toLowerCase());
}
