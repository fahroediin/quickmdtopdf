// src/routes/api/admin/logs/+server.js
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_ADMIN_EMAIL } from '$env/static/public';

export async function GET({ request }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authentication token.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);

    // Create a request-scoped Supabase client with the user's token
    const authenticatedClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await authenticatedClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Session expired or invalid token.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ambil admin email dari configuration, default ke admin@quickmdtopdf.com
    const adminEmail = PUBLIC_ADMIN_EMAIL || 'admin@quickmdtopdf.com';
    
    // Verifikasi apakah email user terautentikasi adalah admin
    if (user.email !== adminEmail) {
      return new Response(JSON.stringify({ error: 'Access denied. Only administrators can view logs.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Jalankan query agregat log
    const { count: totalLogs, error: err1 } = await authenticatedClient
      .from('pdf_usage_logs')
      .select('*', { count: 'exact', head: true });

    if (err1) throw err1;

    const { count: anonLogs, error: err2 } = await authenticatedClient
      .from('pdf_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('is_anonymous', true);

    if (err2) throw err2;

    const { count: authLogs, error: err3 } = await authenticatedClient
      .from('pdf_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('is_anonymous', false);

    if (err3) throw err3;

    const { data: recentLogs, error: err4 } = await authenticatedClient
      .from('pdf_usage_logs')
      .select('id, user_id, is_anonymous, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (err4) throw err4;

    return new Response(JSON.stringify({
      total: totalLogs || 0,
      anonymous: anonLogs || 0,
      authenticated: authLogs || 0,
      logs: recentLogs || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching admin logs:', error.message);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve usage statistics.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
