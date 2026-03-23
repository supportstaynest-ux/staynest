import { state, isLoggedIn, formatPrice, avgRating, renderStars, getAmenityIcon, showToast, showLoading, hideLoading, removeFromCompare } from '../state.js';
import { navigate } from '../router.js';
import { getSavedListings, unsaveListing, getRecentlyViewed, getEnquiries, getUserVisitRequests, verifyStay, triggerSOS, updateEmergencyContacts, requestOwnerApproval, getProfile } from '../supabase.js';
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
                                    ${listing.images?.[0] ? `<img src="${listing.images[0]}" loading="lazy" decoding="async" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined text-slate-300">home</span></div>'}
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
                                    ${listing.images?.[0] ? `<img src="${listing.images[0]}" loading="lazy" decoding="async" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined text-slate-300">home</span></div>'}
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
                        <div class="flex-1 p-4 border-l border-slate-200 dark:border-slate-700 text-center min-w-[200px] bg-white dark:bg-slate-900"><div class="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 overflow-hidden relative border border-slate-200 dark:border-slate-700">${pg.images?.[0] ? `<img src="${pg.images[0]}" loading="lazy" decoding="async" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-3xl text-slate-300 absolute inset-0 m-auto">image</span>`}
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

}

// ══════════════════════════════════════════════════════════════════
// Safety & SOS Page
// ══════════════════════════════════════════════════════════════════
export async function renderSOSSafety() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    showLoading();
    let profile;
    try { profile = await getProfile(state.user.id); } catch (e) { profile = state.profile; }
    hideLoading();

    const isVerified = profile?.is_resident_verified === true;
    const contacts = Array.isArray(profile?.emergency_contacts) ? profile.emergency_contacts : [];

    const content = `
    <div class="space-y-8 max-w-3xl mx-auto">
        <!-- Header -->
        <div class="flex items-start gap-4">
            <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <span class="material-symbols-outlined text-3xl text-red-500">emergency_home</span>
            </div>
            <div>
                <h1 class="text-2xl font-black text-slate-900 dark:text-white">Safety & SOS</h1>
                <p class="text-slate-500 text-sm mt-1">Your personal safety toolkit, powered by StayNest</p>
            </div>
        </div>

        <!-- Verification Status Banner -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border ${isVerified ? 'border-green-200 dark:border-green-900' : 'border-amber-200 dark:border-amber-900'} shadow-sm p-5 flex items-center gap-4">
            <div class="p-2.5 rounded-xl ${isVerified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}">
                <span class="material-symbols-outlined text-2xl ${isVerified ? 'text-green-500' : 'text-amber-500'}" style="font-variation-settings:'FILL' 1">${isVerified ? 'verified_user' : 'lock'}</span>
            </div>
            <div class="flex-1">
                <p class="font-bold ${isVerified ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}">${isVerified ? '✓ Verified Resident' : 'Not Verified Yet'}</p>
                <p class="text-sm text-slate-500">${isVerified ? 'You have full access to Emergency SOS features.' : 'Verify your stay to unlock Emergency SOS.'}</p>
            </div>
        </div>

        ${!isVerified ? `
        <!-- Unlock / Verification Section -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h2 class="font-bold text-lg text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <span class="material-symbols-outlined text-xl text-amber-500">lock_open</span>
                Unlock Safety Features
            </h2>
            <p class="text-sm text-slate-500 mb-6">Verify your stay using a Stay Code provided by your PG owner, or request approval from your owner directly.</p>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Enter Stay Code</label>
                    <div class="flex gap-3">
                        <input id="stay-code-input" type="text" maxlength="20" class="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none uppercase tracking-widest font-mono" placeholder="e.g. STAY2024" />
                        <button id="verify-stay-btn" class="bg-primary text-white font-bold px-5 py-3 rounded-xl shadow-sm hover:brightness-110 transition-all whitespace-nowrap">Verify</button>
                    </div>
                </div>
                <p class="text-xs text-slate-400 flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">info</span> Ask your PG owner for a Stay Code. They can generate one from their vendor dashboard.</p>
                <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Don't have a Stay Code?</p>
                    <button id="req-approval-btn" class="text-sm font-bold text-primary hover:underline flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[18px]">send</span>
                        Request Owner Approval via Email
                    </button>
                    <p class="text-xs text-slate-400 mt-1">Requires knowing the Listing ID from your booking confirmation.</p>
                    <div id="approval-extra" class="hidden mt-3 space-y-2">
                        <p class="text-xs text-slate-500 flex items-start gap-1.5 mb-2">
                            <span class="material-symbols-outlined text-[14px] shrink-0 mt-0.5 text-primary">info</span>
                            Open the PG listing page and click the <strong class="font-mono text-[11px] bg-slate-100 dark:bg-slate-700 px-1 rounded">ID: XXXXXXXX…</strong> badge below the property name to copy the Listing ID, then paste it here.
                        </p>
                        <input id="listing-id-input" type="text" class="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" placeholder="Paste Listing ID here..." />
                        <button id="send-approval-btn" class="bg-slate-800 dark:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:brightness-110 transition-all">Send Approval Request</button>
                    </div>
                </div>
            </div>
        </div>` : ''}

        <!-- Emergency Contacts -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h2 class="font-bold text-lg text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <span class="material-symbols-outlined text-xl text-primary">contacts</span>
                Emergency Contacts
            </h2>
            <p class="text-sm text-slate-500 mb-4">These people will be alerted when you trigger any SOS.</p>
            <div id="contacts-list" class="space-y-3 mb-4">
                ${contacts.length ? contacts.map((c, i) => `
                <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div class="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">${(c.name || 'U').charAt(0).toUpperCase()}</div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">${c.name}</p>
                        <p class="text-xs text-slate-500 truncate">${c.email || c.phone || 'No contact info'}</p>
                    </div>
                    <button onclick="window._removeContact(${i})" class="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>`).join('') : `<p class="text-sm text-slate-400 text-center py-4">No emergency contacts added yet.</p>`}
            </div>
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
                <p class="text-sm font-semibold mb-3">Add New Contact</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input id="ec-name" type="text" class="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Name" />
                    <input id="ec-phone" type="text" class="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Phone (optional)" />
                    <input id="ec-email" type="email" class="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Email" />
                </div>
                <button id="add-contact-btn" class="mt-3 bg-primary/10 text-primary font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/20 transition-all flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">person_add</span> Add Contact
                </button>
            </div>
        </div>

        <!-- SOS Buttons Section -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h2 class="font-bold text-lg text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <span class="material-symbols-outlined text-xl text-red-500">sos</span>
                Trigger SOS Alert
            </h2>
            <p class="text-sm text-slate-500 mb-6">Press and hold any button for 3 seconds to send an alert. A confirmation will appear before anything is sent.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${isVerified ? `
                <!-- Emergency SOS -->
                <div class="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-5 flex flex-col items-center text-center">
                    <div id="emergency-sos-btn" class="relative cursor-pointer mb-4 select-none">
                        <div class="size-24 rounded-full bg-red-500 hover:bg-red-600 text-white flex flex-col items-center justify-center shadow-lg shadow-red-500/40 hover:shadow-red-500/60 transition-all active:scale-95" style="transition: transform 0.1s;">
                            <span class="material-symbols-outlined text-4xl" style="font-variation-settings:'FILL' 1">sos</span>
                        </div>
                        <svg class="absolute top-[-4px] left-[-4px] w-[104px] h-[104px]" id="sos-progress-ring" style="transform:rotate(-90deg)">
                            <circle id="sos-ring" cx="52" cy="52" r="48" stroke="#ef4444" stroke-width="4" fill="none" stroke-dasharray="301" stroke-dashoffset="301" style="transition:stroke-dashoffset 0.1s linear"/>
                        </svg>
                    </div>
                    <p class="font-bold text-red-700 dark:text-red-400 text-sm">🔴 Emergency SOS</p>
                    <p class="text-xs text-slate-500 mt-1">Alerts family + Admin. For verified residents only.</p>
                </div>` : `
                <div class="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 p-5 flex flex-col items-center text-center">
                    <span class="material-symbols-outlined text-4xl text-slate-300 mb-3">lock</span>
                    <p class="font-bold text-slate-500 text-sm">Emergency SOS Locked</p>
                    <p class="text-xs text-slate-400 mt-1">Verify your stay above to unlock this feature.</p>
                </div>`}

                <!-- Personal SOS (everyone) -->
                <div class="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 p-5 flex flex-col items-center text-center">
                    <div id="personal-sos-btn" class="relative cursor-pointer mb-4 select-none">
                        <div class="size-24 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex flex-col items-center justify-center shadow-lg shadow-amber-500/40 hover:shadow-amber-500/60 transition-all active:scale-95" style="transition: transform 0.1s;">
                            <span class="material-symbols-outlined text-4xl" style="font-variation-settings:'FILL' 1">warning</span>
                        </div>
                        <svg class="absolute top-[-4px] left-[-4px] w-[104px] h-[104px]" style="transform:rotate(-90deg)">
                            <circle id="personal-ring" cx="52" cy="52" r="48" stroke="#f59e0b" stroke-width="4" fill="none" stroke-dasharray="301" stroke-dashoffset="301" style="transition:stroke-dashoffset 0.1s linear"/>
                        </svg>
                    </div>
                    <p class="font-bold text-amber-700 dark:text-amber-400 text-sm">🟡 Personal SOS</p>
                    <p class="text-xs text-slate-500 mt-1">Alerts family contacts only. No admin involvement.</p>
                </div>
            </div>
        </div>

        <!-- Learn More + Safety Tips -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h2 class="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-xl text-primary">shield</span>
                About the Safety System
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex gap-3"><div class="size-9 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-red-500 text-lg">sos</span></div><div><p class="text-sm font-bold text-slate-900 dark:text-white">Emergency SOS</p><p class="text-xs text-slate-500">Instantly alerts emergency contacts and admin with your name, time & location.</p></div></div>
                <div class="flex gap-3"><div class="size-9 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-amber-500 text-lg">warning</span></div><div><p class="text-sm font-bold text-slate-900 dark:text-white">Personal SOS</p><p class="text-xs text-slate-500">Privately alerts only your saved family contacts. Admin is never involved.</p></div></div>
                <div class="flex gap-3"><div class="size-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-blue-500 text-lg">location_on</span></div><div><p class="text-sm font-bold text-slate-900 dark:text-white">Location Sharing</p><p class="text-xs text-slate-500">If allowed, your approximate location is attached as a Google Maps link.</p></div></div>
                <div class="flex gap-3"><div class="size-9 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-green-500 text-lg">verified_user</span></div><div><p class="text-sm font-bold text-slate-900 dark:text-white">Resident Verified</p><p class="text-xs text-slate-500">Full SOS is only for verified PG residents for accountability & trust.</p></div></div>
            </div>
        </div>
    </div>
    `;

    document.getElementById('app').innerHTML = renderDashboardLayout(content, 'sos', 'Safety & SOS');
    initDashboardEvents();

    let contactsData = [...contacts];

    window._removeContact = async (idx) => {
        contactsData.splice(idx, 1);
        try {
            await updateEmergencyContacts(state.user.id, contactsData);
            showToast('Contact removed', 'success');
            renderSOSSafety();
        } catch (e) { showToast(e.message || 'Failed to remove', 'error'); }
    };

    document.getElementById('add-contact-btn')?.addEventListener('click', async () => {
        const name = document.getElementById('ec-name').value.trim();
        const phone = document.getElementById('ec-phone').value.trim();
        const email = document.getElementById('ec-email').value.trim();
        if (!name) { showToast('Please enter a contact name', 'error'); return; }
        if (!email && !phone) { showToast('Please enter at least an email or phone', 'error'); return; }
        contactsData.push({ name, phone, email });
        try {
            await updateEmergencyContacts(state.user.id, contactsData);
            showToast('Contact saved!', 'success');
            renderSOSSafety();
        } catch (e) { showToast(e.message || 'Failed to save', 'error'); }
    });

    document.getElementById('verify-stay-btn')?.addEventListener('click', async () => {
        const code = document.getElementById('stay-code-input').value.trim();
        if (!code) { showToast('Please enter a Stay Code', 'error'); return; }
        showLoading();
        try {
            const result = await verifyStay(code);
            showToast(`Stay verified at ${result.listing_name || 'your property'}! 🔓`, 'success');
            renderSOSSafety();
        } catch (e) { showToast(e.message || 'Verification failed', 'error'); }
        hideLoading();
    });

    document.getElementById('req-approval-btn')?.addEventListener('click', () => {
        document.getElementById('approval-extra').classList.toggle('hidden');
    });

    document.getElementById('send-approval-btn')?.addEventListener('click', async () => {
        const lid = document.getElementById('listing-id-input').value.trim();
        if (!lid) { showToast('Please enter a Listing ID', 'error'); return; }
        showLoading();
        try {
            await requestOwnerApproval(lid);
            showToast('Approval request sent to property owner!', 'success');
        } catch (e) { showToast(e.message || 'Failed to send', 'error'); }
        hideLoading();
    });

    // Press-and-hold SOS logic
    function initSOSButton(btnId, type, color) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const ring = document.getElementById(type === 'emergency' ? 'sos-ring' : 'personal-ring');
        let holdTimer = null, progress = 0, animFrame = null;
        const HOLD_MS = 3000;
        const CIRCUMFERENCE = 301;

        function startHold() {
            const startTime = Date.now();
            function tick() {
                progress = Math.min((Date.now() - startTime) / HOLD_MS, 1);
                if (ring) ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
                if (progress < 1) { animFrame = requestAnimationFrame(tick); }
                else { clearHold(); triggerConfirm(); }
            }
            animFrame = requestAnimationFrame(tick);
        }

        function clearHold() {
            if (animFrame) cancelAnimationFrame(animFrame);
            if (ring) ring.style.strokeDashoffset = CIRCUMFERENCE;
            progress = 0;
        }

        function triggerConfirm() {
            const confirmed = confirm(`Are you sure you want to send a ${type === 'emergency' ? '🔴 EMERGENCY' : '🟡 Personal'} SOS alert? This will immediately notify your emergency contacts.`);
            if (!confirmed) return;
            showLoading();
            // Get user location if allowed
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const loc = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
                        const locUrl = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
                        await fireSOS(type, loc, locUrl);
                    },
                    async () => { await fireSOS(type, null, null); },
                    { timeout: 5000 }
                );
            } else { fireSOS(type, null, null).then(() => {}); }
        }

        async function fireSOS(type, loc, locUrl) {
            try {
                const res = await triggerSOS(type, loc, locUrl);
                showToast(`SOS sent! ${res.alerts_sent} alert(s) dispatched.`, 'success');
            } catch (e) { showToast(e.message || 'SOS failed to send', 'error'); }
            hideLoading();
        }

        btn.addEventListener('mousedown', startHold);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(); }, { passive: false });
        btn.addEventListener('mouseup', clearHold);
        btn.addEventListener('mouseleave', clearHold);
        btn.addEventListener('touchend', clearHold);
        btn.addEventListener('touchcancel', clearHold);
    }

    initSOSButton('emergency-sos-btn', 'emergency', 'red');
    initSOSButton('personal-sos-btn', 'personal', 'amber');
}
