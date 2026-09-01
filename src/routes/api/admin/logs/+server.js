// src/routes/api/admin/logs/+server.js
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { isAdmin } from '$lib/adminAuth.js';

export async function GET({ request, url }) {
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

    // Verify whether authenticated user is an authorized admin
    if (!isAdmin(user.email)) {
      return new Response(JSON.stringify({ error: 'Access denied. Only administrators can view logs.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const actionFilter = url.searchParams.get('action') || 'all';
    const searchQuery = (url.searchParams.get('search') || '').trim().toLowerCase();
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    let activityLogs = [];
    let totalCount = 0;
    let tableExists = true;

    // 1. Try querying activity_logs
    try {
      let query = authenticatedClient
        .from('activity_logs')
        .select('*', { count: 'exact' });

      if (actionFilter && actionFilter !== 'all') {
        if (actionFilter === 'pdf') {
          query = query.eq('action', 'generate_pdf');
        } else if (actionFilter === 'documents') {
          query = query.in('action', ['create_document', 'update_document', 'delete_document']);
        } else if (actionFilter === 'keys') {
          query = query.in('action', ['create_api_key', 'delete_api_key']);
        } else if (actionFilter === 'auth') {
          query = query.in('action', ['user_login', 'user_register']);
        } else {
          query = query.eq('action', actionFilter);
        }
      }

      if (searchQuery) {
        query = query.or(`user_email.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) {
        tableExists = false;
      } else {
        activityLogs = data || [];
        totalCount = count || 0;
      }
    } catch (err) {
      tableExists = false;
    }

    // 2. Compute category counts for tabs/badges
    let counts = {
      all: totalCount,
      pdf: 0,
      documents: 0,
      keys: 0,
      auth: 0
    };

    if (tableExists) {
      const { count: pdfCount } = await authenticatedClient.from('activity_logs').select('*', { count: 'exact', head: true }).eq('action', 'generate_pdf');
      const { count: docCount } = await authenticatedClient.from('activity_logs').select('*', { count: 'exact', head: true }).in('action', ['create_document', 'update_document', 'delete_document']);
      const { count: keyCount } = await authenticatedClient.from('activity_logs').select('*', { count: 'exact', head: true }).in('action', ['create_api_key', 'delete_api_key']);
      const { count: authCount } = await authenticatedClient.from('activity_logs').select('*', { count: 'exact', head: true }).in('action', ['user_login', 'user_register']);

      counts = {
        all: totalCount,
        pdf: pdfCount || 0,
        documents: docCount || 0,
        keys: keyCount || 0,
        auth: authCount || 0
      };
    } else {
      // Fallback to pdf_usage_logs if activity_logs is not yet created
      const { data: legacyLogs, count: legacyCount } = await authenticatedClient
        .from('pdf_usage_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      activityLogs = (legacyLogs || []).map(l => ({
        id: l.id,
        user_id: l.user_id,
        user_email: l.is_anonymous ? 'anonymous' : (l.user_id === user.id ? user.email : 'registered user'),
        action: 'generate_pdf',
        details: { method: l.is_anonymous ? 'Anonymous' : 'Registered Session' },
        created_at: l.created_at
      }));
      totalCount = legacyCount || 0;
      counts.all = totalCount;
      counts.pdf = totalCount;
    }

    // 3. Stats for overview metrics
    const { count: legacyTotalExports } = await authenticatedClient.from('pdf_usage_logs').select('*', { count: 'exact', head: true });
    const { count: legacyAnonExports } = await authenticatedClient.from('pdf_usage_logs').select('*', { count: 'exact', head: true }).eq('is_anonymous', true);
    const { count: legacyAuthExports } = await authenticatedClient.from('pdf_usage_logs').select('*', { count: 'exact', head: true }).eq('is_anonymous', false);

    return new Response(JSON.stringify({
      logs: activityLogs,
      totalCount,
      page,
      limit,
      counts,
      tableExists,
      stats: {
        total: legacyTotalExports || counts.pdf || 0,
        anonymous: legacyAnonExports || 0,
        authenticated: legacyAuthExports || (counts.pdf - (legacyAnonExports || 0)) || 0
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in admin logs endpoint:', error.message);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve activity logs.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
