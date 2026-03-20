import { updatePassword } from '../supabase.js';
import { showToast, showLoading, hideLoading } from '../state.js';
import { navigate } from '../router.js';

export function renderSetPassword() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="font-display bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden px-8 py-10">
        <header class="flex flex-col items-center gap-3 text-center mb-8">
          <div class="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-3xl">check_circle</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight">Google Login Successful</h1>
          <p class="text-slate-500 text-sm leading-relaxed">
            Would you like to set a password so you can also log in with your email in the future? (Optional)
          </p>
        </header>

        <form id="set-pwd-form" class="space-y-4">
          <div class="flex flex-col gap-2">
            <label for="new-pwd" class="text-sm font-semibold text-slate-700 dark:text-slate-300">Set a Password (Optional)</label>
            <div class="relative">
              <input type="password" id="new-pwd" class="form-input w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-4 pr-12 outline-none transition-all placeholder:text-slate-400" placeholder="Minimum 8 characters" minlength="8" />
              <button type="button" id="toggle-pwd" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none">
                <span class="material-symbols-outlined text-[20px]" id="pwd-icon">visibility</span>
              </button>
            </div>
          </div>
          
          <div class="flex flex-col gap-3 mt-8">
            <button type="submit" class="w-full bg-primary hover:brightness-110 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98]">
              Save Password & Continue
            </button>
            <button type="button" onclick="window.location.hash='/home'" class="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('toggle-pwd')?.addEventListener('click', () => {
    const pwdInput = document.getElementById('new-pwd');
    const icon = document.getElementById('pwd-icon');
    const type = pwdInput.type === 'password' ? 'text' : 'password';
    pwdInput.type = type;
    icon.textContent = type === 'password' ? 'visibility' : 'visibility_off';
  });

  document.getElementById('set-pwd-form').onsubmit = async (e) => {
    e.preventDefault();
    const pwd = document.getElementById('new-pwd').value;
    if (!pwd) {
      navigate('/home');
      return;
    }
    if (pwd.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    showLoading();
    try {
      await updatePassword(pwd);
      showToast('Password set securely! You can now log in with email or Google.', 'success');
      navigate('/home');
    } catch (err) {
      showToast(err.message, 'error');
    }
    hideLoading();
  }
}
