// src/lib/server/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

// Service-role client: bypasses RLS, so it must never reach the browser.
// SvelteKit refuses to bundle anything under $lib/server into client code.
// Null when SUPABASE_SERVICE_ROLE_KEY is not set; callers skip the write.
export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;
