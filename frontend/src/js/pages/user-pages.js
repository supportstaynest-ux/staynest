import { state, isLoggedIn, formatPrice, avgRating, renderStars, getAmenityIcon, showToast, showLoading, hideLoading, removeFromCompare } from '../state.js';
import { navigate } from '../router.js';
import { getSavedListings, unsaveListing, getRecentlyViewed, getEnquiries, getUserVisitRequests } from '../supabase.js';
import { renderDashboardLayout, initDashboardEvents, renderHorizontalCard } from './dashboard.js';
import { renderPGCard, bindPGCardEvents } from './home.js';

// ══════════════════════════════════════════════════════════════════
// #1 — Saved PGs (FIXED: Now fetches real saved listings)
// ══════════════════════════════════════════════════════════════════
export async function renderSavedPGs() {
    if (!isLoggedIn()) { navigate('/auth'); return; }

    showLoading();
    let savedPGs = [];
    try {
        savedPGs = await getSavedListings(state.user.id);
    } catch (e) { console.error('Error fetching saved listings:', e); }
    hideLoading();

    const content = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-black text-slate-900 dark:text-white">Saved Properties</h1>
                <div class="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                    ${savedPGs.length} Saved
                </div>
            </div>

            <div id="saved-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${savedPGs.length ? savedPGs.map(item => {
                    const pg = item.listings || item;
                    return `
                    <div class="relative group">
                        ${renderPGCard(pg)}
                        <button onclick="window._unsavePG('${pg.id}')" class="absolute top-3 right-3 z-10 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-full shadow-md text-red-500 hover:bg-red-50 hover:scale-110 transition-all" title="Remove from saved">
                            <span class="material-symbols-outlined text-xl" style="font-variation-settings:'FILL' 1">favorite</span>
                        </button>
                    </div>`;
                }).join('') : `
                <div class="col-span-full py-16 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="material-symbols-outlined text-3xl">favorite</span>
                    </div>
                    <p class="font-bold">No saved properties yet</p>
                    <p class="text-sm mt-1">Tap the heart icon on any PG to save it for later.</p>
                    <button onclick="window.location.hash='/explore'" class="mt-6 bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all">Start Exploring</button>
                </div>`}
            </div>
        </div>
    `;
    const app = document.getElementById('app');
    app.innerHTML = renderDashboardLayout(content, 'saved', 'Saved');
    initDashboardEvents();
    bindPGCardEvents();

    // Unsave handler
    window._unsavePG = async (listingId) => {
        try {
            await unsaveListing(state.user.id, listingId);
            showToast('Removed from saved', 'success');
            renderSavedPGs(); // Re-render
        } catch (e) {
            showToast(e.message || 'Failed to unsave', 'error');
        }
    };
}

// ══════════════════════════════════════════════════════════════════
// #2 — My Enquiries / Messages (FIXED: Now fetches real enquiries)
// ══════════════════════════════════════════════════════════════════
export async function renderMyEnquiries() {
    if (!isLoggedIn()) { navigate('/auth'); return; }

    showLoading();
    let enquiries = [];
    try {
        enquiries = await getEnquiries(state.user.id, false);
    } catch (e) { console.error('Error fetching enquiries:', e); }
    hideLoading();

    const content = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-black text-slate-900 dark:text-white">My Enquiries</h1>
                <div class="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                    ${enquiries.length} Total
                </div>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div id="enquiries-list" class="divide-y divide-slate-100 dark:divide-slate-800">
                    ${enquiries.length ? enquiries.map(eq => {
                        const listing = eq.listings || eq.listing || {};
                        const timeAgo = (() => {
                            const diff = Date.now() - new Date(eq.created_at).getTime();
                            if (diff < 60000) return 'Just now';
                            if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
                            if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
                            return Math.floor(diff / 86400000) + 'd ago';
                        })();
                        const statusBadge = eq.status === 'replied'
                            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-600">Replied</span>'
                            : eq.status === 'closed'
                            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500">Closed</span>'
                            : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-600">Pending</span>';

                        return `
                        <div class="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="window.location.hash='/pg/${listing.id || eq.listing_id}'">
                            <div class="flex items-start gap-4">
                                <div class="size-14 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                                    ${listing.images?.[0] ? `<img src="${listing.images[0]}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined text-slate-300">home</span></div>'}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <h4 class="font-bold text-sm text-slate-900 dark:text-white truncate">${listing.name || 'Property'}</h4>
                                        ${statusBadge}
                                    </div>
                                    <p class="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[12px]">location_on</span> ${listing.city || 'Unknown'}
                                    </p>
                                    ${eq.message ? `<p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">"${eq.message}"</p>` : ''}
                                </div>
                                <div class="text-right shrink-0">
                                    <span class="text-[10px] text-slate-400 font-bold">${timeAgo}</span>
                                    ${listing.monthly_rent ? `<p class="text-primary font-bold text-sm mt-1">${formatPrice(listing.monthly_rent)}</p>` : ''}
                                </div>
                            </div>
                        </div>`;
                    }).join('') : `
                    <div class="p-8 text-center text-slate-500">
                        <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="material-symbols-outlined text-3xl">chat_bubble</span>
                        </div>
                        <p class="font-bold">No enquiries yet</p>
                        <p class="text-sm mt-1">Send an enquiry on any PG listing to see it here.</p>
                        <button onclick="window.location.hash='/explore'" class="mt-6 bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all">Explore PGs</button>
                    </div>`}
                </div>
            </div>
        </div>
    `;
    const app = document.getElementById('app');
    app.innerHTML = renderDashboardLayout(content, 'enquiries', 'Enquiries');
    initDashboardEvents();
}

// ══════════════════════════════════════════════════════════════════
// #3 — My Visits (FIXED: Now fetches real visit requests)
// ══════════════════════════════════════════════════════════════════
export async function renderMyVisits() {
    if (!isLoggedIn()) { navigate('/auth'); return; }

    showLoading();
    let visits = [];
    try {
        visits = await getUserVisitRequests(state.user.id);
    } catch (e) { console.error('Error fetching visits:', e); }
    hideLoading();

    const content = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-black text-slate-900 dark:text-white">Visit Management</h1>
                <div class="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                    ${visits.length} Visits
                </div>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div id="visits-list" class="divide-y divide-slate-100 dark:divide-slate-800">
                    ${visits.length ? visits.map(visit => {
                        const listing = visit.listings || visit.listing || {};
                        const visitDate = visit.preferred_date
                            ? new Date(visit.preferred_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Not specified';
                        const visitTime = visit.preferred_time || '';

                        let statusIcon, statusClass, statusLabel;
                        if (visit.status === 'approved') {
                            statusIcon = 'check_circle'; statusClass = 'bg-emerald-100 text-emerald-600'; statusLabel = 'Approved';
                        } else if (visit.status === 'rejected') {
                            statusIcon = 'cancel'; statusClass = 'bg-red-100 text-red-600'; statusLabel = 'Rejected';
                        } else if (visit.status === 'completed') {
                            statusIcon = 'task_alt'; statusClass = 'bg-blue-100 text-blue-600'; statusLabel = 'Completed';
                        } else {
                            statusIcon = 'schedule'; statusClass = 'bg-amber-100 text-amber-600'; statusLabel = 'Pending';
                        }

                        return `
                        <div class="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div class="flex items-start gap-4">
                                <div class="size-14 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer" onclick="window.location.hash='/pg/${listing.id || visit.listing_id}'">
                                    ${listing.images?.[0] ? `<img src="${listing.images[0]}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined text-slate-300">home</span></div>'}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <a href="#/pg/${listing.id || visit.listing_id}" class="font-bold text-sm text-slate-900 dark:text-white truncate hover:text-primary transition-colors">${listing.name || 'Property'}</a>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusClass} flex items-center gap-1">
                                            <span class="material-symbols-outlined text-[12px]">${statusIcon}</span> ${statusLabel}
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-500 flex items-center gap-1 mb-1">
                                        <span class="material-symbols-outlined text-[12px]">location_on</span> ${listing.city || 'Unknown'}
                                    </p>
                                    <div class="flex items-center gap-4 mt-2">
                                        <span class="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <span class="material-symbols-outlined text-[14px] text-primary">calendar_today</span> ${visitDate}
                                        </span>
                                        ${visitTime ? `<span class="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <span class="material-symbols-outlined text-[14px] text-primary">schedule</span> ${visitTime}
                                        </span>` : ''}
                                    </div>
                                    ${visit.rejection_reason ? `<p class="text-xs text-red-500 italic mt-2">"${visit.rejection_reason}"</p>` : ''}
                                </div>
                                ${listing.monthly_rent ? `<div class="text-right shrink-0">
                                    <p class="text-primary font-bold text-sm">${formatPrice(listing.monthly_rent)}</p>
                                    <span class="text-[10px] text-slate-400">/month</span>
                                </div>` : ''}
                            </div>
                        </div>`;
                    }).join('') : `
                    <div class="p-8 text-center text-slate-500">
                        <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="material-symbols-outlined text-3xl">event_available</span>
                        </div>
                        <p class="font-bold">No visits scheduled</p>
                        <p class="text-sm mt-1">Book a visit on any PG listing page to see it here.</p>
                        <button onclick="window.location.hash='/explore'" class="mt-6 bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all">Explore PGs</button>
                    </div>`}
                </div>
            </div>
        </div>
    `;
    const app = document.getElementById('app');
    app.innerHTML = renderDashboardLayout(content, 'visits', 'Visits');
    initDashboardEvents();
}

// ══════════════════════════════════════════════════════════════════
// Compare PGs (Already working — no changes needed)
// ══════════════════════════════════════════════════════════════════
export function renderComparePGs() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    const list = state.compareList;

    const content = `
    <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800"><div>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Compare PGs</h2>
            <p class="text-slate-500 mt-1">Compare up to 4 properties side by side</p>
        </div>
        <div class="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">${list.length}/4 Selected
        </div>
    </div>
    
    ${list.length < 2 ? `
        <div class="py-16 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700"><span class="material-symbols-outlined text-6xl text-slate-300 mb-4">compare_arrows</span>
            <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300">Add more PGs to compare</h3>
            <p class="text-slate-500 mt-2 max-w-sm">Select the Compare checkbox on at least two PG listings to see their features side-by-side.</p>
            <button onclick="window.location.hash='/explore'" class="mt-6 bg-primary text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:brightness-110 transition-all">Explore PGs</button>
        </div>
    ` : `
        <div class="overflow-x-auto pb-6 outline-none"><div class="min-w-[800px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-md"><!-- Headers Row -->
                <div class="flex border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"><div class="w-48 p-4 shrink-0 flex items-center text-slate-500 font-semibold uppercase tracking-wider text-xs">Features</div>
                    ${list.map(pg => `
                        <div class="flex-1 p-4 border-l border-slate-200 dark:border-slate-700 text-center min-w-[200px] bg-white dark:bg-slate-900"><div class="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 overflow-hidden relative border border-slate-200 dark:border-slate-700">${pg.images?.[0] ? `<img src="${pg.images[0]}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-3xl text-slate-300 absolute inset-0 m-auto">image</span>`}
                            </div>
                            <a href="#/pg/${pg.id}" class="block font-bold text-slate-900 dark:text-white hover:text-primary transition-colors truncate mb-2" title="${pg.name}">${pg.name}</a>
                            <button onclick="window._removeCompare('${pg.id}')" class="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors flex items-center justify-center gap-1 mx-auto px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20"><span class="material-symbols-outlined text-[14px]">close</span> Remove
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Data Rows -->
                <div class="flex border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"><div class="w-48 p-4 shrink-0 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">payments</span> Price</div>
                    ${list.map(p => `<div class="flex-1 p-4 border-l border-slate-100 dark:border-slate-800 text-center font-bold text-lg text-primary min-w-[200px] flex items-center justify-center py-6">${formatPrice(p.monthly_rent)}<span class="text-xs text-slate-400 font-normal">/mo</span></div>`).join('')}
                </div>
                
                <div class="flex border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"><div class="w-48 p-4 shrink-0 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">star</span> Rating</div>
                    ${list.map(p => `
                        <div class="flex-1 p-4 border-l border-slate-100 dark:border-slate-800 text-center min-w-[200px] flex gap-1 justify-center items-center"><span class="text-yellow-500 font-bold">${avgRating(p.reviews) || 'New'}</span>
                            <span class="material-symbols-outlined text-[16px] text-yellow-500 origin-bottom relative top-[-1px]">star</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="flex border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"><div class="w-48 p-4 shrink-0 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">group</span> Room Type</div>
                    ${list.map(p => `<div class="flex-1 p-4 border-l border-slate-100 dark:border-slate-800 text-center text-sm font-medium capitalize min-w-[200px]">${p.gender_allowed === 'any' ? 'Co-ed / Any' : p.gender_allowed + ' Only'}</div>`).join('')}
                </div>
                
                <div class="flex border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"><div class="w-48 p-4 shrink-0 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">account_balance_wallet</span> Deposit</div>
                    ${list.map(p => `<div class="flex-1 p-4 border-l border-slate-100 dark:border-slate-800 text-center text-sm min-w-[200px]">${p.deposit ? formatPrice(p.deposit) : '<span class="text-slate-400">Not specified</span>'}</div>`).join('')}
                </div>
                
                <div class="flex border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"><div class="w-48 p-4 shrink-0 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">location_on</span> Location</div>
                    ${list.map(p => `<div class="flex-1 p-4 border-l border-slate-100 dark:border-slate-800 text-center text-sm min-w-[200px]">${p.city}</div>`).join('')}
                </div>
                
                <div class="flex border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"><div class="w-48 p-4 shrink-0 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">restaurant</span> Food Included</div>
                    ${list.map(p => `<div class="flex-1 p-4 border-l border-slate-100 dark:border-slate-800 text-center text-sm min-w-[200px]">${p.food_available ? '<span class="material-symbols-outlined text-green-500">check_circle</span>' : '<span class="material-symbols-outlined text-red-400">cancel</span>'}</div>`).join('')}
                </div>
                
                <div class="flex hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"><div class="w-48 p-4 shrink-0 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">wifi</span> Amenities</div>
                    ${list.map(p => `
                        <div class="flex-1 p-4 border-l border-slate-100 dark:border-slate-800 min-w-[200px]"><div class="flex flex-wrap gap-2 justify-center">${(p.amenities || []).slice(0, 5).map(a => {
        const am = getAmenityIcon(a);
        return `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] uppercase font-bold tracking-wider border border-slate-200 dark:border-slate-700" title="${am.label}">${am.label}</span>`;
    }).join('')}
                                ${(p.amenities || []).length > 5 ? `<span class="px-2 py-1 text-slate-400 text-xs">+${p.amenities.length - 5} more</span>` : ''}
                                ${!(p.amenities || []).length ? '<span class="text-slate-400 text-xs text-center w-full">No details</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `}`;

    window._removeCompare = (id) => { removeFromCompare(id); renderComparePGs(); };
    document.getElementById('app').innerHTML = renderDashboardLayout(content, 'compare', 'Compare Lists');
    initDashboardEvents();
    return () => { delete window._removeCompare; };
}
