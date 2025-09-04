<script>
  import { supabase } from '$lib/supabaseClient';
  let email = '';
  let password = '';
  let loading = false;
  let message = '';
  let successMessage = '';

  async function handleRegister() {
    loading = true;
    message = '';
    successMessage = '';
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      message = error.message;
    } else {
      successMessage = 'Registration successful! Please check your email to verify your account.';
    }
    loading = false;
  }
</script>

<div class="max-w-md mx-auto mt-10">
  <div class="bg-white p-8 rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold text-center mb-6">Create an Account</h2>
    <form on:submit|preventDefault={handleRegister} class="space-y-4">
      <input type="email" placeholder="Email" bind:value={email} class="w-full p-3 border rounded-md" required />
      <input type="password" placeholder="Password" bind:value={password} class="w-full p-3 border rounded-md" required />
      <button type="submit" disabled={loading} class="w-full bg-green-500 text-white p-3 rounded-md hover:bg-green-600 disabled:bg-gray-400">
        {loading ? 'Loading...' : 'Register'}
      </button>
      {#if message}<p class="text-red-500 text-sm mt-2">{message}</p>{/if}
      {#if successMessage}<p class="text-green-500 text-sm mt-2">{successMessage}</p>{/if}
    </form>
    <p class="text-center mt-4 text-sm">
      Already have an account? <a href="/login" class="text-green-600 hover:underline">Login</a>
    </p>
  </div>
</div>