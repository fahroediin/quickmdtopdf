<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  // HANYA IMPORT 'user' DARI FILE STORE YANG BENAR
  import { user } from '$lib/stores.js';

  onMount(() => {
    // Logika ini sudah benar:
    // 1. Cek sesi saat komponen pertama kali dimuat.
    supabase.auth.getSession().then(({ data: { session } }) => {
      user.set(session?.user ?? null);
    });

    // 2. Dengarkan perubahan (login/logout) dan update store.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      user.set(session?.user ?? null);
    });

    // 3. Hentikan listener saat komponen dihancurkan.
    return () => subscription.unsubscribe();
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }
</script>

<!-- Bagian HTML di bawah ini sudah benar, tidak perlu diubah -->
<header class="bg-white shadow-md p-4 flex justify-between items-center">
  <a href="/" class="flex items-center space-x-2">
    <div class="bg-green-500 text-white font-bold text-xl w-10 h-10 flex items-center justify-center rounded-md">
      Q
    </div>
    <span class="text-2xl font-semibold text-gray-700">QuickMDtoPDF</span>
  </a>
  <nav>
    {#if $user}
      <!-- Tampilan jika pengguna sudah login -->
      <div class="flex items-center space-x-4">
        <a href="/dashboard" class="text-gray-600 hover:text-green-600">My Documents</a>
        <button on:click={handleLogout} class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
          Logout
        </button>
      </div>
    {:else}
      <!-- Tampilan jika pengguna belum login -->
      <a href="/login" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
        Login
      </a>
    {/if}
  </nav>
</header>

<main class="p-4 bg-gray-50 min-h-screen">
  <slot />
</main>