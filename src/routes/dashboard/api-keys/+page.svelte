<!-- src/routes/dashboard/api-keys/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';
  import { logActivity } from '$lib/activityLogger.js';

  let apiKeys = [];
  let loading = true;
  let newKeyName = '';
  let isGenerating = false;
  let visibleKeys = {}; // maps key id to boolean (show/hide)

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
    }

    user.set(session.user);
    await fetchApiKeys();
    loading = false;
  });

  async function fetchApiKeys() {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      apiKeys = data;
    }
    if (error) {
      console.error('Error fetching API keys:', error);
    }
  }

  function generateSecureKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'qmd_live_';
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 32; i++) {
      result += characters[randomBytes[i] % characters.length];
    }
    return result;
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) {
      alert('Please enter a key name.');
      return;
    }

    isGenerating = true;
    try {
      const keyValue = generateSecureKey();
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: $user.id,
          key_name: newKeyName,
          key_value: keyValue
        })
        .select()
        .single();

      if (error) throw error;

      logActivity({
        action: 'create_api_key',
        details: { key_name: newKeyName, key_id: data?.id },
        userId: $user.id,
        userEmail: $user.email
      });

      newKeyName = '';
      await fetchApiKeys();
      // Auto show the newly generated key
      if (data) {
        visibleKeys[data.id] = true;
      }
      alert('API key generated successfully!');
    } catch (error) {
      console.error('Error generating API key:', error);
      alert(`Failed to generate API key: ${error.message}`);
    } finally {
      isGenerating = false;
    }
  }

  async function handleDeleteKey(id, name) {
    if (!confirm(`Are you sure you want to revoke "${name}"? Any applications using this key will immediately lose access.`)) return;

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting API key:', error);
      alert('Could not revoke the API key.');
    } else {
      logActivity({
        action: 'delete_api_key',
        details: { key_id: id, key_name: name },
        userId: $user.id,
        userEmail: $user.email
      });
      apiKeys = apiKeys.filter(k => k.id !== id);
    }
  }

  function toggleVisibility(id) {
    visibleKeys[id] = !visibleKeys[id];
  }

  function copyToClipboard(value) {
    navigator.clipboard.writeText(value);
    alert('API Key copied to clipboard!');
  }
</script>

<div class="max-w-4xl mx-auto px-6 py-12 font-sans">
  <div class="border-b border-[#dddddd] pb-4 mb-8">
    <h1 class="text-2xl font-bold text-[#181d26] tracking-tight">API Keys</h1>
    <p class="text-xs text-[#8a8d94] mt-1 font-medium">Manage your secret API keys to generate PDFs programmatically via the API.</p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12 space-x-2">
      <div class="w-5 h-5 border-2 border-gray-200 border-t-[#181d26] rounded-full animate-spin"></div>
      <p class="text-sm text-[#9297a0]">Loading API keys...</p>
    </div>
  {:else}
    <!-- Create Key Form Card -->
    <div class="bg-white border border-[#dddddd] rounded-xl p-6 shadow-sm mb-8">
      <h3 class="text-sm font-bold text-[#181d26] mb-2">Create a New API Key</h3>
      <p class="text-xs text-[#8a8d94] mb-4">Give your key a descriptive name to keep track of its usage (e.g. "Staging Bot", "Prod Application").</p>
      
      <form on:submit|preventDefault={handleCreateKey} class="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="e.g. Production server key" bind:value={newKeyName} disabled={isGenerating} class="flex-grow p-3 border border-[#dddddd] rounded-lg text-sm bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-medium shadow-sm" required />
        <button type="submit" disabled={isGenerating} class="bg-[#181d26] hover:bg-[#0d1218] text-white px-6 py-3 rounded-lg font-medium text-xs tracking-wider uppercase transition-colors duration-150 shadow-sm cursor-pointer disabled:bg-gray-400 select-none">
          {isGenerating ? 'Generating...' : 'Generate Key'}
        </button>
      </form>
    </div>

    <!-- API Keys Table / List -->
    {#if apiKeys.length === 0}
      <div class="bg-[#f8fafc] border border-[#dddddd] p-8 rounded-xl text-center relative overflow-hidden mb-8">
        <svg class="w-10 h-10 text-[#9297a0] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m-5 8a2 2 0 01-2-2V9a2 2 0 012-2h5a2 2 0 012 2v6a2 2 0 01-2 2h-5z" />
        </svg>
        <h3 class="text-sm font-bold text-[#181d26] mb-1">No API Keys</h3>
        <p class="text-xs text-[#8a8d94] leading-relaxed">You haven't generated any API keys yet. Create one above to get started.</p>
      </div>
    {:else}
      <div class="bg-white border border-[#dddddd] rounded-xl shadow-sm overflow-hidden mb-8">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#dddddd] text-left">
            <thead class="bg-[#f8fafc] text-[10px] font-bold text-[#9297a0] uppercase tracking-wider">
              <tr>
                <th scope="col" class="px-6 py-4">Key Name</th>
                <th scope="col" class="px-6 py-4">Secret Key</th>
                <th scope="col" class="px-6 py-4">Created At</th>
                <th scope="col" class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#dddddd] text-sm text-[#333840]">
              {#each apiKeys as key (key.id)}
                <tr class="hover:bg-[#f8fafc] transition-colors duration-100">
                  <td class="px-6 py-4 font-bold text-[#181d26]">{key.key_name}</td>
                  <td class="px-6 py-4 font-mono text-xs">
                    <div class="flex items-center space-x-2">
                      {#if visibleKeys[key.id]}
                        <span class="bg-[#f1f3f5] px-2.5 py-1 rounded border border-[#dddddd] font-medium text-[#aa2d00]">{key.key_value}</span>
                      {:else}
                        <span class="bg-[#f1f3f5] px-2.5 py-1 rounded border border-[#dddddd] font-medium text-gray-400">qmd_live_••••••••••••••••••••••••••••••••</span>
                      {/if}
                      
                      <button type="button" on:click={() => toggleVisibility(key.id)} class="text-[#1b61c9] hover:underline cursor-pointer select-none text-xs">
                        {visibleKeys[key.id] ? 'Hide' : 'Show'}
                      </button>
                      <button type="button" aria-label="Copy API Key" on:click={() => copyToClipboard(key.key_value)} class="text-gray-500 hover:text-[#181d26] cursor-pointer select-none">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-xs text-[#8a8d94]">
                    {new Date(key.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button on:click={() => handleDeleteKey(key.id, key.key_name)} class="text-xs font-semibold text-[#aa2d00] hover:underline cursor-pointer select-none">
                      Revoke
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Documentation Card -->
    <div class="bg-[#f5e9d4]/40 border border-[#dddddd] rounded-xl p-6 shadow-sm">
      <h3 class="text-sm font-bold text-[#aa2d00] mb-2 flex items-center">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        How to use your API Key
      </h3>
      <p class="text-xs text-[#333840] leading-relaxed mb-4">
        Authenticate your requests to the PDF generator endpoint by passing your key in the headers. You can choose either of the following headers:
      </p>

      <div class="space-y-4">
        <div>
          <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Option A: Custom HTTP Header</span>
          <pre class="bg-[#181d26] text-white p-3 rounded-lg text-xs font-mono overflow-x-auto">x-api-key: qmd_live_your_secret_key_here</pre>
        </div>
        <div>
          <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Option B: Bearer Authorization Header</span>
          <pre class="bg-[#181d26] text-white p-3 rounded-lg text-xs font-mono overflow-x-auto">Authorization: Bearer qmd_live_your_secret_key_here</pre>
        </div>
        <div>
          <span class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block mb-1">Example Request (curl)</span>
          <pre class="bg-[#181d26] text-white p-3 rounded-lg text-xs font-mono overflow-x-auto">curl -X POST https://mdtopdf.mibot.my.id/api/generate-pdf \
  -H "Content-Type: application/json" \
  -H "x-api-key: qmd_live_your_secret_key_here" \
  -d '&#123;"markdown": "# Hello World"&#125;' \
  --output document.pdf</pre>
        </div>
      </div>
    </div>
  {/if}
</div>
