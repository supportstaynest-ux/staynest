import { state, isLoggedIn, showToast, isMobile } from '../state.js';
import { navigate } from '../router.js';
import { signOut, getListings, getRecentlyViewed } from '../supabase.js';
import { renderPGCard, bindPGCardEvents } from './home.js';
import { renderNavbar } from '../components/navbar.js';

export function renderDashboardLayout(content, activeItem = 'dashboard', title = 'Dashboard') {
    const p = state.profile || {};
    const items = [
        { key: 'dashboard', icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
        { key: 'explore', icon: 'explore', label: 'Explore PGs', href: '/explore' },
        { key: 'saved', icon: 'favorite', label: 'Saved PGs', href: '/saved' },
        { key: 'compare', icon: 'compare_arrows', label: 'Compare PGs', href: '/compare' },
        { key: 'recent', icon: 'history', label: 'Recently Viewed', href: '/recent' },
        { key: 'visits', icon: 'event_available', label: 'My Visits', href: '/visits' },
        { key: 'enquiries', icon: 'question_answer', label: 'My Enquiries', href: '/enquiries' },
        { divider: true },
        { key: 'profile', icon: 'settings', label: 'Profile Settings', href: '/profile' },
    ];

    const sidebarLinks = items.map(i => {
        if (i.divider) return `<div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800"></div>`;
        const isActive = activeItem === i.key;
        const activeClass = isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors';
        return `
            <a href="#${i.href}" class="dash-link flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeClass}">
                <span class="material-symbols-outlined text-[22px]">${i.icon}</span>
                <span>${i.label}</span>
            </a>
        `;
    }).join('');

    return `
    <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <!-- Sidebar -->
        <aside id="dash-sidebar" class="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm flex flex-col fixed inset-y-0 left-0 z-50 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out">
            <div class="p-6 flex items-center justify-between md:justify-start gap-3">
                <a href="#/home" class="flex items-center gap-3">
                    <div class="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <span class="material-symbols-outlined">home_pin</span>
                    </div>
                    <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">StayNest</h1>
                </a>
                <button id="close-sidebar-btn" class="md:hidden text-slate-400 hover:text-slate-600 p-1">
                    <span class="material-symbols-outlined relative top-1">close</span>
                </button>
            </div>
            
            <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto hidden-scrollbar">
                ${sidebarLinks}
            </nav>
            
            <div class="p-4 border-t border-slate-100 dark:border-slate-800">
                <a href="#/profile" class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            ${p.avatar_url ? `<img src="${p.avatar_url}" loading="lazy" decoding="async" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-400">person</span>`}
                        </div>
                        <div class="flex-1 overflow-hidden">
                            <p class="text-sm font-semibold truncate capitalize group-hover:text-primary transition-colors text-slate-900 dark:text-white">${p.full_name || 'User'}</p>
                            <p class="text-xs text-slate-500 truncate capitalize">${p.role || 'user'}</p>
                        </div>
                    </div>
                </a>
                <button id="sidebar-logout-btn" class="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors group">
                    <div class="size-10 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined">logout</span>
                    </div>
                    <span class="text-sm font-semibold">Logout</span>
                </button>
            </div>
        </aside>

        <!-- Dynamic Overlay for mobile sidebar -->
        <div id="dash-overlay" class="fixed inset-0 bg-black/50 z-40 hidden md:hidden transition-opacity"></div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
            <!-- Header -->
            <header class="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 md:px-8 flex items-center justify-between z-10 shrink-0">
                <div class="flex items-center gap-4 flex-1">
                    <button id="dash-menu-toggle" class="md:hidden p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg">
                        <span class="material-symbols-outlined">menu</span>
                    </button>
                    <h2 class="text-lg font-semibold truncate hidden sm:block">${title}</h2>
                </div>
                
                <div class="flex items-center gap-2 md:gap-4">
                    <button onclick="window.location.hash='/saved'" class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-2 md:px-3">
                        <span class="material-symbols-outlined text-[24px]">bookmark</span>
                        <span class="text-sm font-semibold hidden lg:inline">Saved PGs</span>
                    </button>
                    <div class="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button id="logout-btn" class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors relative group">
                        <span class="material-symbols-outlined text-[24px]">logout</span>
                        <div class="absolute -bottom-8 right-0 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Sign Out</div>
                    </button>
                </div>
            </header>

            <!-- Scrollable Content Area -->
            <main class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-20">
                ${content}
            </main>
        </div>
    </div>
    <style>
      .hidden-scrollbar::-webkit-scrollbar { display: none; }
      .hidden-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
    `;
}

export async function renderDashboard() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    const app = document.getElementById('app');
    let recommended = [], recent = [];
    try { recommended = await getListings({ limit: 6 }); } catch (e) { }
    try { recent = await getRecentlyViewed(state.user.id); } catch (e) { }

    const content = `
        <!-- Quick Search -->
        <section class="max-w-4xl mx-auto w-full md:mt-4">
            <div class="relative group">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10">search</span>
                <input id="dash-search" type="text" class="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none" placeholder="Search for PGs by locality, city or building name..." />
                <button onclick="window.location.hash='/explore?q='+document.getElementById('dash-search').value" class="absolute right-3 top-1/2 -translate-y-1/2 bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded-lg transition-colors">
                    <span class="material-symbols-outlined text-[20px] relative top-[1px]">arrow_forward</span>
                </button>
            </div>
        </section>

        <!-- Recommended PGs -->
        <section>
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">Recommended for You</h3>
                <a href="#/explore" class="text-primary text-sm font-semibold hover:underline">View All</a>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${recommended.length ? recommended.map(pg => renderPGCard(pg)).join('') : '<div class="col-span-full border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500"><span class="material-symbols-outlined text-4xl mb-2">holiday_village</span><p>No recommendations yet</p></div>'}
            </div>
        </section>

        <!-- Recently Viewed -->
        ${recent.length ? `
        <section>
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">Recently Viewed</h3>
                <div class="flex gap-2">
                    <button id="scroll-left" class="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                        <span class="material-symbols-outlined relative top-[1px]">chevron_left</span>
                    </button>
                    <button id="scroll-right" class="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                        <span class="material-symbols-outlined relative top-[1px]">chevron_right</span>
                    </button>
                </div>
            </div>
            <div id="recent-container" class="flex gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
                ${recent.slice(0, 6).map(r => r.listings ? renderHorizontalCard(r.listings) : '').join('')}
            </div>
        </section>
        ` : ''}
    `;

    app.innerHTML = renderDashboardLayout(content, 'dashboard', `Welcome back, ${state.profile?.full_name?.split(' ')[0] || 'User'}!`);
    initDashboardEvents();
    bindPGCardEvents();

    // Setup horizontal scroll
    const container = document.getElementById('recent-container');
    if (container) {
        document.getElementById('scroll-left').onclick = () => container.scrollBy({ left: -300, behavior: 'smooth' });
        document.getElementById('scroll-right').onclick = () => container.scrollBy({ left: 300, behavior: 'smooth' });
    }

    // Bind search enter key
    document.getElementById('dash-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.location.hash = '/explore?q=' + e.target.value;
    });
}

// Helper to render horizontal condensed cards (from reference UI)
export function renderHorizontalCard(pg) {
    const img = pg.images?.[0] || '';
    return `
    <div onclick="window.location.hash='/pg/${pg.id}'" class="flex-none w-72 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md p-3 flex gap-4 hover:border-primary/50 transition-all cursor-pointer group">
        <div class="size-20 rounded bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            ${img ? `<img src="${img}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><span class="material-symbols-outlined">image</span></div>`}
        </div>
        <div class="flex flex-col justify-center min-w-0">
            <h5 class="font-semibold text-sm truncate text-slate-900 dark:text-white" title="${pg.name}">${pg.name}</h5>
            <p class="text-xs text-slate-500 mb-1 truncate flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">location_on</span>${pg.city}</p>
            <p class="text-primary font-bold text-sm">₹${pg.monthly_rent ? pg.monthly_rent.toLocaleString('en-IN') : '0'}</p>
        </div>
    </div>
    `;
}

export function initDashboardEvents() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = async () => {
        if (confirm('Are you sure you want to sign out?')) {
            await signOut();
            navigate('/auth');
        }
    };

    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
    if (sidebarLogoutBtn) sidebarLogoutBtn.onclick = async () => {
        if (confirm('Are you sure you want to sign out?')) {
            await signOut();
            navigate('/auth');
        }
    };

    const toggleBtn = document.getElementById('dash-menu-toggle');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('dash-sidebar');
    const overlay = document.getElementById('dash-overlay');

    if (toggleBtn && sidebar) {
        toggleBtn.onclick = () => {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        };
    }

    if (closeBtn && sidebar) {
        closeBtn.onclick = () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        };
    }

    if (overlay && sidebar) {
        overlay.onclick = () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        };
    }
}
