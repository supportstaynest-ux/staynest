import { signIn, signUp, signInWithGoogle, sendResetPassword, getUser, getProfile, resendVerification, verifyEmail, resetPasswordWithToken } from '../supabase.js';
import { trackLogin, trackSignup } from '../analytics.js'; // Trigger HMR
import { state, setState, showToast, showLoading, hideLoading } from '../state.js';
import { navigate } from '../router.js';

// ─── Rate limiter ────────────────────────────────────────────────────────────
const RATE_KEY = 'sn_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

function getRateData() {
  try { return JSON.parse(sessionStorage.getItem(RATE_KEY)) || { count: 0, lockedUntil: 0 }; }
  catch { return { count: 0, lockedUntil: 0 }; }
}
function saveRateData(d) { sessionStorage.setItem(RATE_KEY, JSON.stringify(d)); }
function recordFailedAttempt() {
  const d = getRateData();
  d.count++;
  if (d.count >= MAX_ATTEMPTS) d.lockedUntil = Date.now() + LOCKOUT_MS;
  saveRateData(d);
}
function resetAttempts() { sessionStorage.removeItem(RATE_KEY); }
function getLockoutSeconds() {
  const d = getRateData();
  const remaining = d.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

// ─── Google SVG Logo ─────────────────────────────────────────────────────────
const GOOGLE_LOGO = `<svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.2 3.2 29.4 1 24 1 14.7 1 6.7 6.7 3.2 14.8l7 5.4C12 14.3 17.5 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4c4.1-3.8 6.3-9.4 6.3-16.2z"/>
  <path fill="#FBBC05" d="M10.2 28.8A14.7 14.7 0 0 1 9.5 24c0-1.7.3-3.3.7-4.8l-7-5.4A23.7 23.7 0 0 0 .5 24c0 3.8.9 7.4 2.7 10.6l7-5.8z"/>
  <path fill="#34A853" d="M24 47c5.4 0 10-1.8 13.3-4.8l-7-5.4C28.6 38.5 26.4 39.5 24 39.5c-6.5 0-12-4.8-13.8-11.2l-7 5.8C6.7 42.3 14.7 47 24 47z"/>
</svg>`;

// ─── Main render ─────────────────────────────────────────────────────────────
export function renderAuth() {
  const app = document.getElementById('app');
  const path = window.location.hash.slice(1).split('?')[0];
  const urlParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
  
  let isLogin = true;
  let showForgot = false;
  let isCheckEmail = false;
  let isVerifying = path === '/verify-email';
  let isResetting = path === '/reset-password';
  
  // Verification Popup State
  let showVerifyPopup = false;
  let verifyPopupState = 'loading'; // 'loading', 'sent', 'error'
  let verifyPopupEmail = '';
  let verifyResendTimer = 60;
  let resendInterval = null;

  function render() {
    if (isVerifying) {
      renderVerifying();
      return;
    }
    if (isResetting) {
      renderResetting();
      return;
    }

    app.innerHTML = `
      <div class="font-display bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <!-- Background decoration -->
        <div class="absolute inset-0 pointer-events-none select-none flex flex-col items-center justify-center gap-4">
          <img src="/namaste-bg.webp" alt="" loading="lazy" decoding="async" class="w-[320px] sm:w-[400px] h-auto" style="opacity:0.12;" />
          <p class="text-4xl sm:text-5xl font-bold text-slate-400" style="opacity:0.08; font-family:'Noto Sans Devanagari',serif;">अतिथि देवो भव</p>
        </div>

        <div class="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/80 dark:shadow-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          <!-- Header -->
          <header class="flex flex-col items-center gap-3 pt-10 pb-6 px-8 text-center">
                            <a href="#/home" class="flex items-center gap-2 text-primary hover:opacity-90 transition-opacity">
              <span class="material-symbols-outlined text-4xl">home_pin</span>
              <h2 class="text-2xl font-black leading-tight tracking-tight">StayNest</h2>
            </a>
            <div class="space-y-1">
              <h1 class="text-2xl font-bold tracking-tight">${isCheckEmail ? 'Check Your Email' : showForgot ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}</h1>
              <p class="text-slate-500 dark:text-slate-400 text-sm">${isCheckEmail ? 'We sent a verification link to your inbox' : showForgot ? 'Enter your email to receive a reset link' : isLogin ? 'Sign in to your StayNest account' : 'Join thousands finding verified PGs'}</p>
            </div>
          </header>

          <div class="px-8 pb-10 space-y-5">
            ${isCheckEmail ? renderCheckEmailView() : showForgot ? renderForgotForm() : renderMainForm()}
          </div>

          <!-- Footer -->
          <footer class="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 border-t border-slate-200 dark:border-slate-800">
            <p class="text-[10px] text-center text-slate-400 leading-relaxed">
              Protected by Supabase Auth. Passwords are hashed with bcrypt and never visible to anyone.
            </p>
          </footer>
        </div>

        <!-- VERIFICATION SIGNUP POPUP DIRECTIVE (USER UX FLOW) -->
        ${showVerifyPopup ? `
          <div class="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-50 p-4 animate-in fade-in duration-200">
            <div class="bg-white dark:bg-slate-900 p-8 rounded-2xl w-full max-w-[400px] text-center shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative overflow-hidden">
              
              <!-- Top color bar -->
              <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-400 to-indigo-500"></div>

              ${verifyPopupState === 'loading' ? `
                <div class="my-6">
                  <div class="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-primary mx-auto"></div>
                </div>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">Creating your account...</h2>
                <p class="text-sm mt-3 text-slate-500 max-w-xs mx-auto">Please wait while we set up your profile and send the verification email.</p>
              ` : verifyPopupState === 'sent' ? `
                <div class="size-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 mb-5 shadow-inner">
                  <span class="material-symbols-outlined text-4xl">mark_email_read</span>
                </div>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify Your Email</h2>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  A verification link has been sent to
                </p>
                <div class="mt-4 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50 font-bold text-primary font-mono select-all">
                  ${verifyPopupEmail}
                </div>
                
                <div class="mt-6 flex flex-col gap-3">
                  ${verifyResendTimer > 0 
                    ? `
                    <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p class="text-sm font-semibold text-slate-500">Resend email in <span class="text-primary font-bold text-lg inline-block w-8">${verifyResendTimer}s</span></p>
                    </div>
                    `
                    : `<button id="popup-resend-btn" class="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98]">
                         Resend Verification Email
                       </button>`
                  }
                  <button id="close-verify-popup" class="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-2">
                    Close and wait for email
                  </button>
                </div>
              ` : `
                <div class="size-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4">
                  <span class="material-symbols-outlined text-3xl">error</span>
                </div>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white animate-shake">Failed to create account</h2>
                <p class="text-sm mt-2 text-slate-500">An error occurred during signup. Please try again.</p>
                <button id="close-verify-popup" class="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3 px-4 mt-6 rounded-xl transition-all active:scale-[0.98]">
                  Dismiss
                </button>
              `}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    attachEvents();
  }

  function renderCheckEmailView() {
    return `
      <div class="text-center space-y-6 animate-in zoomIn">
        <div class="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          <span class="material-symbols-outlined text-4xl">outgoing_mail</span>
        </div>
        <p class="text-slate-600 dark:text-slate-400 font-medium">
          A verification link has been sent to your email address. Please click it to activate your account.
        </p>
        <div class="space-y-3">
          <button id="resend-btn" class="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold py-3 rounded-xl transition-all">
            Resend Email
          </button>
          <button id="back-to-auth" class="text-sm font-semibold text-primary hover:underline transition-colors">
            Back to Sign In
          </button>
        </div>
      </div>
    `;
  }

  async function renderVerifying() {
    app.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-primary mb-4"></div>
        <h2 class="text-xl font-bold">Verifying your email...</h2>
      </div>
    `;
    const token = urlParams.get('token');
    try {
      if (!token) throw new Error("Verification token missing");
      await verifyEmail(token);
      localStorage.removeItem('sn_show_verify_warning');
      
      showToast('Email verified successfully! Redirecting...', 'success');
      
      // Auto redirect after verification (as requested)
      setTimeout(() => {
        navigate('/dashboard'); 
      }, 2000);
    } catch (err) {
      app.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4 text-center">
          <span class="material-symbols-outlined text-6xl text-red-500 mb-4 font-variation-fill">error</span>
          <h2 class="text-2xl font-bold mb-2">Verification Failed</h2>
          <p class="text-slate-500 mb-6">${err.message || 'The link may be expired or invalid.'}</p>
          <button onclick="window.location.hash='/auth'" class="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg">Back to Login</button>
        </div>
      `;
    }
  }

  function renderResetting() {
    app.innerHTML = `
      <div class="font-display bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div class="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <header class="flex flex-col items-center gap-3 pt-10 pb-6 px-8 text-center">
            <div class="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-2">
              <span class="material-symbols-outlined text-3xl">lock_reset</span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight">Set New Password</h1>
            <p class="text-slate-500 dark:text-slate-400 text-sm">Please enter a new secure password for your account.</p>
          </header>
          <div class="px-8 pb-10">
            <form id="reset-password-form" class="space-y-4">
              <div class="flex flex-col gap-2">
                <label for="new-password" class="text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                <input type="password" id="new-password" class="form-input w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 px-4 outline-none transition-all" placeholder="At least 8 characters" required minlength="8" />
              </div>
              <div class="flex flex-col gap-2">
                <label for="confirm-new-password" class="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <input type="password" id="confirm-new-password" class="form-input w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 px-4 outline-none transition-all" placeholder="Confirm new password" required />
              </div>
              <button type="submit" class="w-full bg-primary hover:brightness-110 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 mt-2">
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('reset-password-form').onsubmit = async (e) => {
      e.preventDefault();
      const p1 = document.getElementById('new-password').value;
      const p2 = document.getElementById('confirm-new-password').value;
      const token = urlParams.get('token');

      if (p1 !== p2) { showToast('Passwords do not match', 'error'); return; }
      if (!token) { showToast('Token missing', 'error'); return; }

      showLoading();
      try {
        await resetPasswordWithToken(token, p1);
        showToast('Password updated successfully! Please login.', 'success');
        navigate('/auth');
      } catch (err) {
        showToast(err.message, 'error');
      }
      hideLoading();
    };
  }

  function renderForgotForm() {
    return `
      <form id="forgot-form" class="space-y-5">
        <div class="flex flex-col gap-2">
          <label for="forgot-email" class="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
          <input type="email" id="forgot-email" class="form-input w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 px-4 outline-none transition-all placeholder:text-slate-400" placeholder="name@example.com" required />
        </div>
        <button type="submit" class="w-full bg-primary hover:brightness-110 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-[0.98]">
          Send Reset Link
        </button>
        <div class="text-center">
          <button type="button" id="back-to-login" class="text-sm font-semibold text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">arrow_back</span> Back to Login
          </button>
        </div>
      </form>
    `;
  }

  function renderMainForm() {
    return `
      <!-- Google OAuth Button -->
      <button type="button" id="google-btn" class="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all active:scale-[0.98]">
        ${GOOGLE_LOGO}
        Continue with Google
      </button>

      <div class="relative flex items-center">
        <div class="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        <span class="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase tracking-wider">or continue with email</span>
        <div class="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
      </div>

      <!-- Rate limit warning -->
      <div id="rate-warning" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
        <span class="material-symbols-outlined text-lg">warning</span>
        <span id="rate-warning-text"></span>
      </div>

      <!-- Verification warning -->
      <div id="verify-warning" class="hidden bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl px-4 py-3 text-sm font-medium flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-lg">mail</span>
          <span>Your email is not verified</span>
        </div>
        <button type="button" id="resend-inline-btn" class="text-xs font-bold text-amber-800 dark:text-amber-200 underline text-left hover:opacity-80">
          Didn't receive email? Resend link
        </button>
      </div>

      <!-- Main Form -->
      <form id="auth-form" class="space-y-4">
        ${!isLogin ? `
        <div class="flex flex-col gap-2">
          <label for="auth-name" class="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
          <input type="text" id="auth-name" class="form-input w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 px-4 outline-none transition-all placeholder:text-slate-400" placeholder="Enter your full name" required />
        </div>
        ` : ''}

        <div class="flex flex-col gap-2">
          <label for="auth-email" class="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
          <input type="email" id="auth-email" class="form-input w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 px-4 outline-none transition-all placeholder:text-slate-400" placeholder="name@example.com" required />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <label for="auth-password" class="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
            ${isLogin ? `<button type="button" id="forgot-link" class="text-xs font-semibold text-primary hover:underline">Forgot Password?</button>` : ''}
          </div>
          <div class="relative">
            <input type="password" id="auth-password" class="form-input w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-4 pr-12 outline-none transition-all placeholder:text-slate-400" placeholder="${isLogin ? 'Enter your password' : 'Create a strong password (min 8 chars)'}" required minlength="${isLogin ? 6 : 8}" />
            <button type="button" id="toggle-pwd" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none">
              <span class="material-symbols-outlined text-[20px]" id="pwd-icon">visibility</span>
            </button>
          </div>
        </div>

        ${!isLogin ? `
        <div class="flex flex-col gap-2">
          <label for="auth-confirm-password" class="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm Password</label>
          <div class="relative">
            <input type="password" id="auth-confirm-password" class="form-input w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-4 pr-12 outline-none transition-all placeholder:text-slate-400" placeholder="Confirm your password" required minlength="8" />
            <button type="button" id="toggle-confirm-pwd" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none">
              <span class="material-symbols-outlined text-[20px]" id="confirm-pwd-icon">visibility</span>
            </button>
          </div>
        </div>

        <!-- Terms & Conditions -->
        <div class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <label class="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" id="terms-checkbox" class="mt-0.5 w-4.5 h-4.5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer shrink-0" />
            <span class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              I agree to StayNest's
              <a href="#/terms" class="text-primary font-semibold hover:underline" target="_blank">Terms &amp; Conditions</a>
              and
              <a href="#/privacy" class="text-primary font-semibold hover:underline" target="_blank">Privacy Policy</a>.
              My password is hashed with bcrypt and never stored in plain text.
            </span>
          </label>
        </div>
        ` : ''}

        <button type="submit" id="submit-btn" class="w-full bg-primary hover:brightness-110 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100" ${!isLogin ? 'disabled' : ''}>
          ${isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <!-- Toggle login/signup -->
      <div class="text-center pt-1">
        <button type="button" id="toggle-auth" class="text-sm font-semibold text-slate-500 hover:text-primary transition-colors">
          ${isLogin ? "Don't have an account? <span class='text-primary'>Sign Up</span>" : "Already have an account? <span class='text-primary'>Sign In</span>"}
        </button>
      </div>
    `;
  }

  function attachEvents() {
    // Password toggles
    document.getElementById('toggle-pwd')?.addEventListener('click', () => {
      const pwdInput = document.getElementById('auth-password');
      const icon = document.getElementById('pwd-icon');
      const type = pwdInput.type === 'password' ? 'text' : 'password';
      pwdInput.type = type;
      icon.textContent = type === 'password' ? 'visibility' : 'visibility_off';
    });

    document.getElementById('toggle-confirm-pwd')?.addEventListener('click', () => {
      const input = document.getElementById('auth-confirm-password');
      const icon = document.getElementById('confirm-pwd-icon');
      const type = input.type === 'password' ? 'text' : 'password';
      input.type = type;
      icon.textContent = type === 'password' ? 'visibility' : 'visibility_off';
    });

    // Terms checkbox enables the submit button
    document.getElementById('terms-checkbox')?.addEventListener('change', (e) => {
      const submitBtn = document.getElementById('submit-btn');
      if (submitBtn) submitBtn.disabled = !e.target.checked;
    });

    // Google Button
    document.getElementById('google-btn')?.addEventListener('click', async () => {
      if (!isLogin) {
        const termsChecked = document.getElementById('terms-checkbox')?.checked;
        if (!termsChecked) {
          showToast('You must agree to the Terms & Conditions and Privacy Policy to create an account.', 'error');
          return;
        }
      }
      try {
        await signInWithGoogle();
        // Redirect is handled by Supabase OAuth callback
      } catch (err) {
        showToast(err.message || 'Google sign-in failed', 'error');
      }
    });

    // Main form submit
    if (isCheckEmail) {
      document.getElementById('resend-btn').onclick = async () => {
        const email = document.getElementById('auth-email')?.value || localStorage.getItem('sn_last_email');
        if (!email) { showToast('Email not found', 'error'); return; }
        showLoading();
        try {
          await resendVerification(email);
          showToast('Verification email resent!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
        hideLoading();
      };
      document.getElementById('back-to-auth').onclick = () => { isCheckEmail = false; isLogin = true; render(); };
    } else if (showForgot) {
      document.getElementById('forgot-form').onsubmit = handleForgot;
      document.getElementById('back-to-login').onclick = (e) => { e.preventDefault(); showForgot = false; render(); };
    } else {
      document.getElementById('auth-form').onsubmit = handleSubmit;
      document.getElementById('toggle-auth')?.addEventListener('click', () => { 
        isLogin = !isLogin; 
        if (!isLogin) localStorage.removeItem('sn_show_verify_warning');
        render(); 
      });
      document.getElementById('forgot-link')?.addEventListener('click', (e) => { e.preventDefault(); showForgot = true; render(); });
    }

    // Check rate limit on load
    checkRateLimitDisplay();

    // Show verification warning if flagged
    if (localStorage.getItem('sn_show_verify_warning')) {
      document.getElementById('verify-warning')?.classList.remove('hidden');
      document.getElementById('resend-inline-btn').onclick = async () => {
        const email = localStorage.getItem('sn_last_email');
        if (!email) { showToast('Please enter your email first', 'error'); return; }
        showLoading();
        try {
          await resendVerification(email);
          showToast('Verification email resent!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
        hideLoading();
      };
    }

    // VERIFICATION POPUP EVENTS
    const popupResendBtn = document.getElementById('popup-resend-btn');
    if (popupResendBtn) {
        popupResendBtn.onclick = async () => {
            if (!verifyPopupEmail) return;
            // Briefly show loading state inside the button or use global toast
            popupResendBtn.textContent = 'Sending...';
            popupResendBtn.disabled = true;
            try {
                await resendVerification(verifyPopupEmail);
                showToast('Verification email resent!', 'success');
                verifyResendTimer = 60;
                if (resendInterval) clearInterval(resendInterval);
                resendInterval = setInterval(() => {
                    verifyResendTimer--;
                    render();
                    if (verifyResendTimer <= 0) clearInterval(resendInterval);
                }, 1000);
                render();
            } catch (err) {
                showToast(err.message, 'error');
                popupResendBtn.textContent = 'Resend Verification Email';
                popupResendBtn.disabled = false;
            }
        };
    }

    const closeVerifyPopupBtn = document.getElementById('close-verify-popup');
    if (closeVerifyPopupBtn) {
        closeVerifyPopupBtn.onclick = () => {
            if (resendInterval) clearInterval(resendInterval);
            showVerifyPopup = false;
            // Make sure the main UI reflects the correct state if they close the popup
            if (verifyPopupState === 'sent') {
                isCheckEmail = true;
            }
            render();
        };
    }
  }

  function checkRateLimitDisplay() {
    const secs = getLockoutSeconds();
    const warning = document.getElementById('rate-warning');
    if (!warning) return;
    if (secs > 0) {
      warning.classList.remove('hidden');
      document.getElementById('rate-warning-text').textContent = `Too many failed attempts. Please wait ${secs}s before trying again.`;
      document.getElementById('submit-btn')?.setAttribute('disabled', true);
      const timer = setInterval(() => {
        const s = getLockoutSeconds();
        if (s <= 0) {
          clearInterval(timer);
          warning.classList.add('hidden');
          document.getElementById('submit-btn')?.removeAttribute('disabled');
        } else {
          document.getElementById('rate-warning-text').textContent = `Too many failed attempts. Please wait ${s}s before trying again.`;
        }
      }, 1000);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Rate limit check
    if (getLockoutSeconds() > 0) {
      showToast('Too many attempts. Please wait before trying again.', 'error');
      return;
    }

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!isLogin) {
      const name = document.getElementById('auth-name').value.trim();
      const confirmPassword = document.getElementById('auth-confirm-password').value;
      const termsChecked = document.getElementById('terms-checkbox').checked;

      if (!termsChecked) {
        showToast('You must agree to the Terms & Conditions and Privacy Policy to create an account.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match. Please try again.', 'error');
        return;
      }
      if (password.length < 8) {
        showToast('Password must be at least 8 characters.', 'error');
        return;
      }
      if (!name) {
        showToast('Please enter your full name.', 'error');
        return;
      }

      // Show Popup Loading State (User PRD)
      showVerifyPopup = true;
      verifyPopupState = 'loading';
      verifyPopupEmail = email;
      render(); 

      try {
        await signUp(email, password, name, true);
        trackSignup('email');
        localStorage.setItem('sn_last_email', email);
        
        // Success -> Transition popup to Email Sent UI
        verifyPopupState = 'sent';
        verifyResendTimer = 60;
        
        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(() => {
            verifyResendTimer--;
            render();
            if (verifyResendTimer <= 0) clearInterval(resendInterval);
        }, 1000);
        
        resetAttempts();
        render(); // Apply the sent UI change
      } catch (err) {
        if (err.message === 'UNVERIFIED_EXISTS') {
            verifyPopupState = 'sent';
            verifyResendTimer = 60;
            if (resendInterval) clearInterval(resendInterval);
            resendInterval = setInterval(() => {
                verifyResendTimer--;
                render();
                if (verifyResendTimer <= 0) clearInterval(resendInterval);
            }, 1000);
            resetAttempts();
            render();
            return;
        }
        showVerifyPopup = false;
        showToast(err.message, 'error');
        render();
      }
    } else {
      showLoading();
      try {
        await signIn(email, password);
        trackLogin('email');
        sessionStorage.setItem('staynest_session_tracked', 'true'); // Prevents double-tracking on main.js reload
        resetAttempts();
        localStorage.removeItem('sn_show_verify_warning');
        const user = await getUser();
        const profile = await getProfile(user.id);
        setState({ user, profile });
        showToast('Welcome back!', 'success');
        redirectByRole(profile);
      } catch (err) {
        if (err.message === 'NOT_VERIFIED') {
          showToast('Verification required. Please check your email.', 'warning');
          localStorage.setItem('sn_last_email', email);
          localStorage.setItem('sn_show_verify_warning', 'true');
          isCheckEmail = true;
          render();
          hideLoading();
          return;
        }
        recordFailedAttempt();
        checkRateLimitDisplay();
        const rateData = getRateData();
        const remaining = MAX_ATTEMPTS - rateData.count;
        if (remaining > 0 && remaining < MAX_ATTEMPTS) {
          showToast(`${err.message}. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`, 'error');
        } else {
          showToast(err.message, 'error');
        }
      }
      hideLoading();
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    showLoading();
    try {
      await sendResetPassword(email);
      showToast('Password reset link sent! Check your email inbox. The link expires in 10 minutes.', 'success');
      showForgot = false;
      isLogin = true;
      render();
    } catch (err) {
      showToast(err.message, 'error');
    }
    hideLoading();
  }

  render();
}

export function redirectByRole(profile) {
  if (profile?.role === 'admin') navigate('/admin');
  else if (profile?.role === 'vendor') navigate('/vendor');
  else navigate('/dashboard');
}

export function renderVerifyPending() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="font-display bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6">
        <div class="size-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-500">
          <span class="material-symbols-outlined text-4xl font-variation-fill">verified_user</span>
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold tracking-tight">Email Not Verified</h1>
          <p class="text-slate-500 dark:text-slate-400 text-sm">
            You need to verify your email address before you can access your dashboard.
          </p>
        </div>
        
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3 text-left">
          <span class="material-symbols-outlined text-lg shrink-0">info</span>
          <p>Please check your inbox for a verification link. If you didn't receive it, click the button below.</p>
        </div>

        <div class="space-y-3 pt-2">
          <button id="resend-pending-btn" class="w-full bg-primary hover:brightness-110 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98]">
            Resend Verification Email
          </button>
          <button onclick="window.location.hash='/auth'" class="text-sm font-semibold text-slate-500 hover:text-primary transition-colors">
            Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('resend-pending-btn').onclick = async () => {
    const email = localStorage.getItem('sn_last_email') || state.user?.email;
    if (!email) { 
      showToast('Session expired. Please sign in again.', 'error');
      navigate('/auth');
      return; 
    }
    showLoading();
    try {
      await resendVerification(email);
      showToast('Verification email resent! Check your inbox.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    hideLoading();
  };
}
