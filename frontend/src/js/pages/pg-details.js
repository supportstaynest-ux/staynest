import { state, isLoggedIn, isAdmin, formatPrice, avgRating, renderStars, getAmenityIcon, showToast, showLoading, hideLoading, addToCompare, AMENITIES_LIST } from '../state.js';
import { navigate } from '../router.js';
import { getListing, saveListing, unsaveListing, addRecentlyViewed, createReview, updateReview, deleteReview, incrementListingViews, getNearbyPlaces, createVisitRequest, getListingChatMessages, sendListingChatMessage, subscribeToListingChats, unsubscribeChat, sendTargetedNotification, insertRecentActivity, getUserListingVisitRequest, cancelVisitRequest, createReport } from '../supabase.js';
import { trackPGView, trackPGSave, trackContactClick, trackScrollDepth } from '../analytics.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';

export async function renderPGDetails({ id }) {
    const app = document.getElementById('app');

    // Initial loading state
    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
        ${renderNavbar()}
        <div class="flex-1 flex items-center justify-center">
            <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    `;
    initNavbarEvents();

    let pg;
    let nearbyPlaces = [];
    try {
        pg = await getListing(id);
        nearbyPlaces = await getNearbyPlaces(id);
    } catch (e) {
        app.innerHTML = `
        <div class="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            ${renderNavbar()}
            <div class="flex-1 flex flex-col items-center justify-center text-center p-4">
                <span class="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
                <h2 class="text-2xl font-bold mb-2">PG Not Found</h2>
                <p class="text-slate-500 mb-6">The property you are looking for might have been removed or is unavailable.</p>
                <a href="#/explore" class="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 shadow-sm transition-all">Browse PGs</a>
            </div>
        </div>`;
        return;
    }

    if (isLoggedIn()) { try { await addRecentlyViewed(state.user.id, id); } catch (e) { } }

    // Increment view count in the background and track analytics
    incrementListingViews(id);
    trackPGView(id, pg.name, pg.city);

    const rating = avgRating(pg.reviews);
    const images = pg.images || [];
    let currentImg = 0;
    const isSaved = state.savedListings?.has?.(pg.id);
    const vendor = pg.profiles || {};

    const getPlaceIcon = (type) => {
        const icons = {
            'train_station': 'train',
            'transit_station': 'directions_bus',
            'hospital': 'local_hospital',
            'supermarket': 'local_grocery_store',
            'restaurant': 'restaurant',
            'atm': 'local_atm',
            'university': 'school',
            'cafe': 'local_cafe',
            'subway_station': 'subway'
        };
        return icons[type] || 'place';
    };

    const formatDistance = (metros) => {
        if (metros < 1000) return `${Math.round(metros)}m`;
        return `${(metros / 1000).toFixed(1)}km`;
    };

    let areaScore = 5.0;
    let insightFactors = [];
    if (nearbyPlaces.length > 0) {
        const hasTransport = nearbyPlaces.some(p => p.type && p.type.includes('station'));
        if (hasTransport) { areaScore += 2; insightFactors.push('Transport nearby'); }
        const hasHospital = nearbyPlaces.some(p => p.type === 'hospital');
        if (hasHospital) { areaScore += 1.5; insightFactors.push('Hospitals nearby'); }
        const hasFood = nearbyPlaces.some(p => p.type === 'restaurant' || p.type === 'supermarket');
        if (hasFood) { areaScore += 1.0; insightFactors.push('Food/Groceries nearby'); }
        const hasUniversity = nearbyPlaces.some(p => p.type === 'university');
        if (hasUniversity) { areaScore += 0.5; insightFactors.push('Colleges nearby'); }
    }

    areaScore = Math.min(10, areaScore).toFixed(1);

    // Fetch user's current visit request status if logged in
    let currentVisit = null;
    if (isLoggedIn() && state.user?.role !== 'admin') {
        try {
            currentVisit = await getUserListingVisitRequest(id, state.user.id);
        } catch (e) { console.error('Error fetching visit status:', e); }
    }

    const renderBookingButton = (visit) => {
        if (!visit || visit.status === 'cancelled') {
            return '<button id="book-visit-btn" class="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold py-3 rounded-xl border border-transparent hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">' +
                '<span class="material-symbols-outlined text-[20px]">calendar_month</span> Book Your Visit</button>';
        }
        if (visit.status === 'pending') {
            return '<div class="w-full text-center space-y-1">' +
                '<button class="flex items-center justify-center gap-2 w-full bg-amber-100 text-amber-700 font-bold py-3 rounded-xl cursor-default border border-amber-200">' +
                '<span class="material-symbols-outlined text-[20px] animate-pulse">hourglass_empty</span> Visit Pending...</button>' +
                '<p class="text-[10px] text-slate-500 font-medium">You\\\'ll be notified once vendor confirms.</p></div>';
        }
        if (visit.status === 'approved') {
            return '<div class="w-full text-center space-y-2">' +
                '<button class="flex items-center justify-center gap-2 w-full bg-green-100 text-green-700 font-bold py-3 rounded-xl cursor-default border border-green-200">' +
                '<span class="material-symbols-outlined text-[20px]">check_circle</span> Visit Approved</button>' +
                '<button id="cancel-visit-btn" data-id="' + visit.id + '" class="text-xs text-red-500 hover:text-red-600 font-bold w-full text-center py-1">Cancel Booking</button></div>';
        }
        if (visit.status === 'rejected') {
            return '<div class="w-full space-y-3">' +
                '<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">' +
                '<p class="text-red-800 font-bold flex items-center justify-center gap-1.5 mb-1"><span class="material-symbols-outlined text-[16px]">cancel</span> Visit Rejected</p>' +
                (visit.rejection_reason ? '<p class="text-red-600 text-xs text-center italic">"' + visit.rejection_reason + '"</p>' : '<p class="text-red-600 text-xs text-center">Dates not available.</p>') +
                '</div>' +
                '<button id="book-visit-btn" class="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold py-3 rounded-xl border border-transparent hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">' +
                '<span class="material-symbols-outlined text-[20px]">refresh</span> Book Again</button>' +
                '</div>';
        }
        return '';
    };


    app.innerHTML = `
    <div class="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
      ${renderNavbar(pg.name)}
      
      <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full animate-in fadeIn">
        
        <!-- Breadcrumbs -->
        <div class="hidden md:flex items-center gap-2 text-sm text-slate-500 font-medium mb-6">
            <a href="#/home" class="hover:text-primary transition-colors">Home</a>
            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            <a href="#/explore" class="hover:text-primary transition-colors">Explore</a>
            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            <span class="text-slate-900 dark:text-white font-bold truncate">${pg.name}</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Left Column: Media & Details -->
            <div class="lg:col-span-2 space-y-8">
                
                <!-- Image Gallery -->
                <div class="relative bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden aspect-[16/9] border border-slate-200 dark:border-slate-700 shadow-md group">
                    <div id="pg-gallery" class="w-full h-full transition-all duration-500 bg-cover bg-center flex items-center justify-center" style="${images[0] ? `background-image:url(${images[0]});` : ''}">
                        ${!images.length ? '<span class="material-symbols-outlined text-6xl text-slate-300">image</span>' : ''}
                    </div>
                    
                    ${images.length > 1 ? `
                    <button onclick="window._pgImgNav(-1)" class="absolute left-4 top-1/2 -translate-y-1/2 min-w-10 size-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100">
                        <span class="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button onclick="window._pgImgNav(1)" class="absolute right-4 top-1/2 -translate-y-1/2 min-w-10 size-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100">
                        <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                        ${images.map((_, i) => `<div class="size-2 rounded-full transition-all duration-300 gallery-dot ${i === 0 ? 'bg-white w-4' : 'bg-white/50' }"></div>`).join('')}
                    </div>` : ''}
                </div>

                <!-- Header Info -->
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6">
                    <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-2 flex items-center gap-2">
                                ${pg.name}
                                ${pg.is_verified && pg.gender_allowed !== 'female' ? '<span class="material-symbols-outlined text-[24px] text-blue-500" title="Verified Property">verified</span>' : ''}
                                ${pg.is_verified && pg.gender_allowed === 'female' ? '<span class="material-symbols-outlined text-[24px] text-pink-500" title="Women Verified">check_circle</span>' : ''}
                            </h1>
                            <p class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span class="material-symbols-outlined text-lg">location_on</span> ${pg.address}, ${pg.city}</p>
                        </div>
                        <div class="flex flex-col items-start md:items-end bg-primary/5 dark:bg-primary/10 px-4 py-3 rounded-xl border border-primary/20">
                            <p class="text-3xl font-black text-primary">${formatPrice(pg.monthly_rent)}<span class="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">/mo</span></p>
                            ${pg.deposit ? `<p class="text-xs text-slate-500 mt-1 font-medium">Deposit: ${formatPrice(pg.deposit)}</p>` : ''}
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2 mt-6">
                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pg.is_full ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' }">${pg.is_full ? 'Fully Occupied' : 'Spots Available'}</span>
                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            ${pg.gender_allowed === 'any' ? 'Co-ed / Any' : pg.gender_allowed + ' Only'}
                        </span>
                        ${pg.food_available ? '<span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">Food Included</span>' : ''}
                        ${pg.is_featured ? '<span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">star</span> Featured</span>' : ''}
                    </div>

                    <!-- Listing ID + SOS Safety Row -->
                    <div class="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400 font-medium">Listing ID:</span>
                            <span
                                id="copy-listing-id-badge"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all select-all group"
                                title="Click to copy full Listing ID"
                                onclick="navigator.clipboard.writeText('${pg.id}'); this.innerHTML = '<span class=\\'material-symbols-outlined text-[12px]\\'>check_circle</span> Copied!'; this.classList.add('text-green-600','bg-green-50','border-green-200'); setTimeout(() => { this.innerHTML = '<span class=\\'material-symbols-outlined text-[12px]\\'>content_copy</span> ${pg.id.substring(0,8).toUpperCase()}…'; this.classList.remove(\\'text-green-600\\',\\'bg-green-50\\',\\'border-green-200\\'); }, 2000);"
                            >
                                <span class="material-symbols-outlined text-[12px]">content_copy</span>
                                ${pg.id.substring(0,8).toUpperCase()}…
                            </span>
                        </div>
                        ${pg.gender_allowed !== 'male' ? `
                        <a href="#/safety-sos" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors">
                            <span class="material-symbols-outlined text-[14px]" style="font-variation-settings:'FILL' 1">sos</span>
                            Safety &amp; SOS
                        </a>` : ''}
                    </div>
                </div>

                <!-- Description -->
                ${pg.description ? `
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">description</span> About the Property</h3>
                    <p class="text-slate-600 dark:text-slate-400 leading-relaxed">${pg.description}</p>
                </div>` : ''}

                <!-- Amenities -->
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">verified</span> Amenities Offered</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        ${(pg.amenities || []).map(a => {
        const am = getAmenityIcon(a);
        return `
                            <div class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <span class="material-symbols-outlined text-primary text-[24px]">${am.icon}</span>
                                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">${am.label}</span>
                            </div>`;
    }).join('')}
                        ${!(pg.amenities?.length) ? '<p class="col-span-full text-slate-500 italic">No amenities explicitly listed.</p>' : ''}
                    </div>
                </div>

                <!-- Room Types -->
                ${pg.room_types?.length ? `
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">bed</span> Room Types & Pricing</h3>
                    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-xs tracking-wider">
                                    <th class="p-4 font-bold border-b border-slate-200 dark:border-slate-700">Room Type</th>
                                    <th class="p-4 font-bold border-b border-slate-200 dark:border-slate-700">Monthly Rent</th>
                                    <th class="p-4 font-bold border-b border-slate-200 dark:border-slate-700">Availability</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                ${pg.room_types.map(r => `
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td class="p-4 font-medium text-sm text-slate-900 dark:text-white">${r.type || 'Standard'}</td>
                                    <td class="p-4 font-bold text-sm text-primary">${formatPrice(r.price)}</td>
                                    <td class="p-4">
                                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${r.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                            <span class="material-symbols-outlined text-[14px]">${r.available ? 'check_circle' : 'cancel'}</span>
                                            ${r.available ? 'Available' : 'Occupied'}
                                        </span>
                                    </td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}

                <!-- Location/Map -->
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">location_on</span> Location & Neighborhood</h3>
                    <p class="text-slate-600 dark:text-slate-400 mb-4">${pg.address}, ${pg.city} ${pg.landmark ? `(Near: ${pg.landmark})` : ''}</p>
                    
                    ${pg.latitude && pg.longitude ? `
                    <div id="pg-map" class="w-full h-80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md z-0 mb-6"></div>
                    <div class="flex justify-start">
                        <a href="https://www.openstreetmap.org/?mlat=${pg.latitude}&mlon=${pg.longitude}#map=16/${pg.latitude}/${pg.longitude}" target="_blank" class="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 transition-colors border border-slate-200 dark:border-slate-700">
                            <span class="material-symbols-outlined text-[18px]">directions</span> Get Directions
                        </a>
                    </div>
                    ` : `
                    <div class="w-full h-40 bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
                        <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">map</span>
                        <p class="text-slate-500 font-medium">Exact map location not provided</p>
                    </div>`}

                    ${nearbyPlaces.length > 0 ? `
                    <!-- Area Insights -->
                    <div class="mt-8 mb-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div class="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 class="font-bold text-slate-900 dark:text-white flex items-center gap-2"><span class="material-symbols-outlined text-primary">analytics</span> Area Insights</h4>
                                <ul class="text-sm text-slate-600 dark:text-slate-400 mt-2 list-disc list-inside">
                                    ${insightFactors.map(f => `<li>${f}</li>`).join('')}
                                    ${insightFactors.length === 0 ? '<li>Standard residential area</li>' : ''}
                                </ul>
                            </div>
                            <div class="text-center bg-white dark:bg-slate-900 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                                <span class="block text-2xl font-black text-primary">${areaScore}<span class="text-sm text-slate-500">/10</span></span>
                                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Area Score</span>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4">
                        <h4 class="font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2"><span class="material-symbols-outlined text-primary">explore</span> Nearby Essentials</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 list-none gap-3">
                            ${nearbyPlaces.map(p => {
        const walkTime = Math.round((p.distance / 1000) / 5 * 60) || 1;
        const driveTime = Math.round((p.distance / 1000) / 30 * 60) || 1;
        return `
                                <div class="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-primary/30 transition-colors">
                                    <span class="material-symbols-outlined text-slate-400 pt-0.5">${getPlaceIcon(p.type)}</span>
                                    <div class="min-w-0 pr-2 w-full">
                                        <p class="font-bold text-sm text-slate-900 dark:text-white leading-tight mb-1 truncate" title="${p.name}">${p.name}</p>
                                        <div class="flex items-center justify-between">
                                            <p class="text-xs font-medium text-slate-500 capitalize flex items-center gap-1">${p.type.replace('_', ' ')} • <span class="text-primary">${formatDistance(p.distance)}</span></p>
                                            <div class="flex text-[10px] text-slate-400 gap-2">
                                                <span title="Walking" class="flex items-center"><span class="material-symbols-outlined text-[12px] mr-0.5">directions_walk</span>${walkTime}m</span>
                                                <span title="Driving" class="flex items-center"><span class="material-symbols-outlined text-[12px] mr-0.5">directions_car</span>${driveTime}m</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                `;
    }).join('')}
                        </div>
                    </div>` : ''}
                </div>

                <!-- Reviews Section -->
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-bold flex items-center gap-2"><span class="material-symbols-outlined text-primary">reviews</span> Reviews & Ratings</h3>
                        <div class="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-900">
                            <span class="text-yellow-500 font-bold text-lg">${rating ? rating.toFixed(1) : 'New'}</span>
                            <span class="material-symbols-outlined text-yellow-500">star</span>
                            <span class="text-xs text-slate-500 ml-1">(${pg.reviews?.length || 0})</span>
                        </div>
                    </div>

                    <div id="reviews-list" class="space-y-4 mb-8">
                        ${(pg.reviews || []).map(r => `
                        <div class="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-3">
                                    <div class="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold capitalize">
                                        ${r.profiles?.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <span class="font-bold text-sm text-slate-900 dark:text-slate-100">${r.profiles?.full_name || 'Anonymous User'}</span>
                                </div>
                                <div class="flex text-yellow-500 text-sm gap-0.5">
                                    ${Array(5).fill(0).map((_, i) => `<span class="material-symbols-outlined text-[16px]">${i < r.rating ? 'star' : 'star_border'}</span>`).join('')}
                                </div>
                            </div>
                            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">${r.comment || 'No written feedback provided.'}</p>
                            
                            ${r.vendor_reply ? `
                            <div class="mt-4 bg-white dark:bg-slate-900 p-4 rounded-lg border-l-4 border-primary">
                                <span class="text-xs font-bold text-primary uppercase tracking-wider mb-1 block">Property Owner Reply</span>
                                <p class="text-sm text-slate-700 dark:text-slate-300">"${r.vendor_reply}"</p>
                            </div>` : ''}
                        </div>`).join('') || `
                        <div class="text-center py-8">
                            <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">rate_review</span>
                            <p class="text-slate-500">No reviews yet. Be the first to share your experience!</p>
                        </div>`}
                    </div>

                    </div>

                    ${(() => {
                        if (!isLoggedIn()) {
                            return `
                            <div class="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                                <p class="text-slate-500 text-sm mb-3">You must be logged in to write a review.</p>
                                <button onclick="window.location.hash='/auth'" class="bg-primary/10 text-primary font-bold px-6 py-2 rounded-lg hover:bg-primary/20 transition-all">Log In</button>
                            </div>`;
                        }
                        
                        const userReview = pg.reviews?.find(r => r.user_id === state.user.id);
                        if (userReview) {
                            return `
                            <div class="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h4 class="font-bold mb-4 text-slate-900 dark:text-white">Edit Your Review</h4>
                                <div class="flex items-center justify-between mb-4">
                                    <div class="flex items-center gap-1" id="review-stars" data-existing="${userReview.rating}">
                                        ${[1, 2, 3, 4, 5].map(i => `<button class="review-star focus:outline-none ${i <= userReview.rating ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-400'} transition-colors" data-val="${i}"><span class="material-symbols-outlined text-3xl font-bold" style="${i <= userReview.rating ? 'font-variation-settings: \\\'FILL\\\' 1;' : ''}">${i <= userReview.rating ? 'star' : 'star_border'}</span></button>`).join('')}
                                    </div>
                                    <button id="delete-review-btn" data-id="${userReview.id}" class="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-2 rounded-lg transition-colors flex items-center justify-center" title="Delete Review">
                                        <span class="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                                <textarea id="review-text" rows="3" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400 mb-4 resize-y" placeholder="Share details of your experience...">${userReview.comment || ''}</textarea>
                                <button id="update-review" data-id="${userReview.id}" class="bg-primary text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:brightness-110 transition-all">Update Review</button>
                            </div>`;
                        }
                        
                        return `
                        <div class="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h4 class="font-bold mb-4 text-slate-900 dark:text-white">Write a Review</h4>
                            <div class="flex items-center gap-1 mb-4" id="review-stars">
                                ${[1, 2, 3, 4, 5].map(i => `<button class="review-star text-slate-300 hover:text-yellow-400 transition-colors focus:outline-none" data-val="${i}"><span class="material-symbols-outlined text-3xl">star_border</span></button>`).join('')}
                            </div>
                            <textarea id="review-text" rows="3" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400 mb-4 resize-y" placeholder="Share details of your experience at this property..."></textarea>
                            <button id="submit-review" class="bg-primary text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:brightness-110 transition-all">Submit Review</button>
                        </div>`;
                    })()}
                </div>
            </div>

            <!-- Right Column: Sticky actions sidebar -->
            <div class="relative">
                <div class="lg:sticky lg:top-24 space-y-6">
                    
                    <!-- Vendor Profile Card -->
                    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6">
                        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Listed By</h3>
                        <a href="#/vendor/${pg.vendor_id}" class="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800 group hover:opacity-90 transition-opacity">
                            <div class="flex items-center gap-4">
                                <div class="size-14 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                                    ${vendor.avatar_url ? `<img src="${vendor.avatar_url}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-2xl text-slate-400">person</span>`}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-bold text-lg text-slate-900 dark:text-white truncate capitalize group-hover:text-primary transition-colors">${vendor.full_name || 'Property Owner'}</p>
                                    <p class="text-xs text-slate-500 font-medium">Verified Vendor <span class="material-symbols-outlined text-green-500 text-[14px] relative top-[3px]">verified_user</span></p>
                                </div>
                            </div>
                            <span class="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                        </a>

                        <div class="flex gap-3 mb-6">
                            <button id="save-pg-btn" class="flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl border ${isSaved ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-red-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary'} transition-colors group">
                                <span class="material-symbols-outlined text-2xl group-active:scale-90 transition-transform ${isSaved ? 'icon-filled' : ''}">${isSaved ? 'favorite' : 'favorite_border'}</span>
                                <span class="text-xs font-bold">${isSaved ? 'Saved' : 'Save'}</span>
                            </button>
                            <button id="compare-pg-btn" class="flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary transition-colors group">
                                <span class="material-symbols-outlined text-2xl group-active:scale-90 transition-transform">compare_arrows</span>
                                <span class="text-xs font-bold">Compare</span>
                            </button>
                        </div>

                        <!-- Contact Actions -->
                        ${pg.vendor_id === state.user?.id ? `
                        <div class="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-center font-bold">
                            <span class="material-symbols-outlined block text-3xl mb-1">home</span>
                            This is your property
                        </div>
                        ` : isAdmin() ? `
                        <div class="bg-slate-50 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-bold">
                            <span class="material-symbols-outlined block text-3xl mb-1">admin_panel_settings</span>
                            Viewing as Admin
                        </div>
                        ` : `
                        <div class="space-y-3 mb-6">
                            <div id="booking-button-container">
                                ${renderBookingButton(currentVisit)}
                            </div>
                            <button id="chat-owner-btn" class="flex items-center justify-center gap-2 w-full bg-primary/10 hover:bg-primary/20 text-primary font-bold py-3 rounded-xl transition-colors shadow-sm">
                                <span class="material-symbols-outlined text-[20px]">chat</span> Chat with Owner
                            </button>
                        </div>
                        `}
                        
                        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                            <button id="report-pg-btn" class="text-[11px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1 mx-auto transition-colors">
                                <span class="material-symbols-outlined text-[14px]">flag</span> Report Listing
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>

      ${renderFooter()}
    </div>
  `;

    initNavbarEvents();

    if (pg.latitude && pg.longitude) {
        setTimeout(() => {
            const mapContainer = document.getElementById('pg-map');
            if (!mapContainer || typeof L === 'undefined') return;
            if (mapContainer) {
                const map = L.map(mapContainer).setView([pg.latitude, pg.longitude], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);

                // Main Marker
                const customIcon = L.divIcon({
                    className: 'custom-price-pin',
                    html: `<div class="bg-primary text-white size-5 rounded-full border-2 border-white shadow flex items-center justify-center"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                L.marker([pg.latitude, pg.longitude], { icon: customIcon }).addTo(map).bindPopup(pg.name);

                // Add nearby places pins lightly
                nearbyPlaces.forEach(p => {
                    if (p.lat && p.lng) {
                        const placeIcon = L.divIcon({
                            className: 'custom-sub-pin',
                            html: `<div class="bg-slate-400 text-white size-3 rounded-full border border-white shadow opacity-80"></div>`,
                            iconSize: [12, 12],
                            iconAnchor: [6, 6]
                        });
                        L.marker([p.lat, p.lng], { icon: placeIcon }).addTo(map).bindPopup(p.name);
                    }
                });
            }
        }, 300);
    }

    // Gallery nav
    window._pgImgNav = (dir) => {
        currentImg = (currentImg + dir + images.length) % images.length;
        const gallery = document.getElementById('pg-gallery');
        // Simple fade overlay effect
        gallery.style.opacity = '0.7';
        setTimeout(() => {
            gallery.style.backgroundImage = `url(${images[currentImg]})`;
            gallery.style.opacity = '1';
        }, 150);

        document.querySelectorAll('.gallery-dot').forEach((d, i) => {
            if (i === currentImg) {
                d.className = 'size-2 rounded-full transition-all duration-300 gallery-dot bg-white w-4';
            } else {
                d.className = 'size-2 rounded-full transition-all duration-300 gallery-dot bg-white/50 w-2';
            }
        });
    };

    // Review stars logic
    const starsContainer = document.getElementById('review-stars');
    let reviewRating = starsContainer ? parseInt(starsContainer.dataset.existing) || 0 : 0;
    
    document.querySelectorAll('.review-star').forEach(btn => {
        btn.onclick = () => {
            reviewRating = +btn.dataset.val;
            document.querySelectorAll('.review-star').forEach((b, i) => {
                b.innerHTML = i < reviewRating ? `<span class="material-symbols-outlined text-3xl text-yellow-400 font-bold" style="font-variation-settings: 'FILL' 1;">star</span>` : `<span class="material-symbols-outlined text-3xl">star_border</span>`;
                b.className = i < reviewRating ? 'review-star text-yellow-400 transition-colors focus:outline-none' : 'review-star text-slate-300 hover:text-yellow-400 transition-colors focus:outline-none';
            });
        };
    });

    document.getElementById('submit-review')?.addEventListener('click', async () => {
        if (!reviewRating) { showToast('Please select a rating of at least 1 star', 'error'); return; }
        const comment = document.getElementById('review-text').value.trim();
        showLoading();
        try {
            await createReview({ listing_id: id, user_id: state.user.id, rating: reviewRating, comment: comment });
            showToast('Review submitted successfully!', 'success');
            renderPGDetails({ id }); // Refresh
        } catch (e) { showToast(e.message || 'Failed to submit review', 'error'); }
        hideLoading();
    });

    document.getElementById('update-review')?.addEventListener('click', async (e) => {
        if (!reviewRating) { showToast('Please select a rating of at least 1 star', 'error'); return; }
        const comment = document.getElementById('review-text').value.trim();
        const reviewId = e.target.dataset.id;
        showLoading();
        try {
            await updateReview(reviewId, reviewRating, comment);
            showToast('Review updated successfully!', 'success');
            renderPGDetails({ id }); // Refresh
        } catch (err) { showToast(err.message || 'Failed to update review', 'error'); }
        hideLoading();
    });

    document.getElementById('delete-review-btn')?.addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to delete your review?')) return;
        const reviewId = e.currentTarget.dataset.id;
        showLoading();
        try {
            await deleteReview(reviewId);
            showToast('Review deleted successfully!', 'success');
            renderPGDetails({ id }); // Refresh
        } catch (err) { showToast(err.message || 'Failed to delete review', 'error'); }
        hideLoading();
    });

    document.getElementById('save-pg-btn')?.addEventListener('click', async () => {
        if (!isLoggedIn()) { navigate('/auth'); return; }
        const btn = document.getElementById('save-pg-btn');
        try {
            if (state.savedListings.has(id)) {
                await unsaveListing(state.user.id, id);
                state.savedListings.delete(id);
                showToast('Removed from saved items', 'info');
            } else {
                await saveListing(state.user.id, id);
                state.savedListings.add(id);
                showToast('Added to saved items ❤️', 'success');
                trackPGSave(id);
            }
            // Minor optimisitic update to avoid full reload
            renderPGDetails({ id });
        } catch (e) { showToast(e.message, 'error'); }
    });

    document.getElementById('compare-pg-btn')?.addEventListener('click', () => {
        if (addToCompare(pg)) showToast('Added to compare list', 'success');
        else showToast('Compare list is full (max 4)', 'error');
    });

    let activeChatChannel = null;

    // Handle dynamic booking buttons (event delegation on container or document)

    if (window._pgClickHandler) document.removeEventListener('click', window._pgClickHandler);
    window._pgClickHandler = async (e) => {

        const btn = e.target.closest('#book-visit-btn') || e.target.closest('#book-visit-btn-mobile');
        if (btn) {
            trackContactClick(id, 'visit_request');
            if (!isLoggedIn()) { navigate('/auth'); return; }

            const modalId = 'book-visit-modal';
            if (document.getElementById(modalId)) document.getElementById(modalId).remove();

            const today = new Date().toISOString().split('T')[0];

            const modalObj = document.createElement('div');
            modalObj.id = modalId;
            modalObj.className = 'fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in';
            modalObj.innerHTML = `
                <div class="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 class="font-bold text-lg flex items-center gap-2"><span class="material-symbols-outlined text-primary">calendar_month</span> Book a Visit</h3>
                        <button id="close-visit-modal" class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="p-5 overflow-y-auto pb-10 sm:pb-5">
                        <form id="book-visit-form" class="space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Select Date <span class="text-red-500">*</span></label>
                                    <input type="date" id="visit-date" required min="${today}" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white dark:color-scheme-dark">
                                </div>
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Time <span class="text-red-500">*</span></label>
                                    <input type="time" id="visit-time" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white dark:color-scheme-dark">
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="relative">
                                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Gender <span class="text-red-500">*</span></label>
                                    <select id="visit-gender" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white appearance-none cursor-pointer">
                                        <option value="" disabled ${!state.profile?.gender ? 'selected' : ''}>Select Gender</option>
                                        <option value="male" ${state.profile?.gender === 'male' ? 'selected' : ''}>Male</option>
                                        <option value="female" ${state.profile?.gender === 'female' ? 'selected' : ''}>Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone <span class="text-red-500">*</span></label>
                                    <input type="tel" id="visit-phone" required placeholder="10-digit number" pattern="[0-9]{10}" maxlength="10" value="${state.profile?.phone || ''}" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400">
                                </div>
                            </div>
                            <div id="visit-safety-msg" class="${state.profile?.gender === 'female' ? 'flex' : 'hidden'} bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 p-3 rounded-xl text-xs text-pink-700 dark:text-pink-300 items-start gap-2 mt-[-0.5rem]">
                                <span class="material-symbols-outlined text-[16px] relative top-px">security</span>
                                <span>For your safety, please do not share your personal number. Instead, share your father’s, brother’s, or a trusted person’s contact number.</span>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Message (Optional)</label>
                                <textarea id="visit-message" rows="2" placeholder="Any specific requirements or questions?" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"></textarea>
                            </div>
                            <button type="submit" id="submit-visit-btn" class="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-md hover:shadow-lg disabled:opacity-70">
                                Confirm Booking
                            </button>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modalObj);

            document.getElementById('close-visit-modal').onclick = () => modalObj.remove();
            
            const genderSelect = document.getElementById('visit-gender');
            const safetyMsg = document.getElementById('visit-safety-msg');
            if (genderSelect && safetyMsg) {
                genderSelect.addEventListener('change', (e) => {
                    if (e.target.value === 'female') {
                        safetyMsg.classList.remove('hidden');
                        safetyMsg.classList.add('flex');
                    } else {
                        safetyMsg.classList.add('hidden');
                        safetyMsg.classList.remove('flex');
                    }
                });
            }

            // Handle Form Submits
            document.getElementById('book-visit-form').onsubmit = async (evt) => {
                evt.preventDefault();
                const btn2 = document.getElementById('submit-visit-btn');
                btn2.disabled = true;
                btn2.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Processing...';

                try {
                    const dt = document.getElementById('visit-date').value;
                    const tm = document.getElementById('visit-time').value;
                    const ph = document.getElementById('visit-phone').value;
                    const gender = document.getElementById('visit-gender').value;
                    const ms = document.getElementById('visit-message').value;

                    const newVisit = await createVisitRequest({
                        listing_id: id,
                        vendor_id: pg.vendor_id,
                        user_id: state.user.id, // User who is requesting
                        visit_date: dt,
                        visit_time: tm,
                        name: state.user.user_metadata?.full_name || 'User',
                        phone: ph,
                        gender: gender,
                        message: ms
                    });

                    showToast('Visit request sent successfully!', 'success');
                    modalObj.remove();

                    // Update UI immediately to Pending
                    currentVisit = newVisit;
                    const container = document.getElementById('booking-button-container');
                    if (container) container.innerHTML = renderBookingButton(currentVisit);

                    // Notify Vendor
                    sendTargetedNotification(
                        pg.vendor_id,
                        '📅 New Visit Request',
                        `${state.user.user_metadata?.full_name || 'A user'} wants to visit "${pg.name}" on ${new Date(dt).toLocaleDateString()} at ${tm}.`,
                        'visit_request'
                    ).catch(console.error);

                    insertRecentActivity(pg.vendor_id, 'visit_request', `New visit request for ${pg.name}`, { listing_id: id }).catch(console.error);
                } catch (err) {
                    console.error('Visit error:', err);
                    showToast(err.message || 'Failed to request visit', 'error');
                    btn2.disabled = false;
                    btn2.innerHTML = 'Confirm Booking';
                }
            };
        }

        // Cancel Booking Logic
        const cancelBtn = e.target.closest('#cancel-visit-btn');
        if (cancelBtn) {
            const vid = cancelBtn.dataset.id;
            if (confirm('Are you sure you want to cancel this approved visit?')) {
                const prevHtml = cancelBtn.innerHTML;
                cancelBtn.innerHTML = 'Cancelling...';
                cancelBtn.disabled = true;
                try {
                    await cancelVisitRequest(vid);
                    showToast('Visit cancelled', 'success');

                    // Notify Vendor
                    sendTargetedNotification(
                        pg.vendor_id,
                        '⚠️ Visit Cancelled',
                        `${state.user.user_metadata?.full_name || 'A user'} has cancelled their approved visit to "${pg.name}".`,
                        'visit_cancelled'
                    ).catch(console.error);

                    // Reset button
                    currentVisit = null;
                    const container = document.getElementById('booking-button-container');
                    if (container) container.innerHTML = renderBookingButton(currentVisit);
                } catch (err) {
                    console.error(err);
                    showToast('Failed to cancel', 'error');
                    cancelBtn.innerHTML = prevHtml;
                    cancelBtn.disabled = false;
                }
            }
        }
    };

    document.addEventListener('click', window._pgClickHandler);

    // Remove the old static listener


    if (window._pgChatHandler) document.removeEventListener('click', window._pgChatHandler);
    window._pgChatHandler = async (e) => {
        const chatBtn = e.target.closest('#chat-owner-btn') || e.target.closest('#contact-owner-btn-mobile');
        if (!chatBtn) return;

        trackContactClick(id, 'chat');
        if (!isLoggedIn()) { navigate('/auth'); return; }

        const modalId = 'chat-modal';
        if (document.getElementById(modalId)) document.getElementById(modalId).remove();

        const modalObj = document.createElement('div');
        modalObj.id = modalId;
        modalObj.className = 'fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in';
        modalObj.innerHTML = `
            <div class="bg-white dark:bg-slate-900 shadow-2xl w-full sm:max-w-lg sm:rounded-2xl overflow-hidden flex flex-col h-[85vh] sm:h-[600px] border border-slate-200 dark:border-slate-800 relative">
                <!-- Header -->
                <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0 z-10 shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                             ${vendor.avatar_url ? `<img src="${vendor.avatar_url}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-slate-400">person</span>`}
                        </div>
                        <div>
                            <h3 class="font-bold text-[15px] text-slate-900 dark:text-white leading-none capitalize">${vendor.full_name || 'Property Owner'}</h3>
                            <p class="text-[11px] text-slate-500 font-medium tracking-wide truncate max-w-[200px] mt-1">${pg.name}</p>
                        </div>
                    </div>
                    <button id="close-chat-modal" class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><span class="material-symbols-outlined">close</span></button>
                </div>
                
                <!-- Warning Banner -->
                <div class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-900/50 p-2.5 shrink-0">
                    <p class="text-[11px] text-amber-800 dark:text-amber-500 leading-snug flex items-start gap-1.5 font-medium">
                        <span class="material-symbols-outlined text-[14px] relative top-px">warning</span>
                        <span>This chat is monitored by StayNest. Do not share phone numbers or personal details. Violation may lead to account suspension.</span>
                    </p>
                </div>
                
                <!-- Chat History -->
                <div id="chat-messages-container" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#0f172a]">
                    <div class="flex justify-center"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                </div>
                
                <!-- Chat Input -->
                <div class="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-end gap-2">
                    <textarea id="chat-input-msg" rows="1" class="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-0 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 resize-none max-h-32" style="min-height:44px;" placeholder="Message to ${vendor.full_name || 'Owner'}..."></textarea>
                    <button id="send-chat-btn" class="size-11 rounded-full bg-primary hover:brightness-110 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                        <span class="material-symbols-outlined text-[20px] ml-1">send</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalObj);

        const closeChat = () => {
            if (activeChatChannel) {
                unsubscribeChat(activeChatChannel);
                activeChatChannel = null;
            }
            modalObj.remove();
        };

        document.getElementById('close-chat-modal').onclick = closeChat;

        const messagesContainer = document.getElementById('chat-messages-container');
        const inputMsg = document.getElementById('chat-input-msg');
        const sendBtn = document.getElementById('send-chat-btn');

        // Auto-resize textarea
        inputMsg.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            sendBtn.disabled = !this.value.trim();
        });

        const renderMessage = (msg) => {
            const isMe = !msg.is_from_vendor; // User is me
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const bubbleClass = isMe
                ? 'bg-primary text-white rounded-tr-sm'
                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm rounded-tl-sm';
            const alignClass = isMe ? 'items-end' : 'items-start';
            return '<div class="flex flex-col w-full ' + alignClass + ' animate-in slide-in-from-bottom-2 fade-in duration-200">'
                + '<div class="max-w-[80%] rounded-2xl px-4 py-2.5 ' + bubbleClass + '">'
                + '<p class="text-[14px] leading-relaxed break-words">' + (msg.message || '') + '</p>'
                + '</div>'
                + '<span class="text-[10px] text-slate-400 font-medium mt-1 px-1">' + timeStr + '</span>'
                + '</div>';
        };

        // Load messages
        try {
            const msgs = await getListingChatMessages(id, state.user.id, pg.vendor_id);
            messagesContainer.innerHTML = msgs.length ?
                msgs.map(m => renderMessage(m)).join('') :
                '<div class="h-full flex flex-col items-center justify-center text-slate-400"><span class="material-symbols-outlined text-4xl mb-2">forum</span><p class="text-sm">Start the conversation</p></div>';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Subscribe to new messages

            if (activeChatChannel) { unsubscribeChat(activeChatChannel); activeChatChannel = null; }
            activeChatChannel = subscribeToListingChats(id, state.user.id, pg.vendor_id, (newMsg) => {
                if (messagesContainer.innerHTML.includes('Start the conversation')) messagesContainer.innerHTML = '';
                messagesContainer.insertAdjacentHTML('beforeend', renderMessage(newMsg));
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
        } catch (e) {
            console.error(e);
            messagesContainer.innerHTML = '<div class="text-red-500 text-center text-sm p-4">Failed to load chat history.</div>';
        }


        const handleSendChat = async () => {
            if (!sendBtn || sendBtn.disabled) return;
            const text = inputMsg.value.trim();
            if (!text) return;

            // Optional: Regex check for strict phone number sharing
            const phoneRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{2}\b/;
            if (phoneRegex.test(text)) {
                showToast("It looks like you're sending a phone number. This is against policy.", "error");
                return;
            }

            inputMsg.value = '';
            inputMsg.style.height = 'auto';
            sendBtn.disabled = true;

            const tempMsg = {
                message: text,
                is_from_vendor: false,
                created_at: new Date().toISOString()
            };

            if (messagesContainer.innerHTML.includes('Start the conversation')) messagesContainer.innerHTML = '';
            messagesContainer.insertAdjacentHTML('beforeend', renderMessage(tempMsg));
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            try {
                await sendListingChatMessage({
                    listing_id: id,
                    user_id: state.user.id,
                    vendor_id: pg.vendor_id,
                    message: text,
                    is_from_vendor: false
                });
                // Notify vendor of new chat message (fire-and-forget)
                sendTargetedNotification(
                    pg.vendor_id,
                    '💬 New Message',
                    `${state.user.user_metadata?.full_name || 'A user'} sent you a message regarding "${pg.name}".`,
                    'new_chat_message'
                ).catch(console.error);
            } catch (err) {
                console.error(err);
                showToast('Failed to send message', 'error');
                sendBtn.disabled = false;
            }
        };

        sendBtn.onclick = handleSendChat;
        inputMsg.onkeydown = (ev) => {
            if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                handleSendChat();
            }
        };
    };
    
    document.getElementById('report-pg-btn')?.addEventListener('click', () => {
        if (!isLoggedIn()) { navigate('/auth'); return; }
        
        const modalId = 'report-modal';
        if (document.getElementById(modalId)) document.getElementById(modalId).remove();
        
        const modalObj = document.createElement('div');
        modalObj.id = modalId;
        modalObj.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in py-4 px-4';
        modalObj.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden flex flex-col">
                <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 class="font-bold text-lg flex items-center gap-2"><span class="material-symbols-outlined text-red-500">flag</span> Report Listing</h3>
                    <button id="close-report-modal" class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><span class="material-symbols-outlined">close</span></button>
                </div>
                <div class="p-5 overflow-y-auto">
                    <form id="report-listing-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Reporting <span class="text-red-500">*</span></label>
                            <select id="report-reason" required class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-slate-900 dark:text-white appearance-none cursor-pointer">
                                <option value="" disabled selected>Select a reason</option>
                                <option value="Fake listing">Fake listing / Doesn't exist</option>
                                <option value="Wrong price">Inaccurate pricing</option>
                                <option value="Incorrect location">Incorrect location</option>
                                <option value="Spam or scam">Spam or scam</option>
                                <option value="Offensive content">Offensive content</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Additional Details (Optional)</label>
                            <textarea id="report-desc" rows="3" placeholder="Please provide more context..." class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"></textarea>
                        </div>
                        <button type="submit" id="submit-report-btn" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-md disabled:opacity-70">
                            Submit Report
                        </button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalObj);
        
        document.getElementById('close-report-modal').onclick = () => modalObj.remove();
        
        document.getElementById('report-listing-form').onsubmit = async (evt) => {
            evt.preventDefault();
            const btn = document.getElementById('submit-report-btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Submitting...';
            
            try {
                const reason = document.getElementById('report-reason').value;
                const desc = document.getElementById('report-desc').value.trim();
                
                await createReport({
                    listing_id: id,
                    reported_by: state.user.id,
                    reason: reason,
                    description: desc || null,
                    status: 'pending'
                });
                
                showToast('Report submitted successfully. Our team will review it.', 'success');
                modalObj.remove();
            } catch (err) {
                console.error(err);
                showToast(err.message || 'Failed to submit report', 'error');
                btn.disabled = false;
                btn.innerHTML = 'Submit Report';
            }
        };
    });

    return () => {
        delete window._pgImgNav;
        if (activeChatChannel) {
            unsubscribeChat(activeChatChannel);
            activeChatChannel = null;
        }
    };
}
