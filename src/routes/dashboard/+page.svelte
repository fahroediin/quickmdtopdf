<!-- src/routes/dashboard/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';

  let documents = [];
  let loading = true;
  let searchQuery = '';
  let currentPage = 1;
  const itemsPerPage = 10;

  $: filteredDocuments = documents.filter(doc => 
    doc.document_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  $: paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  $: totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

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
    <!-- Search Bar -->
    <div class="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div class="relative w-full sm:max-w-md">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input type="text" placeholder="Search documents..." bind:value={searchQuery} on:input={() => currentPage = 1} class="w-full pl-9 pr-10 py-2 border border-[#dddddd] rounded-lg text-sm bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-medium shadow-sm" />
        {#if searchQuery}
          <button type="button" aria-label="Clear search" on:click={() => { searchQuery = ''; currentPage = 1; }} class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>
      
      <div class="text-xs text-[#8a8d94] font-medium">
        Showing {filteredDocuments.length} of {documents.length} documents
      </div>
    </div>

    {#if filteredDocuments.length === 0}
      <!-- Empty Search Results Card -->
      <div class="bg-[#f8fafc] border border-[#dddddd] p-8 rounded-xl max-w-md mx-auto text-center relative overflow-hidden my-8">
        <svg class="w-10 h-10 text-[#9297a0] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="text-sm font-bold text-[#181d26] mb-1">No Results Found</h3>
        <p class="text-xs text-[#8a8d94] leading-relaxed mb-4">
          No documents match your search query "{searchQuery}".
        </p>
        <button on:click={() => { searchQuery = ''; currentPage = 1; }} class="inline-block bg-[#181d26] hover:bg-[#0d1218] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer select-none">
          Clear Search
        </button>
      </div>
    {:else}
      <div class="bg-white border border-[#dddddd] rounded-xl shadow-sm overflow-hidden">
        <ul class="divide-y divide-[#dddddd]">
          {#each paginatedDocuments as doc (doc.id)}
            <li class="p-5 flex justify-between items-center hover:bg-[#f8fafc] transition-colors duration-100">
              <div class="space-y-1">
                <a href="/?id={doc.id}" class="font-bold text-sm text-[#181d26] hover:text-[#aa2d00] hover:underline tracking-tight transition-colors">
                  {doc.document_name}
                </a>
                <p class="text-[11px] text-[#9297a0] font-medium uppercase tracking-wider">
                  Saved on: {new Date(doc.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              
              <div class="flex items-center space-x-4">
                <!-- Inline Link to go to workspace or delete -->
                <a href="/?id={doc.id}" class="text-xs font-semibold text-[#181d26] hover:underline cursor-pointer select-none">
                  Open & Edit
                </a>
                <button on:click={() => deleteDocument(doc.id)} class="text-xs font-semibold text-[#aa2d00] hover:underline cursor-pointer select-none">
                  Delete
                </button>
              </div>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Pagination Controls -->
      {#if totalPages > 1}
        <div class="flex items-center justify-between border-t border-[#dddddd] px-4 py-4 sm:px-6 mt-6">
          <div class="flex flex-1 justify-between sm:hidden">
            <button on:click={() => currentPage = Math.max(1, currentPage - 1)} disabled={currentPage === 1} class="relative inline-flex items-center rounded-md border border-[#dddddd] bg-white px-4 py-2 text-xs font-medium text-[#181d26] hover:bg-[#f8fafc] disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <button on:click={() => currentPage = Math.min(totalPages, currentPage + 1)} disabled={currentPage === totalPages} class="relative ml-3 inline-flex items-center rounded-md border border-[#dddddd] bg-white px-4 py-2 text-xs font-medium text-[#181d26] hover:bg-[#f8fafc] disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p class="text-xs text-[#8a8d94]">
                Showing <span class="font-semibold text-[#181d26]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span class="font-semibold text-[#181d26]">{Math.min(currentPage * itemsPerPage, filteredDocuments.length)}</span> of <span class="font-semibold text-[#181d26]">{filteredDocuments.length}</span> results
              </p>
            </div>
            <div>
              <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button on:click={() => currentPage = Math.max(1, currentPage - 1)} disabled={currentPage === 1} class="relative inline-flex items-center rounded-l-md px-3 py-2 text-[#8a8d94] ring-1 ring-inset ring-[#dddddd] hover:bg-[#f8fafc] focus:z-20 focus:outline-offset-0 disabled:opacity-40 disabled:cursor-not-allowed">
                  <span class="sr-only">Previous</span>
                  <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
                  </svg>
                </button>
                
                {#each Array(totalPages) as _, i}
                  <button on:click={() => currentPage = i + 1} class="relative inline-flex items-center px-4 py-2 text-xs font-semibold focus:z-20 {currentPage === i + 1 ? 'bg-[#181d26] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181d26]' : 'text-[#333840] ring-1 ring-inset ring-[#dddddd] hover:bg-[#f8fafc] focus:outline-offset-0'}">
                    {i + 1}
                  </button>
                {/each}

                <button on:click={() => currentPage = Math.min(totalPages, currentPage + 1)} disabled={currentPage === totalPages} class="relative inline-flex items-center rounded-r-md px-3 py-2 text-[#8a8d94] ring-1 ring-inset ring-[#dddddd] hover:bg-[#f8fafc] focus:z-20 focus:outline-offset-0 disabled:opacity-40 disabled:cursor-not-allowed">
                  <span class="sr-only">Next</span>
                  <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>