import { state, isLoggedIn, showToast, isMobile } from '../state.js';
import { navigate } from '../router.js';
import { signOut, getListings, getRecentlyViewed } from '../supabase.js';
import { renderPGCard, bindPGCardEvents } from './home.js';
import { renderNavbar } from '../components/navbar.js';

export function renderDashboardLayout(content, activeItem = 'dashboard', title = 'Dashboard') {
    const p = state.profile || {};
    const items = [
        { key: 'dashboard', icon: '🏠', label: 'Dashboard', href: '/dashboard' },
        { key: 'explore', icon: '🔍', label: 'Explore PGs', href: '/explore' },
        { key: 'saved', icon: '❤️', label: 'Saved PGs', href: '/saved' },
        { key: 'compare', icon: '⚖️', label: 'Compare PGs', href: '/compare' },
        { key: 'recent', icon: '🕒', label: 'Recently Viewed', href: '/recent' },
        { key: 'visits', icon: '📅', label: 'My Visits', href: '/visits' },
        { key: 'enquiries', icon: '💬', label: 'My Enquiries', href: '/enquiries' },
        { divider: true },
        { key: 'sos', icon: '🚨', label: 'Safety & SOS', href: '/safety-sos', special: true },
        { key: 'profile', icon: '⚙️', label: 'Profile Settings', href: '/profile' },
    ];

    const sidebarLinks = items.map(i => {
        if (i.divider) return `<div class="my-3 border-t border-slate-200 dark:border-slate-800/60 opacity-60"></div>`;
        const isActive = activeItem === i.key;
        
        let linkClass = isActive
            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-semibold shadow-sm'
            : 'text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200';
            
        if (i.special) {
            linkClass = isActive 
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold shadow-sm'
                : 'bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20';
        }

        return `
            <a href="#${i.href}" class="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${linkClass} mb-1">
                <span class="text-xl w-6 flex justify-center">${i.icon}</span>
                <span class="tracking-wide">${i.label}</span>
            </a>
        `;
    }).join('');

    return `
    <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <!-- Sidebar -->
        <aside id="dash-sidebar" class="w-72 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/90 border-r border-slate-200/80 dark:border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col fixed inset-y-0 left-0 z-50 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-out">
            <div class="p-6 flex items-center justify-between md:justify-start gap-4 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                <a href="#/home" class="flex items-center gap-3 group">
                    <div class="size-10 bg-gradient-to-br from-primary to-teal-400 rounded-xl flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-all">
                        <span class="text-xl">🏠</span>
                    </div>
                    <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Stay<span class="text-primary">Nest</span></h1>
                </a>
                <button id="close-sidebar-btn" class="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span class="material-symbols-outlined relative top-0.5">close</span>
                </button>
            </div>
            
            <nav class="flex-1 px-5 py-6 overflow-y-auto hidden-scrollbar flex flex-col">
                ${sidebarLinks}
            </nav>
            
            <div class="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-white/30 dark:bg-slate-900/30">
                <a href="#/profile" class="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all group mb-3">
                    <div class="size-11 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
                        ${p.avatar_url ? `<img src="${p.avatar_url}" loading="lazy" decoding="async" class="w-full h-full object-cover">` : `<span class="text-xl text-slate-400">👤</span>`}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold truncate capitalize text-slate-900 dark:text-white group-hover:text-primary transition-colors">${p.full_name || 'User'}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate capitalize font-medium">${p.role || 'user'}</p>
                    </div>
                </a>
                <button id="sidebar-logout-btn" class="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-red-100 dark:hover:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-600 dark:text-slate-400 hover:text-red-600 font-medium transition-all group">
                    <span class="text-xl w-6 flex justify-center group-hover:scale-110 transition-transform">🚪</span>
                    <span class="tracking-wide">Sign Out</span>
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
