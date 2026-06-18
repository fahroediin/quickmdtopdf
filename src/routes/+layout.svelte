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

<!-- Bagian HTML di bawah ini menggunakan gaya desain Airtable (DESIGN.md) -->
<header class="bg-white border-b border-[#dddddd] px-6 h-16 flex justify-between items-center select-none">
  <a href="/" class="flex items-center space-x-3">
    <div class="bg-[#181d26] text-white font-bold text-lg w-9 h-9 flex items-center justify-center rounded-lg transition-transform hover:scale-105">
      Q
    </div>
    <span class="text-xl font-bold text-[#181d26] tracking-tight">QuickMDtoPDF</span>
  </a>
  <nav class="font-sans text-sm">
    {#if $user}
      <div class="flex items-center space-x-6">
        <a href="/dashboard" class="text-[#333840] hover:text-[#181d26] font-medium transition-colors">My Documents</a>
        <button on:click={handleLogout} class="bg-white border border-[#dddddd] text-[#333840] hover:bg-[#f8fafc] px-4 py-2 rounded-lg font-medium transition-colors duration-150 text-xs">
          Logout
        </button>
      </div>
    {:else}
      <div class="flex items-center space-x-4">
        <a href="/login" class="bg-[#181d26] hover:bg-[#0d1218] text-white px-5 py-2 rounded-lg font-medium transition-colors duration-150 text-xs shadow-sm">
          Login
        </a>
      </div>
    {/if}
  </nav>
</header>

<main class="bg-white min-h-screen text-[#333840] font-sans antialiased">
  <slot />
</main>