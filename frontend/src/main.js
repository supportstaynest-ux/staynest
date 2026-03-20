import './style.css';
import { state, setState, hasOnboarded } from './js/state.js';
import { supabase, getProfile, getSavedListings, signOut } from './js/supabase.js';

console.log('🚀 StayNest App Initializing...');

// Global error handling to prevent silent white screens
window.onerror = function(msg, url, line, col, error) {
  console.error('🔴 GLOBAL ERROR:', msg, 'at', url, ':', line, ':', col);
  const app = document.getElementById('app');
  if (app && app.innerHTML.includes('animate-spin')) {
    app.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-900">
        <span class="material-symbols-outlined text-6xl text-red-500 mb-4">bug_report</span>
        <h2 class="text-2xl font-bold mb-2">Application Error</h2>
        <p class="text-slate-500 mb-6">A JavaScript error occurred. Please check the console for details.</p>
        <button onclick="window.location.reload()" class="bg-primary text-white px-8 py-3 rounded-xl font-bold">Reload Page</button>
      </div>
    `;
  }
  return false;
};

import { 
  route, 
  startRouter, 
  navigate 
} from './js/router.js';
import { trackPageView, initAnalytics } from './js/analytics.js';
import { initNavbarEvents } from './js/components/navbar.js';
import { initPerformance } from './js/performance.js';
import { loadFooterSettings } from './js/components/footer.js';
import { initOneSignal } from './js/onesignal.js';

// ── Lazy Import Helper ────────────────────────────────────────────
// Wraps a dynamic import so the module is only downloaded when the route is first accessed.
// After first load the module is cached by the browser — subsequent navigations are instant.
function lazy(importFn, exportName) {
  return (params) => importFn().then(m => m[exportName](params));
}

// ── Route Guards (Role-Based Access Control) ──────────────────────
function userGuard(handler) {
  return async (params) => {
    if (!state.user) { navigate('/auth'); return; }
    if (!state.profile?.is_verified) { navigate('/verify-pending'); return; }
    return typeof handler === 'function' ? await handler(params) : handler;
  };
}

function vendorGuard(handler) {
  return async (params) => {
    if (!state.user) { navigate('/auth'); return; }
    if (!state.profile?.is_verified) { navigate('/verify-pending'); return; }
    if (state.profile?.role !== 'vendor') { import('./js/pages/auth.js').then(m => m.redirectByRole(state.profile)); return; }
    return typeof handler === 'function' ? await handler(params) : handler;
  };
}

function adminGuard(handler) {
  return async (params) => {
    if (!state.user) { navigate('/auth'); return; }
    if (!state.profile?.is_verified) { navigate('/verify-pending'); return; }
    if (state.profile?.role !== 'admin') { import('./js/pages/auth.js').then(m => m.redirectByRole(state.profile)); return; }
    return typeof handler === 'function' ? await handler(params) : handler;
  };
}

function unAuthGuard(handler) {
  return async (params) => {
    if (state.user) { import('./js/pages/auth.js').then(m => m.redirectByRole(state.profile)); return; }
    return typeof handler === 'function' ? await handler(params) : handler;
  };
}

function publicGuard(handler) {
  return async (params) => {
    if (state.user && (state.profile?.role === 'vendor' || state.profile?.role === 'admin')) {
      import('./js/pages/auth.js').then(m => m.redirectByRole(state.profile));
      return;
    }
    return typeof handler === 'function' ? await handler(params) : handler;
  };
}

// ── Core pages (small, loaded eagerly for instant first-paint) ────
import { renderOnboarding } from './js/pages/onboarding.js';
import { renderAuth } from './js/pages/auth.js';
import { renderHome } from './js/pages/home.js';

route('/', () => { if (!hasOnboarded()) renderOnboarding(); else navigate('/home'); });
route('/onboarding', unAuthGuard(renderOnboarding));
route('/auth', unAuthGuard(renderAuth));
route('/verify-pending', userGuard(lazy(() => import('./js/pages/auth.js'), 'renderVerifyPending')));
route('/reset-password', renderAuth);
route('/home', publicGuard(renderHome));

// ── Auth follow-up route ──
route('/set-password', userGuard(lazy(() => import('./js/pages/set-password.js'), 'renderSetPassword')));

// ── User pages (lazy – only loaded when user navigates) ──────────
route('/complete-profile', userGuard(lazy(() => import('./js/pages/complete-profile.js'), 'renderCompleteProfile')));
route('/dashboard', userGuard(lazy(() => import('./js/pages/dashboard.js'), 'renderDashboard')));
route('/explore', publicGuard(lazy(() => import('./js/pages/explore.js'), 'renderExplore')));
route('/pg/:id', lazy(() => import('./js/pages/pg-details.js'), 'renderPGDetails'));
route('/verify-email', async () => {
  // Using URLSearchParams safely across standard query strings and hash-based query strings
  const queryString = window.location.search || window.location.hash.split('?')[1] || window.location.href.split('?')[1] || '';
  const token = new URLSearchParams(queryString).get("token");
  const app = document.getElementById('app');
  
  console.log("Token extracted:", token);

  if (!token) {
    app.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4">
        <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100 dark:border-slate-800">
          <span class="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Invalid Link ❌</h2>
          <p class="text-slate-500 mb-6">No verification token provided in the URL.</p>
          <button onclick="window.location.hash='/home'" class="bg-primary hover:brightness-110 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 mx-auto">
            Return Home
          </button>
        </div>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100 dark:border-slate-800">
        <div id="verify-status">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-primary mx-auto mb-4"></div>
          <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Verifying...</h2>
          <p class="text-slate-500">Please wait while we verify your account.</p>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/verify-email?token=${token}`);
    
    // Do NOT parse non-JSON response (prevents "Cannot coerce the result to a single JSON object")
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid server response. Expected JSON but received HTML/Text.");
    }

    const data = await res.json();

    if (res.ok && data.success) {
      const statusEl = document.getElementById('verify-status');
      if (statusEl) {
        statusEl.innerHTML = `
          <span class="material-symbols-outlined text-6xl text-emerald-500 mb-4">check_circle</span>
          <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Email Verified Successfully ✅</h2>
          <p class="text-slate-500 mb-6">Your account has been successfully verified. You can now log in.</p>
          <a href="#/auth" class="inline-block bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:brightness-110 transition-all">Log In Now</a>
        `;
      }
    } else {
      throw new Error(data.error || "Verification Failed");
    }
  } catch (err) {
    console.error('Verification error:', err);
    const statusEl = document.getElementById('verify-status');
    if (statusEl) {
      statusEl.innerHTML = `
        <span class="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Verification Failed ❌</h2>
        <p class="text-slate-500 mb-6">${err.message || 'Something went wrong.'}</p>
        <a href="#/auth" class="inline-block bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:brightness-110 transition-all">Back to Login</a>
      `;
    }
  }
});
route('/saved', userGuard(lazy(() => import('./js/pages/user-pages.js'), 'renderSavedPGs')));
route('/visits', userGuard(lazy(() => import('./js/pages/user-pages.js'), 'renderMyVisits')));
route('/compare', userGuard(lazy(() => import('./js/pages/user-pages.js'), 'renderComparePGs')));
route('/recent', userGuard(lazy(() => import('./js/pages/user-pages.js'), 'renderRecentlyViewed')));
route('/enquiries', userGuard(lazy(() => import('./js/pages/user-pages.js'), 'renderMyEnquiries')));
route('/notifications', userGuard(lazy(() => import('./js/pages/notifications.js'), 'renderNotifications')));
route('/profile', userGuard(lazy(() => import('./js/pages/complete-profile.js'), 'renderCompleteProfile')));

// ── Vendor routes (lazy – vendor.js is ~156KB, only loaded for vendors) ──
route('/vendor', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorDashboard')));
route('/vendor/listings', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorListings')));
route('/vendor/add-listing', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderAddListing')));
route('/vendor/edit-listing/:id', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderEditListing')));
route('/vendor/enquiries', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorEnquiries')));
route('/vendor/analytics', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorAnalytics')));
route('/vendor/reviews', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorReviews')));
route('/vendor/boost', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorBoost')));
route('/vendor/subscriptions', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorSubscriptions')));
route('/vendor/settings', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorSettings')));
route('/vendor/settings/mfa', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorMfa')));
route('/vendor/support', vendorGuard(lazy(() => import('./js/pages/vendor.js'), 'renderVendorSupport')));

// ── Admin routes (lazy – admin.js is ~85KB, only loaded for admins) ──
route('/admin', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminDashboard')));
route('/admin/analytics', adminGuard(lazy(() => import('./js/pages/admin-analytics.js'), 'renderAdminAnalytics')));
route('/admin/realtime-monitor', adminGuard(lazy(() => import('./js/pages/admin-analytics.js'), 'renderAdminRealtime')));
route('/admin/user-activity', adminGuard(lazy(() => import('./js/pages/admin-analytics.js'), 'renderAdminUserActivity')));
route('/admin/conversion-funnel', adminGuard(lazy(() => import('./js/pages/admin-analytics.js'), 'renderAdminConversionFunnel')));
route('/admin/demand-prediction', adminGuard(lazy(() => import('./js/pages/admin-analytics.js'), 'renderAdminDemandPrediction')));
route('/admin/demand-heatmap', adminGuard(lazy(() => import('./js/pages/admin-analytics.js'), 'renderAdminDemandHeatmap')));
route('/admin/vendor-performance', adminGuard(lazy(() => import('./js/pages/admin-analytics.js'), 'renderAdminVendorPerformance')));
route('/admin/fraud-detection', adminGuard(lazy(() => import('./js/pages/admin-analytics.js'), 'renderAdminFraudDetection')));
route('/admin/users', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminUsers')));
route('/admin/vendors', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminVendors')));
route('/admin/listings', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminListings')));
route('/admin/featured', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminFeatured')));
route('/admin/reports', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminReports')));
route('/admin/notifications', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminNotifications')));
route('/admin/settings', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminSettings')));
route('/admin/boost-plans', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminBoostPlans')));
route('/admin/payments', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminPayments')));
route('/admin/plans', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminPlans')));
route('/admin/support', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminSupport')));
route('/admin/chat-monitoring', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminChatMonitoring')));
route('/admin/vendor-detail', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminVendorDetail')));
route('/admin/listing-chat', adminGuard(lazy(() => import('./js/pages/admin.js'), 'renderAdminListingChat')));

// ── Legal pages (lazy) ──
route('/about', lazy(() => import('./js/pages/legal.js'), 'renderAbout'));
route('/privacy', lazy(() => import('./js/pages/legal.js'), 'renderPrivacy'));
route('/terms', lazy(() => import('./js/pages/legal.js'), 'renderTerms'));
route('/contact', lazy(() => import('./js/pages/legal.js'), 'renderContact'));

// Safety tips
route('/safety', async () => {
  const { renderNavbar } = await import('./js/components/navbar.js');
  const { renderFooter } = await import('./js/components/footer.js');
  document.getElementById('app').innerHTML = `
  <div class="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      ${renderNavbar()}
      <main class="flex-grow max-w-4xl mx-auto w-full px-4 py-12 animate-in slideInUp">
          <div class="text-center mb-10">
              <div class="inline-flex size-16 items-center justify-center bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-full mb-4">
                  <span class="material-symbols-outlined text-3xl">health_and_safety</span>
              </div>
              <h1 class="text-3xl font-black text-slate-900 dark:text-white mb-2">Safety Tips & Guidelines</h1>
              <p class="text-slate-500 font-medium max-w-lg mx-auto">Your safety is our top priority. Please review these essential tips before finalizing any PG accommodation.</p>
          </div>
          
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              ${[
      { title: 'Visit in person', text: 'Always visit the PG in person before paying any deposit or advance.', icon: 'directions_walk', color: 'text-blue-500', bg: 'bg-blue-50' },
      { title: 'Verify Owner Identity', text: 'Verify the owner\'s identity through a govt ID before finalizing the deal.', icon: 'badge', color: 'text-indigo-500', bg: 'bg-indigo-50' },
      { title: 'Written Agreement', text: 'Always insist on a written and signed rent agreement detailing terms.', icon: 'contract', color: 'text-violet-500', bg: 'bg-violet-50' },
      { title: 'Digital Payments', text: 'Never pay large amounts in cash – use UPI or bank transfer for a clear record.', icon: 'account_balance', color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { title: 'Security Measures', text: 'Check physical locks, fire safety equipment, and working CCTV cameras.', icon: 'vpn_key', color: 'text-amber-500', bg: 'bg-amber-50' },
      { title: 'Talk to Tenants', text: 'Talk to existing tenants about their experience, food quality, and owner behavior.', icon: 'groups', color: 'text-rose-500', bg: 'bg-rose-50' },
      { title: 'Location Verification', text: 'Verify the actual physical location matches the listing address exactly.', icon: 'location_on', color: 'text-cyan-500', bg: 'bg-cyan-50' },
      { title: 'Too Good to be True', text: 'Be cautious of deals that seem unbelievably cheap or too good to be true.', icon: 'warning', color: 'text-orange-500', bg: 'bg-orange-50' },
    ].map(t => `
                  <li class="p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div class="size-10 rounded-full ${t.bg} dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <span class="material-symbols-outlined ${t.color}">${t.icon}</span>
                      </div>
                      <div>
                          <h3 class="font-bold text-slate-900 dark:text-white mb-1">${t.title}</h3>
                          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">${t.text}</p>
                      </div>
                  </li>
              `).join('')}
              </ul>
          </div>
      </main>
      ${renderFooter()}
  </div>`;
  initNavbarEvents();
});

// FAQ
route('/faq', async () => {
  const { renderNavbar } = await import('./js/components/navbar.js');
  const { renderFooter } = await import('./js/components/footer.js');
  const faqs = [
    { q: 'What is StayNest?', a: 'StayNest is a platform to find verified PG accommodations near your college or office. We connect you directly with PG owners.' },
    { q: 'Is StayNest free to use?', a: 'Yes! Searching and contacting PG owners is completely free for students and professionals.' },
    { q: 'How are PGs verified?', a: 'Our team manually verifies each listing for authenticity, safety, and accuracy before approval.' },
    { q: 'Can I list my PG on StayNest?', a: 'Absolutely! Sign up, and you can list your PG for free. Listings are reviewed before going live.' },
    { q: 'How do I contact a PG owner?', a: 'You can call, WhatsApp, or send an enquiry directly through the PG details page.' },
  ];
  document.getElementById('app').innerHTML = `
  <div class="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      ${renderNavbar()}
      <main class="flex-grow max-w-3xl mx-auto w-full px-4 py-12 animate-in fadeIn">
          <div class="text-center mb-10">
              <h1 class="text-3xl font-black text-slate-900 dark:text-white mb-2">Frequently Asked Questions</h1>
              <p class="text-slate-500 font-medium">Everything you need to know about using StayNest.</p>
          </div>
          
          <div class="space-y-4">
              ${faqs.map(f => `
              <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm group">
                  <div class="p-5 cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onclick="const a = this.nextElementSibling; const i = this.querySelector('span'); if(a.classList.contains('hidden')){a.classList.remove('hidden');i.style.transform='rotate(180deg)';}else{a.classList.add('hidden');i.style.transform='rotate(0deg)';}">
                      <h3 class="font-bold text-slate-900 dark:text-white pr-4">${f.q}</h3>
                      <span class="material-symbols-outlined text-slate-400 transition-transform duration-300">expand_more</span>
                  </div>
                  <div class="p-5 pt-2 hidden text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      ${f.a}
                  </div>
              </div>
              `).join('')}
          </div>
          
          <div class="mt-12 text-center bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-8">
              <h3 class="font-bold text-lg mb-2 text-slate-900 dark:text-white">Still have questions?</h3>
              <p class="text-slate-500 text-sm mb-4">We're here to help you find your perfect stay.</p>
              <a href="#/contact" class="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:brightness-110 transition-all shadow-sm">
                  <span class="material-symbols-outlined text-[18px]">mail</span> Contact Support
              </a>
          </div>
      </main>
      ${renderFooter()}
  </div>`;
  initNavbarEvents();
});

// 404
route('/404', () => {
  document.getElementById('app').innerHTML = `
  <div class="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white relative overflow-hidden">
      <div class="absolute inset-0 z-0 opacity-[0.03] dark:opacity-5 pointer-events-none" style="background-image: radial-gradient(#6c5ce7 2px, transparent 2px); background-size: 30px 30px;"></div>
      
      <div class="relative z-10 max-w-md animate-in zoomIn">
          <h1 class="text-8xl md:text-9xl font-black text-primary mb-2 tracking-tighter mix-blend-multiply dark:mix-blend-screen opacity-90">404</h1>
          <div class="h-2 w-20 bg-primary mx-auto rounded-full mb-6"></div>
          <h2 class="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-200">Page not found</h2>
          <p class="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
          <button onclick="window.location.hash='/home'" class="bg-primary hover:brightness-110 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_8px_30px_rgb(108,92,231,0.3)] hover:shadow-[0_8px_30px_rgb(108,92,231,0.5)] flex items-center justify-center gap-2 mx-auto">
              <span class="material-symbols-outlined text-[20px]">home</span> Return Home
          </button>
      </div>
  </div>`;
});

// Initialize app
async function init() {
  console.log('App init starting...');
  initPerformance();
  console.log('Performance initialized');

  // Pre-load site settings for footer (non-blocking)
  loadFooterSettings().catch(() => {});

  // initOneSignal().catch(() => {});

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.error('PWA Service Worker registration failed.', err));
    });
  }

  // Initialize Analytics globally
  initAnalytics();

  // Capture PWA Install Prompt for custom install buttons
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    // Show install buttons globally if they exist in DOM
    document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.classList.remove('hidden'));
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    window.deferredPrompt = null;
    document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.classList.add('hidden'));
  });

  // Load auth state synchronously BEFORE drawing the app
  try {
    console.log('Fetching session...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session fetched:', session ? 'Active' : 'None');
    state.user = session?.user;

    // Track login if it's a new session and we haven't tracked it yet
    const prevSession = sessionStorage.getItem('staynest_session_tracked');
    if (!prevSession && state.user?.id) { // Added nullish coalescing for state.user
        import('./js/analytics.js').then(m => m.trackLogin(session.user.app_metadata?.provider || 'email'));
        sessionStorage.setItem('staynest_session_tracked', 'true');
    }

    if (session?.user) {
      // Load profile and saved listings in parallel
      const [profile] = await Promise.all([
        getProfile(session.user.id).catch(() => null),
        getSavedListings(session.user.id).then(saved => {
          state.savedListings = new Set(saved.map(s => s.listing_id));
        }).catch(() => { })
      ]);
      if (profile) setState({ user: session.user, profile });
      console.log('📄 Profile loaded');
    }
  } catch (e) { 
    console.error('❌ Init error:', e);
  }

  // Start router AFTER session is restored to prevent jumping/flashing
  console.log('Calling startRouter...');
  startRouter();
  console.log('Router should be running');

  supabase.auth.onAuthStateChange(async (event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
      try {
        const profile = await getProfile(session.user.id);
        setState({ user: session.user, profile });
        
        // If this is a brand new user who just signed up via Google
        if (event === 'SIGNED_IN') {
          const isGoogle = session.user.app_metadata?.provider === 'google';
          
          // CRITICAL: Google users are automatically verified
          if (isGoogle && profile && !profile.is_verified) {
             await supabase.from('profiles').update({ is_verified: true }).eq('id', profile.id);
             profile.is_verified = true;
             setState({ profile });
          }

          const createdAt = new Date(session.user.created_at).getTime();
          const now = Date.now();
          
          if (isGoogle && (now - createdAt < 15000)) {
            navigate('/set-password');
          } else {
            // DO NOT redirect unverified users; auth.js handles their check-email UI.
            if (!profile?.is_verified) {
               return;
            }
            // For normal verified sign ins, redirect them properly
            import('./js/pages/auth.js').then(m => m.redirectByRole(profile));
          }
        }
      } catch (e) { }
    } else if (event === 'SIGNED_OUT') {
      setState({ user: null, profile: null, savedListings: new Set() });
      state.savedListings = new Set();
    }
  });
}

init();
