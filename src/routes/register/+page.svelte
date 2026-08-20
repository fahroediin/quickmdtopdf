<script>
  import { supabase } from '$lib/supabaseClient';
  let email = '';
  let password = '';
  let loading = false;
  let message = '';
  let successMessage = '';
  let showPassword = false;

  async function handleRegister() {
    loading = true;
    message = '';
    successMessage = '';
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) {
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
          message = 'This email is already registered. Please login.';
        } else {
          message = error.message;
        }
      } else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        message = 'This email is already registered. Please login.';
      } else {
        if (data?.session) {
          window.location.href = '/dashboard';
        } else {
          successMessage = 'Registration successful! Please check your email to verify your account.';
          email = '';
          password = '';
        }
      }
    } catch (err) {
      console.error(err);
      message = err.message || 'An unexpected error occurred during signup.';
    } finally {
      loading = false;
    }
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
        <div class="relative">
          <input id="register-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" bind:value={password} class="w-full p-3 pr-10 border border-[#dddddd] rounded-lg text-sm bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-sans font-medium shadow-sm" required />
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