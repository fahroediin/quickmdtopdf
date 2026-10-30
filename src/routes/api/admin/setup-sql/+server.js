// src/routes/api/admin/setup-sql/+server.js
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { isAdmin } from '$lib/adminAuth.js';
import setupSql from '../../../../../sql/2026-10-30-security-fix.sql?raw';

export async function GET({ request }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid authentication token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.substring(7);

  const authenticatedClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: { user }, error: authError } = await authenticatedClient.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Session expired or invalid token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!isAdmin(user.email)) {
    return new Response(JSON.stringify({ error: 'Access denied. Only administrators can view the setup script.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(setupSql, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
