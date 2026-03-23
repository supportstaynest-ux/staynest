import { state, isLoggedIn, isVendor, isAdmin } from '../state.js';
import { signOut, getUserBroadcasts, getVendorBroadcasts, dismissMessage } from '../supabase.js';
import { navigate } from '../router.js';

export function renderNavbar(title = 'StayNest') {
    const isUserLoggedIn = isLoggedIn();
    const profile = state.profile || {};
    const dashRoute = isAdmin() ? '#/admin' : isVendor() ? '#/vendor' : '#/dashboard';

    return `
    <div class="h-16 w-full z-50">
        <header class="fixed top-0 left-0 w-full z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_14px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border-b border-slate-100 dark:border-slate-800/60 transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-8">
                                <a href="#/home" class="flex items-center gap-2.5 group">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                        <span class="material-symbols-outlined text-[20px] text-white">home_pin</span>
                    </div>
                    <h2 class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white hidden sm:block">Stay<span class="text-primary">Nest</span></h2>
                </a>
            </div>

            <!-- Actions area & Right Nav -->
            <div class="flex items-center gap-3">
                <!-- Desktop Only Nav & Auth -->
                <div class="hidden md:flex items-center gap-4 mr-2">
                    <nav id="nav-links" class="flex items-center gap-6 mr-2">
                        <a href="#/home" class="text-[13px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-wide">HOME</a>
                        <a href="#/explore" class="text-[13px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-wide">EXPLORE PGS</a>
                        <a href="#/safety" class="text-[13px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-wide">SAFETY TIPS</a>
                        <a href="#/faq" class="text-[13px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-wide">FAQ</a>
                    </nav>

                    <div class="flex items-center gap-4">
                        ${!isUserLoggedIn ? `
                            <div class="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
                            <a href="#/auth" class="bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:brightness-110 transition-all shadow-md shadow-primary/20">Login/Signup</a>
                        ` : `
                        <div class="flex items-center gap-3">
                            <!-- Dashboard/Admin Link -->
                            <a href="${dashRoute}" class="p-2 text-slate-500 hover:text-primary transition-colors" title="Go to ${isAdmin() ? 'Admin' : isVendor() ? 'Vendor' : 'User'} Dashboard">
                              <span class="material-symbols-outlined">dashboard</span>
                            </a>

                            <!-- Notifications -->
                            <div id="nav-notif-container" class="relative">
                                <button id="nav-notif-btn" class="relative p-2 text-slate-500 hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined">notifications</span>
                                    <span id="nav-notif-badge" class="absolute top-1.5 right-1.5 size-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 hidden"></span>
                                </button>
                                <div id="nav-notif-dropdown" class="hidden absolute right-0 mt-3 w-80 max-h-[28rem] overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 transition-all origin-top-right">
                                    <div class="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
                                        <span class="font-bold text-sm text-slate-900 dark:text-white">Announcements</span>
                                    </div>
                                    <div id="nav-notif-list" class="p-2 space-y-1">
                                        <div class="p-4 text-center text-xs text-slate-500 select-none">Checking...</div>
                                    </div>
                                </div>
                            </div>

                            <div class="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                            <!-- Profile Menu -->
                            <div class="relative group cursor-pointer">
                                <div class="flex items-center gap-2 pl-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors p-1">
                                    <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                                        ${profile.avatar_url ? `<img src="${profile.avatar_url}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-400 flex items-center justify-center h-full">person</span>`}
                                    </div>
                                    <span class="text-sm font-bold text-slate-700 dark:text-slate-300 hidden lg:block max-w-[100px] truncate">${profile.full_name || 'User'}</span>
                                </div>
                                <div class="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
                                    <div class="w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-2">
                                        <a href="#/dashboard" class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <span class="material-symbols-outlined text-[18px]">account_circle</span> Profile
                                        </a>
                                        <a href="#/saved" class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <span class="material-symbols-outlined text-[18px]">favorite</span> My Saves
                                        </a>
                                        <div class="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                                        <button id="logout-btn" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                            <span class="material-symbols-outlined text-[18px]">logout</span> Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
                </div> <!-- Close Desktop Only Nav & Auth -->

                <!-- Mobile Header Toggle -->
                <button id="hamburger-btn" class="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                    <span class="material-symbols-outlined">menu</span>
                </button>
            </div>
        </div>
        </header>
    </div>

    <!-- Mobile Menu (Drawer) -->
    <div id="mobile-drawer" class="fixed inset-0 z-[9999] opacity-0 invisible transition-all duration-300 md:hidden">
        <!-- Background Overlay -->
        <div id="mobile-drawer-overlay" class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"></div>
        <!-- Drawer Content -->
        <div id="mobile-drawer-content" class="absolute right-0 top-0 h-full w-[80%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl transform translate-x-full transition-transform duration-300 ease-out flex flex-col overflow-y-auto hidden-scrollbar">
            <div class="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-10">
                <span class="font-bold text-xl text-slate-900 dark:text-white">Menu</span>
                <button class="md-close-btn p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center">
                    <span class="material-symbols-outlined text-[22px]">close</span>
                </button>
            </div>
            
            <nav class="flex-1 px-5 py-6 space-y-2">
                <a href="#/explore" class="md-close-btn flex items-center gap-4 px-4 py-3 rounded-xl text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <span class="material-symbols-outlined text-slate-400">search</span>
                    Explore PGs
                </a>
                <a href="#/compare" class="md-close-btn flex items-center gap-4 px-4 py-3 rounded-xl text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <span class="material-symbols-outlined text-slate-400">compare_arrows</span>
                    Compare
                </a>
                <a href="#/saved" class="md-close-btn flex items-center gap-4 px-4 py-3 rounded-xl text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <span class="material-symbols-outlined text-slate-400">favorite</span>
                    Saved
                </a>
                <div class="my-4 border-t border-slate-100 dark:border-slate-800"></div>
                ${!isUserLoggedIn ? `
                    <a href="#/auth" class="md-close-btn flex items-center gap-4 px-4 py-3 rounded-xl text-base font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors mt-4">
                        <span class="material-symbols-outlined mt-0.5">login</span>
                        Login / Sign Up
                    </a>
                ` : `
                    <a href="${dashRoute}" class="md-close-btn flex items-center gap-4 px-4 py-3 rounded-xl text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <span class="material-symbols-outlined text-slate-400">dashboard</span>
                        Dashboard
                    </a>
                    <button id="mobile-logout-btn" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-base font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors mt-2 text-left">
                        <span class="material-symbols-outlined text-red-400">logout</span>
                        Sign Out
                    </button>
                `}
            </nav>
        </div>
    </div>
    `;
}

export function initNavbarEvents() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = async () => {
        if (confirm('Are you sure you want to sign out?')) {
            await signOut();
            navigate('/auth');
        }
    };

    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) mobileLogoutBtn.onclick = async () => {
        if (confirm('Are you sure you want to sign out?')) {
            await signOut();
            navigate('/auth');
        }
    };

    // Mobile drawer logic
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const drawerContent = document.getElementById('mobile-drawer-content');
    const closeBtns = document.querySelectorAll('.md-close-btn');

    if (hamburgerBtn && drawer) {
        hamburgerBtn.onclick = () => {
            drawer.classList.remove('invisible', 'opacity-0');
            drawer.classList.add('visible', 'opacity-100');
            drawerContent.classList.remove('translate-x-full');
            drawerContent.classList.add('translate-x-0');
            document.body.style.setProperty('overflow', 'hidden', 'important');
            document.body.style.setProperty('touch-action', 'none', 'important');
        };
    }

    const closeDrawer = () => {
        if (!drawerContent) return;
        drawerContent.classList.remove('translate-x-0');
        drawerContent.classList.add('translate-x-full');
        setTimeout(() => {
            drawer.classList.remove('visible', 'opacity-100');
            drawer.classList.add('invisible', 'opacity-0');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('touch-action');
        }, 300);
    };

    closeBtns.forEach(btn => btn.onclick = closeDrawer);
    const drawerOverlay = document.getElementById('mobile-drawer-overlay');
    if (drawerOverlay) drawerOverlay.onclick = closeDrawer;

    // Notifications Logic
    (async () => {
        if (!isLoggedIn() || !state.user?.id) return;

        const notifBtn = document.getElementById('nav-notif-btn');
        const notifDropdown = document.getElementById('nav-notif-dropdown');
        const notifList = document.getElementById('nav-notif-list');
        const notifBadge = document.getElementById('nav-notif-badge');

        if (!notifBtn || !notifDropdown) return;

        notifBtn.onclick = (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('hidden');
        };

        document.addEventListener('click', (e) => {
            if (notifDropdown && !notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                notifDropdown.classList.add('hidden');
            }
        });

        try {
            const broadcasts = isVendor() ? await getVendorBroadcasts(state.user.id) : await getUserBroadcasts(state.user.id);

            if (broadcasts && broadcasts.length > 0) {
                notifBadge.classList.remove('hidden');
                notifList.innerHTML = broadcasts.map(n => {
                    const timeAgo = formatTimeAgo(n.created_at);                    return `
                        <div class="group relative p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50" id="nav-notif-${n.id}">
                            <div class="flex gap-3">
                                <div class="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span class="material-symbols-outlined text-primary text-[1rem]">campaign</span>
                                </div>
                                <div class="flex-1 min-w-0 pr-6">
                                    <div class="flex justify-between items-start mb-0.5">
                                        <h5 class="text-xs font-bold text-slate-900 dark:text-white truncate">${n.title}</h5>
                                        <span class="text-[10px] text-slate-400 shrink-0 ml-2 whitespace-nowrap">${timeAgo}</span>
                                    </div>
                                    <p class="text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">${n.message}</p>
                                </div>
                            </div>
                            <button class="dismiss-nav-notif absolute top-2 right-2 size-5 flex flex-col items-center justify-center text-slate-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700" data-id="${n.id}" title="Dismiss">
                                <span class="material-symbols-outlined text-[12px]">close</span>
                            </button>
                        </div>
                    `;
                }).join('');

                notifList.querySelectorAll('.dismiss-nav-notif').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const id = btn.dataset.id;
                        const el = document.getElementById(`nav-notif-${id}`);
                        if (el) el.remove();
                        try {
                            await dismissMessage(state.user.id, id);
                            if (notifList.children.length === 0) {
                                notifBadge.classList.add('hidden');
                                notifList.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No new announcements</div>';
                            }
                        } catch (err) {
                            console.error('Failed to dismiss message:', err);
                        }
                    };
                });
            } else {
                notifList.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No new announcements</div>';
            }
        } catch (e) {
            console.error('Error fetching navbar notifications:', e);
            if (notifList) notifList.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">Failed to load announcements</div>';
        }
    })();

    // Scroll effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header?.classList.add('shadow-lg', 'bg-white', 'dark:bg-slate-900');
            header?.classList.remove('bg-white/80', 'dark:bg-slate-900/80');
        } else {
            header?.classList.remove('shadow-lg', 'bg-white', 'dark:bg-slate-900');
            header?.classList.add('bg-white/80', 'dark:bg-slate-900/80');
        }
    });

    // ── Smart Female Detection Popup ──
    setTimeout(() => {
        if (!isLoggedIn() || state.profile?.role === 'vendor' || state.profile?.role === 'admin') return;
        
        // Only show once per session
        if (sessionStorage.getItem('sos_popup_shown')) return;

        const p = state.profile || {};
        const isFemale = p.gender === 'Female' || p.gender === 'female' || 
            (p.full_name && /\b(kumari|devi|sharma|kaur|shree|ben)\b/i.test(p.full_name.split(' ').pop()));

        if (isFemale) {
            sessionStorage.setItem('sos_popup_shown', 'true');
            // Inject the popup into body
            const popupHtml = `
            <div id="sos-discovery-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden text-center transform transition-all animate-in zoom-in-95 duration-300">
                    <div class="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-8 pb-6 border-b border-rose-100 dark:border-rose-900/30">
                        <div class="size-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto shadow-sm border border-rose-100 dark:border-slate-700 mb-4">
                            <span class="material-symbols-outlined text-4xl text-rose-500" style="font-variation-settings:'FILL' 1">shield_person</span>
                        </div>
                        <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Safety Feature for Women</h2>
                        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Book your PG through StayNest to unlock our Emergency SOS Safety Feature, designed exclusively for your protection.</p>
                    </div>
                    <div class="p-6 bg-white dark:bg-slate-900 space-y-3">
                        <button id="sos-learn-more-btn" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">Learn More</button>
                        <button id="sos-maybe-later-btn" class="w-full bg-transparent text-slate-500 font-bold py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">Maybe Later</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', popupHtml);
            
            document.getElementById('sos-maybe-later-btn').onclick = () => {
                const m = document.getElementById('sos-discovery-modal');
                m.classList.add('fade-out', 'zoom-out-95');
                setTimeout(() => m.remove(), 300);
            };

            document.getElementById('sos-learn-more-btn').onclick = () => {
                const m = document.getElementById('sos-discovery-modal');
                m.remove();
                showSOSLearnMoreModal();
            };
        }
    }, 1500); // slight delay after login/navigation
}

export function showSOSLearnMoreModal() {
    const modalHtml = `
    <div id="sos-learn-more-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div class="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] overflow-y-auto hidden-scrollbar rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 relative">
            
            <!-- Close Button -->
            <button id="close-sos-learn-more" class="absolute top-4 right-4 size-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors z-10">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>

            <!-- Header -->
            <div class="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-rose-500/5 dark:bg-rose-500/10 pointer-events-none"></div>
                <div class="size-20 bg-rose-50 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/50">
                    <span class="material-symbols-outlined text-5xl text-rose-500" style="font-variation-settings:'FILL' 1">emergency_home</span>
                </div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">How Smart SOS Works</h2>
                <p class="text-slate-500 text-sm">Your safety is our priority. Here's how StayNest protects verified residents.</p>
            </div>

            <!-- Content -->
            <div class="p-8 space-y-6">
                
                <div class="flex gap-4">
                    <div class="size-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-rose-500">1</div>
                    <div>
                        <h4 class="font-bold text-slate-900 dark:text-white mb-1">Book & Verify Stay</h4>
                        <p class="text-sm text-slate-600 dark:text-slate-400">After moving in, enter your unique 'Stay Code' from your PG owner to become a Verified Resident.</p>
                    </div>
                </div>

                <div class="flex gap-4">
                    <div class="size-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-rose-500">2</div>
                    <div>
                        <h4 class="font-bold text-slate-900 dark:text-white mb-1">Add Emergency Contacts</h4>
                        <p class="text-sm text-slate-600 dark:text-slate-400">Add phone numbers and emails of trusted family members and friends to your safety profile.</p>
                    </div>
                </div>

                <div class="flex gap-4">
                    <div class="size-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-rose-500">3</div>
                    <div>
                        <h4 class="font-bold text-slate-900 dark:text-white mb-1">3-Second Press & Hold</h4>
                        <p class="text-sm text-slate-600 dark:text-slate-400">In an emergency, press and hold the SOS button for 3 seconds to prevent accidental triggers.</p>
                    </div>
                </div>

                <div class="flex gap-4">
                    <div class="size-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-rose-500">4</div>
                    <div>
                        <h4 class="font-bold text-slate-900 dark:text-white mb-1">Instant Multi-Alert</h4>
                        <p class="text-sm text-slate-600 dark:text-slate-400">Instantly alerts your contacts, the PG owner, and StayNest Admin with your name, time, and live location.</p>
                    </div>
                </div>

            </div>

            <!-- Footer -->
            <div class="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button id="setup-sos-btn" class="flex-1 bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-rose-500/20 hover:shadow-rose-500/40 hover:-translate-y-0.5">Setup Safety Now</button>
            </div>
            
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('sos-learn-more-modal');
    
    document.getElementById('close-sos-learn-more').onclick = () => {
        modal.classList.add('fade-out', 'zoom-out-95');
        setTimeout(() => modal.remove(), 300);
    };

    document.getElementById('setup-sos-btn').onclick = () => {
        modal.remove();
        if (typeof window.location.hash !== 'undefined') {
            window.location.hash = '/safety-sos';
        }
    };
}
