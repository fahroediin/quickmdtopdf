// src/routes/api/admin/users/+server.js
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { isAdmin } from '$lib/adminAuth.js';

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

    // Verify whether user is an authorized admin
    if (!isAdmin(user.email)) {
      return new Response(JSON.stringify({ error: 'Access denied. Only administrators can view user management.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Try to fetch rich user list via PostgreSQL RPC function get_admin_users_list
    let usersList = [];
    let rpcAvailable = true;

    try {
      const { data: rpcData, error: rpcError } = await authenticatedClient.rpc('get_admin_users_list');
      if (rpcError) {
        rpcAvailable = false;
      } else if (rpcData) {
        usersList = rpcData.map(u => ({
          ...u,
          isAdmin: isAdmin(u.email)
        }));
      }
    } catch (err) {
      rpcAvailable = false;
    }

    // 2. Fallback: If RPC is not created yet, compute stats from documents, pdf_usage_logs, and api_keys
    if (!rpcAvailable) {
      const { data: docData } = await authenticatedClient.from('documents').select('user_id');
      const { data: logData } = await authenticatedClient.from('pdf_usage_logs').select('user_id').eq('is_anonymous', false);
      const { data: keyData } = await authenticatedClient.from('api_keys').select('user_id');

      const userMap = {};

      // Helper to init user map entry
      const ensureUser = (id) => {
        if (!id) return;
        if (!userMap[id]) {
          userMap[id] = {
            id,
            email: id === user.id ? user.email : `User (${id.substring(0, 8)}...)`,
            created_at: null,
            last_sign_in_at: null,
            documents_count: 0,
            pdf_exports_count: 0,
            api_keys_count: 0,
            isAdmin: id === user.id ? isAdmin(user.email) : false
          };
        }
      };

      (docData || []).forEach(d => {
        ensureUser(d.user_id);
        if (d.user_id) userMap[d.user_id].documents_count++;
      });

      (logData || []).forEach(l => {
        ensureUser(l.user_id);
        if (l.user_id) userMap[l.user_id].pdf_exports_count++;
      });

      (keyData || []).forEach(k => {
        ensureUser(k.user_id);
        if (k.user_id) userMap[k.user_id].api_keys_count++;
      });

      // Ensure the current admin user is always in the list
      ensureUser(user.id);
      userMap[user.id].created_at = user.created_at;
      userMap[user.id].last_sign_in_at = user.last_sign_in_at;

      usersList = Object.values(userMap);
    }

    // Compute totals
    const totalUsers = usersList.length;
    const totalDocs = usersList.reduce((sum, u) => sum + (parseInt(u.documents_count) || 0), 0);
    const totalExports = usersList.reduce((sum, u) => sum + (parseInt(u.pdf_exports_count) || 0), 0);
    const totalKeys = usersList.reduce((sum, u) => sum + (parseInt(u.api_keys_count) || 0), 0);

    return new Response(JSON.stringify({
      users: usersList,
      totalUsers,
      totalDocs,
      totalExports,
      totalKeys,
      rpcAvailable
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching admin users:', error.message);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve users list.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
