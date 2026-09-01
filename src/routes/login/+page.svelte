<script>
  import { supabase } from '$lib/supabaseClient';
  import { logActivity } from '$lib/activityLogger.js';

  let email = '';
  let password = '';
  let loading = false;
  let message = '';
  let showPassword = false;

  async function handleLogin() {
    loading = true;
    message = '';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      message = error.message;
    } else {
      logActivity({
        action: 'user_login',
        details: { method: 'password' },
        userId: data?.user?.id,
        userEmail: email
      });
      window.location.href = '/dashboard';
    }
    loading = false;
  }
</script>

<div class="max-w-md mx-auto mt-16 px-4">
  <div class="bg-white p-8 rounded-xl border border-[#dddddd] shadow-sm relative overflow-hidden">
    <!-- Brand voltage coral strip -->
    <div class="absolute top-0 left-0 right-0 h-1 bg-[#aa2d00]"></div>
    
    <h2 class="text-xl font-bold text-center text-[#181d26] mb-6 tracking-tight">Login to QuickMDtoPDF</h2>
    
    <form on:submit|preventDefault={handleLogin} class="space-y-4">
      <div class="space-y-1">
        <label for="login-email" class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block">Email Address</label>
        <input id="login-email" type="email" placeholder="email@example.com" bind:value={email} class="w-full p-3 border border-[#dddddd] rounded-lg text-sm bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-sans font-medium shadow-sm" required />
      </div>
      
      <div class="space-y-1">
        <label for="login-password" class="text-[10px] font-bold text-[#9297a0] uppercase tracking-wider block">Password</label>
        <div class="relative">
          <input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" bind:value={password} class="w-full p-3 pr-10 border border-[#dddddd] rounded-lg text-sm bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-sans font-medium shadow-sm" required />
          <button type="button" on:click={() => showPassword = !showPassword} class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer">
            {#if showPassword}
              <!-- Eye Off Icon -->
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            {:else}
              <!-- Eye Icon -->
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>
      </div>
      
      <button type="submit" disabled={loading} class="w-full bg-[#181d26] hover:bg-[#0d1218] text-white p-3 rounded-lg font-medium text-xs tracking-wider uppercase transition-colors duration-150 shadow-sm cursor-pointer disabled:bg-gray-400 mt-2 select-none">
        {loading ? 'Logging in...' : 'Login'}
      </button>
      
      {#if message}
        <div class="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 mt-2">
          {message}
        </div>
      {/if}
    </form>
    
    <p class="text-center mt-6 text-xs text-[#333840]">
      Don't have an account? <a href="/register" class="text-[#1b61c9] font-semibold hover:underline">Register</a>
    </p>
  </div>
</div>