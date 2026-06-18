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

<div class="max-w-md mx-auto mt-16 px-4">
  <div class="bg-white p-8 rounded-xl border border-[#dddddd] shadow-sm relative overflow-hidden">
    <!-- Brand voltage coral strip -->
    <div class="absolute top-0 left-0 right-0 h-1 bg-[#aa2d00]"></div>
    
    <h2 class="text-xl font-bold text-center text-[#181d26] mb-6 tracking-tight">Create an Account</h2>
    
    <form on:submit|preventDefault={handleRegister} class="space-y-4">
      <div class="space-y-1">
        <label for="register-email" class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block">Email Address</label>
        <input id="register-email" type="email" placeholder="email@example.com" bind:value={email} class="w-full p-3 border border-[#dddddd] rounded-lg text-sm bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-sans font-medium shadow-sm" required />
      </div>
      
      <div class="space-y-1">
        <label for="register-password" class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block">Password</label>
        <input id="register-password" type="password" placeholder="••••••••" bind:value={password} class="w-full p-3 border border-[#dddddd] rounded-lg text-sm bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-sans font-medium shadow-sm" required />
      </div>
      
      <button type="submit" disabled={loading} class="w-full bg-[#181d26] hover:bg-[#0d1218] text-white p-3 rounded-lg font-medium text-xs tracking-wider uppercase transition-colors duration-150 shadow-sm cursor-pointer disabled:bg-gray-400 mt-2 select-none">
        {loading ? 'Creating Account...' : 'Register'}
      </button>
      
      {#if message}
        <div class="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 mt-2">
          {message}
        </div>
      {/if}
      
      {#if successMessage}
        <div class="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-100 mt-2">
          {successMessage}
        </div>
      {/if}
    </form>
    
    <p class="text-center mt-6 text-xs text-[#333840]">
      Already have an account? <a href="/login" class="text-[#1b61c9] font-semibold hover:underline">Login</a>
    </p>
  </div>
</div>