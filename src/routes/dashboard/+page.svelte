<!-- src/routes/dashboard/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';

  let documents = [];
  let loading = true;

  onMount(async () => {
    // Check session first to avoid race conditions with $user store initialization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
    }

    // Set user store reactively
    user.set(session.user);

    const { data, error } = await supabase
      .from('documents')
      .select('id, document_name, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      documents = data;
    }
    if (error) {
      console.error('Error fetching documents:', error);
    }
    loading = false;
  });

  async function deleteDocument(id) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) {
      alert('Could not delete the document.');
    } else {
      documents = documents.filter(doc => doc.id !== id);
    }
  }
</script>

<div class="max-w-4xl mx-auto px-6 py-12 font-sans">
  <div class="flex justify-between items-center mb-8 border-b border-[#dddddd] pb-4">
    <h1 class="text-2xl font-bold text-[#181d26] tracking-tight">My Documents</h1>
    <a href="/" class="bg-[#181d26] hover:bg-[#0d1218] text-white px-4 py-2 rounded-lg font-medium text-xs tracking-wide transition-all duration-150 select-none shadow-sm flex items-center space-x-1.5">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <span>New Document</span>
    </a>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12 space-x-2">
      <div class="w-5 h-5 border-2 border-gray-200 border-t-[#181d26] rounded-full animate-spin"></div>
      <p class="text-sm text-[#9297a0]">Loading documents...</p>
    </div>
  {:else if documents.length === 0}
    <!-- Airtable-inspired Empty Callout Card -->
    <div class="bg-[#f5e9d4] border border-[#dddddd] p-8 rounded-xl max-w-md mx-auto text-center relative overflow-hidden">
      <div class="absolute top-0 left-0 right-0 h-1 bg-[#aa2d00]"></div>
      <svg class="w-10 h-10 text-[#aa2d00] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      <h3 class="text-sm font-bold text-[#181d26] mb-1">No Documents Found</h3>
      <p class="text-xs text-[#333840] leading-relaxed mb-6">
        You haven't saved any markdown documents yet. Head over to the editor to create your first document.
      </p>
      <a href="/" class="inline-block bg-[#181d26] hover:bg-[#0d1218] text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm">
        Go to Editor
      </a>
    </div>
  {:else}
    <div class="bg-white border border-[#dddddd] rounded-xl shadow-sm overflow-hidden">
      <ul class="divide-y divide-[#dddddd]">
        {#each documents as doc (doc.id)}
          <li class="p-5 flex justify-between items-center hover:bg-[#f8fafc] transition-colors duration-100">
            <div class="space-y-1">
              <p class="font-bold text-sm text-[#181d26] tracking-tight">{doc.document_name}</p>
              <p class="text-[11px] text-[#9297a0] font-medium uppercase tracking-wider">
                Saved on: {new Date(doc.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            
            <div class="flex items-center space-x-4">
              <!-- Inline Link to go to workspace or delete -->
              <button on:click={() => deleteDocument(doc.id)} class="text-xs font-semibold text-[#aa2d00] hover:underline cursor-pointer select-none">
                Delete
              </button>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>