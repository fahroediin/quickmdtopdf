<!-- src/routes/dashboard/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';

  let documents = [];
  let loading = true;

  onMount(async () => {
    // Redirect if not logged in
    if (!$user) {
      window.location.href = '/login';
      return;
    }

    const { data, error } = await supabase
      .from('documents')
      .select('id, document_name, created_at')
      .eq('user_id', $user.id)
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

<div class="container mx-auto">
  <h1 class="text-3xl font-bold mb-6">My Documents</h1>

  {#if loading}
    <p>Loading documents...</p>
  {:else if documents.length === 0}
    <p>You haven't saved any documents yet. Go to the <a href="/" class="text-green-600 hover:underline">converter</a> to create one.</p>
  {:else}
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <ul class="divide-y divide-gray-200">
        {#each documents as doc (doc.id)}
          <li class="p-4 flex justify-between items-center hover:bg-gray-50">
            <div>
              <p class="font-semibold text-lg">{doc.document_name}</p>
              <p class="text-sm text-gray-500">
                Created on: {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
            <button on:click={() => deleteDocument(doc.id)} class="text-red-500 hover:text-red-700">
              Delete
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>