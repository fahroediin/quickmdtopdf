// src/lib/activityLogger.js
import { supabase } from '$lib/supabaseClient';

/**
 * Logs an activity event into the `activity_logs` table in Supabase.
 * Fails gracefully (non-blocking) if the table does not exist yet.
 * 
 * @param {Object} params
 * @param {string} params.action - e.g. 'generate_pdf', 'create_document', 'update_document', 'delete_document', 'create_api_key', 'delete_api_key', 'user_login', 'user_register'
 * @param {Object} [params.details={}] - Optional metadata (e.g. document_name, method, ip)
 * @param {string} [params.userId=null] - UUID of the user
 * @param {string} [params.userEmail=null] - Email of the user
 */
export async function logActivity({ action, details = {}, userId = null, userEmail = null }) {
  try {
    let finalUserId = userId;
    let finalUserEmail = userEmail;

    // If userId or userEmail are not explicitly passed, try to infer from active session
    if (!finalUserId || !finalUserEmail) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          finalUserId = finalUserId || session.user.id;
          finalUserEmail = finalUserEmail || session.user.email;
        }
      } catch (sessionErr) {
        // Ignore session inference errors
      }
    }

    const payload = {
      action,
      details: typeof details === 'object' ? details : { raw: details },
      user_id: finalUserId || null,
      user_email: finalUserEmail || (finalUserId ? null : 'anonymous')
    };

    const { error } = await supabase.from('activity_logs').insert(payload);
    if (error) {
      // Non-blocking warning (e.g. if activity_logs table migration is not yet run)
      console.warn('[ActivityLogger] Note inserting activity log:', error.message);
    }
  } catch (err) {
    console.warn('[ActivityLogger] Error logging activity:', err.message);
  }
}
