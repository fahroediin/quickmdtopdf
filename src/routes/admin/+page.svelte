<!-- src/routes/admin/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';
  import { PUBLIC_ADMIN_EMAIL } from '$env/static/public';

  const adminEmail = PUBLIC_ADMIN_EMAIL || 'admin@quickmdtopdf.com';
  
  let stats = null;
  let loading = true;
  let errorMessage = '';

  async function loadLogs() {
    if (!$user || $user.email !== adminEmail) {
      loading = false;
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session.');
      }

      const response = await fetch('/api/admin/logs', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch logs.');
      }

      stats = await response.json();
    } catch (err) {
      console.error('Error loading admin logs:', err);
      errorMessage = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadLogs();
  });

  // Reload logs if user store updates
  $: if ($user) {
    loadLogs();
  }
</script>

<div class="max-w-5xl mx-auto px-6 py-12 font-sans text-[#333840]">
  <!-- 1. NOT LOGGED IN STATE -->
  {#if !$user}
    <div class="bg-white border border-[#dddddd] p-8 rounded-xl max-w-md mx-auto text-center relative overflow-hidden shadow-sm mt-12">
      <div class="absolute top-0 left-0 right-0 h-1 bg-[#aa2d00]"></div>
      <svg class="w-10 h-10 text-[#aa2d00] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m0-6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <h3 class="text-sm font-bold text-[#181d26] mb-1">Administrator Area</h3>
      <p class="text-xs text-[#333840] leading-relaxed mb-6">
        Authentication is required to view usage logs. Please log in with your administrator credentials.
      </p>
      <a href="/login" class="inline-block bg-[#181d26] hover:bg-[#0d1218] text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm">
        Go to Login
      </a>
    </div>

  <!-- 2. LOGGED IN BUT NOT ADMIN STATE -->
  {:else if $user.email !== adminEmail}
    <div class="bg-[#f5e9d4] border border-[#dddddd] p-8 rounded-xl max-w-md mx-auto text-center relative overflow-hidden shadow-sm mt-12">
      <div class="absolute top-0 left-0 right-0 h-1 bg-[#aa2d00]"></div>
      <svg class="w-10 h-10 text-[#aa2d00] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
      <h3 class="text-sm font-bold text-[#181d26] mb-1">Access Denied</h3>
      <p class="text-xs text-[#333840] leading-relaxed mb-4">
        Your account (<strong>{$user.email}</strong>) is not authorized to access the system usage logs.
      </p>
      <p class="text-[10px] text-[#9297a0] mb-6">
        Required Email: {adminEmail}
      </p>
      <a href="/" class="inline-block bg-[#181d26] hover:bg-[#0d1218] text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm">
        Back to Home
      </a>
    </div>

  <!-- 3. LOADING STATE -->
  {:else if loading}
    <div class="flex flex-col items-center justify-center py-24 space-y-3">
      <div class="w-8 h-8 border-3 border-gray-200 border-t-[#181d26] rounded-full animate-spin"></div>
      <p class="text-sm text-[#9297a0] font-medium tracking-wide uppercase">Verifying Admin Token...</p>
    </div>

  <!-- 4. ERROR STATE -->
  {:else if errorMessage}
    <div class="bg-red-50 border border-red-200 p-8 rounded-xl max-w-lg mx-auto text-center relative overflow-hidden shadow-sm mt-12">
      <div class="absolute top-0 left-0 right-0 h-1 bg-[#aa2d00]"></div>
      <h3 class="text-sm font-bold text-red-700 mb-2">Error Loading Statistics</h3>
      <p class="text-xs text-red-600 leading-relaxed mb-6">{errorMessage}</p>
      <button on:click={loadLogs} class="bg-[#181d26] hover:bg-[#0d1218] text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all">
        Try Again
      </button>
    </div>

  <!-- 5. VERIFIED ADMIN LOGS DASHBOARD -->
  {:else if stats}
    <div class="space-y-8 animate-fade-in">
      <!-- Title header -->
      <div class="border-b border-[#dddddd] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[#181d26] tracking-tight">System Usage Dashboard</h1>
          <p class="text-xs text-[#9297a0] mt-1">Real-time usage tracking of PDF generation events</p>
        </div>
        <button on:click={loadLogs} class="bg-white border border-[#dddddd] hover:bg-[#f8fafc] text-[#181d26] font-medium text-xs px-4 py-2 rounded-lg transition-colors select-none">
          Refresh Data
        </button>
      </div>

      <!-- Metrics cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Card 1: Total -->
        <div class="bg-white border border-[#dddddd] rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1 bg-[#181d26]"></div>
          <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Total Exports</span>
          <span class="text-4xl font-extrabold text-[#181d26] tracking-tight">{stats.total}</span>
          <span class="text-[10px] text-[#9297a0] block mt-2 font-medium">All-time PDF generations</span>
        </div>

        <!-- Card 2: Registered -->
        <div class="bg-white border border-[#dddddd] rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1 bg-[#1b61c9]"></div>
          <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Registered Users</span>
          <span class="text-4xl font-extrabold text-[#1b61c9] tracking-tight">{stats.authenticated}</span>
          <span class="text-[10px] text-[#9297a0] block mt-2 font-medium">
            {stats.total > 0 ? Math.round((stats.authenticated / stats.total) * 100) : 0}% of total usages
          </span>
        </div>

        <!-- Card 3: Anonymous -->
        <div class="bg-white border border-[#dddddd] rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1 bg-[#fcab79]"></div>
          <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Anonymous Users</span>
          <span class="text-4xl font-extrabold text-[#fcab79] tracking-tight">{stats.anonymous}</span>
          <span class="text-[10px] text-[#9297a0] block mt-2 font-medium">
            {stats.total > 0 ? Math.round((stats.anonymous / stats.total) * 100) : 0}% of total usages
          </span>
        </div>
      </div>

      <!-- Ratio Visualizer Bar -->
      {#if stats.total > 0}
        <div class="bg-[#f8fafc] border border-[#dddddd] rounded-xl p-6 shadow-sm">
          <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-3">User Distribution Ratio</span>
          <div class="w-full h-4 rounded-full overflow-hidden bg-[#e0e2e6] flex">
            <div class="bg-[#1b61c9] h-full" style="width: {(stats.authenticated / stats.total) * 100}%" title="Registered Users"></div>
            <div class="bg-[#fcab79] h-full" style="width: {(stats.anonymous / stats.total) * 100}%" title="Anonymous Users"></div>
          </div>
          <div class="flex justify-between items-center mt-3 text-[11px] font-semibold">
            <span class="text-[#1b61c9] flex items-center">
              <span class="w-2.5 h-2.5 bg-[#1b61c9] rounded-full mr-1.5"></span>
              Registered ({stats.authenticated})
            </span>
            <span class="text-[#fcab79] flex items-center">
              <span class="w-2.5 h-2.5 bg-[#fcab79] rounded-full mr-1.5"></span>
              Anonymous ({stats.anonymous})
            </span>
          </div>
        </div>
      {/if}

      <!-- Detailed Logs list -->
      <div class="space-y-3">
        <span class="text-[11px] font-bold text-[#9297a0] uppercase tracking-wider block">Recent Activity Logs (Last 50)</span>
        
        {#if stats.logs.length === 0}
          <div class="bg-white border border-[#dddddd] rounded-xl p-8 text-center text-xs text-[#9297a0]">
            No activity logs found.
          </div>
        {:else}
          <div class="bg-white border border-[#dddddd] rounded-xl shadow-sm overflow-hidden select-none">
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-left text-xs">
                <thead>
                  <tr class="bg-[#f8fafc] border-b border-[#dddddd]">
                    <th class="p-4 font-bold text-[#181d26] uppercase tracking-wider">Log ID</th>
                    <th class="p-4 font-bold text-[#181d26] uppercase tracking-wider">User ID</th>
                    <th class="p-4 font-bold text-[#181d26] uppercase tracking-wider">User Type</th>
                    <th class="p-4 font-bold text-[#181d26] uppercase tracking-wider">Generated At</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#dddddd]">
                  {#each stats.logs as log (log.id)}
                    <tr class="hover:bg-[#f8fafc]/50 transition-colors duration-100 font-medium">
                      <td class="p-4 text-[#333840] font-mono text-[11px]">{log.id}</td>
                      <td class="p-4 text-[#9297a0] font-mono text-[11px]">
                        {#if log.is_anonymous}
                          <span class="italic text-gray-400">anonymous</span>
                        {:else}
                          {log.user_id}
                        {/if}
                      </td>
                      <td class="p-4">
                        {#if log.is_anonymous}
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fcab79]/10 text-[#fcab79] border border-[#fcab79]/20 uppercase">
                            Anonymous
                          </span>
                        {:else}
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#a8d8c4]/20 text-[#006400] border border-[#a8d8c4]/40 uppercase">
                            Registered
                          </span>
                        {/if}
                      </td>
                      <td class="p-4 text-[#333840]">
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
        {/if}
      </div>
    </div>
  {/if}
</div>
