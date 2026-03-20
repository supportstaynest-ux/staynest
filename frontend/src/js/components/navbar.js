import { state, isLoggedIn, isVendor, isAdmin, formatTimeAgo } from '../state.js';
import { signOut, getUserBroadcasts, getVendorBroadcasts, dismissMessage } from '../supabase.js';
import { navigate } from '../router.js';

export function renderNavbar(title = 'StayNest') {
    const isUserLoggedIn = isLoggedIn();
    const profile = state.profile || {};
    const dashRoute = isAdmin() ? '#/admin' : isVendor() ? '#/vendor' : '#/dashboard';

    return `
    <header class="sticky top-0 z-50 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_14px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border-b border-slate-100 dark:border-slate-800/60 transition-colors duration-300">
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

        <!-- Mobile Menu (Drawer) -->
        <div id="mobile-drawer" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] opacity-0 invisible transition-all duration-300 md:hidden">
            <div id="mobile-drawer-content" class="absolute right-0 top-0 h-full w-72 bg-white dark:bg-slate-900 shadow-2xl transform translate-x-full transition-transform duration-300 ease-out flex flex-col">
                <div class="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <span class="font-bold text-lg">Menu</span>
                    <button class="md-close-btn p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <nav class="flex-1 p-6 space-y-4">
                    <a href="#/explore" class="block text-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-primary">Explore PGs</a>
                    <a href="#/compare" class="block text-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-primary">Compare</a>
                    <a href="#/saved" class="block text-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-primary">Saved</a>
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800"></div>
                    ${!isUserLoggedIn ? `
                        <a href="#/auth" class="block text-lg font-bold text-primary">Login / Sign Up</a>
                    ` : `
                        <a href="${dashRoute}" class="block text-lg font-semibold text-slate-700 dark:text-slate-300">Dashboard</a>
                        <button id="mobile-logout-btn" class="block w-full text-left text-lg font-semibold text-red-500">Sign Out</button>
                    `}
                </nav>
            </div>
        </div>
    </header>
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
            document.body.style.overflow = 'hidden';
        };
    }

    const closeDrawer = () => {
        if (!drawerContent) return;
        drawerContent.classList.remove('translate-x-0');
        drawerContent.classList.add('translate-x-full');
        setTimeout(() => {
            drawer.classList.remove('visible', 'opacity-100');
            drawer.classList.add('invisible', 'opacity-0');
            document.body.style.overflow = 'auto';
        }, 300);
    };

    closeBtns.forEach(btn => btn.onclick = closeDrawer);
    if (drawer) drawer.onclick = (e) => { if (e.target === drawer) closeDrawer(); };

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
}
