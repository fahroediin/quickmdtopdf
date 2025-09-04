<script>
  import { supabase } from '$lib/supabaseClient';
  let email = '';
  let password = '';
  let loading = false;
  let message = '';

  async function handleLogin() {
    loading = true;
    message = '';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      message = error.message;
    } else {
      window.location.href = '/dashboard';
    }
    loading = false;
  }
</script>

<div class="max-w-md mx-auto mt-10">
  <div class="bg-white p-8 rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold text-center mb-6">Login to QuickMDtoPDF</h2>
    <form on:submit|preventDefault={handleLogin} class="space-y-4">
      <input type="email" placeholder="Email" bind:value={email} class="w-full p-3 border rounded-md" required />
      <input type="password" placeholder="Password" bind:value={password} class="w-full p-3 border rounded-md" required />
      <button type="submit" disabled={loading} class="w-full bg-green-500 text-white p-3 rounded-md hover:bg-green-600 disabled:bg-gray-400">
        {loading ? 'Loading...' : 'Login'}
      </button>
      {#if message}<p class="text-red-500 text-sm mt-2">{message}</p>{/if}
    </form>
    <p class="text-center mt-4 text-sm">
      Don't have an account? <a href="/register" class="text-green-600 hover:underline">Register</a>
    </p>
  </div>
</div>