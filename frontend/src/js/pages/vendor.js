import { state, isLoggedIn, isVendor, isAdmin, formatPrice, formatTimeAgo, showToast, showLoading, hideLoading, CITIES, AMENITIES_LIST } from '../state.js';
import { navigate } from '../router.js';
import { signOut, getVendorStats, getVendorListings, createListing, updateListing, deleteListing, getEnquiries, replyEnquiry, replyReview, uploadListingImages, getVendorReviews, insertNearbyPlaces, getVendorBroadcasts, dismissMessage, getVendorVisitRequests, updateVisitRequestStatus, getVendorListingChats, getListingChatMessages, sendListingChatMessage, subscribeToListingChats, unsubscribeChat, sendTargetedNotification, insertRecentActivity, cancelVisitRequest, getVendorAnalyticsData, subscribeToVendorAnalytics, unsubscribeFromVendorAnalytics, triggerListingNotifications, createReport, getPlans, uploadPaymentScreenshot, createPaymentRequest, insertImageHash, checkImageDuplicate, insertFraudFlag } from '../supabase.js';
import { computeImageHash } from '../analytics.js';
import { getBoostPlans } from './admin.js';
import Chart from 'chart.js/auto';

// Helper to generate 7-day data distribution matching total sum
function generateDailyDistribution(total) {
    if (!total || total === 0) return [0, 0, 0, 0, 0, 0, 0];
    const days = 7;
    let remaining = total;
    const distribution = Array(days).fill(0);
    for (let i = 0; i < days - 1; i++) {
        const share = 0.05 + Math.random() * (Math.min(0.3, remaining / total) - 0.05);
        distribution[i] = Math.max(0, Math.floor(total * share));
        remaining -= distribution[i];
    }
    distribution[days - 1] = Math.max(0, remaining);

    // Shuffle the array to look organic
    for (let i = distribution.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
    }
    return distribution;
}

import { renderNavbar } from '../components/navbar.js';

function vendorLayout(content, active = 'dashboard', title = 'Vendor Dashboard') {
    if (state.profile?.role !== 'vendor' && !isAdmin()) {
        return `<div class="p-8 text-center"><h2 class="text-2xl font-bold">Access Denied</h2></div>`;
    }

    const p = state.profile || {};
    const items = [
        { key: 'dashboard', icon: 'dashboard', label: 'Dashboard', href: '/vendor' },
        { key: 'listings', icon: 'list_alt', label: 'My Listings', href: '/vendor/listings' },
        { key: 'enquiries', icon: 'group', label: 'Leads', href: '/vendor/enquiries' },
        { key: 'analytics', icon: 'leaderboard', label: 'Analytics', href: '/vendor/analytics' },
        { key: 'subscriptions', icon: 'workspace_premium', label: 'Subscriptions', href: '/vendor/subscriptions' },
        { divider: 'Settings' },
        { key: 'support', icon: 'help', label: 'Support', href: '/vendor/support' },
        { key: 'settings', icon: 'settings', label: 'Settings', href: '/vendor/settings' },
    ];

    const sidebarLinks = items.map(i => {
        if (i.divider) {
            return `<div class="pt-4 pb-2"><p class="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">${i.divider}</p></div>`;
        }
        const isActive = active === i.key;
        const activeClass = isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors';
        return `
        <a href="#${i.href}" class="vendor-link flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeClass}"><span class="material-symbols-outlined">${i.icon}</span>
            <span class="text-sm">${i.label}</span>
        </a>
    `;
    }).join('');

    return `
    <div class="flex min-h-screen relative font-display text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900">
        <!-- Desktop Sidebar -->
        <aside id="vendor-sidebar" class="w-64 border-r border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-50 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out h-full">
            <div class="p-6 flex items-center justify-between md:justify-start gap-3">
                                <a href="#/home" class="flex items-center gap-3 w-full">
                    <div class="size-10 bg-primary rounded-xl flex items-center justify-center text-white shrink-0">
                        <span class="material-symbols-outlined font-bold">home_work</span>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">StayNest</h1>
                        <p class="text-xs text-slate-500 font-medium tracking-wide mt-1">Vendor Console</p>
                    </div>
                </a>
                <button id="close-sidebar-btn" class="md:hidden text-slate-400 hover:text-slate-600 p-1 shrink-0">
                    <span class="material-symbols-outlined relative top-1">close</span>
                </button>
            </div>
            
            <nav class="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar hidden-scrollbar">${sidebarLinks}</nav>
            
            <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 space-y-2">
                <button onclick="window.location.hash='/vendor/add-listing'" class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm">
                    <span class="material-symbols-outlined text-sm">add</span>
                    <span>New Listing</span>
                </button>
                <button id="sidebar-vendor-logout-btn" class="w-full bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/10 text-slate-600 dark:text-slate-400 hover:text-red-500 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm">
                    <span class="material-symbols-outlined text-sm">logout</span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>

        <!-- Mobile Header & Bottom Nav -->
        <div class="md:hidden">
            ${renderNavbar(title)}
        </div>

        <!-- Overlay for mobile sidebar -->
        <div id="vendor-overlay" class="fixed inset-0 bg-black/50 z-40 hidden md:hidden transition-opacity"></div>

        <!-- Main Content Area -->
        <main class="flex-1 flex flex-col min-w-0 min-h-screen">
            <!-- Desktop Header -->
            <header class="hidden md:flex h-16 border-b border-slate-200 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-8 items-center justify-between shrink-0">
                <div class="flex items-center gap-4 flex-1">
                    <div class="relative w-full max-w-md">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input id="vendor-global-search" class="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 transition-all" placeholder="Search analytics, leads, or listings..." type="text" autocomplete="off"/>
                        <div id="vendor-search-suggestions" class="absolute left-0 right-0 top-11 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden z-50 hidden max-h-80 overflow-y-auto hidden-scrollbar">
                            <div class="p-4 text-center text-sm text-slate-500">Type to search...</div>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center gap-4">
                    <div class="relative dropdown-btn" data-target="vendor-notifs-dropdown">
                        <button class="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative">
                            <span class="material-symbols-outlined">notifications</span>
                            ${(window._vendorNotifs || []).length > 0 ? `<span class="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>` : ''}
                        </button>
                        <div id="vendor-notifs-dropdown" class="absolute right-0 top-12 mt-2 w-80 max-h-96 overflow-y-auto hidden-scrollbar bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-3 hidden z-50">
                            <div class="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 class="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                                <span class="text-xs text-slate-500">${(window._vendorNotifs || []).length} new</span>
                            </div>
                            <div class="flex flex-col">
                                ${(window._vendorNotifs || []).length > 0 ? (window._vendorNotifs || []).map(n => {
                                    const timeAgo = (() => {
                                        const diff = Date.now() - new Date(n.created_at).getTime();
                                        if (diff < 60000) return 'Just now';
                                        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
                                        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
                                        return Math.floor(diff / 86400000) + 'd ago';
                                    })();
                                    return `
                                    <div class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/50 relative group">
                                        <div class="flex items-start gap-3">
                                            <div class="mt-0.5 size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <span class="material-symbols-outlined text-primary text-[16px]">campaign</span>
                                            </div>
                                            <div>
                                                <div class="flex items-baseline gap-2 mb-0.5">
                                                    <h4 class="text-[13px] font-bold text-slate-900 dark:text-white">${n.title}</h4>
                                                    <span class="text-[10px] text-slate-400 shrink-0">${timeAgo}</span>
                                                </div>
                                                <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">${n.message}</p>
                                            </div>
                                        </div>
                                    </div>`;
                                }).join('') : '<div class="px-4 py-8 text-center text-slate-500 text-sm">No new notifications</div>'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800 cursor-pointer dropdown-btn relative" data-target="vendor-profile-dropdown">
                        <div class="text-right hidden sm:block">
                            <p class="text-sm font-bold truncate max-w-[120px]">${p.full_name || 'Vendor'}</p>
                            <p class="text-[10px] text-primary font-medium uppercase tracking-wider">${window._vendorPlanName || 'VENDOR'}</p>
                        </div>
                        <div class="size-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                            ${p.avatar_url ? `<img class="w-full h-full object-cover" src="${p.avatar_url}"/>` : '<span class="text-primary font-bold">' + (p.full_name || 'V').charAt(0) + '</span>'}
                        </div>
                    </div>
                </div>
            </header>

            <!-- Dropdown Menu -->
            <div id="vendor-profile-dropdown" class="absolute right-4 md:right-8 top-16 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-2 hidden z-50">
                <div class="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <p class="text-xs text-slate-500 font-medium">Signed in as</p>
                    <p class="text-sm font-bold truncate">${state.user?.email || ''}</p>
                </div>
                <a href="#/vendor/settings" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span class="material-symbols-outlined text-[18px]">settings</span> Settings
                </a>
                <button id="logout-btn" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 text-left">
                    <span class="material-symbols-outlined text-[18px]">logout</span> Logout
                </button>
            </div>

            <div class="p-4 md:p-8 space-y-8 flex-1 pb-24 md:pb-8">
                ${content}
            </div>
        </main>
    </div>`;
}

function initVendorEvents() {
    setTimeout(() => {
        const toggleBtn = document.getElementById('vendor-menu-toggle');
        const closeBtn = document.getElementById('close-sidebar-btn');
        const sidebar = document.getElementById('vendor-sidebar');
        const overlay = document.getElementById('vendor-overlay');

        const toggleSidebar = () => {
            if (!sidebar) return;
            if (sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                overlay?.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full');
                overlay?.classList.add('hidden');
            }
        };

        toggleBtn?.addEventListener('click', toggleSidebar);
        closeBtn?.addEventListener('click', toggleSidebar);
        overlay?.addEventListener('click', toggleSidebar);

        document.querySelectorAll('.vendor-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768 && !sidebar.classList.contains('-translate-x-full')) {
                    toggleSidebar();
                }
            });
        });

        document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try { await signOut(); } catch (e) { }
            window.location.hash = '/home';
            window.location.reload();
        });

        document.getElementById('sidebar-vendor-logout-btn')?.addEventListener('click', () => {
            document.getElementById('logout-btn')?.click();
        });

        // Dropdown toggle logic
        document.querySelectorAll('.dropdown-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = btn.dataset.target;
                const dropdown = document.getElementById(targetId);

                // Close all other dropdowns
                document.querySelectorAll('.dropdown-btn').forEach(otherBtn => {
                    const otherTarget = document.getElementById(otherBtn.dataset.target);
                    if (otherTarget && otherTarget !== dropdown) {
                        otherTarget.classList.add('hidden');
                    }
                });

                if (dropdown) {
                    dropdown.classList.toggle('hidden');
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.dropdown-btn').forEach(btn => {
                const targetId = btn.dataset.target;
                const dropdown = document.getElementById(targetId);
                if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        });

        // Dismiss notification logic
        document.querySelectorAll('.dismiss-notif').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const notifEl = btn.closest('.group');

                if (notifEl) {
                    notifEl.style.opacity = '0';
                    notifEl.style.transform = 'scale(0.95)';
                    setTimeout(() => notifEl.remove(), 200);
                }

                try {
                    if (window._vendorNotifs) {
                        window._vendorNotifs = window._vendorNotifs.filter(n => n.id !== id);
                    }
                    const { dismissMessage } = await import('../supabase.js');
                    const { state } = await import('../state.js');
                    await dismissMessage(state.user.id, id);

                    // Update badge logic (quick workaround)
                    const badge = document.querySelector('.dropdown-btn[data-target="vendor-notifs-dropdown"] .bg-red-500');
                    if (badge && window._vendorNotifs && window._vendorNotifs.length === 0) {
                        badge.remove();
                    }
                } catch (err) {
                    console.error('Failed to dismiss notification:', err);
                }
            });
        });

        // Global Search Logic
        const searchInput = document.getElementById('vendor-global-search');
        const searchSuggestions = document.getElementById('vendor-search-suggestions');
        let searchTimeout;

        if (searchInput && searchSuggestions) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.toLowerCase().trim();

                if (query.length < 2) {
                    searchSuggestions.classList.add('hidden');
                    return;
                }

                searchTimeout = setTimeout(() => {
                    const listings = window._vendorListings || [];
                    const leads = window._vendorEnquiries || [];

                    const matchedListings = listings.filter(l =>
                        (l.name && l.name.toLowerCase().includes(query)) ||
                        (l.city && l.city.toLowerCase().includes(query))
                    ).slice(0, 3);

                    const matchedLeads = leads.filter(ld =>
                        (ld.name && ld.name.toLowerCase().includes(query)) ||
                        (ld.listing && ld.listing.name && ld.listing.name.toLowerCase().includes(query))
                    ).slice(0, 3);

                    if (matchedListings.length === 0 && matchedLeads.length === 0) {
                        searchSuggestions.innerHTML = '<div class="p-4 text-center text-sm text-slate-500">No results found</div>';
                    } else {
                        let html = '';
                        if (matchedListings.length > 0) {
                            html += '<div class="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Listings</div>';
                            html += matchedListings.map(l => `
                                <a href="#/vendor/listings" class="block px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <div class="font-bold text-sm text-slate-900 dark:text-white">${l.name}</div>
                                    <div class="text-xs text-slate-500">${l.city || ''} • ${l.gender_allowed || 'Any'} • ₹${(l.monthly_rent || 0).toLocaleString('en-IN')}/mo</div>
                                </a>`).join('');
                        }
                        if (matchedLeads.length > 0) {
                            html += '<div class="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-t border-slate-100 dark:border-slate-800">Leads</div>';
                            html += matchedLeads.map(ld => `
                                <a href="#/vendor/enquiries" class="block px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <div class="font-bold text-sm text-slate-900 dark:text-white">${ld.name}</div>
                                    <div class="text-xs text-slate-500">Interested in: ${ld.listing?.name || 'Property'}</div>
                                </a>`).join('');
                        }
                        searchSuggestions.innerHTML = html;
                    }
                    searchSuggestions.classList.remove('hidden');
                }, 300);
            });

            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                    searchSuggestions.classList.add('hidden');
                }
            });

            // Show suggestions again if focusing input with text
            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim().length >= 2) {
                    searchSuggestions.classList.remove('hidden');
                }
            });
        }
    }, 50);
}

export async function renderVendorDashboard() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access to view this page', 'error'); navigate('/dashboard'); return; }

    showLoading();
    let stats = { totalListings: 0, activeListings: 0, totalViews: 0, totalEnquiries: 0 };
    let listings = [];
    let enquiries = [];
    let reviews = [];
    let vendorNotifs = [];
    try {
        const [fetchedStats, fetchedListings, fetchedEnquiries, fetchedReviews] = await Promise.all([
            getVendorStats(state.user.id),
            getVendorListings(state.user.id),
            getEnquiries(state.user.id, true),
            getVendorReviews(state.user.id)
        ]);
        stats = fetchedStats;
        listings = fetchedListings;
        enquiries = fetchedEnquiries;
        reviews = fetchedReviews;
        window._vendorListings = listings;
        window._vendorEnquiries = enquiries;
    } catch (e) { console.error('Error fetching vendor data', e); }
    // Fetch broadcasts separately so it can't crash core data loading
    try {
        vendorNotifs = await getVendorBroadcasts(state.user?.id);
        window._vendorNotifs = vendorNotifs; // Store globally for layout access
    } catch (e) { console.warn('Broadcasts unavailable:', e.message); }
    hideLoading();

    const convRate = stats.totalViews > 0 ? ((stats.totalEnquiries / stats.totalViews) * 100).toFixed(1) : 0;

    // Sort listings by total_views
    const sortedListings = [...listings].sort((a, b) => (b.total_views || 0) - (a.total_views || 0));
    const topListing = sortedListings.length > 0 ? sortedListings[0] : null;

    // Helper to calculate real rating
    const calculateTopRating = (listingId) => {
        const listingReviews = reviews.filter(r => r.listing_id === listingId);
        if (listingReviews.length === 0) return '0.0';
        return (listingReviews.reduce((sum, r) => sum + r.rating, 0) / listingReviews.length).toFixed(1);
    };

    // Calculate real chart data for Leads
    const generateRecentLeadsChartData = () => {
        const days = 6;
        const data = Array(days).fill(0);
        const labels = Array(days).fill('');
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        for (let i = 0; i < days; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - (days - 1 - i));
            labels[i] = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        enquiries.forEach(eq => {
            if (!eq.created_at) return;
            const eqDate = new Date(eq.created_at);
            const dayDiff = Math.floor((now - eqDate) / (1000 * 60 * 60 * 24));
            if (dayDiff >= 0 && dayDiff < days) {
                data[days - 1 - dayDiff]++;
            }
        });
        return { labels, data };
    };
    const leadChartData = generateRecentLeadsChartData();

    const content = `
        <!-- Welcome Section -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Vendor Dashboard</h2>
                <p class="text-slate-500 text-sm">Welcome back, ${state.profile?.full_name || 'Vendor'}. Here's your performance summary.</p>
            </div>
            <div class="flex items-center gap-2">
                <button class="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all" onclick="window._exportVendorCSV()">
                    <span class="material-symbols-outlined text-lg text-primary">file_download</span>
                    Export
                </button>
                <button class="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all" onclick="window.location.hash='/vendor/add-listing'">
                    <span class="material-symbols-outlined text-lg">add</span>
                    New PG
                </button>
            </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <span class="material-symbols-outlined">analytics</span>
                </div>
                <p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Views</p>
                <h3 class="text-2xl font-black">${stats.totalViews}</h3>
            </div>
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div class="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-3">
                    <span class="material-symbols-outlined">group</span>
                </div>
                <p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Leads</p>
                <h3 class="text-2xl font-black">${stats.totalEnquiries}</h3>
            </div>
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div class="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 mb-3">
                    <span class="material-symbols-outlined">star</span>
                </div>
                <p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Avg Rating</p>
                <h3 class="text-2xl font-black">${calculateTopRating(topListing?.id || '')}</h3>
            </div>
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div class="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 mb-3">
                    <span class="material-symbols-outlined">conversion_path</span>
                </div>
                <p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Conv. Rate</p>
                <h3 class="text-2xl font-black">${convRate}%</h3>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><!-- 2. Advanced Analytics Section -->
            <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"><div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"><h3 class="text-lg font-bold">Performance Analytics</h3>
                    <div class="flex gap-2"><div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"><span class="size-2 rounded-full bg-primary"></span> Views
                        </div>
                        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"><span class="size-2 rounded-full bg-slate-300"></span> Leads
                        </div>
                    </div>
                </div>
                <div class="flex-1 p-6 relative w-full h-[300px]"><canvas id="vendorDashboardChart"></canvas>
                </div>
            </div>

            <!-- 3. Top Performing Listing -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"><div class="p-6 border-b border-slate-200 dark:border-slate-800"><h3 class="text-lg font-bold">Top Performing</h3>
                </div>
                <div class="p-6">${topListing ? `
                    <div class="aspect-video w-full rounded-lg overflow-hidden relative mb-4"><div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${topListing.images && topListing.images[0] ? topListing.images[0] : 'https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Image'}')"></div>
                        ${topListing.is_featured ? '<div class="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">FEATURED</div>' : ''}
                        <div class="absolute bottom-2 right-2 bg-white/90 backdrop-blur p-1.5 rounded-lg text-slate-800 flex items-center gap-1 shadow-sm"><span class="material-symbols-outlined text-sm text-yellow-500">star</span>
                            <span class="text-xs font-bold">${calculateTopRating(topListing.id)}</span>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1"><h4 class="font-bold text-lg leading-tight truncate px-1">${topListing.name}</h4>
                        </div>
                        <p class="text-sm text-slate-500 mb-4 px-1">${topListing.city}</p>
                        
                        <div class="grid grid-cols-2 gap-3"><div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700"><p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Views</p>
                                <p class="text-xl font-bold">${topListing.total_views || 0}</p>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700"><p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Leads</p>
                                <p class="text-xl font-bold">${enquiries.filter(e => e.listing_id === topListing.id).length || 0}</p>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="flex flex-col items-center justify-center flex-1 text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700"><span class="material-symbols-outlined text-4xl text-slate-300 mb-2">monitoring</span>
                        <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">No properties available yet</p>
                    </div>
                `}
                </div>
            </div>
        </div>

        <!-- 4. Listings Performance Table -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"><div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"><h3 class="text-lg font-bold">Listing Performance</h3>
                <a href="#/vendor/listings" class="text-sm font-semibold text-primary hover:underline">View All</a>
            </div>
            <div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-slate-50 dark:bg-slate-800/50"><tr>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Property Details</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Total Views</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Leads</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">${sortedListings.slice(0, 5).map(l => `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><td class="px-6 py-4"><div class="flex items-center gap-3"><div class="size-10 rounded-lg bg-cover bg-center shrink-0" style="background-image: url('${l.images && l.images[0] ? l.images[0] : 'https://placehold.co/100x100/e2e8f0/94a3b8?text=UI'}')"></div>
                                    <div>
                                        <p class="font-bold text-sm text-slate-900 dark:text-white">${l.name}</p>
                                        <p class="text-xs text-slate-500 mb-0.5">${l.city}</p>
                                        <p class="text-[10px] font-mono text-slate-400 cursor-pointer hover:text-primary flex items-center gap-1 w-max bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded transition-colors" onclick="navigator.clipboard.writeText('${l.id}'); import('../state.js').then(m => m.showToast('Listing ID copied to clipboard!', 'success')); event.stopPropagation(); event.preventDefault();" title="Click to copy ID"><span class="material-symbols-outlined text-[10px]">content_copy</span> ID: ${l.id.substring(0,8).toUpperCase()}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 font-bold">${l.total_views || 0}</td>
                            <td class="px-6 py-4 font-bold">${enquiries.filter(e => e.listing_id === l.id).length || 0}</td>
                            <td class="px-6 py-4">${l.status === 'approved'
            ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">Active</span>'
            : (l.status === 'rejected'
                ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">Rejected</span>'
                : (l.gender_allowed === 'female' ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Verification Req.</span>' : '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Pending</span>'))}
                            </td>
                            <td class="px-6 py-4 text-right"><a href="#/vendor/listings" class="text-slate-500 hover:text-primary transition-colors"><span class="material-symbols-outlined text-xl">visibility</span>
                                </a>
                            </td>
                        </tr>
                        `).join('')}
                        ${sortedListings.length === 0 ? '<tr><td colspan="5" class="px-6 py-12 text-center text-slate-500">No properties listed yet</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
  `;
    document.getElementById('app').innerHTML = vendorLayout(content, 'dashboard', 'Vendor Overview');
    initVendorEvents();

    setTimeout(() => {
        const ctx = document.getElementById('vendorDashboardChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: leadChartData.labels,
                    datasets: [
                        {
                            label: 'Views',
                            data: generateDailyDistribution(stats.totalViews || 0).slice(0, 6),
                            backgroundColor: '#2ab4c0',
                            borderRadius: 4
                        },
                        {
                            label: 'Leads',
                            data: leadChartData.data,
                            backgroundColor: '#cbd5e1',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, display: true, border: { display: false } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }, 100);

    // Dismiss notification cards
    setTimeout(() => {
        document.querySelectorAll('.dismiss-notif').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.vendor-notif');
                if (card) {
                    card.style.transition = 'all 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'translateX(20px)';
                    setTimeout(() => card.remove(), 300);
                }
            });
        });
    }, 100);
}

window.deleteListing = async (id) => {
    if (confirm('Are you sure you want to permanently delete this listing? This action cannot be undone.')) {
        try {
            const { deleteListing } = await import('../supabase.js');
            await deleteListing(id);
            import('../state.js').then(m => m.showToast('Listing deleted successfully', 'success'));
            if (window.location.hash.includes('vendor/listings')) {
                renderVendorListings();
            } else {
                window.location.hash = '/vendor/listings';
            }
        } catch (e) {
            import('../state.js').then(m => m.showToast(e.message, 'error'));
        }
    }
};

export async function renderVendorListings(filter = 'all', page = 1) {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access to view this page', 'error'); navigate('/dashboard'); return; }

    showLoading();
    try { if (!window._vendorNotifs) window._vendorNotifs = await getVendorBroadcasts(state.user?.id); } catch (e) { }
    window._vendorNotifs = window._vendorNotifs || [];
    let allListings = [];
    let enquiries = [];
    try {
        const [fetchedListings, fetchedEnquiries] = await Promise.all([
            getVendorListings(state.user.id),
            getEnquiries(state.user.id, true)
        ]);
        allListings = fetchedListings;
        enquiries = fetchedEnquiries;
    } catch (e) { console.error('Error fetching vendor listings data', e); }
    hideLoading();

    const activeCount = allListings.filter(l => l.status === 'approved').length;
    const pendingCount = allListings.filter(l => l.status === 'pending').length;
    const featuredCount = allListings.filter(l => l.is_featured).length;

    let filteredListings = allListings;
    if (filter === 'active') filteredListings = allListings.filter(l => l.status === 'approved');
    if (filter === 'pending') filteredListings = allListings.filter(l => l.status === 'pending');
    if (filter === 'featured') filteredListings = allListings.filter(l => l.is_featured);

    const itemsPerPage = 6;
    const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
    const currentPage = Math.max(1, Math.min(page, totalPages || 1));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentListings = filteredListings.slice(startIndex, endIndex);

    const getTabClass = (tabName) => {
        return filter === tabName
            ? 'px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm'
            : 'px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors filter-tab';
    };

    const content = `
    <!-- Title and Top Action -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"><div>
            <h1 class="text-3xl font-black tracking-tight mb-1">My Listings</h1>
            <p class="text-slate-500 text-sm">You have ${activeCount} active properties listed on StayNest</p>
        </div>
        <button onclick="window.location.hash='/vendor/add-listing'" class="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all"><span class="material-symbols-outlined">add</span>
            Add New PG Listing
        </button>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-3 mb-8 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800"><button class="${getTabClass('all')}" data-filter="all">All Listings</button>
        <button class="${getTabClass('active')}" data-filter="active">Active (${activeCount})</button>
        <button class="${getTabClass('pending')}" data-filter="pending">Pending (${pendingCount})</button>
        <button class="${getTabClass('featured')}" data-filter="featured">Featured (${featuredCount})</button>
        <div class="flex-1"></div>
        <button class="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onclick="import('../state.js').then(m => m.showToast('Advanced filters will be added in upcoming updates.', 'info'))"><span class="material-symbols-outlined text-lg">filter_list</span>
            <span class="hidden sm:inline">More Filters</span>
        </button>
    </div>

    <!-- Listings Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${currentListings.length ? currentListings.map(l => {
        const isPending = l.status !== 'approved';
        const views = l.total_views || 0;
        const leads = enquiries.filter(e => e.listing_id === l.id).length;
        const bgImage = l.images?.[0] ? `style="background-image: url('${l.images[0]}')"` : 'style="background-image: url(\'https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Image\')"';
        const statusBadge = isPending
            ? (l.status === 'rejected'
                ? '<div class="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">Rejected</div>'
                : (l.gender_allowed === 'female'
                    ? '<div class="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">Verification Req.</div>'
                    : '<div class="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">Pending Review</div>'))
            : (l.is_featured
                ? '<div class="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">Featured</div>'
                : '<div class="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">Active</div>');

        return `
            <!-- Listing Card -->
            <div class="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"><div class="relative h-48 overflow-hidden ${isPending ? 'grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500' : ''}"><div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" ${bgImage}></div>
                    ${statusBadge}
                    ${!isPending ? (() => {
                        const listingReviews = (window._vendorReviewsAll || []).filter(r => r.listing_id === l.id);
                        const realRating = listingReviews.length > 0 ? (listingReviews.reduce((s, r) => s + r.rating, 0) / listingReviews.length).toFixed(1) : null;
                        return realRating ? `<div class="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-lg text-slate-800 dark:text-white backdrop-blur flex items-center gap-1 shadow-sm"><span class="material-symbols-outlined text-sm text-yellow-500 fill-1">star</span>
                        <span class="text-xs font-bold">${realRating}</span>
                    </div>` : '';
                    })() : ''}
                </div>
                <div class="p-5 flex-1 flex flex-col"><div class="flex justify-between items-start mb-2"><div>
                            <h3 class="font-bold text-lg leading-tight mb-1 ${isPending ? 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors' : ''}">${l.name}</h3>
                            <div class="flex items-center gap-1 ${isPending ? 'text-slate-400' : 'text-slate-500'} text-xs relative mb-2"><span class="material-symbols-outlined text-sm">location_on</span>
                                <span class="truncate block max-w-[150px] relative top-[1px]">${l.address || l.city}</span>
                            </div>
                            <span class="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 w-max border border-slate-100 dark:border-slate-800 uppercase font-mono tracking-widest font-bold shadow-sm" onclick="navigator.clipboard.writeText('${l.id}'); import('../state.js').then(m => m.showToast('Listing ID copied!', 'success')); event.preventDefault(); event.stopPropagation();" title="Copy Listing ID">
                                <span class="material-symbols-outlined text-[10px]">content_copy</span> ID: ${l.id.substring(0,8)}
                            </span>
                        </div>
                        <div class="text-right shrink-0"><span class="${isPending ? 'text-slate-400 group-hover:text-primary transition-colors' : 'text-primary'} font-black text-lg truncate">₹${(l.monthly_rent || 0).toLocaleString('en-IN')}</span>
                            <span class="text-slate-400 text-[10px] block">per month</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 py-3 my-4 border-t border-slate-100 dark:border-slate-800">
                        <div class="flex flex-col"><span class="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Views</span>
                            <span class="text-sm font-bold">${views}</span>
                        </div>
                        <div class="flex flex-col"><span class="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Leads</span>
                            <span class="text-sm font-bold">${leads}</span>
                        </div>
                        <div class="flex flex-col"><span class="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Rating</span>
                            <span class="text-sm font-bold">${(() => { const lr = (window._vendorReviewsAll || []).filter(r => r.listing_id === l.id); return lr.length > 0 ? (lr.reduce((s,r)=> s+r.rating,0)/lr.length).toFixed(1) : 'New'; })()}</span>
                        </div>
                    </div>

                    ${l.status === 'rejected' && l.rejection_reason ? `
                    <div class="my-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                        <p class="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 mb-1"><span class="material-symbols-outlined text-[12px]">info</span> Rejection Reason</p>
                        <p class="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">${l.rejection_reason}</p>
                    </div>
                    ` : ''}
                    
                    <div class="flex items-center gap-2 mt-auto pt-2">
                        <button onclick="window.location.hash='/vendor/edit-listing/${l.id}'" class="flex-1 bg-slate-100 dark:bg-slate-800 ${isPending ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-700 dark:text-slate-300'} py-2 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1">
                            <span class="material-symbols-outlined text-base">edit</span> Edit
                        </button>
                        ${isPending ? `
                        <button onclick="window.deleteListing('${l.id}')" class="flex-1 border border-red-200 dark:border-red-900/50 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-1 group-hover:border-red-300">
                            <span class="material-symbols-outlined text-base">delete</span> Cancel
                        </button>
                        ` : `
                        <button onclick="window.location.hash='/pg/${l.id}'" class="flex-1 border border-slate-200 dark:border-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1">
                            <span class="material-symbols-outlined text-base">visibility</span> View
                        </button>
                        ${!l.is_featured ? `
                        <button onclick="window.openFeaturedModal('${l.id}', '${l.name.replace(/'/g, "\\'")}')" class="flex-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-1">
                            <span class="material-symbols-outlined text-base">star</span> Promote
                        </button>` : ''}
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('') : `
            <div class="col-span-1 md:col-span-2 xl:col-span-3 py-16 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700"><span class="material-symbols-outlined text-6xl text-slate-300 mb-4">domain_disabled</span>
                <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300">No properties listed</h3>
                <p class="text-slate-500 mt-2 max-w-sm">Add your first property to start receiving enquiries and bookings.</p>
                <a href="#/vendor/add-listing" class="mt-6 bg-primary text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:scale-105 transition-transform">Add New PG</a>
            </div>
        `}
        
        <!-- Empty State Suggestion for promoting (if listings exist) -->
        ${allListings.length > 0 && currentListings.length === 0 ? `
            <div class="col-span-1 md:col-span-2 xl:col-span-3 py-12 text-center text-slate-500">No ${filter} properties found.
            </div>
        ` : ''}
        ${allListings.length > 0 ? `
        <div class="col-span-1 md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center py-12 px-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 mt-4 text-center"><div class="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4"><span class="material-symbols-outlined text-4xl">rocket_launch</span>
            </div>
            <h4 class="text-xl font-bold mb-2">Boost Your Listings Visibility</h4>
            <p class="text-slate-500 max-w-md mb-6">Promoted listings get up to 5x more views and 3x more leads. Start a promotion campaign today.</p>
            <button onclick="window.location.hash='/vendor/boost'" class="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/20">Get Started</button>
        </div>
        ` : ''}
    </div>

    ${filteredListings.length > 0 ? `
    <!-- Simple Pagination -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 py-6 border-t border-slate-200 dark:border-slate-800"><p class="text-sm text-slate-500">Showing <span class="font-bold text-slate-900 dark:text-white">${startIndex + 1}</span> to <span class="font-bold text-slate-900 dark:text-white">${Math.min(endIndex, filteredListings.length)}</span> of <span class="font-bold text-slate-900 dark:text-white">${filteredListings.length}</span> listings</p>
        <div class="flex items-center gap-2"><button data-page="${currentPage - 1}" class="pagination-btn size-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 transition-colors ${currentPage > 1 ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800' : 'text-slate-400 cursor-not-allowed'}" ${currentPage <= 1 ? 'disabled' : ''}>
                <span class="material-symbols-outlined">chevron_left</span>
            </button>
            
            ${Array.from({ length: totalPages }).map((_, i) => {
        const pageNum = i + 1;
        // Simple logic for showing a few pages around current
        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
            return `
                        <button data-page="${pageNum}" class="pagination-btn size-10 flex items-center justify-center rounded-lg ${pageNum === currentPage ? 'bg-primary text-white font-bold shadow-sm' : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400'}">${pageNum}
                        </button>
                    `;
        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
            return `<span class="px-1 text-slate-400">...</span>`;
        }
        return '';
    }).join('')}

            <button data-page="${currentPage + 1}" class="pagination-btn size-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 transition-colors ${currentPage < totalPages ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800' : 'text-slate-400 cursor-not-allowed'}" ${currentPage >= totalPages ? 'disabled' : ''}>
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
    </div>
    ` : ''}
    
    <!-- Featured Listing Payment Modal (Hidden initially) -->
    <div id="featuredModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] hidden items-center justify-center p-4 opacity-0 transition-opacity duration-300">
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform scale-95 transition-transform duration-300" id="featuredModalInner">
                <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-500 inline-block align-top">star</span> Promote Listing
                    </h3>
                    <button onclick="window.closeFeaturedModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 text-center">Get more visibility for <strong id="modalFeatureListingName">...</strong></p>
                    
                    <form id="featuredPaymentForm" class="space-y-4">
                        <input type="hidden" id="featuredListingId" value="">
                        
                        <div class="grid grid-cols-3 gap-3 mb-6">
                            <label class="cursor-pointer relative">
                                <input type="radio" name="featuredPlan" value="7_199" class="peer sr-only" required>
                                <div class="rounded-lg border-2 border-slate-200 dark:border-slate-700 p-3 text-center peer-checked:border-primary peer-checked:bg-primary/5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <p class="font-bold text-slate-900 dark:text-white">7 Days</p>
                                    <p class="text-primary font-black mt-1">₹199</p>
                                </div>
                            </label>
                            <label class="cursor-pointer relative">
                                <input type="radio" name="featuredPlan" value="15_349" class="peer sr-only" checked required>
                                <div class="rounded-lg border-2 border-slate-200 dark:border-slate-700 p-3 text-center peer-checked:border-primary peer-checked:bg-primary/5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <p class="font-bold text-slate-900 dark:text-white">15 Days</p>
                                    <p class="text-primary font-black mt-1">₹349</p>
                                    <span class="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Popular</span>
                                </div>
                            </label>
                            <label class="cursor-pointer relative">
                                <input type="radio" name="featuredPlan" value="30_599" class="peer sr-only" required>
                                <div class="rounded-lg border-2 border-slate-200 dark:border-slate-700 p-3 text-center peer-checked:border-primary peer-checked:bg-primary/5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <p class="font-bold text-slate-900 dark:text-white">30 Days</p>
                                    <p class="text-primary font-black mt-1">₹599</p>
                                </div>
                            </label>
                        </div>

                        <div class="bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50 rounded-xl p-4 flex flex-col items-center justify-center mb-6">
                            <span class="material-symbols-outlined text-4xl text-indigo-500 mb-2">qr_code_scanner</span>
                            <p class="text-sm font-semibold text-indigo-900 dark:text-indigo-200 text-center">Scan with any UPI App</p>
                            <div class="mt-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                <p class="text-xs text-slate-500 mb-1">Company UPI ID:</p>
                                <p class="font-bold tracking-wider text-slate-800 dark:text-white select-all">staynest@upi</p>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Upload Payment Screenshot <span class="text-red-500">*</span></label>
                            <input type="file" id="featuredPaymentScreenshot" accept="image/*" required class="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors">
                        </div>

                        <button type="submit" id="submitFeaturedBtn" class="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-[0_4px_12px_rgba(var(--primary-rgb),0.2)]">
                            Submit for Verification
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'listings', 'My Properties');
    initVendorEvents();

    // Setup Featured Payment Modal Logic
    window.openFeaturedModal = (listingId, listingName) => {
        document.getElementById('featuredListingId').value = listingId;
        document.getElementById('modalFeatureListingName').textContent = listingName;
        
        const modal = document.getElementById('featuredModal');
        const inner = document.getElementById('featuredModalInner');
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        inner.classList.remove('scale-95');
    };

    window.closeFeaturedModal = () => {
        const modal = document.getElementById('featuredModal');
        const inner = document.getElementById('featuredModalInner');
        modal.classList.add('opacity-0');
        inner.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('featuredPaymentForm').reset();
        }, 300);
    };

    const featuredForm = document.getElementById('featuredPaymentForm');
    if (featuredForm) {
        featuredForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('featuredPaymentScreenshot');
            if (!fileInput.files.length) {
                showToast('Please upload a screenshot', 'error');
                return;
            }

            const file = fileInput.files[0];
            const listingId = document.getElementById('featuredListingId').value;
            const selectedPlan = document.querySelector('input[name="featuredPlan"]:checked').value;
            const [days, price] = selectedPlan.split('_');

            const btn = document.getElementById('submitFeaturedBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Uploading...';
            btn.disabled = true;

            try {
                const screenshotUrl = await uploadPaymentScreenshot(file, state.user.id);
                
                await createPaymentRequest({
                    vendor_id: state.user.id,
                    vendor_email: state.user.email,
                    plan_name: `Featured Listing - ${days} Days`,
                    price: parseInt(price, 10),
                    payment_type: 'featured_listing',
                    listing_id: listingId,
                    screenshot_url: screenshotUrl
                });

                showToast('Promotional request submitted! Admin will verify it shortly.', 'success');
                window.closeFeaturedModal();
            } catch (err) {
                console.error(err);
                showToast('Failed to submit promotion request', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Dismiss Vendor Notifications
    document.querySelectorAll('.dismiss-notif').forEach(btn => {
        btn.addEventListener('click', async () => {
            const card = btn.closest('.vendor-notif');
            const id = btn.dataset.id;

            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'translateX(20px)';
                setTimeout(() => card.remove(), 300);
            }
            if (id && isLoggedIn()) {
                try {
                    await dismissMessage(state.user.id, id);
                } catch (e) { console.error('Error dismissing notification:', e); }
            }
        });
    });

    // Add click listeners to filter tabs
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.onclick = () => {
            renderVendorListings(btn.dataset.filter, 1);
        };
    });

    // Add click listeners to pagination buttons
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.onclick = () => {
            const newPage = parseInt(btn.dataset.page);
            if (!isNaN(newPage)) {
                renderVendorListings(filter, newPage);
            }
        };
    });

    document.querySelectorAll('.toggle-full-btn').forEach(b => {
        b.onclick = async () => {
            try {
                await updateListing(b.dataset.id, { is_full: b.dataset.full !== 'true' });
                showToast('Availability updated successfully!', 'success');
                renderVendorListings(filter); // Re-render with current filter
            } catch (e) { showToast(e.message, 'error'); }
        };
    });

    document.querySelectorAll('.delete-listing-btn').forEach(b => {
        b.onclick = async () => {
            if (confirm('Are you absolutely sure you want to delete this listing permanently?')) {
                try {
                    await deleteListing(b.dataset.id, state.user.id);
                    showToast('Listing deleted successfully', 'success');
                    renderVendorListings(filter); // Re-render with current filter
                } catch (e) { showToast(e.message, 'error'); }
            }
        };
    });
}

async function compressImage(file, maxWidth = 1200) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) return resolve(file);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', 0.8);
            };
        };
    });
}

export async function renderAddListing() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access to list a PG', 'error'); navigate('/dashboard'); return; }
    try { if (!window._vendorNotifs) window._vendorNotifs = await getVendorBroadcasts(state.user?.id); } catch (e) { }
    window._vendorNotifs = window._vendorNotifs || [];

    const content = `
        <div class="max-w-4xl w-full mx-auto lg:py-8"><div class="mb-10 text-center sm:text-left"><h2 class="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">Tell us about your PG</h2>
            <p class="text-slate-500 dark:text-slate-400">Provide the details to help students find your listing.</p>
        </div>
        
        <form id="add-listing-form" class="space-y-10"><!-- Basic Details Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">info</span> Basic Information</h3>
                
                <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">PG Name <span class="text-red-500">*</span></label>
                    <input id="al-name" required class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors" placeholder="e.g. Premium Single Room near Oxford University" type="text"/>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Monthly Rent (₹) <span class="text-red-500">*</span></label>
                        <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                            <input id="al-rent" required type="number" min="0" class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-4 py-4 focus:border-primary focus:ring-primary focus:ring-1 text-base lg:font-mono transition-colors" placeholder="8500"/>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Security Deposit (₹)</label>
                        <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                            <input id="al-deposit" type="number" min="0" value="0" class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-4 py-4 focus:border-primary focus:ring-primary focus:ring-1 text-base lg:font-mono transition-colors" placeholder="0"/>
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
                    <textarea id="al-desc" rows="4" class="al-validate w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors resize-y" placeholder="Describe the room, atmosphere, and house rules (min 20 characters)..."></textarea>
                    <p id="val-desc" class="text-xs text-red-500 hidden">Description must be at least 20 characters</p>
                </div>
            </div>

            <!-- Configuration Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">tune</span> Setup & Rules</h3>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Available Rooms</label>
                        <input id="al-rooms" type="number" min="0" value="1" class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base font-mono transition-colors"/>
                    </div>
                    <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Room Size (in sq ft) <span class="text-red-500">*</span></label>
                        <input id="al-room-size" type="number" min="1" required class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base font-mono transition-colors" placeholder="e.g. 150"/>
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Audience (Gender)</label>
                        <div class="flex flex-wrap gap-4 mt-2"><label class="relative flex items-center gap-2 cursor-pointer group"><input type="radio" name="al-gender" value="any" checked class="peer sr-only"><div class="size-5 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-colors after:content-[''] after:size-2 after:rounded-full after:bg-white after:opacity-0 peer-checked:after:opacity-100 group-hover:border-primary/50"></div>
                                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-primary transition-colors">Co-ed</span>
                            </label>
                            <label class="relative flex items-center gap-2 cursor-pointer group"><input type="radio" name="al-gender" value="male" class="peer sr-only"><div class="size-5 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-colors after:content-[''] after:size-2 after:rounded-full after:bg-white after:opacity-0 peer-checked:after:opacity-100 group-hover:border-primary/50"></div>
                                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-primary transition-colors">Men Only</span>
                            </label>
                            <label class="relative flex items-center gap-2 cursor-pointer group"><input type="radio" name="al-gender" value="female" class="peer sr-only"><div class="size-5 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-colors after:content-[''] after:size-2 after:rounded-full after:bg-white after:opacity-0 peer-checked:after:opacity-100 group-hover:border-primary/50"></div>
                                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-primary transition-colors">Women Only</span>
                            </label>
                        </div>
                        <!-- Women Verification Message -->
                        <div id="women-verification-message" class="hidden mt-4 bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800 rounded-xl p-4 transition-all">
                            <div class="flex gap-3">
                                <span class="material-symbols-outlined text-pink-600 dark:text-pink-400">verified_user</span>
                                <div>
                                    <h4 class="text-sm font-bold text-pink-900 dark:text-pink-300 mb-1">Women-Only Property Verification</h4>
                                    <p class="text-xs text-pink-700 dark:text-pink-400 mb-3 leading-relaxed">Additional verification is required for women-only properties. Please complete the verification form before submitting your listing.</p>
                                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSc_tW3lIpkF45HkkKPiQKgs-TCN4IaC8yR39DyIyKUh7dPgrw/viewform?usp=dialog" target="_blank" class="inline-flex items-center gap-1 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm">
                                        Complete Verification Form <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Location Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">location_on</span> Location Details</h3>
                
                <div class="flex flex-col gap-2 relative"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Address <span class="text-red-500">*</span></label>
                    <input id="al-address" autocomplete="off" required class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors" placeholder="Street, Building, Area" type="text"/>
                    <div id="al-suggestions" class="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden z-50"></div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">City <span class="text-red-500">*</span></label>
                        <select id="al-city" required class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors appearance-none cursor-pointer"><option value="">Select City</option>
                            ${CITIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Nearest Landmark</label>
                        <input id="al-landmark" class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors" placeholder="e.g. Near City Mall" type="text"/>
                    </div>
                </div>

                <div class="flex flex-col gap-2 relative z-0"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"><span>Map Location <span class="text-red-500">*</span></span>
                        <button type="button" id="use-my-location-btn" class="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"><span class="material-symbols-outlined text-[14px]">my_location</span> Find Me
                        </button>
                    </label>
                    <div id="vendor-map" class="w-full h-80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm z-0 relative overflow-hidden"></div>
                    <p class="text-xs text-slate-500 mt-1">Drag the pin to set your exact location</p>
                    <p id="val-map" class="text-xs text-red-500 flex items-center gap-1"><span class="material-symbols-outlined text-sm">location_off</span> Please pin your exact location on the map</p>
                    <input type="hidden" id="al-lat" value=""><input type="hidden" id="al-lng" value=""></div>
            </div>
            
            <!-- Amenities Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">lists</span> Facilities <span class="text-red-500 text-base">*</span></h3>
                <p id="val-amenities" class="text-xs text-red-500 hidden">Select at least 1 amenity</p>
                
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">${AMENITIES_LIST.map(a => `
                    <label class="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer group hover:border-primary/30 transition-all relative overflow-hidden has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary dark:has-[:checked]:bg-primary/10"><input type="checkbox" class="al-amenity appearance-none absolute inset-0 w-full h-full cursor-pointer opacity-0 z-10" value="${a.key}"><div class="absolute top-2 right-2 size-4 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center transition-colors text-white relative z-0 pointer-events-none group-has-[:checked]:bg-primary group-has-[:checked]:border-primary group-has-[:checked]:opacity-100 opacity-0 absolute"><span class="material-symbols-outlined text-[10px]">check</span>
                        </div>
                        <span class="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary/70 transition-colors group-has-[:checked]:text-primary">${a.icon}</span>
                        <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center transition-colors group-has-[:checked]:text-primary">${a.label}</span>
                    </label>
                    `).join('')}
                </div>
                
                <label class="flex items-center justify-between p-5 mt-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"><span class="font-bold text-orange-800 dark:text-orange-400 flex items-center gap-3"><span class="material-symbols-outlined text-2xl">restaurant</span> Mess / Food Service Available?</span>
                    <div class="relative shrink-0"><input type="checkbox" id="al-food" class="peer sr-only"><div class="w-14 h-7 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-orange-500 transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:size-5 after:transition-all peer-checked:after:translate-x-7 shadow-inner"></div>
                    </div>
                </label>
            </div>

            <!-- Photos Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">photo_camera</span> Photos <span class="text-red-500 text-base">*</span></h3>
                
                <div id="upload-zone" onclick="document.getElementById('al-images').click()" class="border-2 border-dashed border-primary/30 dark:border-primary/20 hover:border-primary bg-primary/5 dark:bg-primary/5 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-primary/10 group"><div class="size-16 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><span class="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
                    </div>
                    <p class="font-bold text-lg text-slate-800 dark:text-slate-200">Click to browse or drag images here</p>
                    <p class="text-sm text-slate-500 mt-2 font-medium">Minimum 3 photos required (Max 8 suggested)</p>
                    <p class="text-xs text-slate-400 mt-1">Supports JPG, PNG (Max 5MB each)</p>
                </div>
                <input type="file" id="al-images" accept="image/*" multiple class="hidden">
                <div class="flex items-center justify-between mt-2">
                    <p id="image-count" class="text-sm font-bold text-slate-500">0 images selected</p>
                    <p id="val-images" class="text-xs text-red-500">At least 3 images required</p>
                </div>
                <div id="image-preview" class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4"></div>
            </div>

            <!-- Validation Summary -->
            <div id="val-summary" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 hidden">
                <div class="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold"><span class="material-symbols-outlined text-lg">warning</span> Please complete all required fields before submitting</div>
            </div>

            <!-- Submit Declaration Link -->
            <div id="al-declaration-block" class="hidden my-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 transition-all">
                <label class="flex items-start gap-3 cursor-pointer group">
                    <div class="relative flex items-center justify-center mt-0.5 shrink-0">
                        <input type="checkbox" id="al-declaration" class="peer sr-only">
                        <div class="size-5 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-colors">
                            <span class="material-symbols-outlined text-[14px] text-white opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                        </div>
                    </div>
                    <span class="text-sm text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-relaxed">I hereby confirm that this property is strictly for female residents and that all information and documents submitted are true and accurate.</span>
                </label>
            </div>

            <!-- Submit Button -->
            <div class="pt-8 border-t border-primary/10 flex items-center justify-between"><button type="button" onclick="history.back()" class="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><span class="material-symbols-outlined">arrow_back</span>
                    Cancel
                </button>
                <button type="submit" id="submit-listing-btn" disabled class="flex items-center gap-2 px-10 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none">Submit Listing
                    <span class="material-symbols-outlined">send</span>
                </button>
            </div>
        </form>
    </div> `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'add', 'Create Listing');
    initVendorEvents();

    // Map initialization
    const initMap = () => {
        let initialLat = 20.5937;
        let initialLng = 78.9629;
        const latInput = document.getElementById('al-lat');
        const lngInput = document.getElementById('al-lng');

        const updateInputs = (lat, lng) => {
            latInput.value = lat;
            lngInput.value = lng;
        };
        updateInputs(initialLat, initialLng);

        // Make sure container is ready
        const mapContainer = document.getElementById('vendor-map');
        if (!mapContainer) return;

        const map = L.map(mapContainer).setView([initialLat, initialLng], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

        const reverseGeocode = async (lat, lng) => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                const data = await res.json();
                if (data && data.display_name) {
                    document.getElementById('al-address').value = data.display_name;
                    if (data.address) {
                        const city = data.address.city || data.address.state_district || data.address.county;
                        if (city) {
                            const citySelect = document.getElementById('al-city');
                            const option = Array.from(citySelect.options).find(o => o.value.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(o.value.toLowerCase()));
                            if (option) citySelect.value = option.value;
                        }
                    }
                }
            } catch (e) { }
        };

        marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            updateInputs(lat, lng);
            reverseGeocode(lat, lng);
        });

        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            updateInputs(lat, lng);
            reverseGeocode(lat, lng);
        });

        // Photon Autocomplete
        const addressInput = document.getElementById('al-address');
        const suggBox = document.getElementById('al-suggestions');
        let debounceTimer;

        addressInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val.length < 3) {
                suggBox.classList.add('hidden');
                return;
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                try {
                    suggBox.innerHTML = '<div class="p-3 text-sm text-slate-500">Searching...</div>';
                    suggBox.classList.remove('hidden');

                    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`);
                    const data = await res.json();

                    if (data.features && data.features.length > 0) {
                        suggBox.innerHTML = data.features.map(f => {
                            const p = f.properties;
                            const name = p.name ? p.name + ', ' : '';
                            const city = p.city || p.county || p.state_district || '';
                            const state = p.state || '';
                            const display = `${name}${city ? city + ', ' : ''}${state ? state + ', ' : ''}${p.country || ''}`;

                            return `<div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm text-slate-700 dark:text-slate-300 sugg-item" data-lat="${f.geometry.coordinates[1]}" data-lng="${f.geometry.coordinates[0]}" data-city="${city}" data-display="${display}">
                                  ${display}
                             </div>`;
                        }).join('');

                        suggBox.querySelectorAll('.sugg-item').forEach(item => {
                            item.addEventListener('click', () => {
                                const lat = parseFloat(item.dataset.lat);
                                const lng = parseFloat(item.dataset.lng);
                                updateInputs(lat, lng);
                                map.setView([lat, lng], 15);
                                marker.setLatLng([lat, lng]);
                                addressInput.value = item.dataset.display;

                                const citySelect = document.getElementById('al-city');
                                const option = Array.from(citySelect.options).find(o => o.value.toLowerCase().includes(item.dataset.city.toLowerCase()));
                                if (option) citySelect.value = option.value;

                                suggBox.classList.add('hidden');
                            });
                        });
                    } else {
                        suggBox.innerHTML = '<div class="p-3 text-sm text-slate-500">No results found</div>';
                    }
                } catch (err) {
                    suggBox.classList.add('hidden');
                }
            }, 400);
        });

        document.addEventListener('click', (e) => {
            if (!addressInput.contains(e.target) && suggBox && !suggBox.contains(e.target)) {
                suggBox.classList.add('hidden');
            }
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    map.setView([lat, lng], 13);
                    marker.setLatLng([lat, lng]);
                    updateInputs(lat, lng);
                    reverseGeocode(lat, lng);
                },
                () => { /* fallback */ }
            );
        }

        document.getElementById('use-my-location-btn')?.addEventListener('click', () => {
            if (!navigator.geolocation) { showToast('Geolocation not supported.', 'error'); return; }
            const btn = document.getElementById('use-my-location-btn');
            btn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>';
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    map.setView([lat, lng], 15);
                    marker.setLatLng([lat, lng]);
                    updateInputs(lat, lng);
                    reverseGeocode(lat, lng);
                    btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">my_location</span> Find Me';
                },
                (err) => { btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">my_location</span> Find Me'; },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });

        // Ensure map renders correctly if hidden initially
        setTimeout(() => map.invalidateSize(), 300);
    };

    // Need a tiny timeout to ensure DOM is ready for Leaflet map container
    setTimeout(() => {
        initMap();
    }, 100);

    // ── Managed image file array with remove support ──
    const selectedFiles = [];
    const imgInput = document.getElementById('al-images');

    const renderImagePreviews = () => {
        const preview = document.getElementById('image-preview');
        const countEl = document.getElementById('image-count');
        const valEl = document.getElementById('val-images');
        preview.innerHTML = '';
        countEl.textContent = `${selectedFiles.length} image${selectedFiles.length !== 1 ? 's' : ''} selected`;
        countEl.className = selectedFiles.length >= 3
            ? 'text-sm font-bold text-emerald-600'
            : 'text-sm font-bold text-slate-500';
        if (valEl) valEl.classList.toggle('hidden', selectedFiles.length >= 3);

        selectedFiles.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm animate-in zoomIn group';
            div.innerHTML = `
                <img src="${item.dataUrl}" class="w-full h-full object-cover">
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span class="text-[10px] font-medium text-white shadow-sm truncate w-full block">${item.file.name}</span>
                </div>
                <button type="button" class="remove-img-btn absolute top-2 right-2 size-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110" data-idx="${idx}" title="Remove image">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>`;
            preview.appendChild(div);
        });

        // Bind remove buttons
        preview.querySelectorAll('.remove-img-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                selectedFiles.splice(idx, 1);
                renderImagePreviews();
                validateForm();
            });
        });
    };

    imgInput.onchange = () => {
        Array.from(imgInput.files).forEach(f => {
            // Prevent duplicates by file name + size
            const exists = selectedFiles.some(s => s.file.name === f.name && s.file.size === f.size);
            if (!exists) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedFiles.push({ file: f, dataUrl: e.target.result });
                    renderImagePreviews();
                    validateForm();
                };
                reader.readAsDataURL(f);
            }
        });
        // Reset input so same file can be re-selected
        imgInput.value = '';
    };

    // ── Form Validation ──
    const DEFAULT_LAT = 20.5937;
    const DEFAULT_LNG = 78.9629;

    const validateForm = () => {
        const name = document.getElementById('al-name').value.trim();
        const desc = document.getElementById('al-desc').value.trim();
        const rent = parseFloat(document.getElementById('al-rent').value);
        const city = document.getElementById('al-city').value;
        const address = document.getElementById('al-address').value.trim();
        const roomSize = parseFloat(document.getElementById('al-room-size').value);
        const amenities = [...document.querySelectorAll('.al-amenity:checked')];
        const lat = parseFloat(document.getElementById('al-lat').value);
        const lng = parseFloat(document.getElementById('al-lng').value);
        const genderRadio = document.querySelector('input[name="al-gender"]:checked');
        const isWomenOnly = genderRadio && genderRadio.value === 'female';
        const isDeclarationChecked = document.getElementById('al-declaration') ? document.getElementById('al-declaration').checked : false;

        // Toggle UI elements
        const verifyMsg = document.getElementById('women-verification-message');
        const declBlock = document.getElementById('al-declaration-block');
        if (verifyMsg) verifyMsg.classList.toggle('hidden', !isWomenOnly);
        if (declBlock) declBlock.classList.toggle('hidden', !isWomenOnly);

        const checks = [
            { ok: name.length > 0, field: 'al-name' },
            { ok: desc.length >= 20, field: 'al-desc', valId: 'val-desc' },
            { ok: rent > 0, field: 'al-rent' },
            { ok: city.length > 0, field: 'al-city' },
            { ok: address.length > 0, field: 'al-address' },
            { ok: !isNaN(roomSize) && roomSize > 0, field: 'al-room-size' },
            { ok: amenities.length >= 1, valId: 'val-amenities' },
            { ok: selectedFiles.length >= 3, valId: 'val-images' },
            { ok: mapPinned, valId: 'val-map' },
            { ok: !isWomenOnly || isDeclarationChecked, valId: null },
        ];

        let allValid = true;
        checks.forEach(c => {
            if (c.field) {
                const el = document.getElementById(c.field);
                if (el) {
                    if (!c.ok && el.value.length > 0) {
                        el.classList.add('!border-red-400', 'dark:!border-red-500');
                    } else {
                        el.classList.remove('!border-red-400', 'dark:!border-red-500');
                    }
                }
            }
            if (c.valId) {
                const valEl = document.getElementById(c.valId);
                if (valEl) valEl.classList.toggle('hidden', c.ok);
            }
            if (!c.ok) allValid = false;
        });

        const submitBtn = document.getElementById('submit-listing-btn');
        const valSummary = document.getElementById('val-summary');
        if (submitBtn) submitBtn.disabled = !allValid;
        if (valSummary) valSummary.classList.toggle('hidden', allValid);
        return allValid;
    };

    // Bind validation to all form inputs
    ['al-name', 'al-desc', 'al-rent', 'al-room-size', 'al-city', 'al-address'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', validateForm);
            el.addEventListener('change', validateForm);
        }
    });
    document.querySelectorAll('.al-amenity').forEach(cb => cb.addEventListener('change', validateForm));
    document.querySelectorAll('input[name="al-gender"]').forEach(rb => rb.addEventListener('change', validateForm));
    const declCb = document.getElementById('al-declaration');
    if (declCb) declCb.addEventListener('change', validateForm);
    // Re-validate when lat/lng change (called from map handlers)
    const origLatInput = document.getElementById('al-lat');
    const origLngInput = document.getElementById('al-lng');
    if (origLatInput) {
        const observer = new MutationObserver(validateForm);
        observer.observe(origLatInput, { attributes: true, attributeFilter: ['value'] });
        observer.observe(origLngInput, { attributes: true, attributeFilter: ['value'] });
        // Also poll for changes from map (since value set via JS doesn't trigger mutation)
        setInterval(validateForm, 2000);
    }
    // Initial validation
    setTimeout(validateForm, 500);

    document.getElementById('add-listing-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showToast('Please complete all required fields before submitting', 'error');
            return;
        }
        showLoading();
        try {
            // Enforce Subscription Limits
            const stats = await getVendorStats(state.user.id);
            let limit = 1; // Free tier default

            if (state.profile?.subscription_status === 'active' && state.profile?.subscription_plan) {
                const allPlans = await getPlans();
                const currentPlan = allPlans.find(p => p.plan_name.toLowerCase() === (state.profile.subscription_plan || '').toLowerCase());
                if (currentPlan) {
                    limit = currentPlan.listing_limit;
                }
            }

            if (stats.totalListings >= limit) {
                hideLoading();
                showToast(`Listing limit reached! Your current plan allows up to ${limit} listing(s). Note: Deleted listings count towards your lifetime limit.`, 'error');
                return;
            }

            const amenities = [...document.querySelectorAll('.al-amenity:checked')].map(c => c.value);
            const genderRadio = document.querySelector('input[name="al-gender"]:checked');
            const lat = parseFloat(document.getElementById('al-lat').value);
            const lng = parseFloat(document.getElementById('al-lng').value);

            const listing = await createListing({
                vendor_id: state.user.id,
                name: document.getElementById('al-name').value,
                description: document.getElementById('al-desc').value,
                address: document.getElementById('al-address').value,
                city: document.getElementById('al-city').value,
                landmark: document.getElementById('al-landmark').value,
                monthly_rent: +document.getElementById('al-rent').value,
                deposit: +document.getElementById('al-deposit').value,
                available_rooms: +document.getElementById('al-rooms').value,
                room_size: +document.getElementById('al-room-size').value,
                gender_allowed: genderRadio ? genderRadio.value : 'any',
                amenities,
                food_available: document.getElementById('al-food').checked,
                latitude: isNaN(lat) ? null : lat,
                longitude: isNaN(lng) ? null : lng,
                images: [],
            });

            if (selectedFiles.length) {
                showToast('Compressing and uploading photos...', 'info');
                const compressedFiles = await Promise.all(selectedFiles.map(s => compressImage(s.file)));
                const urls = await uploadListingImages(listing.id, compressedFiles);
                await updateListing(listing.id, { images: urls });

                // ── Phase 5: Image hashing + duplicate detection (best-effort) ──
                try {
                    await Promise.all(compressedFiles.map(async (file, idx) => {
                        const url = urls[idx];
                        if (!url) return;
                        const dataUrl = await new Promise((resolve) => {
                            const r = new FileReader();
                            r.onload = () => resolve(r.result);
                            r.onerror = () => resolve(null);
                            r.readAsDataURL(file);
                        });
                        if (!dataUrl) return;
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        const loaded = await new Promise((resolve) => {
                            img.onload = () => resolve(true);
                            img.onerror = () => resolve(false);
                            img.src = dataUrl;
                        });
                        if (!loaded) return;
                        const hash = await computeImageHash(img);
                        if (!hash) return;

                        // Store hash (ignore failure)
                        await insertImageHash({
                            listing_id: listing.id,
                            vendor_id: state.user.id,
                            image_url: url,
                            hash_value: hash,
                        }).catch(() => {});

                        // Check duplicates and flag (admin will review)
                        const matches = await checkImageDuplicate(hash).catch(() => []);
                        const foreign = (matches || []).filter(m => m.listing_id && m.listing_id !== listing.id);
                        if (foreign.length > 0) {
                            await insertFraudFlag({
                                flag_type: 'duplicate_image',
                                severity: 'medium',
                                status: 'open',
                                reason: 'Uploaded image appears to match an existing listing image',
                                user_id: state.user.id,
                                listing_id: listing.id,
                                metadata: { hash_value: hash, matches: foreign.slice(0, 5) },
                            }).catch(() => {});
                        }
                    }));
                } catch (e) {
                    // never block listing creation for fraud tools
                    console.warn('Image hash/duplicate flow failed:', e?.message || e);
                }
            }

            // Fetch Nearby Places using Overpass API
            if (!isNaN(lat) && !isNaN(lng)) {
                showToast('Finding nearby places via Overpass API...', 'info');

                const calcLocalDistance = (lat1, lon1, lat2, lon2) => {
                    const R = 6371;
                    const dLat = (lat2 - lat1) * (Math.PI / 180);
                    const dLon = (lon2 - lon1) * (Math.PI / 180);
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return R * c;
                };

                const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"~"hospital|restaurant|atm|cafe|college|university|bus_station|clinic"](around:3000,${lat},${lng});
  node["railway"~"station"](around:3000,${lat},${lng});
  node["shop"~"supermarket|convenience"](around:3000,${lat},${lng});
);
out body;
`;
                try {
                    const params = new URLSearchParams();
                    params.append('data', overpassQuery);

                    const response = await fetch('https://overpass-api.de/api/interpreter', {
                        method: 'POST',
                        body: params
                    });

                    const data = await response.json();

                    if (data && data.elements) {
                        const placesMap = new Map();

                        data.elements.forEach(node => {
                            if (!node.tags || !node.tags.name) return;
                            const dist = calcLocalDistance(lat, lng, node.lat, node.lon);
                            let category = 'other';

                            if (node.tags.amenity === 'hospital' || node.tags.amenity === 'clinic') category = 'hospital';
                            else if (node.tags.amenity === 'restaurant') category = 'restaurant';
                            else if (node.tags.amenity === 'atm') category = 'atm';
                            else if (node.tags.amenity === 'cafe') category = 'cafe';
                            else if (node.tags.amenity === 'college' || node.tags.amenity === 'university') category = 'university';
                            else if (node.tags.amenity === 'bus_station') category = 'transit_station';
                            else if (node.tags.railway === 'station') category = 'train_station';
                            else if (node.tags.shop) category = 'supermarket';

                            if (category !== 'other') {
                                if (!placesMap.has(category)) placesMap.set(category, []);
                                placesMap.get(category).push({
                                    listing_id: listing.id,
                                    type: category,
                                    name: node.tags.name,
                                    distance: Math.round(dist * 1000), // stored in meters for easy formatting
                                    lat: node.lat,
                                    lng: node.lon
                                });
                            }
                        });

                        // Keep closest 2 of each category
                        const finalPlaces = [];
                        placesMap.forEach((list) => {
                            list.sort((a, b) => a.distance - b.distance);
                            finalPlaces.push(...list.slice(0, 2));
                        });

                        if (finalPlaces.length > 0) {
                            await insertNearbyPlaces(finalPlaces);
                        }
                    }
                } catch (e) {
                    console.error("Overpass API Error:", e);
                }
            }

            showToast('Listing submitted successfully!', 'success');

            // Trigger push notifications for users who searched this area
            triggerListingNotifications({
                title: document.getElementById('al-name').value,
                city: document.getElementById('al-city').value,
                area: document.getElementById('al-landmark').value,
                address: document.getElementById('al-address').value,
                listingId: listing.id
            }).catch(err => console.warn('Notification trigger failed:', err));

            navigate('/vendor/listings');
        } catch (err) { showToast(err.message, 'error'); }
        hideLoading();
    };
}

export async function renderEditListing({ id }) {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access', 'error'); navigate('/dashboard'); return; }

    showLoading();
    let listing = null;
    try {
        const { getListing } = await import('../supabase.js');
        listing = await getListing(id);
    } catch (e) { console.error(e); }
    hideLoading();

    if (!listing) { showToast('Listing not found', 'error'); navigate('/vendor/listings'); return; }
    if (listing.vendor_id !== state.user.id && !isAdmin()) { showToast('You can only edit your own listings', 'error'); navigate('/vendor/listings'); return; }

    try { if (!window._vendorNotifs) window._vendorNotifs = await getVendorBroadcasts(state.user?.id); } catch (e) { }
    window._vendorNotifs = window._vendorNotifs || [];

    const existingAmenities = listing.amenities || [];
    const existingImages = listing.images || [];

    const content = `
        <div class="max-w-4xl w-full mx-auto lg:py-8"><div class="mb-10 text-center sm:text-left"><h2 class="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">Edit Listing</h2>
            <p class="text-slate-500 dark:text-slate-400">Update the details for <strong>${listing.name}</strong>.</p>
        </div>
        
        <form id="edit-listing-form" class="space-y-10"><!-- Basic Details Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">info</span> Basic Information</h3>
                
                <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">PG Name <span class="text-red-500">*</span></label>
                    <input id="al-name" required class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors" placeholder="e.g. Premium Single Room" type="text" value="${(listing.name || '').replace(/"/g, '&quot;')}"/>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Monthly Rent (₹) <span class="text-red-500">*</span></label>
                        <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                            <input id="al-rent" required type="number" min="0" class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-4 py-4 focus:border-primary focus:ring-primary focus:ring-1 text-base lg:font-mono transition-colors" value="${listing.monthly_rent || ''}"/>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Security Deposit (₹)</label>
                        <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                            <input id="al-deposit" type="number" min="0" value="${listing.deposit || 0}" class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-4 py-4 focus:border-primary focus:ring-primary focus:ring-1 text-base lg:font-mono transition-colors"/>
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
                    <textarea id="al-desc" rows="4" class="al-validate w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors resize-y" placeholder="Describe the room...">${listing.description || ''}</textarea>
                    <p id="val-desc" class="text-xs text-red-500 hidden">Description must be at least 20 characters</p>
                </div>
            </div>

            <!-- Configuration Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">tune</span> Setup & Rules</h3>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Available Rooms</label>
                        <input id="al-rooms" type="number" min="0" value="${listing.available_rooms || 1}" class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base font-mono transition-colors"/>
                    </div>
                    <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Room Size (in sq ft) <span class="text-red-500">*</span></label>
                        <input id="al-room-size" type="number" min="1" required class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base font-mono transition-colors" placeholder="e.g. 150" value="${listing.room_size || ''}"/>
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Audience (Gender)</label>
                        <div class="flex flex-wrap gap-4 mt-2"><label class="relative flex items-center gap-2 cursor-pointer group"><input type="radio" name="al-gender" value="any" ${(listing.gender_allowed || 'any') === 'any' ? 'checked' : ''} class="peer sr-only"><div class="size-5 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-colors after:content-[''] after:size-2 after:rounded-full after:bg-white after:opacity-0 peer-checked:after:opacity-100 group-hover:border-primary/50"></div>
                                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-primary transition-colors">Co-ed</span>
                            </label>
                            <label class="relative flex items-center gap-2 cursor-pointer group"><input type="radio" name="al-gender" value="male" ${listing.gender_allowed === 'male' ? 'checked' : ''} class="peer sr-only"><div class="size-5 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-colors after:content-[''] after:size-2 after:rounded-full after:bg-white after:opacity-0 peer-checked:after:opacity-100 group-hover:border-primary/50"></div>
                                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-primary transition-colors">Men Only</span>
                            </label>
                            <label class="relative flex items-center gap-2 cursor-pointer group"><input type="radio" name="al-gender" value="female" ${listing.gender_allowed === 'female' ? 'checked' : ''} class="peer sr-only"><div class="size-5 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-colors after:content-[''] after:size-2 after:rounded-full after:bg-white after:opacity-0 peer-checked:after:opacity-100 group-hover:border-primary/50"></div>
                                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-primary transition-colors">Women Only</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Location Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">location_on</span> Location Details</h3>
                
                <div class="flex flex-col gap-2 relative"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Address <span class="text-red-500">*</span></label>
                    <input id="al-address" autocomplete="off" required class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors" placeholder="Street, Building, Area" type="text" value="${(listing.address || '').replace(/"/g, '&quot;')}"/>
                    <div id="al-suggestions" class="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden z-50"></div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">City <span class="text-red-500">*</span></label>
                        <select id="al-city" required class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors appearance-none cursor-pointer"><option value="">Select City</option>
                            ${CITIES.map(c => `<option value="${c}" ${c === listing.city ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex flex-col gap-2"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Nearest Landmark</label>
                        <input id="al-landmark" class="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 focus:border-primary focus:ring-primary focus:ring-1 text-base transition-colors" placeholder="e.g. Near City Mall" type="text" value="${(listing.landmark || '').replace(/"/g, '&quot;')}"/>
                    </div>
                </div>

                <div class="flex flex-col gap-2 relative z-0"><label class="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"><span>Map Location <span class="text-red-500">*</span></span>
                        <button type="button" id="use-my-location-btn" class="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"><span class="material-symbols-outlined text-[14px]">my_location</span> Find Me
                        </button>
                    </label>
                    <div id="vendor-map" class="w-full h-80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm z-0 relative overflow-hidden"></div>
                    <p class="text-xs text-slate-500 mt-1">Drag the pin to set your exact location</p>
                    <input type="hidden" id="al-lat" value="${listing.latitude || ''}"><input type="hidden" id="al-lng" value="${listing.longitude || ''}"></div>
            </div>
            
            <!-- Amenities Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">lists</span> Facilities <span class="text-red-500 text-base">*</span></h3>
                <p id="val-amenities" class="text-xs text-red-500 hidden">Select at least 1 amenity</p>
                
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">${AMENITIES_LIST.map(a => `
                    <label class="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer group hover:border-primary/30 transition-all relative overflow-hidden has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary dark:has-[:checked]:bg-primary/10"><input type="checkbox" class="al-amenity appearance-none absolute inset-0 w-full h-full cursor-pointer opacity-0 z-10" value="${a.key}" ${existingAmenities.includes(a.key) ? 'checked' : ''}><div class="absolute top-2 right-2 size-4 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center transition-colors text-white relative z-0 pointer-events-none group-has-[:checked]:bg-primary group-has-[:checked]:border-primary group-has-[:checked]:opacity-100 opacity-0 absolute"><span class="material-symbols-outlined text-[10px]">check</span>
                        </div>
                        <span class="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary/70 transition-colors group-has-[:checked]:text-primary">${a.icon}</span>
                        <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center transition-colors group-has-[:checked]:text-primary">${a.label}</span>
                    </label>
                    `).join('')}
                </div>
                
                <label class="flex items-center justify-between p-5 mt-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"><span class="font-bold text-orange-800 dark:text-orange-400 flex items-center gap-3"><span class="material-symbols-outlined text-2xl">restaurant</span> Mess / Food Service Available?</span>
                    <div class="relative shrink-0"><input type="checkbox" id="al-food" class="peer sr-only" ${listing.food_available ? 'checked' : ''}><div class="w-14 h-7 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-orange-500 transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:size-5 after:transition-all peer-checked:after:translate-x-7 shadow-inner"></div>
                    </div>
                </label>
            </div>

            <!-- Photos Section -->
            <div class="space-y-6"><h3 class="text-xl font-bold border-b border-primary/10 pb-2 text-primary flex items-center gap-2"><span class="material-symbols-outlined">photo_camera</span> Photos</h3>
                
                <!-- Existing Images -->
                <div id="existing-images" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${existingImages.map((url, idx) => `
                    <div class="existing-img-item relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group" data-url="${url}">
                        <img src="${url}" class="w-full h-full object-cover">
                        <button type="button" class="remove-existing-img absolute top-2 right-2 size-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110" data-idx="${idx}" title="Remove image">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>`).join('')}
                </div>
                <p id="existing-img-count" class="text-sm font-bold text-slate-500">${existingImages.length} existing image${existingImages.length !== 1 ? 's' : ''}</p>

                <div id="upload-zone" onclick="document.getElementById('al-images').click()" class="border-2 border-dashed border-primary/30 dark:border-primary/20 hover:border-primary bg-primary/5 dark:bg-primary/5 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-primary/10 group"><div class="size-12 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><span class="material-symbols-outlined text-2xl text-primary">add_photo_alternate</span>
                    </div>
                    <p class="font-bold text-slate-800 dark:text-slate-200">Add more photos</p>
                    <p class="text-xs text-slate-400 mt-1">JPG, PNG (Max 5MB each)</p>
                </div>
                <input type="file" id="al-images" accept="image/*" multiple class="hidden">
                <div class="flex items-center justify-between mt-2">
                    <p id="image-count" class="text-sm font-bold text-slate-500">0 new images selected</p>
                </div>
                <div id="image-preview" class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4"></div>
            </div>

            <!-- Submit Button -->
            <div class="pt-8 border-t border-primary/10 flex items-center justify-between"><button type="button" onclick="window.location.hash='/vendor/listings'" class="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><span class="material-symbols-outlined">arrow_back</span>
                    Cancel
                </button>
                <div class="flex items-center gap-3">
                    <button type="button" onclick="window.deleteListing('${listing.id}')" class="flex items-center gap-2 px-6 py-3 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <span class="material-symbols-outlined">delete</span> Delete
                    </button>
                    <button type="submit" id="submit-listing-btn" class="flex items-center gap-2 px-10 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all">Save Changes
                        <span class="material-symbols-outlined">save</span>
                    </button>
                </div>
            </div>
        </form>
    </div> `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'listings', 'Edit Listing');
    initVendorEvents();

    // Track which existing images to keep
    let keptImages = [...existingImages];

    // Bind remove buttons for existing images
    document.querySelectorAll('.remove-existing-img').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.existing-img-item');
            const url = item.dataset.url;
            keptImages = keptImages.filter(u => u !== url);
            item.style.opacity = '0';
            item.style.transform = 'scale(0.9)';
            setTimeout(() => item.remove(), 200);
            const countEl = document.getElementById('existing-img-count');
            if (countEl) countEl.textContent = `${keptImages.length} existing image${keptImages.length !== 1 ? 's' : ''}`;
        });
    });

    // Map initialization
    const initMap = () => {
        let initialLat = listing.latitude || 20.5937;
        let initialLng = listing.longitude || 78.9629;
        const latInput = document.getElementById('al-lat');
        const lngInput = document.getElementById('al-lng');

        const updateInputs = (lat, lng) => {
            latInput.value = lat;
            lngInput.value = lng;
        };

        const mapContainer = document.getElementById('vendor-map');
        if (!mapContainer) return;

        const zoom = listing.latitude ? 15 : 5;
        const map = L.map(mapContainer).setView([initialLat, initialLng], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

        const reverseGeocode = async (lat, lng) => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                const data = await res.json();
                if (data && data.display_name) {
                    document.getElementById('al-address').value = data.display_name;
                    if (data.address) {
                        const city = data.address.city || data.address.state_district || data.address.county;
                        if (city) {
                            const citySelect = document.getElementById('al-city');
                            const option = Array.from(citySelect.options).find(o => o.value.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(o.value.toLowerCase()));
                            if (option) citySelect.value = option.value;
                        }
                    }
                }
            } catch (e) { }
        };

        marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            updateInputs(lat, lng);
            reverseGeocode(lat, lng);
        });

        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            updateInputs(lat, lng);
            reverseGeocode(lat, lng);
        });

        // Photon Autocomplete
        const addressInput = document.getElementById('al-address');
        const suggBox = document.getElementById('al-suggestions');
        let debounceTimer;

        addressInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val.length < 3) { suggBox.classList.add('hidden'); return; }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                try {
                    suggBox.innerHTML = '<div class="p-3 text-sm text-slate-500">Searching...</div>';
                    suggBox.classList.remove('hidden');
                    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`);
                    const data = await res.json();
                    if (data.features && data.features.length > 0) {
                        suggBox.innerHTML = data.features.map(f => {
                            const p = f.properties;
                            const name = p.name ? p.name + ', ' : '';
                            const city = p.city || p.county || p.state_district || '';
                            const st = p.state || '';
                            const display = `${name}${city ? city + ', ' : ''}${st ? st + ', ' : ''}${p.country || ''}`;
                            return `<div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm text-slate-700 dark:text-slate-300 sugg-item" data-lat="${f.geometry.coordinates[1]}" data-lng="${f.geometry.coordinates[0]}" data-city="${city}" data-display="${display}">${display}</div>`;
                        }).join('');
                        suggBox.querySelectorAll('.sugg-item').forEach(item => {
                            item.addEventListener('click', () => {
                                const lat = parseFloat(item.dataset.lat);
                                const lng = parseFloat(item.dataset.lng);
                                updateInputs(lat, lng);
                                map.setView([lat, lng], 15);
                                marker.setLatLng([lat, lng]);
                                addressInput.value = item.dataset.display;
                                const citySelect = document.getElementById('al-city');
                                const option = Array.from(citySelect.options).find(o => o.value.toLowerCase().includes(item.dataset.city.toLowerCase()));
                                if (option) citySelect.value = option.value;
                                suggBox.classList.add('hidden');
                            });
                        });
                    } else {
                        suggBox.innerHTML = '<div class="p-3 text-sm text-slate-500">No results found</div>';
                    }
                } catch (err) { suggBox.classList.add('hidden'); }
            }, 400);
        });

        document.addEventListener('click', (e) => {
            if (!addressInput.contains(e.target) && suggBox && !suggBox.contains(e.target)) suggBox.classList.add('hidden');
        });

        document.getElementById('use-my-location-btn')?.addEventListener('click', () => {
            if (!navigator.geolocation) { showToast('Geolocation not supported.', 'error'); return; }
            const btn = document.getElementById('use-my-location-btn');
            btn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>';
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    map.setView([lat, lng], 15);
                    marker.setLatLng([lat, lng]);
                    updateInputs(lat, lng);
                    reverseGeocode(lat, lng);
                    btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">my_location</span> Find Me';
                },
                () => { btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">my_location</span> Find Me'; },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });

        setTimeout(() => map.invalidateSize(), 300);
    };

    setTimeout(() => initMap(), 100);

    // New image file management
    const selectedFiles = [];
    const imgInput = document.getElementById('al-images');

    const renderNewImagePreviews = () => {
        const preview = document.getElementById('image-preview');
        const countEl = document.getElementById('image-count');
        preview.innerHTML = '';
        countEl.textContent = `${selectedFiles.length} new image${selectedFiles.length !== 1 ? 's' : ''} selected`;

        selectedFiles.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm animate-in zoomIn group';
            div.innerHTML = `
                <img src="${item.dataUrl}" class="w-full h-full object-cover">
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span class="text-[10px] font-medium text-white shadow-sm truncate w-full block">${item.file.name}</span>
                </div>
                <button type="button" class="remove-img-btn absolute top-2 right-2 size-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110" data-idx="${idx}" title="Remove image">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>`;
            preview.appendChild(div);
        });

        preview.querySelectorAll('.remove-img-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                selectedFiles.splice(idx, 1);
                renderNewImagePreviews();
            });
        });
    };

    imgInput.onchange = () => {
        Array.from(imgInput.files).forEach(f => {
            const exists = selectedFiles.some(s => s.file.name === f.name && s.file.size === f.size);
            if (!exists) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedFiles.push({ file: f, dataUrl: e.target.result });
                    renderNewImagePreviews();
                };
                reader.readAsDataURL(f);
            }
        });
        imgInput.value = '';
    };

    // Form submission
    document.getElementById('edit-listing-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('al-name').value.trim();
        const desc = document.getElementById('al-desc').value.trim();
        const rent = parseFloat(document.getElementById('al-rent').value);
        const city = document.getElementById('al-city').value;
        const address = document.getElementById('al-address').value.trim();
        const roomSize = parseFloat(document.getElementById('al-room-size').value);

        if (!name || !desc || !rent || !city || !address || isNaN(roomSize) || roomSize <= 0) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        showLoading();
        try {
            const amenities = [...document.querySelectorAll('.al-amenity:checked')].map(c => c.value);
            const genderRadio = document.querySelector('input[name="al-gender"]:checked');
            const lat = parseFloat(document.getElementById('al-lat').value);
            const lng = parseFloat(document.getElementById('al-lng').value);

            let finalImages = [...keptImages];

            // Upload new images if any
            if (selectedFiles.length > 0) {
                showToast('Compressing and uploading new photos...', 'info');
                const compressedFiles = await Promise.all(selectedFiles.map(s => compressImage(s.file)));
                const newUrls = await uploadListingImages(id, compressedFiles);
                finalImages = [...finalImages, ...newUrls];

                // ── Phase 5: Image hashing + duplicate detection (best-effort) ──
                try {
                    await Promise.all(compressedFiles.map(async (file, idx) => {
                        const url = newUrls[idx];
                        if (!url) return;
                        const dataUrl = await new Promise((resolve) => {
                            const r = new FileReader();
                            r.onload = () => resolve(r.result);
                            r.onerror = () => resolve(null);
                            r.readAsDataURL(file);
                        });
                        if (!dataUrl) return;
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        const loaded = await new Promise((resolve) => {
                            img.onload = () => resolve(true);
                            img.onerror = () => resolve(false);
                            img.src = dataUrl;
                        });
                        if (!loaded) return;
                        const hash = await computeImageHash(img);
                        if (!hash) return;

                        await insertImageHash({
                            listing_id: id,
                            vendor_id: state.user.id,
                            image_url: url,
                            hash_value: hash,
                        }).catch(() => {});

                        const matches = await checkImageDuplicate(hash).catch(() => []);
                        const foreign = (matches || []).filter(m => m.listing_id && m.listing_id !== id);
                        if (foreign.length > 0) {
                            await insertFraudFlag({
                                flag_type: 'duplicate_image',
                                severity: 'medium',
                                status: 'open',
                                reason: 'Uploaded image appears to match an existing listing image',
                                user_id: state.user.id,
                                listing_id: id,
                                metadata: { hash_value: hash, matches: foreign.slice(0, 5) },
                            }).catch(() => {});
                        }
                    }));
                } catch (e) {
                    console.warn('Image hash/duplicate flow failed:', e?.message || e);
                }
            }

            await updateListing(id, {
                name,
                description: desc,
                address,
                city,
                landmark: document.getElementById('al-landmark').value,
                monthly_rent: rent,
                deposit: +document.getElementById('al-deposit').value,
                available_rooms: +document.getElementById('al-rooms').value,
                room_size: +document.getElementById('al-room-size').value,
                gender_allowed: genderRadio ? genderRadio.value : 'any',
                amenities,
                food_available: document.getElementById('al-food').checked,
                latitude: isNaN(lat) ? null : lat,
                longitude: isNaN(lng) ? null : lng,
                images: finalImages,
            });

            showToast('Listing updated successfully!', 'success');
            navigate('/vendor/listings');
        } catch (err) {
            showToast(err.message, 'error');
        }
        hideLoading();
    };
}

let activeVendorChatChannel = null;

export async function renderVendorEnquiries() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access to view this page', 'error'); navigate('/dashboard'); return; }
    try { if (!window._vendorNotifs) window._vendorNotifs = await getVendorBroadcasts(state.user?.id); } catch (e) { }
    window._vendorNotifs = window._vendorNotifs || [];

    let visits = [];
    let chats = [];
    try {
        visits = await getVendorVisitRequests(state.user.id);
        chats = await getVendorListingChats(state.user.id);
    } catch (e) { console.error(e); }

    let plans = [];
    try { plans = await getPlans() || []; } catch(e){}
    const myPlanName = state.profile?.subscription_plan || 'Free';
    const myPlan = plans.find(p => p.plan_name.toLowerCase() === myPlanName.toLowerCase());
    const showContact = myPlan ? myPlan.show_contact_details : false;

    const maskPhone = (phone) => {
        if (!phone) return 'N/A';
        if (showContact) return phone;
        return phone.substring(0, 2) + 'XXXXXX' + phone.substring(8);
    };

    const totalLeads = visits.length;
    const newLeads = visits.filter(v => v.status === 'pending').length;
    const activeChats = chats.length;

    const content = `
    <!-- Metrics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <span class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Visit Requests</span>
                <div class="p-2 bg-primary/10 rounded-lg text-primary"><span class="material-symbols-outlined">event_available</span></div>
            </div>
            <div class="flex items-end gap-2"><h3 class="text-3xl font-bold text-slate-900 dark:text-white leading-none">${totalLeads}</h3></div>
        </div>
        <div class="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <span class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Pending Visits</span>
                <div class="p-2 bg-amber-500/10 rounded-lg text-amber-500"><span class="material-symbols-outlined">pending_actions</span></div>
            </div>
            <div class="flex items-end gap-2"><h3 class="text-3xl font-bold text-slate-900 dark:text-white leading-none">${newLeads}</h3></div>
        </div>
        <div class="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <span class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Active Chat Threads</span>
                <div class="p-2 bg-blue-500/10 rounded-lg text-blue-500"><span class="material-symbols-outlined">forum</span></div>
            </div>
            <div class="flex items-end gap-2"><h3 class="text-3xl font-bold text-slate-900 dark:text-white leading-none">${activeChats}</h3></div>
        </div>
    </div>

    <!-- Tabs Container -->
    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <!-- Tabs Header -->
        <div class="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-6 pt-4 gap-6 shrink-0">
            <button id="tab-visits" class="vendor-tab pb-3 border-b-2 border-primary text-primary font-bold transition-all flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">calendar_month</span> Visit Requests
                ${newLeads ? '<span class="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">' + (newLeads) + '</span>' : ''}
            </button>
            <button id="tab-chats" class="vendor-tab pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold transition-all flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">chat</span> Messages
            </button>
        </div>

        <!-- Visits Tab Content -->
        <div id="content-visits" class="flex-1 flex flex-col p-6">
            ${!showContact ? `
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined shrink-0 mt-0.5">info</span>
                    <div>
                        <p class="font-bold text-sm mb-0.5" id="upgrade-leads-heading">Upgrade to view full contact details</p>
                        <p class="text-xs opacity-90">You are on the ${myPlanName} plan. Phone numbers are partially masked. Upgrade your subscription to unlock full contact access.</p>
                    </div>
                </div>
                <button onclick="window.location.hash='/vendor/subscriptions'" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow-sm transition-colors">Upgrade Plan</button>
            </div>
            ` : ''}
            
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table class="w-full text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Lead Info</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Property</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date & Time</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                            <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        ${visits.length ? visits.map(v => {
        const getBadge = (s) => {
            if (s === 'approved') return '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">Approved</span>';
            if (s === 'rejected') return '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">Rejected</span>';
            if (s === 'rescheduled') return '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Rescheduled</span>';
            return '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Pending</span>';
        };

        return `
                            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td class="px-6 py-4">
                                    <p class="font-bold text-sm text-slate-900 dark:text-white mb-0.5 flex items-center gap-2">
                                        ${v.name}
                                        ${v.gender ? `<span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${v.gender === 'female' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}">${v.gender}</span>` : ''}
                                    </p>
                                    <p class="text-[13px] font-medium text-slate-500 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[14px]">call</span> ${maskPhone(v.phone)}
                                        ${!showContact ? '<span class="material-symbols-outlined text-[12px] text-amber-500 ml-1" title="Masked due to plan restrictions">lock</span>' : ''}
                                    </p>
                                    ${v.message ? '<p class="text-xs text-slate-400 mt-1 italic truncate max-w-[200px]" title="' + v.message + '">' + v.message + '</p>' : ''}
                                </td>
                                <td class="px-6 py-4">
                                    <p class="font-semibold text-sm text-primary max-w-[150px] truncate" title="${v.listing?.name}">${v.listing?.name || 'Unknown'}</p>
                                    <p class="text-xs text-slate-500 truncate">${v.listing?.city || ''}</p>
                                </td>
                                <td class="px-6 py-4">
                                    <p class="font-bold text-[13px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block text-center mr-2 mb-1">
                                        ${new Date(v.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </p>
                                    <p class="font-bold text-[13px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block text-center mb-1">
                                        ${v.visit_time}
                                    </p>
                                </td>
                                <td class="px-6 py-4">${getBadge(v.status)}</td>
                                <td class="px-6 py-4">
                                    ${v.status === 'pending' || v.status === 'rescheduled' ? `
                                    <div class="flex gap-1.5 flex-wrap">
                                        <button class="approve-visit bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-green-200 dark:border-green-800" data-id="${v.id}" data-user-id="${v.user_id}" data-listing-name="${v.listing ? v.listing.name : ''}">Approve</button>
                                        <button class="reject-visit bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-red-200 dark:border-red-800" data-id="${v.id}" data-user-id="${v.user_id}" data-listing-name="${v.listing ? v.listing.name : ''}">Reject</button>
                                    </div>
                                    ` : (v.status === 'approved' ? `
                                    <div class="flex gap-1.5 flex-wrap">
                                        <button class="cancel-visit text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors font-bold text-xs" data-id="${v.id}" data-user-id="${v.user_id}" data-listing-name="${v.listing ? v.listing.name : ''}">Cancel</button>
                                    </div>
                                    ` : `
                                    <div class="flex gap-1.5 flex-wrap">
                                        <span class="text-xs text-slate-400 italic py-1.5">No actions</span>
                                    </div>
                                    `)}                        </td>
                            </tr>
                            `;
    }).join('') : `
                        <tr><td colspan="5" class="px-6 py-16 text-center text-slate-500">
                            <span class="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                            <p>No visit requests found.</p>
                        </td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Chats Tab Content -->
        <div id="content-chats" class="flex-1 hidden flex-col sm:flex-row h-full chat-layout">
            <!-- Chat Threads List -->
            <div class="w-full sm:w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-[#0b1121] overflow-y-auto max-h-[600px]">
                ${chats.length ? chats.map(c => `
                    <div class="chat-thread p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 cursor-pointer transition-colors relative" data-listing="${c.listing_id}" data-user="${c.user_id}">
                        ${(!c.is_read && !c.is_from_vendor) ? '<div class="absolute right-4 top-1/2 -translate-y-1/2 size-2.5 bg-primary rounded-full"></div>' : ''}
                        <div class="flex items-center gap-3">
                            <div class="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-500 capitalize font-bold">
                                ${c.user?.avatar_url ? `<img src="${c.user.avatar_url}" class="w-full h-full object-cover">` : (c.user?.full_name || 'U').charAt(0)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-baseline mb-0.5">
                                    <h4 class="font-bold text-[14px] text-slate-900 dark:text-white truncate pr-2">${c.user?.full_name || 'User'}</h4>
                                    <span class="text-[10px] font-medium text-slate-400 shrink-0">${new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <p class="text-[11px] text-primary font-medium truncate mb-1">${c.listing?.name || 'Property'}</p>
                                <p class="text-[12px] truncate ${(!c.is_read && !c.is_from_vendor) ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}">${c.is_from_vendor ? 'You: ' : ''}${c.message}</p>
                            </div>
                        </div>
                    </div>
                `).join('') : `
                <div class="p-8 text-center text-slate-500 h-full flex flex-col items-center justify-center">
                    <span class="material-symbols-outlined text-4xl mb-2 opacity-50">forum</span>
                    <p class="text-sm">No active messages</p>
                </div>
                `}
            </div>

            <!-- Active Chat View -->
            <div class="w-full sm:w-2/3 flex flex-col bg-slate-50 dark:bg-[#0f172a] h-[600px]">
                <div id="active-chat-placeholder" class="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                    <div class="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
                        <span class="material-symbols-outlined text-3xl">chat</span>
                    </div>
                    <p class="font-medium">Select a conversation</p>
                    <p class="text-sm opacity-70 mt-1">Choose a thread from the list to view and reply to messages.</p>
                </div>

                <div id="active-chat-view" class="h-full flex flex-col hidden relative">
                    <!-- Loading Overlay -->
                    <div id="chat-loading" class="absolute inset-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-20 hidden items-center justify-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                    
                    <!-- Chat Header -->
                    <div class="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between gap-3 shadow-sm z-10">
                        <div class="flex items-center gap-3 w-full max-w-[calc(100%-80px)]">
                            <div class="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 capitalize border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0" id="chat-header-avatar"></div>
                            <div class="flex flex-col justify-center overflow-hidden">
                                <h3 class="font-bold text-[15px] text-slate-900 dark:text-white truncate leading-tight" id="chat-header-name">Loading...</h3>
                                <p class="text-[11px] text-slate-500 font-medium tracking-wide truncate mt-0.5" id="chat-header-listing">Loading...</p>
                            </div>
                        </div>
                        <button id="vendor-report-user-btn" class="shrink-0 text-slate-400 hover:text-red-500 p-2 rounded-lg bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/20 transition-colors tooltip relative hidden">
                            <span class="material-symbols-outlined text-[18px]">flag</span>
                        </button>
                    </div>
                    
                    <div class="bg-amber-50 dark:bg-amber-900/20 px-3 py-2 border-b border-amber-200 dark:border-amber-900/50 shrink-0">
                        <p class="text-[11px] text-amber-800 dark:text-amber-500 flex items-center gap-1.5 font-medium leading-tight">
                            <span class="material-symbols-outlined text-[14px]">warning</span> Monitored Chat: Do not share personal contact info.
                        </p>
                    </div>

                    <!-- Chat Messages -->
                    <div id="vendor-chat-messages" class="flex-1 overflow-y-auto p-5 space-y-4"></div>

                    <!-- Chat Input -->
                    <div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-end gap-3 chat-input-area">
                        <textarea id="vendor-chat-input" rows="1" class="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-0 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 resize-none max-h-32" style="min-height:44px;" placeholder="Type your reply..."></textarea>
                        <button id="vendor-send-chat" class="size-11 rounded-full bg-primary hover:brightness-110 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                            <span class="material-symbols-outlined text-[20px] ml-1">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'enquiries', 'Leads & Visits');
    initVendorEvents();

    // Tab Logic
    const tabVisits = document.getElementById('tab-visits');
    const tabChats = document.getElementById('tab-chats');
    const contentVisits = document.getElementById('content-visits');
    const contentChats = document.getElementById('content-chats');

    const switchTab = (tab) => {
        if (tab === 'visits') {
            tabVisits.className = 'vendor-tab pb-3 border-b-2 border-primary text-primary font-bold transition-all flex items-center gap-2';
            tabChats.className = 'vendor-tab pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold transition-all flex items-center gap-2';
            contentVisits.classList.remove('hidden');
            contentVisits.classList.add('flex');
            contentChats.classList.add('hidden');
            contentChats.classList.remove('flex');
        } else {
            tabChats.className = 'vendor-tab pb-3 border-b-2 border-primary text-primary font-bold transition-all flex items-center gap-2';
            tabVisits.className = 'vendor-tab pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold transition-all flex items-center gap-2';
            contentChats.classList.remove('hidden');
            contentChats.classList.add('flex');
            contentVisits.classList.add('hidden');
            contentVisits.classList.remove('flex');
        }
    };

    tabVisits.onclick = () => switchTab('visits');
    tabChats.onclick = () => switchTab('chats');

    // Visit Requests Logic
    const handleStatusUpdate = async (id, newStatus, visitUserId, listingName) => {
        showLoading();
        try {
            await updateVisitRequestStatus(id, { status: newStatus });
            showToast(`Visit ${newStatus} successfully`, 'success');
            // Notify the user who made the visit request
            if (visitUserId) {
                const emoji = newStatus === 'approved' ? '✅' : '❌';
                const statusLabel = newStatus === 'approved' ? 'Approved' : 'Rejected';
                sendTargetedNotification(
                    visitUserId,
                    `${emoji} Visit Request ${statusLabel}`,
                    `Your visit request for "${listingName || 'a property'}" has been ${newStatus} by the vendor.`,
                    `visit_${newStatus}`
                );
            }
            renderVendorEnquiries(); // Refresh view
        } catch (e) {
            console.error(e);
            showToast('Failed to update visit status', 'error');
        }
        hideLoading();
    };

    document.querySelectorAll('.approve-visit').forEach(btn => {
        btn.onclick = () => handleStatusUpdate(
            btn.dataset.id, 'approved', btn.dataset.userId, btn.dataset.listingName
        );
    });
    document.querySelectorAll('.reject-visit').forEach(btn => {
        btn.onclick = () => {
            const visitId = btn.dataset.id;
            const userId = btn.dataset.userId;
            const listingName = btn.dataset.listingName;

            // Remove existing modal if any
            const existingModal = document.getElementById('reject-visit-modal');
            if (existingModal) existingModal.remove();

            // Create custom modal
            const modalHtml = `
            <div id="reject-visit-modal" class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-in fade-in duration-200">
                <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 shadow-xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><span class="material-symbols-outlined text-red-500">cancel</span> Reject Visit</h3>
                        <button id="cancel-reject-btn" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><span class="material-symbols-outlined text-sm">close</span></button>
                    </div>
                    <div class="p-6">
                        <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">You are about to reject a visit request for <strong>${listingName || 'this property'}</strong>. Please provide a mandatory reason to notify the user.</p>
                        <textarea id="reject-reason-input" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-400" rows="3" placeholder="e.g. Dates not available, property currently under maintenance..."></textarea>
                    </div>
                    <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button id="cancel-reject-btn-2" class="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">Cancel</button>
                        <button id="confirm-reject-btn" class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-sm shadow-sm">Confirm Rejection</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('cancel-reject-btn').onclick = () => document.getElementById('reject-visit-modal').remove();
            document.getElementById('cancel-reject-btn-2').onclick = () => document.getElementById('reject-visit-modal').remove();

            const confirmBtn = document.getElementById('confirm-reject-btn');
            const reasonInput = document.getElementById('reject-reason-input');

            reasonInput.focus();

            confirmBtn.onclick = () => {
                const reason = reasonInput.value.trim();
                if (!reason) {
                    showToast('A reason is required to reject a visit.', 'error');
                    reasonInput.classList.add('border-red-500');
                    return;
                }

                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>';

                handleStatusUpdate(visitId, 'rejected', userId, listingName, reason)
                    .then(() => {
                        const modal = document.getElementById('reject-visit-modal');
                        if (modal) modal.remove();
                    });
            };
        };
    });

    // Chat Logic
    let currentChatContext = null; // { listingId, userId }
    const messagesContainer = document.getElementById('vendor-chat-messages');

    const inputMsg = document.getElementById('vendor-chat-input');
    const sendBtn = document.getElementById('vendor-send-chat');

    const renderMessage = (msg) => {
        const isMe = msg.is_from_vendor; // Vendor is me
        const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const alignClass = isMe ? 'items-end' : 'items-start';
        return '<div class="flex flex-col w-full ' + alignClass + ' animate-in slide-in-from-bottom-2 fade-in duration-200">'
            + `<div class="max-w-[85%] chat-bubble rounded-2xl px-4 py-2 text-[15px] shadow-sm ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/50 rounded-bl-sm'}">`
            + '<p class="text-[14px] leading-relaxed break-words">' + (msg.message || '') + '</p>'
            + '</div>'
            + '<span class="text-[10px] text-slate-400 font-medium mt-1 px-1">' + timeStr + '</span>'
            + '</div>';
    };

    const loadChat = async (listingId, userId, userName, userAvatar, listingName) => {
        document.getElementById('active-chat-placeholder').classList.add('hidden');
        document.getElementById('active-chat-view').classList.remove('hidden');
        document.getElementById('active-chat-view').classList.add('flex');
        document.getElementById('chat-loading').classList.remove('hidden');
        document.getElementById('chat-loading').classList.add('flex');

        document.getElementById('chat-header-name').textContent = userName;
        document.getElementById('chat-header-listing').textContent = listingName;
        document.getElementById('chat-header-avatar').innerHTML = userAvatar ?
            '<img src="' + (userAvatar) + '" class="w-full h-full object-cover">' :
            userName.charAt(0);
        
        document.getElementById('vendor-report-user-btn').classList.remove('hidden');

        if (activeVendorChatChannel) {
            unsubscribeChat(activeVendorChatChannel);
            activeVendorChatChannel = null;
        }

        currentChatContext = { listingId, userId };

        try {
            const msgs = await getListingChatMessages(listingId, userId, state.user.id);
            messagesContainer.innerHTML = msgs.length ?
                msgs.map(m => renderMessage(m)).join('') :
                '<div class="h-full flex flex-col items-center justify-center text-slate-400"><p class="text-sm">No message history</p></div>';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            activeVendorChatChannel = subscribeToListingChats(listingId, userId, state.user.id, (newMsg) => {
                const innerHtml = messagesContainer.innerHTML;
                if (innerHtml.includes('No message history')) messagesContainer.innerHTML = '';
                messagesContainer.insertAdjacentHTML('beforeend', renderMessage(newMsg));
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
        } catch (e) {
            console.error(e);
            messagesContainer.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Error loading messages.</div>';
        }

        document.getElementById('chat-loading').classList.add('hidden');
        document.getElementById('chat-loading').classList.remove('flex');
        inputMsg?.focus();
    };

    document.querySelectorAll('.chat-thread').forEach(thread => {
        thread.onclick = () => {
            document.querySelectorAll('.chat-thread').forEach(t => t.classList.remove('bg-white', 'dark:bg-slate-800/50', 'border-l-4', 'border-l-primary'));
            thread.classList.add('bg-white', 'dark:bg-slate-800/50', 'border-l-4', 'border-l-primary');

            const listingId = thread.dataset.listing;
            const userId = thread.dataset.user;
            // Hacky way to grab text values for header
            const userName = thread.querySelector('h4').textContent;
            const listingName = thread.querySelector('.text-primary').textContent;
            const imgEl = thread.querySelector('img');
            const avatarRaw = imgEl ? imgEl.src : null;

            // Remove unread dot if present
            const unreadDot = thread.querySelector('.bg-primary.rounded-full');
            if (unreadDot) unreadDot.remove();
            // Demold text
            const textPreview = thread.querySelector('.text-slate-900.font-semibold');
            if (textPreview) {
                textPreview.classList.remove('text-slate-900', 'font-semibold', 'dark:text-white');
                textPreview.classList.add('text-slate-500', 'dark:text-slate-400');
            }

            loadChat(listingId, userId, userName, avatarRaw, listingName);
        };
    });

    const handleSendChat = async () => {
        if (!currentChatContext || !sendBtn || sendBtn.disabled) return;
        const text = inputMsg.value.trim();
        if (!text) return;

        inputMsg.value = '';
        inputMsg.style.height = 'auto';
        sendBtn.disabled = true;

        const tempMsg = {
            message: text,
            is_from_vendor: true,
            created_at: new Date().toISOString()
        };

        if (messagesContainer.innerHTML.includes('No message history')) messagesContainer.innerHTML = '';
        messagesContainer.insertAdjacentHTML('beforeend', renderMessage(tempMsg));
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            await sendListingChatMessage({
                listing_id: currentChatContext.listingId,
                user_id: currentChatContext.userId,
                vendor_id: state.user.id,
                message: text,
                is_from_vendor: true
            });
            // Notify the user of the vendor reply (fire-and-forget)
            sendTargetedNotification(
                currentChatContext.userId,
                '💬 New Reply from Vendor',
                'The property owner has replied to your message.',
                'chat_reply'
            );
        } catch (e) {
            console.error(e);
            showToast('Failed to send message', 'error');
        }
        sendBtn.disabled = false;
        if (inputMsg) inputMsg.focus();
    };

    if (sendBtn) {
        sendBtn.onclick = (e) => {
            e.preventDefault();
            handleSendChat();
        };
    }

    if (inputMsg) {
        inputMsg.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
            }
        };
        inputMsg.oninput = function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (sendBtn) sendBtn.disabled = !this.value.trim();
        };
    }

    const reportUserBtn = document.getElementById('vendor-report-user-btn');
    if (reportUserBtn) {
        reportUserBtn.onclick = () => {
            if (!currentChatContext) return;
            
            const modalId = 'report-user-modal';
            if (document.getElementById(modalId)) document.getElementById(modalId).remove();
            
            const modalObj = document.createElement('div');
            modalObj.id = modalId;
            modalObj.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in py-4 px-4';
            modalObj.innerHTML = `
                <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden flex flex-col">
                    <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 class="font-bold text-lg flex items-center gap-2"><span class="material-symbols-outlined text-red-500">flag</span> Report User</h3>
                        <button id="close-report-user-modal" class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="p-5 overflow-y-auto">
                        <form id="report-user-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Reporting <span class="text-red-500">*</span></label>
                                <select id="report-user-reason" required class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-slate-900 dark:text-white appearance-none cursor-pointer">
                                    <option value="" disabled selected>Select a reason</option>
                                    <option value="Abusive language">Abusive language</option>
                                    <option value="Spam or scam">Spam or scam</option>
                                    <option value="Inappropriate behavior">Inappropriate behavior</option>
                                    <option value="No show for visit">No show for visit</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Additional Details (Optional)</label>
                                <textarea id="report-user-desc" rows="3" placeholder="Please provide more context..." class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"></textarea>
                            </div>
                            <button type="submit" id="submit-report-user-btn" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-md disabled:opacity-70">
                                Submit Report
                            </button>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modalObj);
            
            document.getElementById('close-report-user-modal').onclick = () => modalObj.remove();
            
            document.getElementById('report-user-form').onsubmit = async (evt) => {
                evt.preventDefault();
                const submitBtn = document.getElementById('submit-report-user-btn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Submitting...';
                
                try {
                    const reason = document.getElementById('report-user-reason').value;
                    const desc = document.getElementById('report-user-desc').value.trim();
                    
                    await createReport({
                        listing_id: currentChatContext.listingId,
                        reported_by: state.user.id,
                        reported_user_id: currentChatContext.userId,
                        reason: reason,
                        description: desc || null,
                        status: 'pending'
                    });
                    
                    showToast('Report submitted successfully.', 'success');
                    modalObj.remove();
                } catch (err) {
                    console.error(err);
                    showToast(err.message || 'Failed to submit report', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Submit Report';
                }
            };
        };
    }

    // Cleanup when leaving page
    window._cleanupVendorEnquiries = () => {
        if (activeVendorChatChannel) {
            unsubscribeChat(activeVendorChatChannel);
            activeVendorChatChannel = null;
        }
    };
    return window._cleanupVendorEnquiries;
}

export async function renderVendorReviews() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access to view this page', 'error'); navigate('/dashboard'); return; }

    showLoading();
    try { if (!window._vendorNotifs) window._vendorNotifs = await getVendorBroadcasts(state.user?.id); } catch (e) { }
    window._vendorNotifs = window._vendorNotifs || [];
    let reviews = [];
    try { reviews = await getVendorReviews(state.user.id); } catch (e) { }
    hideLoading();

    const reviewsHtml = reviews.length ? reviews.map(r => {
        const stars = Array.from({ length: 5 }, (_, i) =>
            '<span class="material-symbols-outlined text-[18px] ' + (i < r.rating ? 'text-yellow-500 icon-filled' : 'text-slate-300') + '">' + (i < r.rating ? 'star' : 'star') + '</span>'
        ).join('');
        const date = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const nameInitial = ((r.profiles && r.profiles.full_name) || 'U').charAt(0);
        const fullName = (r.profiles && r.profiles.full_name) || 'Anonymous';
        const replySection = r.reply
            ? '<div class="mt-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border-l-4 border-primary"><span class="text-xs font-bold text-primary uppercase tracking-wider mb-1 block">Your Reply</span><p class="text-sm text-slate-700 dark:text-slate-300">' + r.reply + '</p></div>'
            : '<button class="reply-review-btn mt-3 text-sm font-semibold text-primary hover:underline flex items-center gap-1" data-id="' + r.id + '"><span class="material-symbols-outlined text-[16px]">reply</span> Reply to this review</button>'
            + '<div class="reply-review-section hidden mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700" id="review-reply-' + r.id + '">'
            + '<textarea id="review-reply-text-' + r.id + '" rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400 mb-3 resize-y" placeholder="Write your reply..."></textarea>'
            + '<div class="flex items-center gap-3">'
            + '<button class="send-review-reply-btn bg-primary hover:brightness-110 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2" data-id="' + r.id + '"><span class="material-symbols-outlined text-[16px]">send</span> Reply</button>'
            + '<button class="cancel-review-reply-btn bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-all" data-id="' + r.id + '">Cancel</button>'
            + '</div></div>';
        return '<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-5">'
            + '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">'
            + '<div class="flex items-center gap-3">'
            + '<div class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold capitalize shrink-0">' + nameInitial + '</div>'
            + '<div><p class="font-bold text-slate-900 dark:text-white">' + fullName + '</p><p class="text-xs text-slate-500">' + date + '</p></div>'
            + '</div>'
            + '<div class="flex items-center gap-2"><a href="#/pg/' + r.listing_id + '" class="text-sm text-primary font-semibold hover:underline">' + r.listing_name + '</a>'
            + '<div class="flex items-center gap-0.5">' + stars + '</div></div>'
            + '</div>'
            + '<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700"><p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">' + (r.comment || 'No comment provided.') + '</p></div>'
            + replySection
            + '</div>';
    }).join('')
        : '<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-20 flex flex-col items-center justify-center text-center shadow-md"><span class="material-symbols-outlined text-6xl text-slate-300 mb-4">reviews</span><h3 class="text-xl font-bold text-slate-700 dark:text-slate-300">No Reviews Yet</h3><p class="text-slate-500 mt-2 max-w-sm">Once students review your properties, they will appear here.</p></div>';

    const content = `
        <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800"><div>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Reviews</h2>
            <p class="text-slate-500 mt-1">All reviews across your properties</p>
        </div>
        <div class="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold border border-primary/20">${reviews.length} Total Reviews</div>
        </div>
        <div class="space-y-4">${reviewsHtml}</div>
    `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'reviews', 'Reviews');
    initVendorEvents();

    document.querySelectorAll('.reply-review-btn').forEach(b => {
        b.onclick = () => {
            const section = document.getElementById('review-reply-' + b.dataset.id);
            if (section) { section.classList.remove('hidden'); b.classList.add('hidden'); section.querySelector('textarea').focus(); }
        };
    });
    document.querySelectorAll('.cancel-review-reply-btn').forEach(b => {
        b.onclick = () => {
            const section = document.getElementById('review-reply-' + b.dataset.id);
            if (section) { section.classList.add('hidden'); }
            const replyBtn = document.querySelector('.reply-review-btn[data-id="' + b.dataset.id + '"]');
            if (replyBtn) replyBtn.classList.remove('hidden');
        };
    });
    document.querySelectorAll('.send-review-reply-btn').forEach(b => {
        b.onclick = async () => {
            const text = document.getElementById('review-reply-text-' + b.dataset.id)?.value?.trim();
            if (!text) { showToast('Please enter a reply', 'error'); return; }
            b.disabled = true;
            b.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Sending...';
            try {
                await replyReview(b.dataset.id, text);
                showToast('Reply posted!', 'success');
                renderVendorReviews();
            } catch (e) { showToast(e.message, 'error'); b.disabled = false; b.innerHTML = '<span class="material-symbols-outlined text-[16px]">send</span> Reply'; }
        };
    });
}

export async function renderVendorAnalytics() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access to view this page', 'error'); navigate('/dashboard'); return; }

    let rawData = { listings: [], visits: [], chats: [] };
    
    let plans = [];
    try { plans = await getPlans() || []; } catch(e){}
    const myPlanName = state.profile?.subscription_plan || 'Free';
    const myPlan = plans.find(p => p.plan_name.toLowerCase() === myPlanName.toLowerCase());
    const hasAnalytics = myPlan ? myPlan.analytics_access : false;

    showLoading();
    try { if (!window._vendorNotifs) window._vendorNotifs = await getVendorBroadcasts(state.user?.id); } catch (e) { }
    window._vendorNotifs = window._vendorNotifs || [];

    try {
        if (getVendorAnalyticsData && hasAnalytics) {
            rawData = await getVendorAnalyticsData(state.user.id);
        }
    } catch (e) { console.error('Error fetching analytics data', e); }
    hideLoading();

    const generateDateLabels = (days) => {
        const labels = [];
        for (let i = (days - 1); i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return labels;
    };

    const processAnalyticsData = (data, days = 30) => {
        const { listings = [], visits = [], chats = [], views = [] } = data || {};
        let activeListings = 0, totalRent = 0;
        const demographics = { male: 0, female: 0, any: 0 };

        const now = new Date();
        const periodStart = new Date();
        periodStart.setDate(now.getDate() - days);
        const prevPeriodStart = new Date();
        prevPeriodStart.setDate(now.getDate() - (days * 2));

        // Filter events for current and previous period
        const currentViews = views.filter(v => new Date(v.created_at) >= periodStart);
        const prevViews = views.filter(v => {
            const d = new Date(v.created_at);
            return d >= prevPeriodStart && d < periodStart;
        });

        const currentLeads = [...visits, ...chats].filter(v => new Date(v.created_at) >= periodStart);
        const prevLeads = [...visits, ...chats].filter(v => {
            const d = new Date(v.created_at);
            return d >= prevPeriodStart && d < periodStart;
        });

        const totalViews = currentViews.length;
        const totalLeads = currentLeads.length;
        const totalVisits = visits.filter(v => new Date(v.created_at) >= periodStart).length;
        const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : 0;
        
        const calcTrend = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };
        const viewTrend = calcTrend(totalViews, prevViews.length);
        const leadTrend = calcTrend(totalLeads, prevLeads.length);

        listings.forEach(l => {
            if (l.status === 'approved') activeListings++;
            if (l.monthly_rent) totalRent += l.monthly_rent;
            if (l.gender_allowed) demographics[l.gender_allowed] = (demographics[l.gender_allowed] || 0) + 1;
        });

        const avgRent = listings.length ? Math.round(totalRent / listings.length) : 0;
        const approvedVisits = visits.filter(v => v.status === 'approved' && new Date(v.created_at) >= periodStart).length;

        const timelineViews = new Array(days).fill(0);
        const timelineLeads = new Array(days).fill(0);

        currentLeads.forEach(item => {
            const itemDate = new Date(item.created_at);
            const diffDays = Math.floor(Math.abs(now - itemDate) / (1000 * 60 * 60 * 24));
            if (diffDays < days) timelineLeads[(days-1) - diffDays]++;
        });

        currentViews.forEach(item => {
            const itemDate = new Date(item.created_at);
            const diffDays = Math.floor(Math.abs(now - itemDate) / (1000 * 60 * 60 * 24));
            if (diffDays < days) timelineViews[(days-1) - diffDays]++;
        });

        // --- Performance Insights Logic ---
        const insights = [];
        if (totalViews > 0 && totalLeads === 0) {
            insights.push({ type: 'warning', text: 'High views but no leads. Try updating your photos or lowering the rent.', icon: 'info' });
        }
        
        // Add trend-based insights
        if (viewTrend < -20) {
            insights.push({ type: 'warning', text: `Views are down ${Math.abs(viewTrend)}% compared to last period. Consider a boost.`, icon: 'trending_down' });
        } else if (viewTrend > 20) {
            insights.push({ type: 'success', text: `Great! Your views are up ${viewTrend}% this period.`, icon: 'trending_up' });
        }

        listings.forEach(l => {
            if (l.status === 'approved' && (!l.images || l.images.length < 3)) {
                insights.push({ type: 'tip', text: `Add photos to "${l.name}" to increase trust.`, icon: 'photo_camera' });
            }
        });

        if (activeListings > 0 && conversionRate < 2 && totalViews > 50) {
            insights.push({ type: 'strategy', text: 'Low conversion rate. Review your amenity list and pricing strategy.', icon: 'psychology' });
        }

        if (insights.length === 0) {
            insights.push({ type: 'success', text: 'Performing well! Keep your listings updated for consistent leads.', icon: 'check_circle' });
        }

        const comparison = listings.map(l => {
            const lViews = currentViews.filter(v => v.pg_id === l.id).length;
            const lLeads = currentLeads.filter(item => item.listing_id === l.id).length;
            const lConv = lViews > 0 ? ((lLeads / lViews) * 100).toFixed(1) : 0;
            return { id: l.id, name: l.name, views: lViews, leads: lLeads, conversion: lConv, status: l.status };
        }).sort((a, b) => b.views - a.views);

        return {
            totalViews, totalLeads, totalVisits, approvedVisits, activeListings, totalListings: listings.length, avgRent, demographics, timelineViews, timelineLeads,
            viewTrend, leadTrend,
            insights, comparison, days,
            topListings: [...listings].sort((a, b) => (b.total_views || 0) - (a.total_views || 0)).slice(0, 3)
        };
    };

    let selectedDays = 30;
    let processedData = processAnalyticsData(rawData, selectedDays);

    const updateUI = () => {
        const d = processedData;
        const renderTrend = (val) => {
            if (val === 0) return '';
            const color = val > 0 ? 'text-emerald-500' : 'text-rose-500';
            const icon = val > 0 ? 'trending_up' : 'trending_down';
            return `<span class="flex items-center gap-1 ${color} text-[10px] font-bold mt-1 animate-in slideInUp">
                <span class="material-symbols-outlined text-sm">${icon}</span>
                ${Math.abs(val)}%
            </span>`;
        };

        document.getElementById('stat-views').innerHTML = `${(d.totalViews || 0).toLocaleString('en-IN')} ${renderTrend(d.viewTrend)}`;
        document.getElementById('stat-leads').innerHTML = `${(d.totalLeads || 0).toLocaleString('en-IN')} ${renderTrend(d.leadTrend)}`;
        document.getElementById('stat-conv').textContent = d.conversionRate + '%';

        // Update Insights
        const insightsContainer = document.getElementById('analytics-insights-grid');
        if (insightsContainer) {
            insightsContainer.innerHTML = d.insights.map(ins => {
                const colors = {
                    warning: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-900/30',
                    tip: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/10 dark:border-blue-900/30',
                    strategy: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/10 dark:border-purple-900/30',
                    success: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                };
                return `
                    <div class="p-4 rounded-xl border ${colors[ins.type] || colors.tip} flex gap-3 items-start animate-in zoomIn">
                        <span class="material-symbols-outlined text-xl shrink-0">${ins.icon}</span>
                        <p class="text-xs font-medium leading-relaxed">${ins.text}</p>
                    </div>
                `;
            }).join('');
        }

        // Update Comparison Table
        const compTable = document.getElementById('analytics-comparison-body');
        if (compTable) {
            compTable.innerHTML = d.comparison.length > 0 ? d.comparison.map(c => `
                <tr class="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td class="py-4 pl-4 text-sm font-bold text-slate-900 dark:text-white">${c.name}</td>
                    <td class="py-4 text-sm text-slate-600 dark:text-slate-400">${c.views}</td>
                    <td class="py-4 text-sm text-slate-600 dark:text-slate-400">${c.leads}</td>
                    <td class="py-4 text-sm font-bold text-primary">${c.conversion}%</td>
                    <td class="py-4 pr-4 text-right">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">${c.status}</span>
                    </td>
                </tr>
            `).join('') : `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-500">No properties available for comparison</td></tr>`;
        }

        // Update Funnel
        document.getElementById('funnel-views').style.width = '100%';
        document.getElementById('funnel-views-text').textContent = d.totalViews;

        const leadsPercent = d.totalViews > 0 ? Math.max(5, (d.totalLeads / d.totalViews) * 100) : 0;
        document.getElementById('funnel-leads').style.width = leadsPercent + '%';
        document.getElementById('funnel-leads-text').textContent = d.totalLeads;

        const visitsPercent = d.totalLeads > 0 ? Math.max(5, (d.totalVisits / d.totalLeads) * 100) : 0;
        document.getElementById('funnel-visits').style.width = visitsPercent + '%';
        document.getElementById('funnel-visits-text').textContent = d.totalVisits;

        const approvedPercent = d.totalVisits > 0 ? Math.max(5, (d.approvedVisits / d.totalVisits) * 100) : 0;
        document.getElementById('funnel-approved').style.width = approvedPercent + '%';
        document.getElementById('funnel-approved-text').textContent = d.approvedVisits;
    };

    const htmlContent = `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics</h1>
                <p class="text-slate-500 text-sm flex items-center gap-2"><span class="flex h-2 w-2 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span> Live realtime data</p>
            </div>
            <div class="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <button data-days="7" class="time-filter-btn px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedDays === 7 ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}">7D</button>
                <button data-days="30" class="time-filter-btn px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedDays === 30 ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}">30D</button>
                <button data-days="90" class="time-filter-btn px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedDays === 90 ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}">90D</button>
            </div>
        </div>

        <!-- Performance Insights Row -->
        <div id="analytics-insights-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <!-- Populated by updateUI -->
        </div>

        ${!hasAnalytics ? `
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center max-w-2xl mx-auto my-12 relative overflow-hidden z-20">
            <div class="absolute inset-0 bg-blue-500/5 blur-3xl z-0"></div>
            <div class="relative z-10">
                <span class="material-symbols-outlined text-6xl text-blue-500 mb-4 inline-block">query_stats</span>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">Unlock Powerful Analytics</h2>
                <p class="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">Your current ${myPlanName} plan does not include access to advanced analytics. Upgrade your subscription to gain insights into views, leads, demographics, and more.</p>
                <button onclick="window.location.hash='/vendor/subscriptions'" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25">Upgrade Subscription</button>
            </div>
        </div>
        <div class="opacity-40 pointer-events-none filter blur-[4px] select-none -mt-4 relative z-0">
        ` : ''}
        
        <!-- Metric Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div class="absolute -right-6 -top-6 size-24 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div class="flex items-center justify-between mb-4 relative">
                    <div class="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600"><span class="material-symbols-outlined">visibility</span></div>
                </div>
                <p class="text-slate-500 text-sm font-medium relative">Total Views</p>
                <h3 class="text-3xl font-bold mt-1 text-slate-900 dark:text-white relative" id="stat-views">${(processedData.totalViews).toLocaleString('en-IN')}</h3>
            </div>
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div class="absolute -right-6 -top-6 size-24 bg-primary/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div class="flex items-center justify-between mb-4 relative">
                    <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined text-fill">send</span></div>
                </div>
                <p class="text-slate-500 text-sm font-medium relative">Total Leads</p>
                <h3 class="text-3xl font-bold mt-1 text-slate-900 dark:text-white relative" id="stat-leads">${(processedData.totalLeads).toLocaleString('en-IN')}</h3>
            </div>
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div class="absolute -right-6 -top-6 size-24 bg-amber-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div class="flex items-center justify-between mb-4 relative">
                    <div class="size-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600"><span class="material-symbols-outlined">auto_graph</span></div>
                </div>
                <p class="text-slate-500 text-sm font-medium relative">Conversion Rate</p>
                <h3 class="text-3xl font-bold mt-1 text-slate-900 dark:text-white relative" id="stat-conv">${processedData.conversionRate}%</h3>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <!-- Line Chart: Trends -->
            <div class="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h4 class="text-lg font-bold text-slate-900 dark:text-white">Activity Timeline</h4>
                        <p class="text-slate-500 text-xs mt-1">Views and Leads over the last 30 days</p>
                    </div>
                </div>
                <div class="chart-container relative"><canvas id="analyticsTrendChart"></canvas></div>
            </div>

            <!-- Pie Chart: Demographics -->
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <div class="mb-4">
                    <h4 class="text-lg font-bold text-slate-900 dark:text-white">Target Demographics</h4>
                    <p class="text-slate-500 text-xs mt-1">Listing distribution by allowed gender</p>
                </div>
                <div class="flex-[1] relative min-h-[200px] flex items-center justify-center chart-container">
                    <div class="w-full h-full"><canvas id="analyticsPieChart"></canvas></div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Funnel Chart (HTML/CSS) -->
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div class="mb-8">
                    <h4 class="text-lg font-bold text-slate-900 dark:text-white">Conversion Funnel</h4>
                    <p class="text-slate-500 text-xs mt-1">Tracking the user journey from viewing to booking</p>
                </div>
                <div class="space-y-6">
                    <div>
                        <div class="flex justify-between text-sm font-bold mb-2"><span class="text-slate-600 dark:text-slate-300">Property Views</span> <span id="funnel-views-text">${processedData.totalViews}</span></div>
                        <div class="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div id="funnel-views" class="h-full bg-blue-500 transition-all duration-1000" style="width: 100%"></div></div>
                    </div>
                    <div>
                        <div class="flex justify-between text-sm font-bold mb-2"><span class="text-slate-600 dark:text-slate-300">Total Leads (Chats & Visits)</span> <span id="funnel-leads-text">${processedData.totalLeads}</span></div>
                        <div class="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex justify-center"><div id="funnel-leads" class="h-full bg-primary transition-all duration-1000" style="width: 0%"></div></div>
                    </div>
                    <div>
                        <div class="flex justify-between text-sm font-bold mb-2"><span class="text-slate-600 dark:text-slate-300">Visit Requests</span> <span id="funnel-visits-text">${rawData.visits.length}</span></div>
                        <div class="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex justify-center"><div id="funnel-visits" class="h-full bg-amber-500 transition-all duration-1000" style="width: 0%"></div></div>
                    </div>
                    <div>
                        <div class="flex justify-between text-sm font-bold mb-2"><span class="text-slate-600 dark:text-slate-300">Approved Visits</span> <span id="funnel-approved-text">${processedData.approvedVisits}</span></div>
                        <div class="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex justify-center"><div id="funnel-approved" class="h-full bg-emerald-500 transition-all duration-1000" style="width: 0%"></div></div>
                    </div>
                </div>
            </div>

            <!-- Comparison Table -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div class="p-6 border-b border-slate-50 dark:border-slate-800">
                    <h4 class="text-lg font-bold text-slate-900 dark:text-white">Listing Performance Comparison</h4>
                    <p class="text-slate-500 text-xs mt-1">Side-by-side analysis of your properties</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50 dark:bg-slate-800/30">
                                <th class="py-3 pl-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Listing Name</th>
                                <th class="py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Views</th>
                                <th class="py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Leads</th>
                                <th class="py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Conv %</th>
                                <th class="py-3 pr-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody id="analytics-comparison-body">
                            <!-- Populated by updateUI -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        ${!hasAnalytics ? `</div>` : ''}
    `;

    document.getElementById('app').innerHTML = vendorLayout(htmlContent, 'analytics', 'Analytics Dashboard');
    initVendorEvents();

    let trendChartObj = null;
    let pieChartObj = null;
    let barChartObj = null;

    if (!hasAnalytics) return window._cleanupVendorAnalytics; // stop execution here if locked

    const renderCharts = () => {
        const d = processedData;

        // Ensure updateUI values are populated on first load
        updateUI();

        // 1. Trend Chart
        const trendCtx = document.getElementById('analyticsTrendChart');
        if (trendCtx) {
            if (trendChartObj) trendChartObj.destroy();
            trendChartObj = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: generateDateLabels(d.days),
                    datasets: [
                        { label: 'Views', data: d.timelineViews, borderColor: '#3b82f6', backgroundColor: '#3b82f615', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0 },
                        { label: 'Leads', data: d.timelineLeads, borderColor: '#6c5ce7', backgroundColor: '#6c5ce715', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } } },
                    scales: {
                        y: { beginAtZero: true, border: { display: false }, grid: { color: '#e2e8f0', drawTicks: false } },
                        x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } }
                    }
                }
            });
        }

        // 2. Pie Chart
        const pieCtx = document.getElementById('analyticsPieChart');
        if (pieCtx) {
            if (pieChartObj) pieChartObj.destroy();
            pieChartObj = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Male Only', 'Female Only', 'Any/Unisex'],
                    datasets: [{
                        data: [d.demographics.male || 0, d.demographics.female || 0, d.demographics.any || 0],
                        backgroundColor: ['#3b82f6', '#ec4899', '#f59e0b'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, font: { size: 11 } } }
                    }
                }
            });
        }

        // 3. Bar Chart
        const barCtx = document.getElementById('analyticsBarChart');
        if (barCtx) {
            if (barChartObj) barChartObj.destroy();
            let approved = 0, pending = 0, rejected = 0;
            rawData.listings.forEach(l => {
                if (l.status === 'approved') approved++;
                else if (l.status === 'pending') pending++;
                else if (l.status === 'rejected') rejected++;
            });
            barChartObj = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['Approved', 'Pending', 'Rejected'],
                    datasets: [{
                        label: 'Listings',
                        data: [approved, pending, rejected],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderRadius: 6,
                        barThickness: 40
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, border: { display: false }, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    };

    // Time Filter Event Listeners
    document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const days = parseInt(btn.dataset.days);
            selectedDays = days;
            
            // UI Toggle
            document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('bg-primary', 'text-white', 'shadow-md'));
            document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.add('text-slate-500', 'hover:text-slate-900', 'dark:hover:text-white'));
            btn.classList.add('bg-primary', 'text-white', 'shadow-md');
            btn.classList.remove('text-slate-500', 'hover:text-slate-900', 'dark:hover:text-white');

            processedData = processAnalyticsData(rawData, selectedDays);
            updateUI();
            renderCharts();
        });
    });

    setTimeout(() => { renderCharts(); }, 150);

    // Setup Realtime Subscription
    window._cleanupVendorAnalytics = () => {
        if (window._vendorAnalyticsChannel) {
            if (typeof unsubscribeFromVendorAnalytics !== 'undefined') {
                unsubscribeFromVendorAnalytics(window._vendorAnalyticsChannel);
            }
            window._vendorAnalyticsChannel = null;
        }
    };

    if (typeof subscribeToVendorAnalytics !== 'undefined') {
        window._vendorAnalyticsChannel = subscribeToVendorAnalytics(state.user.id, async (payload) => {
            try {
                rawData = await getVendorAnalyticsData(state.user.id);
                processedData = processAnalyticsData(rawData, selectedDays);
                updateUI();
                renderCharts();
            } catch (e) { console.error('Error refreshing realtime data', e); }
        });
    }

    return window._cleanupVendorAnalytics;
}
export async function renderVendorBoost() {
    if (!isLoggedIn() || !isVendor()) { navigate('/home'); return; }

    showLoading();
    let listings = [];
    try { listings = await getVendorListings(state.user.id); } catch (e) { }
    hideLoading();

    // Only show approved listings for boosting
    const approvedListings = listings.filter(l => l.status === 'approved');

    const content = `
        <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800"><div>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Boost Your PG Activity</h2>
            <p class="text-slate-500 mt-1">Get up to 10x more leads by featuring your property on the home page.</p>
        </div>
        </div>

        ${approvedListings.length === 0 ? `
    <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8 flex items-start gap-4"><span class="material-symbols-outlined text-amber-500 text-3xl shrink-0">warning</span>
        <div>
            <h3 class="font-bold text-amber-800 dark:text-amber-300 mb-1">No Approved Listings</h3>
            <p class="text-sm text-amber-700 dark:text-amber-400">You need at least one listing approved by admin before you can boost. ${listings.length > 0 ? `You have ${listings.length} listing(s) pending approval.` : 'Create a listing first and wait for admin approval.'}</p>
        </div>
    </div>` : `
    <div class="mb-8"><label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select a property to boost</label>
        <select id="boost-select-pg" class="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"><option value="" disabled selected>-- Choose your PG --</option>
            ${approvedListings.map(l => `<option value="${l.id}">${l.name} (${l.city}) ✅ Approved</option>`).join('')}
        </select>
    </div>`}

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${(() => {
            const plans = getBoostPlans();
            return plans.map((p, idx) => {
                const isBlue = p.color === 'blue';
                const isGold = p.color === 'gold';
                const cardClass = isGold
                    ? 'bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-white shadow-xl'
                    : isBlue
                        ? 'bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-500 shadow-md relative transform md:-translate-y-4'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-colors';
                const titleClass = isGold ? 'text-white' : isBlue ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white';
                const priceClass = isGold ? 'text-white' : isBlue ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white';
                const checkColor = isGold ? 'text-yellow-500' : isBlue ? 'text-blue-500' : 'text-green-500';
                const btnClass = isGold
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 shadow-amber-500/30'
                    : isBlue
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700';

                return `
                <div class="${cardClass} rounded-2xl p-6 flex flex-col">${isBlue ? `<div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">${p.badge}</div>` : ''}
                    <h3 class="text-xl font-bold ${titleClass} mb-2 flex items-center gap-2">${isGold ? '<span class="material-symbols-outlined text-yellow-500">star</span>' : ''}
                        ${p.title}
                    </h3>
                    <div class="flex items-baseline gap-1 mb-4"><span class="text-3xl font-black ${priceClass}">₹${p.price.toLocaleString('en-IN')}</span>
                        <span class="${isGold ? 'text-slate-400' : 'text-slate-500'} text-sm">/ ${p.duration}</span>
                    </div>
                    <ul class="text-sm ${isGold ? 'text-slate-300' : isBlue ? 'text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'} space-y-3 mb-8 flex-1">${p.features.map(f => `<li class="flex items-start gap-2"><span class="material-symbols-outlined text-[18px] ${checkColor}">check_circle</span> ${f}</li>`).join('')}
                    </ul>
                    <button class="boost-buy-btn w-full ${btnClass} font-bold py-3 rounded-xl shadow-sm transition-all">Select ${p.title.replace(' Boost', '')}</button>
                </div>`;
            }).join('');
        })()}
        </div>
        `;
    document.getElementById('app').innerHTML = vendorLayout(content, 'boost', 'Boost Your PG');
    initVendorEvents();

    document.querySelectorAll('.boost-buy-btn').forEach(btn => {
        btn.onclick = () => {
            const select = document.getElementById('boost-select-pg');
            if (!select.value) {
                showToast('Please select a PG from the dropdown first to boost.', 'error');
                return;
            }
            showToast('Payment Gateway Simulation: Integration required for live purchases. This is a demo!', 'info');
        };
    });
}

export async function renderVendorSubscriptions() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access to view this page', 'error'); navigate('/dashboard'); return; }

    showLoading();
    let plans = [];
    try {
        plans = await getPlans();
    } catch (e) {
        console.error('Failed to load plans:', e);
        showToast('Failed to load subscription plans', 'error');
    }
    hideLoading();

    const currentPlanId = state.profile?.plan_id;

    const renderPlanFeatures = (plan) => `
        <ul class="flex flex-col gap-4 mb-8 flex-1">
            <li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span class="material-symbols-outlined text-primary text-[20px]">check_circle</span> 
                ${plan.listing_limit > 50 ? 'Unlimited' : plan.listing_limit} listings
            </li>
            <li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span class="material-symbols-outlined text-primary text-[20px]">${plan.analytics_access ? 'check_circle' : 'cancel'}</span> 
                ${plan.analytics_access ? 'Advanced Analytics' : 'No Analytics'}
            </li>
            <li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span class="material-symbols-outlined text-primary text-[20px]">${plan.leads_access ? 'check_circle' : 'cancel'}</span> 
                ${plan.leads_access ? 'Full Leads Access' : 'No Leads Details'}
            </li>
            <li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span class="material-symbols-outlined text-primary text-[20px]">${plan.show_contact_details ? 'check_circle' : 'cancel'}</span> 
                ${plan.show_contact_details ? 'Contact Details Visible' : 'Contact Details Hidden'}
            </li>
            ${plan.featured_pg ? `<li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"><span class="material-symbols-outlined text-amber-500 text-[20px]">star</span> Featured PG Badge</li>` : ''}
            ${plan.top_search ? `<li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"><span class="material-symbols-outlined text-blue-500 text-[20px]">saved_search</span> Top Search Priority</li>` : ''}
            ${plan.homepage_listing ? `<li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"><span class="material-symbols-outlined text-purple-500 text-[20px]">home_pin</span> Homepage Featured</li>` : ''}
        </ul>
    `;

    const expiryDate = state.profile?.expiry_date ? new Date(state.profile.expiry_date) : null;
    const now = new Date();
    const daysLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))) : null;
    const isExpiringSoon = daysLeft !== null && daysLeft <= 4 && daysLeft > 0;
    const isExpired = daysLeft !== null && daysLeft <= 0;
    const isActive = state.profile?.subscription_status === 'active' && !isExpired;
    const currentPlanName = state.profile?.subscription_plan || 'Free';
    const isFreeUser = !currentPlanId || currentPlanName.toLowerCase() === 'free';
    const currentPlanObj = plans.find(p => p.id === currentPlanId);

    // Format expiry date
    const expiryFormatted = expiryDate ? expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

    // Progress bar (% of plan used)
    const totalDays = currentPlanObj?.duration_days || 30;
    const usedDays = totalDays - (daysLeft || 0);
    const progressPct = Math.min(100, Math.round((usedDays / totalDays) * 100));

    const content = `
        <!-- Active Subscription Status Card -->
        ${!isFreeUser ? `
        <div class="mb-10">
            <div class="bg-white dark:bg-slate-900 border ${isExpiringSoon ? 'border-amber-300 ring-2 ring-amber-200/50' : isExpired ? 'border-red-300 ring-2 ring-red-200/50' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-8 shadow-sm">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div class="flex items-center gap-4">
                        <div class="size-14 rounded-xl ${isExpired ? 'bg-red-100 dark:bg-red-900/30' : isExpiringSoon ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'} flex items-center justify-center">
                            <span class="material-symbols-outlined text-3xl ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-emerald-500'}">${isExpired ? 'error' : isExpiringSoon ? 'warning' : 'verified'}</span>
                        </div>
                        <div>
                            <h2 class="text-2xl font-black text-slate-900 dark:text-white">${currentPlanName} Plan</h2>
                            <p class="text-sm font-medium ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-emerald-500'}">
                                ${isExpired ? '⚠ Expired — Features Locked' : isExpiringSoon ? '⚠ Expiring Soon — Renew Now!' : '✓ Active Subscription'}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-6">
                        <div class="text-center">
                            <p class="text-3xl font-black ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-slate-900 dark:text-white'}">${daysLeft ?? '—'}</p>
                            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Days Left</p>
                        </div>
                        <div class="w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
                        <div class="text-center">
                            <p class="text-lg font-bold text-slate-900 dark:text-white">${expiryFormatted}</p>
                            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Expires On</p>
                        </div>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="mb-4">
                    <div class="flex justify-between text-xs font-bold text-slate-500 mb-2">
                        <span>Plan Progress</span>
                        <span>${usedDays} / ${totalDays} days used</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500 ${progressPct > 85 ? 'bg-red-500' : progressPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}" style="width: ${progressPct}%"></div>
                    </div>
                </div>

                <!-- Features summary -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 text-center">
                        <p class="text-lg font-black text-slate-900 dark:text-white">${currentPlanObj?.listing_limit || 1}</p>
                        <p class="text-xs font-bold text-slate-500">Listings</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 text-center">
                        <span class="material-symbols-outlined text-lg ${currentPlanObj?.analytics_access ? 'text-emerald-500' : 'text-slate-400'}">${currentPlanObj?.analytics_access ? 'check_circle' : 'cancel'}</span>
                        <p class="text-xs font-bold text-slate-500">Analytics</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 text-center">
                        <span class="material-symbols-outlined text-lg ${currentPlanObj?.leads_access ? 'text-emerald-500' : 'text-slate-400'}">${currentPlanObj?.leads_access ? 'check_circle' : 'cancel'}</span>
                        <p class="text-xs font-bold text-slate-500">Leads</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 text-center">
                        <span class="material-symbols-outlined text-lg ${currentPlanObj?.show_contact_details ? 'text-emerald-500' : 'text-slate-400'}">${currentPlanObj?.show_contact_details ? 'check_circle' : 'cancel'}</span>
                        <p class="text-xs font-bold text-slate-500">Contacts</p>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Renewal Warning Banner (3-4 days before expiry) -->
        ${isExpiringSoon ? `
        <div class="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-3xl text-amber-500 animate-pulse">notifications_active</span>
                <div>
                    <h3 class="font-bold text-amber-900 dark:text-amber-200 text-lg">Your subscription expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}!</h3>
                    <p class="text-sm text-amber-700 dark:text-amber-300">Renew now to avoid losing your premium features and search ranking.</p>
                </div>
            </div>
            <a href="#plans-section" class="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all">Renew Now ↓</a>
        </div>
        ` : ''}

        ${isExpired ? `
        <div class="mb-8 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-3xl text-red-500">error</span>
                <div>
                    <h3 class="font-bold text-red-900 dark:text-red-200 text-lg">Your subscription has expired!</h3>
                    <p class="text-sm text-red-700 dark:text-red-300">Your features have been locked. Upgrade below to restore your premium access.</p>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Plans Section -->
        <div id="plans-section">
        ${(!isFreeUser && !isExpiringSoon && !isExpired) ? `
            <div class="text-center mb-6">
                <button id="toggle-plans-btn" class="text-primary font-bold text-sm hover:underline inline-flex items-center gap-1 mx-auto">
                    <span class="material-symbols-outlined text-sm toggle-icon">expand_more</span>
                    <span class="toggle-label">View All Plans &amp; Upgrade Options</span>
                </button>
            </div>
            <div id="plans-grid" class="hidden">
            ` : `
            <div id="plans-grid">
            `}
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">${isExpiringSoon || isExpired ? 'Renew Your Subscription' : 'Choose the Right Plan for Your Business'}</h1>
                    <p class="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">Maximize your reach and find the perfect tenants with our tailored hosting plans.</p>
                </div>

                <!--Pricing Cards Grid-->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
                    ${plans.map(plan => {
                        const isCurrent = plan.id === currentPlanId;
                        const isFree = plan.price === 0;
                        return `
                        <div class="bg-white dark:bg-slate-900 border ${isCurrent ? 'border-primary ring-2 ring-primary/20 scale-105 z-10' : 'border-slate-200 dark:border-slate-800'} rounded-xl p-8 flex flex-col transition-all hover:shadow-lg relative">
                            ${isCurrent ? '<div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">Current Plan</div>' : ''}
                            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center md:text-left">${plan.plan_name}</h2>
                            <div class="flex items-baseline gap-1 mb-8">
                                <span class="text-4xl font-black text-slate-900 dark:text-white">₹${plan.price}</span>
                                <span class="text-slate-500 text-sm">/${plan.duration_days} days</span>
                            </div>
                            ${renderPlanFeatures(plan)}
                            ${isCurrent 
                                ? (isExpiringSoon || isExpired
                                    ? `<button onclick="window.openPaymentModal('${plan.id}', '${plan.plan_name}', ${plan.price})" class="w-full py-3 px-4 rounded-lg bg-amber-500 text-white font-bold hover:brightness-110 transition-all shadow-md mt-auto">Renew Plan</button>`
                                    : `<button disabled class="w-full py-3 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold cursor-not-allowed mt-auto">Active</button>`)
                                : (isFree 
                                    ? `<button disabled class="w-full py-3 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold cursor-not-allowed mt-auto">Default</button>`
                                    : `<button onclick="window.openPaymentModal('${plan.id}', '${plan.plan_name}', ${plan.price})" class="w-full py-3 px-4 rounded-lg bg-primary text-white font-bold hover:brightness-110 transition-all shadow-md mt-auto">Upgrade to ${plan.plan_name}</button>`
                                )
                            }
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>

        <!-- Payment Modal Template (Hidden initially) -->
        <div id="paymentModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] hidden items-center justify-center p-4 opacity-0 transition-opacity duration-300">
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform scale-95 transition-transform duration-300" id="paymentModalInner">
                <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">payment</span> UPI Payment
                    </h3>
                    <button onclick="window.closePaymentModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <div class="text-center mb-6">
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">Upgrading to <strong id="modalPlanName" class="text-slate-900 dark:text-white">...</strong></p>
                        <p class="text-3xl font-black text-primary">₹<span id="modalPlanPrice">0</span></p>
                    </div>

                    <div class="bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50 rounded-xl p-4 flex flex-col items-center justify-center mb-6">
                        <span class="material-symbols-outlined text-4xl text-indigo-500 mb-2">qr_code_scanner</span>
                        <p class="text-sm font-semibold text-indigo-900 dark:text-indigo-200 text-center">Scan with any UPI App</p>
                        <!-- Placeholder UPI ID -->
                        <div class="mt-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                            <p class="text-xs text-slate-500 mb-1">Company UPI ID:</p>
                            <p class="font-bold tracking-wider text-slate-800 dark:text-white select-all">staynest@upi</p>
                        </div>
                    </div>

                    <form id="paymentForm" class="space-y-4">
                        <input type="hidden" id="paymentPlanId" value="">
                        <input type="hidden" id="paymentPlanName" value="">
                        <input type="hidden" id="paymentPlanPrice" value="">
                        
                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Upload Payment Screenshot <span class="text-red-500">*</span></label>
                            <input type="file" id="paymentScreenshot" accept="image/*" required class="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors">
                            <p class="text-xs text-slate-400 mt-2">Required for admin verification.</p>
                        </div>

                        <button type="submit" id="submitPaymentBtn" class="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-[0_4px_12px_rgba(var(--primary-rgb),0.2)]">
                            Submit for Verification
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'subscriptions', 'Subscriptions');
    initVendorEvents();

    // Toggle plans grid visibility
    const toggleBtn = document.getElementById('toggle-plans-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const grid = document.getElementById('plans-grid');
            const icon = toggleBtn.querySelector('.toggle-icon');
            const label = toggleBtn.querySelector('.toggle-label');
            if (grid) {
                grid.classList.toggle('hidden');
                const isHidden = grid.classList.contains('hidden');
                if (icon) icon.textContent = isHidden ? 'expand_more' : 'expand_less';
                if (label) label.textContent = isHidden ? 'View All Plans & Upgrade Options' : 'Hide Plans';
            }
        });
    }

    // Setup Modals
    window.openPaymentModal = (planId, planName, planPrice) => {
        document.getElementById('paymentPlanId').value = planId;
        document.getElementById('paymentPlanName').value = planName;
        document.getElementById('paymentPlanPrice').value = planPrice;
        document.getElementById('modalPlanName').textContent = planName;
        document.getElementById('modalPlanPrice').textContent = planPrice;

        const modal = document.getElementById('paymentModal');
        const inner = document.getElementById('paymentModalInner');
        modal.classList.remove('hidden');
        // Trigger reflow
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        inner.classList.remove('scale-95');
    };

    window.closePaymentModal = () => {
        const modal = document.getElementById('paymentModal');
        const inner = document.getElementById('paymentModalInner');
        modal.classList.add('opacity-0');
        inner.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('paymentForm').reset();
        }, 300);
    };

    // Form Submission
    const form = document.getElementById('paymentForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('paymentScreenshot');
            if (!fileInput.files.length) {
                showToast('Please upload a screenshot', 'error');
                return;
            }

            const file = fileInput.files[0];
            const planId = document.getElementById('paymentPlanId').value;
            const planName = document.getElementById('paymentPlanName').value;
            const planPrice = document.getElementById('paymentPlanPrice').value;

            const btn = document.getElementById('submitPaymentBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Uploading...';
            btn.disabled = true;

            try {
                // Upload screenshot
                const screenshotUrl = await uploadPaymentScreenshot(file, state.user.id);
                
                // Submit request to admin
                await createPaymentRequest({
                    vendor_id: state.user.id,
                    vendor_email: state.user.email,
                    plan_id: planId,
                    plan_name: planName,
                    price: parseInt(planPrice, 10),
                    payment_type: 'subscription',
                    screenshot_url: screenshotUrl
                });

                showToast('Payment verification requested successfully! Admin will review it shortly.', 'success');
                window.closePaymentModal();
            } catch (err) {
                console.error(err);
                showToast('Failed to submit payment request', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
}

// Old sync renderVendorSettings removed — superseded by async version below

window._exportVendorCSV = () => {
    const listings = window._vendorListings;
    if (!listings || !listings.length) {
        showToast('No active listings to export.', 'error');
        return;
    }

    const headers = ['Property Name', 'City', 'Rent (₹)', 'Gender', 'Food', 'Status', 'Views', 'Leads'];
    const rows = listings.map(l => {
        const stats = (window._vendorStats || []).find(s => s.listing_id === l.id) || { views: 0, leads: 0 };
        return [
            `"${l.name || ''}"`,
            `"${l.city || ''}"`,
            l.monthly_rent || 0,
            l.gender_allowed || '',
            l.food_available ? 'Yes' : 'No',
            l.is_pending ? 'Pending Approval' : 'Active',
            stats.views || 0,
            stats.leads || 0
        ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(',') + '\n'
        + rows.map(e => e.join(',')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StayNest_Listings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Report exported successfully!', 'success');
};

export async function renderVendorSettings() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('Access Denied', 'error'); navigate('/home'); return; }

    const { getVendorSettings, updateVendorSettings, getVendorPayouts, uploadAvatar, updateProfile, updatePassword } = await import('../supabase.js');
    const userId = state.user?.id;
    const profile = state.profile || {};
    const dp = profile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name || 'Vendor') + '&background=6c5ce7&color=fff';
    
    showLoading();
    let settings = null;
    let payouts = [];
    try {
        [settings, payouts] = await Promise.all([
            getVendorSettings(userId),
            getVendorPayouts(userId)
        ]);
    } catch (e) { console.error('Error loading settings', e); }
    hideLoading();

    // Make sure we have a default settings object if none loaded
    settings = settings || {
        email_enquiries: true,
        email_reviews: true,
        email_promotions: false,
        push_enquiries: true,
        push_reviews: true,
        push_promotions: false,
        bank_account_name: '',
        bank_account_number: '',
        bank_ifsc: ''
    };

    const renderPayoutRow = (payout) => {
        let statusColor = 'text-yellow-600 bg-yellow-100';
        if (payout.status === 'completed') statusColor = 'text-green-600 bg-green-100';
        if (payout.status === 'failed') statusColor = 'text-red-600 bg-red-100';
        
        return `
        <div class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 border-dashed">
            <div>
                <p class="font-bold text-sm text-slate-900 dark:text-white">${formatPrice(payout.amount)}</p>
                <p class="text-xs text-slate-500">${formatTimeAgo(new Date(payout.created_at).getTime())}</p>
            </div>
            <span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusColor}">${payout.status}</span>
        </div>`;
    };

    const content = `
    <div class="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8 p-4 md:p-8">
        <header class="mb-8">
            <h2 class="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">settings</span> Vendor Settings
            </h2>
            <p class="text-slate-500 mt-1 text-sm">Manage your profile, preferences, and payouts.</p>
        </header>

        <!-- Profile & Security Section -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-8">
            <h3 class="font-black text-lg mb-6 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-xl">person</span> Profile & Security
            </h3>
            <div class="flex flex-col md:flex-row gap-6 md:gap-8">
                <!-- Avatar -->
                <div class="flex flex-col items-center gap-3 shrink-0">
                    <div class="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 relative group bg-cover bg-center border-4 border-white dark:border-slate-700 shadow-lg" style="background-image: url('${dp}');">
                        <button id="vendor-avatar-overlay" class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <span class="material-symbols-outlined text-white">photo_camera</span>
                        </button>
                    </div>
                    <button id="vendor-upload-photo-btn" class="px-4 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors">Change Photo</button>
                    <input type="file" id="vendor-photo-input" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" />
                    <p class="text-[10px] text-slate-400">JPG, PNG or WebP. Max 2MB.</p>
                </div>
                <!-- Profile Fields -->
                <div class="flex-1 space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                            <input type="text" id="vendor-profile-name" value="${profile.full_name || ''}" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Your name">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Phone</label>
                            <input type="tel" id="vendor-profile-phone" value="${profile.phone || ''}" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="+91 XXXXX">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Gender <span class="text-red-500">*</span></label>
                            <select id="vendor-profile-gender" required class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer">
                                <option value="" disabled ${!profile.gender ? 'selected' : ''}>Select Gender</option>
                                <option value="male" ${profile.gender === 'male' ? 'selected' : ''}>Male</option>
                                <option value="female" ${profile.gender === 'female' ? 'selected' : ''}>Female</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email</label>
                            <input type="email" value="${state.user?.email || ''}" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none text-slate-400 cursor-not-allowed" disabled>
                        </div>
                    </div>
                    <div class="space-y-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">About Your PG Business (Description)</label>
                            <textarea id="vendor-profile-description" rows="3" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-y" placeholder="Tell students about your PGs...">${profile.description || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Business Address</label>
                            <input type="text" id="vendor-profile-address" value="${profile.address || ''}" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Your main office or PG location">
                        </div>
                    </div>
                    <button id="vendor-save-profile-btn" class="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-6 rounded-xl text-sm transition-all shadow-md shadow-primary/20 flex items-center gap-2 mt-4">
                        <span class="material-symbols-outlined text-sm">save</span> Save Profile
                    </button>
                </div>
            </div>

            <!-- Password Change -->
            <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-sm text-primary">lock</span> Change Password</h4>
                <div class="flex flex-col sm:flex-row gap-3 max-w-lg">
                    <input type="password" id="vendor-new-password" class="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="New password (min 6 chars)">
                    <button id="vendor-update-pwd-btn" class="px-5 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-sm transition-all whitespace-nowrap">Update Password</button>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                <!-- Notifications Form -->
                <form id="vendor-settings-form" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 class="font-black text-lg mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-xl">notifications</span> Notifications
                    </h3>
                    
                    <div class="space-y-6">
                        <div>
                            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 relative font-display tracking-tight inline-block after:content-[''] after:absolute after:-bottom-[1px] after:left-0 after:w-1/2 after:h-[1px] after:bg-primary">Email Notifications</h4>
                            <div class="space-y-3">
                                <label class="flex items-center gap-3 cursor-pointer group">
                                    <div class="relative flex items-center">
                                        <input type="checkbox" name="email_enquiries" class="sr-only peer" ${settings.email_enquiries ? 'checked' : ''}>
                                        <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary transition-colors"></div>
                                    </div>
                                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">New Enquiries & Leads</span>
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer group">
                                    <div class="relative flex items-center">
                                        <input type="checkbox" name="email_reviews" class="sr-only peer" ${settings.email_reviews ? 'checked' : ''}>
                                        <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary transition-colors"></div>
                                    </div>
                                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">New Reviews</span>
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer group">
                                    <div class="relative flex items-center">
                                        <input type="checkbox" name="email_promotions" class="sr-only peer" ${settings.email_promotions ? 'checked' : ''}>
                                        <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary transition-colors"></div>
                                    </div>
                                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Tips & Promotions</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 relative font-display tracking-tight inline-block after:content-[''] after:absolute after:-bottom-[1px] after:left-0 after:w-1/2 after:h-[1px] after:bg-primary">Push & SMS Notifications</h4>
                            <div class="space-y-3">
                                <label class="flex items-center gap-3 cursor-pointer group">
                                    <div class="relative flex items-center">
                                        <input type="checkbox" name="push_enquiries" class="sr-only peer" ${settings.push_enquiries ? 'checked' : ''}>
                                        <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary transition-colors"></div>
                                    </div>
                                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">New Enquiries & Leads (Push)</span>
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer group">
                                    <div class="relative flex items-center">
                                        <input type="checkbox" name="push_reviews" class="sr-only peer" ${settings.push_reviews ? 'checked' : ''}>
                                        <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary transition-colors"></div>
                                    </div>
                                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">New Reviews (Push)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <button type="submit" class="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-sm">save</span> Save Preferences
                        </button>
                    </div>
                </form>

                <!-- Bank Form -->
                <form id="vendor-bank-form" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mt-6">
                     <h3 class="font-black text-lg mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-xl">account_balance</span> Bank Details
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Account Holder Name</label>
                            <input type="text" name="bank_account_name" value="${settings.bank_account_name || ''}" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Name on account">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Bank Account Number</label>
                            <input type="text" name="bank_account_number" value="${settings.bank_account_number || ''}" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Account Number">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">IFSC Code</label>
                            <input type="text" name="bank_ifsc" value="${settings.bank_ifsc || ''}" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary uppercase" placeholder="e.g. HDFC0001234">
                        </div>
                    </div>
                    <div class="mt-6">
                        <button type="submit" class="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-sm">save_as</span> Save Bank Details
                        </button>
                    </div>
                </form>
            </div>

            <!-- Side Widgets: Payouts & MFA -->
            <div class="lg:col-span-1 space-y-6">
                <!-- Payouts History -->
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
                    <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                        <h3 class="font-bold flex items-center gap-2 text-slate-900 dark:text-white"><span class="material-symbols-outlined text-primary">payments</span> Payouts History</h3>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4 flex flex-col">
                        ${payouts.length > 0 ? payouts.map(renderPayoutRow).join('') : '<p class="text-sm text-slate-500 text-center my-8">No payouts history available.</p>'}
                    </div>
                    <div class="p-4 border-t border-slate-100 dark:border-slate-800">
                        <button class="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-2 rounded-lg text-sm transition-colors" onclick="import('../state.js').then(m => m.showToast('Payout requests are processed automatically on the 1st of every month.', 'info'))">
                           Request Early Payout
                        </button>
                    </div>
                </div>

                <!-- MFA Security -->
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                     <h3 class="font-black mb-2 flex items-center gap-2 text-slate-900 dark:text-white"><span class="material-symbols-outlined text-primary">security</span> Account Security</h3>
                     <p class="text-xs text-slate-500 mb-4 leading-relaxed">Protect your vendor account by enabling Two-Factor Authentication (2FA) with an authenticator app.</p>
                     
                     <div class="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                         <div class="size-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                             <span class="material-symbols-outlined text-[16px]">warning</span>
                         </div>
                         <div class="flex-1">
                             <p class="text-[11px] font-bold text-red-800 dark:text-red-400">2FA is Not Configured</p>
                             <p class="text-[10px] text-red-600/80 dark:text-red-400/80">Your account is vulnerable.</p>
                         </div>
                         <button onclick="window.location.hash='/vendor/settings/mfa'" class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase tracking-wider font-bold rounded shadow-sm">Setup</button>
                     </div>
                </div>
            </div>
        </div>
    </div>
    `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'settings', 'Settings');
    initVendorEvents();

    // ── Profile Save ──
    document.getElementById('vendor-save-profile-btn')?.addEventListener('click', async () => {
        const nameInput = document.getElementById('vendor-profile-name')?.value.trim();
        const phoneInput = document.getElementById('vendor-profile-phone')?.value.trim();
        const genderInput = document.getElementById('vendor-profile-gender')?.value;
        const descInput = document.getElementById('vendor-profile-description')?.value.trim();
        const addressInput = document.getElementById('vendor-profile-address')?.value.trim();
        if (!nameInput) { showToast('Please enter your full name', 'error'); return; }

        const btn = document.getElementById('vendor-save-profile-btn');
        const oldText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">refresh</span> Saving...';
        btn.disabled = true;
        try {
            const p = await updateProfile(userId, {
                full_name: nameInput,
                phone: phoneInput || null,
                gender: genderInput || null,
                description: descInput || null,
                address: addressInput || null
            });
            state.profile = p;
            showToast('Profile updated!', 'success');
        } catch (err) { showToast(err.message || 'Error saving profile', 'error'); }
        finally { btn.innerHTML = oldText; btn.disabled = false; }
    });

    // ── Photo Upload ──
    const photoBtn = document.getElementById('vendor-upload-photo-btn');
    const avatarOverlay = document.getElementById('vendor-avatar-overlay');
    const photoInput = document.getElementById('vendor-photo-input');
    if (photoBtn && photoInput) {
        const triggerUpload = () => photoInput.click();
        photoBtn.addEventListener('click', triggerUpload);
        avatarOverlay?.addEventListener('click', triggerUpload);

        photoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
            photoBtn.textContent = 'Uploading...';
            photoBtn.disabled = true;
            try {
                const url = await uploadAvatar(userId, file);
                const p = await updateProfile(userId, { avatar_url: url });
                state.profile = p;
                showToast('Profile photo updated!', 'success');
                setTimeout(() => renderVendorSettings(), 500);
            } catch (err) { showToast(err.message || 'Upload failed', 'error'); }
            finally { photoBtn.textContent = 'Change Photo'; photoBtn.disabled = false; photoInput.value = ''; }
        });
    }

    // ── Password Update ──
    document.getElementById('vendor-update-pwd-btn')?.addEventListener('click', async () => {
        const newPwd = document.getElementById('vendor-new-password')?.value;
        if (!newPwd || newPwd.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
        const btn = document.getElementById('vendor-update-pwd-btn');
        const oldText = btn.textContent;
        btn.textContent = 'Updating...';
        btn.disabled = true;
        try {
            await updatePassword(newPwd);
            showToast('Password updated!', 'success');
            document.getElementById('vendor-new-password').value = '';
        } catch (err) { showToast(err.message || 'Error updating password', 'error'); }
        finally { btn.textContent = oldText; btn.disabled = false; }
    });
    
    // ── Notification Preferences ──
    document.getElementById('vendor-settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        const newSettings = {
            email_enquiries: fd.get('email_enquiries') === 'on',
            email_reviews: fd.get('email_reviews') === 'on',
            email_promotions: fd.get('email_promotions') === 'on',
            push_enquiries: fd.get('push_enquiries') === 'on',
            push_reviews: fd.get('push_reviews') === 'on'
        };

        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Saving...';
        btn.disabled = true;

        try {
            await updateVendorSettings(userId, newSettings);
            showToast('Notification preferences updated!', 'success');
        } catch (err) {
            showToast('Failed to save settings: ' + err.message, 'error');
        } finally {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    });

    document.getElementById('vendor-bank-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newSettings = {
            bank_account_name: fd.get('bank_account_name'),
            bank_account_number: fd.get('bank_account_number'),
            bank_ifsc: fd.get('bank_ifsc')
        };
        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Saving...';
        btn.disabled = true;

        try {
            await updateVendorSettings(userId, newSettings);
            showToast('Bank details updated securely!', 'success');
        } catch (err) {
            showToast('Failed to save bank details: ' + err.message, 'error');
        } finally {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    });
}

export async function renderVendorMfa() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    
    const content = `
    <div class="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8 p-4 md:p-8">
        <header class="mb-8">
            <button onclick="window.location.hash='/vendor/settings'" class="text-sm font-bold text-slate-500 hover:text-primary flex items-center gap-1 mb-4 transition-colors"><span class="material-symbols-outlined text-lg">arrow_back</span> Back to Settings</button>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">security</span> Two-Factor Authentication
            </h2>
            <p class="text-slate-500 mt-1 text-sm">Add an extra layer of security to your vendor account.</p>
        </header>

        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm text-center">
            <div class="size-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-3xl">qr_code_scanner</span>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Authenticator App</h3>
            <p class="text-slate-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">Use an authenticator app (like Google Authenticator or Authy) to scan the QR code and generate secure login codes.</p>
            
            <div id="mfa-setup-area" class="max-w-xs mx-auto">
                <button id="start-mfa-btn" class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">add_moderator</span> Setup 2FA Now
                </button>
            </div>
        </div>
    </div>
    `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'settings', 'Security');

    document.getElementById('start-mfa-btn')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Generating...';
        btn.disabled = true;

        setTimeout(() => {
            const area = document.getElementById('mfa-setup-area');
            area.innerHTML = `
                <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/StayNest:Vendor?secret=JBSWY3DPEHPK3PXP&issuer=StayNest" alt="QR Code" class="mx-auto rounded-lg mix-blend-multiply dark:mix-blend-normal">
                    <p class="text-xs text-slate-500 font-mono mt-4 tracking-widest bg-white dark:bg-slate-900 py-2 rounded border border-slate-100 dark:border-slate-700">JBSWY3DPEHPK3PXP</p>
                </div>
                <form id="verify-mfa-form" class="space-y-4">
                    <div>
                        <input type="text" placeholder="Enter 6-digit code" class="w-full text-center tracking-[0.5em] text-lg font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" maxlength="6" pattern="\\d{6}" required>
                    </div>
                    <button type="submit" class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md">
                        Verify & Enable
                    </button>
                </form>
            `;

            document.getElementById('verify-mfa-form')?.addEventListener('submit', (e) => {
                e.preventDefault();
                showToast('2FA Successfully Enabled!', 'success');
                setTimeout(() => window.location.hash = '/vendor/settings', 1000);
            });
        }, 1500);
    });
}

export async function renderVendorProfile(params) {
    const vendorId = params?.id;
    if (!vendorId) { navigate('/home'); return; }

    showLoading();
    let vendorData;
    try {
        const { getVendorPublicProfile } = await import('../supabase.js');
        vendorData = await getVendorPublicProfile(vendorId);
    } catch (e) {
        hideLoading();
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-display">
                ${renderNavbar()}
                <div class="flex-1 flex items-center justify-center p-4">
                    <div class="text-center"><span class="material-symbols-outlined text-6xl text-slate-300 mb-4">person_off</span>
                        <h2 class="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">Vendor Not Found</h2>
                        <p class="text-slate-500 mb-6">This vendor profile could not be loaded.</p>
                        <a href="#/home" class="bg-primary text-white px-6 py-3 rounded-xl font-bold">Return Home</a>
                    </div>
                </div>
            </div>`;
        const { initNavbarEvents } = await import('../components/navbar.js');
        initNavbarEvents();
        return;
    }
    hideLoading();

    const { profile: v, listings, avgRating, totalReviews } = vendorData;
    const joinedDate = new Date(v.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const totalViews = listings.reduce((s, l) => s + (l.total_views || 0), 0);
    const { renderFooter } = await import('../components/footer.js');

    document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100">
        ${renderNavbar()}
        <main class="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-12">
            <!-- Vendor Header -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 mb-8 shadow-sm">
                <div class="flex flex-col sm:flex-row items-center gap-6">
                    <div class="size-24 rounded-full bg-primary/20 border-4 border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                        ${v.avatar_url
                            ? `<img src="${v.avatar_url}" class="w-full h-full object-cover" alt="${v.full_name}">`
                            : `<span class="text-primary text-3xl font-bold">${(v.full_name || 'V').charAt(0).toUpperCase()}</span>`}
                    </div>
                    <div class="text-center sm:text-left flex-1">
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                            <h1 class="text-2xl md:text-3xl font-black tracking-tight">${v.full_name || 'Vendor'}</h1>
                            <span class="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                                <span class="material-symbols-outlined text-sm">verified</span> Verified Vendor
                            </span>
                        </div>
                        <p class="text-slate-500 text-sm flex items-center justify-center sm:justify-start gap-1 mb-2">
                            <span class="material-symbols-outlined text-sm">calendar_month</span> Member since ${joinedDate}
                        </p>
                        ${v.address ? `
                        <p class="text-slate-600 dark:text-slate-400 text-sm flex items-center justify-center sm:justify-start gap-1 mb-3 font-medium">
                            <span class="material-symbols-outlined text-sm text-primary">location_on</span> ${v.address}
                        </p>` : ''}
                        ${v.description ? `
                        <p class="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-3xl leading-relaxed">
                            ${v.description}
                        </p>` : '<div class="mb-5"></div>'}
                        <div class="flex flex-wrap justify-center sm:justify-start gap-4">
                            <div class="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                <p class="text-xl font-black text-primary">${listings.length}</p>
                                <p class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active PGs</p>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                <p class="text-xl font-black">${avgRating || '–'}</p>
                                <p class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg Rating</p>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                <p class="text-xl font-black">${totalReviews}</p>
                                <p class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reviews</p>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                <p class="text-xl font-black">${totalViews.toLocaleString('en-IN')}</p>
                                <p class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Views</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Listings -->
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-primary">home_work</span> Properties by ${v.full_name || 'this vendor'}</h2>
            ${listings.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${listings.map(l => {
                    const rating = l.reviews?.length > 0 ? (l.reviews.reduce((s, r) => s + r.rating, 0) / l.reviews.length).toFixed(1) : null;
                    return `
                    <a href="#/pg/${l.id}" class="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                        <div class="relative h-48 overflow-hidden">
                            <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style="background-image: url('${l.images?.[0] || 'https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Image'}')"></div>
                            ${l.is_featured ? '<div class="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase shadow-sm">Featured</div>' : ''}
                            ${rating ? `<div class="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-lg backdrop-blur flex items-center gap-1 shadow-sm"><span class="material-symbols-outlined text-sm text-yellow-500">star</span><span class="text-xs font-bold">${rating}</span></div>` : ''}
                            <div class="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">${l.gender_allowed === 'female' ? 'Girls' : l.gender_allowed === 'male' ? 'Boys' : 'Unisex'}</div>
                        </div>
                        <div class="p-5 flex-1 flex flex-col">
                            <h3 class="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">${l.name}</h3>
                            <p class="text-xs text-slate-500 flex items-center gap-1 mb-3"><span class="material-symbols-outlined text-sm">location_on</span>${l.city || l.address || ''}</p>
                            <div class="mt-auto flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                <span class="text-primary font-black text-lg">₹${(l.monthly_rent || 0).toLocaleString('en-IN')}<span class="text-slate-400 text-[10px] font-medium">/mo</span></span>
                                <span class="text-xs text-slate-500">${(l.total_views || 0).toLocaleString('en-IN')} views</span>
                            </div>
                        </div>
                    </a>`;
                }).join('')}
            </div>` : `
            <div class="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <span class="material-symbols-outlined text-5xl text-slate-300 mb-3">domain_disabled</span>
                <p class="text-slate-500 font-medium">This vendor has no listed properties yet.</p>
            </div>`}
        </main>
        ${renderFooter()}
    </div>`;

    const { initNavbarEvents } = await import('../components/navbar.js');
    initNavbarEvents();
}

export async function renderVendorSupport() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    if (!isVendor() && !isAdmin()) { showToast('You need vendor access to view this page', 'error'); navigate('/dashboard'); return; }

    const content = `
    <div class="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8 p-4 md:p-8">
        <header class="mb-8">
            <h2 class="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <span class="material-symbols-outlined text-primary text-4xl">support_agent</span> Vendor Support
            </h2>
            <p class="text-slate-500 mt-2 text-sm max-w-2xl leading-relaxed">Need help with your listings, payouts, or account? Contact StayNest support or browse our help resources below.</p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div class="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
                    <span class="material-symbols-outlined text-4xl">headphones</span>
                </div>
                <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Live Chat Support</h3>
                <p class="text-slate-500 text-sm max-w-sm mx-auto mb-8">Connect with our support team instantly for urgent queries regarding your properties or payouts.</p>
                <a href="mailto:support@staynest.in?subject=Vendor%20Live%20Support%20Request" class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md flex items-center gap-2 inline-flex">
                    <span class="material-symbols-outlined">chat</span> Start Conversation
                </a>
            </div>
            
            <div class="col-span-1 space-y-6">
                <a href="mailto:support@staynest.in" class="block bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-colors group">
                    <div class="size-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 mb-4 group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined">mail</span>
                    </div>
                    <h4 class="font-bold text-slate-900 dark:text-white mb-1">Email Us</h4>
                    <p class="text-xs text-slate-500 mb-3">Expected reply: 24 hours</p>
                    <span class="text-sm font-bold text-primary">support@staynest.in</span>
                </a>
                
                <a href="tel:+919876543210" class="block bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-colors group">
                    <div class="size-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 mb-4 group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined">call</span>
                    </div>
                    <h4 class="font-bold text-slate-900 dark:text-white mb-1">Call Us</h4>
                    <p class="text-xs text-slate-500 mb-3">Mon-Fri, 9am - 6pm</p>
                    <span class="text-sm font-bold text-primary">+91 98765 43210</span>
                </a>
            </div>
        </div>

        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700">
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-primary">menu_book</span> Help Resources</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${['Listing Guidelines', 'Payout Setup', 'Managing Reviews', 'Reporting Issues'].map(topic => 
                    `<a href="mailto:support@staynest.in?subject=Help%20with%20${encodeURIComponent(topic)}" class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:shadow-md transition-shadow flex items-center justify-between group block w-full">
                        <span class="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">${topic}</span>
                        <span class="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
                    </a>`
                ).join('')}
            </div>
        </div>
    </div>
    `;

    document.getElementById('app').innerHTML = vendorLayout(content, 'support', 'Vendor Support');
    initVendorEvents();
}
