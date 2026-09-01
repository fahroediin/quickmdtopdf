<!-- src/routes/admin/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';
  import { isAdmin, getAdminEmails } from '$lib/adminAuth.js';

  let activeTab = 'overview'; // 'overview' | 'logs' | 'users' | 'sql'
  let loading = true;
  let errorMessage = '';

  // Log statistics & logs list
  let logsData = {
    logs: [],
    totalCount: 0,
    counts: { all: 0, pdf: 0, documents: 0, keys: 0, auth: 0 },
    stats: { total: 0, anonymous: 0, authenticated: 0 },
    tableExists: true
  };
  let logsActionFilter = 'all';
  let logsSearchQuery = '';
  let logsPage = 1;
  const logsPerPage = 15;

  // User management data
  let usersData = {
    users: [],
    totalUsers: 0,
    totalDocs: 0,
    totalExports: 0,
    totalKeys: 0,
    rpcAvailable: true
  };
  let usersSearchQuery = '';

  // SQL Script for in-app migration reference
  const setupSqlScript = `-- ====================================================
-- QUICKMDtoPDF DATABASE SETUP & MIGRATION SCRIPT
-- Run this in your Supabase project's SQL Editor
-- ====================================================

-- 1. Create activity_logs table for rich system event tracking
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for high-performance log queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Allow inserts from public/authenticated users, allow reads for authenticated users
CREATE POLICY "Enable insert for activity_logs"
ON public.activity_logs FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Enable select for authenticated users"
ON public.activity_logs FOR SELECT TO authenticated USING (true);


-- 2. Create RPC Function for Admin User Management Analytics
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  documents_count bigint,
  pdf_exports_count bigint,
  api_keys_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(d.doc_count, 0)::bigint AS documents_count,
    COALESCE(p.log_count, 0)::bigint AS pdf_exports_count,
    COALESCE(a.key_count, 0)::bigint AS api_keys_count
  FROM auth.users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS doc_count
    FROM public.documents
    GROUP BY user_id
  ) d ON d.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS log_count
    FROM public.activity_logs
    WHERE action = 'generate_pdf'
    GROUP BY user_id
  ) p ON p.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS key_count
    FROM public.api_keys
    GROUP BY user_id
  ) a ON a.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;
`;

  async function fetchAdminData() {
    if (!$user || !isAdmin($user.email)) {
      loading = false;
      return;
    }

    try {
      loading = true;
      errorMessage = '';

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session found.');

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      // 1. Fetch Logs Data
      const logsUrl = `/api/admin/logs?action=${logsActionFilter}&search=${encodeURIComponent(logsSearchQuery)}&page=${logsPage}&limit=${logsPerPage}`;
      const logsRes = await fetch(logsUrl, { headers });
      if (!logsRes.ok) {
        const err = await logsRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch activity logs.');
      }
      logsData = await logsRes.json();

      // 2. Fetch User Management Data
      const usersRes = await fetch('/api/admin/users', { headers });
      if (usersRes.ok) {
        usersData = await usersRes.json();
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      errorMessage = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchAdminData();
  });

  $: if ($user) {
    fetchAdminData();
  }

  function handleTabChange(tab) {
    activeTab = tab;
  }

  function handleFilterChange(filter) {
    logsActionFilter = filter;
    logsPage = 1;
    fetchAdminData();
  }

  function handleLogsSearch() {
    logsPage = 1;
    fetchAdminData();
  }

  function copySetupSql() {
    navigator.clipboard.writeText(setupSqlScript);
    alert('SQL Setup script copied to clipboard! Paste and execute it in your Supabase SQL Editor.');
  }

  // Filter users by search query
  $: filteredUsers = usersData.users.filter(u => 
    (u.email || '').toLowerCase().includes(usersSearchQuery.toLowerCase()) ||
    (u.id || '').toLowerCase().includes(usersSearchQuery.toLowerCase())
  );

  function getActionBadge(action) {
    switch (action) {
      case 'generate_pdf':
        return { label: 'PDF Export', bg: 'bg-[#1b61c9]/10', text: 'text-[#1b61c9]', border: 'border-[#1b61c9]/20' };
      case 'create_document':
        return { label: 'Create Doc', bg: 'bg-[#a8d8c4]/20', text: 'text-[#006400]', border: 'border-[#a8d8c4]/40' };
      case 'update_document':
        return { label: 'Update Doc', bg: 'bg-[#a8d8c4]/20', text: 'text-[#006400]', border: 'border-[#a8d8c4]/40' };
      case 'delete_document':
        return { label: 'Delete Doc', bg: 'bg-[#aa2d00]/10', text: 'text-[#aa2d00]', border: 'border-[#aa2d00]/20' };
      case 'create_api_key':
        return { label: 'Create Key', bg: 'bg-[#fcab79]/15', text: 'text-[#c45500]', border: 'border-[#fcab79]/30' };
      case 'delete_api_key':
        return { label: 'Revoke Key', bg: 'bg-[#aa2d00]/10', text: 'text-[#aa2d00]', border: 'border-[#aa2d00]/20' };
      case 'user_login':
        return { label: 'Login', bg: 'bg-[#e0d6ff]/40', text: 'text-[#5e35b1]', border: 'border-[#d1c4e9]' };
      case 'user_register':
        return { label: 'Register', bg: 'bg-[#e0d6ff]/40', text: 'text-[#5e35b1]', border: 'border-[#d1c4e9]' };
      default:
        return { label: action, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  }
</script>

<div class="max-w-6xl mx-auto px-6 py-10 font-sans text-[#333840]">
  <!-- 1. NOT LOGGED IN STATE -->
  {#if !$user}
    <div class="bg-white border border-[#dddddd] p-8 rounded-xl max-w-md mx-auto text-center relative overflow-hidden shadow-sm mt-12">
      <div class="absolute top-0 left-0 right-0 h-1 bg-[#aa2d00]"></div>
      <svg class="w-10 h-10 text-[#aa2d00] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m0-6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <h3 class="text-sm font-bold text-[#181d26] mb-1">Administrator Area</h3>
      <p class="text-xs text-[#333840] leading-relaxed mb-6">
        Authentication is required to access the admin console. Please log in with your administrator credentials.
      </p>
      <a href="/login" class="inline-block bg-[#181d26] hover:bg-[#0d1218] text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm">
        Go to Login
      </a>
    </div>

  <!-- 2. LOGGED IN BUT NOT ADMIN STATE -->
  {:else if !isAdmin($user.email)}
    <div class="bg-[#f5e9d4] border border-[#dddddd] p-8 rounded-xl max-w-md mx-auto text-center relative overflow-hidden shadow-sm mt-12">
      <div class="absolute top-0 left-0 right-0 h-1 bg-[#aa2d00]"></div>
      <svg class="w-10 h-10 text-[#aa2d00] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
      <h3 class="text-sm font-bold text-[#181d26] mb-1">Access Denied</h3>
      <p class="text-xs text-[#333840] leading-relaxed mb-4">
        Your account (<strong>{$user.email}</strong>) is not listed in the administrator email configuration.
      </p>
      <p class="text-[10px] text-[#9297a0] mb-6">
        Configured Admins: {getAdminEmails().join(', ')}
      </p>
      <a href="/" class="inline-block bg-[#181d26] hover:bg-[#0d1218] text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm">
        Back to Home
      </a>
    </div>

  <!-- 3. VERIFIED ADMIN DASHBOARD -->
  {:else}
    <div class="space-y-8 animate-fade-in">
      <!-- Header Bar -->
      <div class="border-b border-[#dddddd] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#aa2d00]"></span>
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#aa2d00]">Admin Management Console</span>
          </div>
          <h1 class="text-2xl font-bold text-[#181d26] tracking-tight mt-1">Administration & Analytics</h1>
          <p class="text-xs text-[#9297a0] mt-0.5">Logged in as admin: <strong class="text-[#333840]">{$user.email}</strong></p>
        </div>
        
        <div class="flex items-center space-x-3">
          <button on:click={fetchAdminData} class="bg-white border border-[#dddddd] hover:bg-[#f8fafc] text-[#181d26] font-medium text-xs px-4 py-2 rounded-lg transition-colors select-none flex items-center space-x-1.5 shadow-sm cursor-pointer">
            <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex space-x-2 border-b border-[#dddddd] pb-px overflow-x-auto">
        <button on:click={() => handleTabChange('overview')} class="px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer select-none flex items-center space-x-2 {activeTab === 'overview' ? 'bg-white border-t-2 border-t-[#181d26] border-x border-[#dddddd] text-[#181d26] shadow-sm' : 'text-[#8a8d94] hover:text-[#181d26]'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span>Overview</span>
        </button>

        <button on:click={() => handleTabChange('logs')} class="px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer select-none flex items-center space-x-2 {activeTab === 'logs' ? 'bg-white border-t-2 border-t-[#181d26] border-x border-[#dddddd] text-[#181d26] shadow-sm' : 'text-[#8a8d94] hover:text-[#181d26]'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Activity Logs</span>
          <span class="bg-[#181d26]/10 text-[#181d26] px-1.5 py-0.2 rounded-full text-[10px]">{logsData.totalCount}</span>
        </button>

        <button on:click={() => handleTabChange('users')} class="px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer select-none flex items-center space-x-2 {activeTab === 'users' ? 'bg-white border-t-2 border-t-[#181d26] border-x border-[#dddddd] text-[#181d26] shadow-sm' : 'text-[#8a8d94] hover:text-[#181d26]'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <span>User Management</span>
          <span class="bg-[#181d26]/10 text-[#181d26] px-1.5 py-0.2 rounded-full text-[10px]">{usersData.totalUsers}</span>
        </button>

        <button on:click={() => handleTabChange('sql')} class="px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer select-none flex items-center space-x-2 {activeTab === 'sql' ? 'bg-white border-t-2 border-t-[#181d26] border-x border-[#dddddd] text-[#181d26] shadow-sm' : 'text-[#8a8d94] hover:text-[#181d26]'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          <span>Database SQL Setup</span>
        </button>
      </div>

      <!-- TAB 1: OVERVIEW -->
      {#if activeTab === 'overview'}
        <div class="space-y-8">
          <!-- KPI Metrics Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <!-- Metric 1: Total Users -->
            <div class="bg-white border border-[#dddddd] rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 left-0 right-0 h-1 bg-[#181d26]"></div>
              <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Registered Users</span>
              <span class="text-3xl font-extrabold text-[#181d26] tracking-tight">{usersData.totalUsers}</span>
              <span class="text-[10px] text-[#9297a0] block mt-1 font-medium">Registered account base</span>
            </div>

            <!-- Metric 2: Total PDF Exports -->
            <div class="bg-white border border-[#dddddd] rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 left-0 right-0 h-1 bg-[#1b61c9]"></div>
              <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Total PDF Exports</span>
              <span class="text-3xl font-extrabold text-[#1b61c9] tracking-tight">{logsData.stats.total}</span>
              <span class="text-[10px] text-[#9297a0] block mt-1 font-medium">{logsData.stats.authenticated} by users • {logsData.stats.anonymous} anon</span>
            </div>

            <!-- Metric 3: Total Documents Saved -->
            <div class="bg-white border border-[#dddddd] rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 left-0 right-0 h-1 bg-[#006400]"></div>
              <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Documents Created</span>
              <span class="text-3xl font-extrabold text-[#006400] tracking-tight">{usersData.totalDocs}</span>
              <span class="text-[10px] text-[#9297a0] block mt-1 font-medium">Stored markdown documents</span>
            </div>

            <!-- Metric 4: Active API Keys -->
            <div class="bg-white border border-[#dddddd] rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 left-0 right-0 h-1 bg-[#fcab79]"></div>
              <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Active API Keys</span>
              <span class="text-3xl font-extrabold text-[#c45500] tracking-tight">{usersData.totalKeys}</span>
              <span class="text-[10px] text-[#9297a0] block mt-1 font-medium">Provisioned secret keys</span>
            </div>
          </div>

          <!-- Activity Distribution Ratio -->
          {#if logsData.stats.total > 0}
            <div class="bg-[#f8fafc] border border-[#dddddd] rounded-xl p-6 shadow-sm">
              <div class="flex justify-between items-center mb-3">
                <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider">PDF Export Generation Breakdown</span>
                <span class="text-xs font-semibold text-[#181d26]">Total: {logsData.stats.total} generations</span>
              </div>
              <div class="w-full h-3.5 rounded-full overflow-hidden bg-[#e0e2e6] flex">
                <div class="bg-[#1b61c9] h-full" style="width: {logsData.stats.total > 0 ? (logsData.stats.authenticated / logsData.stats.total) * 100 : 0}%" title="Registered Users"></div>
                <div class="bg-[#fcab79] h-full" style="width: {logsData.stats.total > 0 ? (logsData.stats.anonymous / logsData.stats.total) * 100 : 0}%" title="Anonymous Users"></div>
              </div>
              <div class="flex justify-between items-center mt-3 text-[11px] font-semibold">
                <span class="text-[#1b61c9] flex items-center">
                  <span class="w-2.5 h-2.5 bg-[#1b61c9] rounded-full mr-1.5"></span>
                  Registered Accounts ({logsData.stats.authenticated})
                </span>
                <span class="text-[#c45500] flex items-center">
                  <span class="w-2.5 h-2.5 bg-[#fcab79] rounded-full mr-1.5"></span>
                  Anonymous ({logsData.stats.anonymous})
                </span>
              </div>
            </div>
          {/if}

          <!-- Quick Navigation Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white border border-[#dddddd] rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 class="text-sm font-bold text-[#181d26] mb-1">User Management</h3>
                <p class="text-xs text-[#8a8d94] leading-relaxed mb-4">View all registered accounts, identify administrators, and track document creation counts per user.</p>
              </div>
              <button on:click={() => handleTabChange('users')} class="inline-flex items-center space-x-1.5 text-xs font-bold text-[#181d26] hover:underline cursor-pointer">
                <span>Go to User Management</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div class="bg-white border border-[#dddddd] rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 class="text-sm font-bold text-[#181d26] mb-1">Activity Logs</h3>
                <p class="text-xs text-[#8a8d94] leading-relaxed mb-4">Inspect real-time event logs for document changes, logins, registrations, API key creation, and PDF exports.</p>
              </div>
              <button on:click={() => handleTabChange('logs')} class="inline-flex items-center space-x-1.5 text-xs font-bold text-[#181d26] hover:underline cursor-pointer">
                <span>Go to Activity Logs</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

      <!-- TAB 2: ACTIVITY LOGS -->
      {:else if activeTab === 'logs'}
        <div class="space-y-6">
          <!-- Filters and Search Bar -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <!-- Filter Pills -->
            <div class="flex flex-wrap gap-2">
              <button on:click={() => handleFilterChange('all')} class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {logsActionFilter === 'all' ? 'bg-[#181d26] text-white shadow-sm' : 'bg-white border border-[#dddddd] text-[#8a8d94] hover:text-[#181d26]'}">
                All Events ({logsData.counts.all})
              </button>
              <button on:click={() => handleFilterChange('pdf')} class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {logsActionFilter === 'pdf' ? 'bg-[#1b61c9] text-white shadow-sm' : 'bg-white border border-[#dddddd] text-[#8a8d94] hover:text-[#1b61c9]'}">
                PDF Exports ({logsData.counts.pdf})
              </button>
              <button on:click={() => handleFilterChange('documents')} class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {logsActionFilter === 'documents' ? 'bg-[#006400] text-white shadow-sm' : 'bg-white border border-[#dddddd] text-[#8a8d94] hover:text-[#006400]'}">
                Documents ({logsData.counts.documents})
              </button>
              <button on:click={() => handleFilterChange('keys')} class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {logsActionFilter === 'keys' ? 'bg-[#c45500] text-white shadow-sm' : 'bg-white border border-[#dddddd] text-[#8a8d94] hover:text-[#c45500]'}">
                API Keys ({logsData.counts.keys})
              </button>
              <button on:click={() => handleFilterChange('auth')} class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {logsActionFilter === 'auth' ? 'bg-[#5e35b1] text-white shadow-sm' : 'bg-white border border-[#dddddd] text-[#8a8d94] hover:text-[#5e35b1]'}">
                Auth ({logsData.counts.auth})
              </button>
            </div>

            <!-- Search input -->
            <form on:submit|preventDefault={handleLogsSearch} class="flex items-center space-x-2 w-full md:w-auto">
              <input type="text" placeholder="Search by email / action..." bind:value={logsSearchQuery} class="px-3 py-1.5 border border-[#dddddd] rounded-lg text-xs bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] shadow-sm w-full md:w-60" />
              <button type="submit" class="bg-white border border-[#dddddd] hover:bg-[#f8fafc] text-[#181d26] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm">
                Search
              </button>
            </form>
          </div>

          <!-- Activity Logs Table -->
          {#if logsData.logs.length === 0}
            <div class="bg-white border border-[#dddddd] rounded-xl p-12 text-center text-xs text-[#9297a0]">
              No activity logs found matching the current filter.
            </div>
          {:else}
            <div class="bg-white border border-[#dddddd] rounded-xl shadow-sm overflow-hidden select-none">
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="bg-[#f8fafc] border-b border-[#dddddd] text-[10px] font-bold text-[#9297a0] uppercase tracking-wider">
                      <th class="p-4">Action</th>
                      <th class="p-4">User</th>
                      <th class="p-4">Details / Metadata</th>
                      <th class="p-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#dddddd]">
                    {#each logsData.logs as log (log.id)}
                      {@const badge = getActionBadge(log.action)}
                      <tr class="hover:bg-[#f8fafc]/60 transition-colors font-medium">
                        <!-- Action Badge -->
                        <td class="p-4 whitespace-nowrap">
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold {badge.bg} {badge.text} border {badge.border} uppercase">
                            {badge.label}
                          </span>
                        </td>

                        <!-- User Info -->
                        <td class="p-4">
                          <div class="flex flex-col">
                            <span class="font-bold text-[#181d26] text-xs">
                              {log.user_email || (log.user_id ? `User (${log.user_id.substring(0, 8)}...)` : 'Anonymous')}
                            </span>
                            {#if log.user_id}
                              <span class="text-[10px] text-[#9297a0] font-mono">{log.user_id}</span>
                            {/if}
                          </div>
                        </td>

                        <!-- Details -->
                        <td class="p-4 text-xs text-[#333840]">
                          {#if log.details && typeof log.details === 'object'}
                            <div class="flex flex-wrap gap-2 items-center">
                              {#if log.details.document_title || log.details.document_name}
                                <span class="bg-gray-100 text-[#181d26] font-semibold px-2 py-0.5 rounded text-[11px] border border-gray-200">
                                  📄 {log.details.document_title || log.details.document_name}
                                </span>
                              {/if}
                              {#if log.details.filename}
                                <span class="text-gray-500 font-mono text-[10px]">{log.details.filename}</span>
                              {/if}
                              {#if log.details.method}
                                <span class="bg-blue-50 text-[#1b61c9] px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                  via {log.details.method}
                                </span>
                              {/if}
                              {#if log.details.key_name}
                                <span class="bg-orange-50 text-[#c45500] px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                  Key: {log.details.key_name}
                                </span>
                              {/if}
                            </div>
                          {:else}
                            <span class="text-gray-400 italic">No extra metadata</span>
                          {/if}
                        </td>

                        <!-- Timestamp -->
                        <td class="p-4 text-right whitespace-nowrap text-[#8a8d94] text-xs">
                          {new Date(log.created_at).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Pagination Bar -->
            {#if Math.ceil(logsData.totalCount / logsPerPage) > 1}
              <div class="flex justify-between items-center pt-2">
                <span class="text-xs text-[#8a8d94]">
                  Showing {(logsPage - 1) * logsPerPage + 1} to {Math.min(logsPage * logsPerPage, logsData.totalCount)} of {logsData.totalCount} records
                </span>
                <div class="flex space-x-2">
                  <button on:click={() => { logsPage = Math.max(1, logsPage - 1); fetchAdminData(); }} disabled={logsPage === 1} class="bg-white border border-[#dddddd] px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer select-none">
                    Previous
                  </button>
                  <button on:click={() => { logsPage++; fetchAdminData(); }} disabled={logsPage * logsPerPage >= logsData.totalCount} class="bg-white border border-[#dddddd] px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer select-none">
                    Next
                  </button>
                </div>
              </div>
            {/if}
          {/if}
        </div>

      <!-- TAB 3: USER MANAGEMENT -->
      {:else if activeTab === 'users'}
        <div class="space-y-6">
          <!-- Search and Summary -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="relative w-full sm:max-w-md">
              <input type="text" placeholder="Search users by email or ID..." bind:value={usersSearchQuery} class="w-full px-4 py-2 border border-[#dddddd] rounded-lg text-xs bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] shadow-sm font-medium" />
            </div>
            <div class="text-xs text-[#8a8d94] font-medium">
              Showing {filteredUsers.length} of {usersData.totalUsers} registered users
            </div>
          </div>

          <!-- Users Table -->
          {#if filteredUsers.length === 0}
            <div class="bg-white border border-[#dddddd] rounded-xl p-12 text-center text-xs text-[#9297a0]">
              No users found matching "{usersSearchQuery}".
            </div>
          {:else}
            <div class="bg-white border border-[#dddddd] rounded-xl shadow-sm overflow-hidden select-none">
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="bg-[#f8fafc] border-b border-[#dddddd] text-[10px] font-bold text-[#9297a0] uppercase tracking-wider">
                      <th class="p-4">User Account</th>
                      <th class="p-4">Role</th>
                      <th class="p-4 text-center">Docs Saved</th>
                      <th class="p-4 text-center">PDF Exports</th>
                      <th class="p-4 text-center">API Keys</th>
                      <th class="p-4 text-right">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#dddddd]">
                    {#each filteredUsers as u (u.id)}
                      <tr class="hover:bg-[#f8fafc]/60 transition-colors font-medium">
                        <!-- User & Email -->
                        <td class="p-4">
                          <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full bg-[#181d26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                              {u.email ? u.email.substring(0, 1) : 'U'}
                            </div>
                            <div class="flex flex-col">
                              <span class="font-bold text-[#181d26] text-xs">{u.email}</span>
                              <span class="text-[10px] text-[#9297a0] font-mono">{u.id}</span>
                            </div>
                          </div>
                        </td>

                        <!-- Role Badge -->
                        <td class="p-4 whitespace-nowrap">
                          {#if u.isAdmin}
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#aa2d00]/10 text-[#aa2d00] border border-[#aa2d00]/20 uppercase">
                              <span class="w-1.5 h-1.5 rounded-full bg-[#aa2d00] mr-1"></span>
                              Admin
                            </span>
                          {:else}
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                              User
                            </span>
                          {/if}
                        </td>

                        <!-- Documents Count -->
                        <td class="p-4 text-center font-bold text-[#181d26]">
                          {u.documents_count || 0}
                        </td>

                        <!-- PDF Exports Count -->
                        <td class="p-4 text-center font-bold text-[#1b61c9]">
                          {u.pdf_exports_count || 0}
                        </td>

                        <!-- API Keys Count -->
                        <td class="p-4 text-center font-bold text-[#c45500]">
                          {u.api_keys_count || 0}
                        </td>

                        <!-- Joined Date -->
                        <td class="p-4 text-right text-[#8a8d94] whitespace-nowrap">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>

      <!-- TAB 4: SQL SETUP SCRIPT -->
      {:else if activeTab === 'sql'}
        <div class="space-y-6">
          <div class="bg-white border border-[#dddddd] rounded-xl p-6 shadow-sm">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 class="text-sm font-bold text-[#181d26]">Supabase Database SQL Setup</h3>
                <p class="text-xs text-[#8a8d94] mt-0.5">Execute this script in your Supabase SQL Editor to enable full table indexing and user analytics RPC.</p>
              </div>
              <button on:click={copySetupSql} class="bg-[#181d26] hover:bg-[#0d1218] text-white px-4 py-2 rounded-lg font-medium text-xs tracking-wide transition-all shadow-sm cursor-pointer select-none flex items-center space-x-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                <span>Copy SQL Script</span>
              </button>
            </div>

            <pre class="bg-[#181d26] text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed border border-gray-800">{setupSqlScript}</pre>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
