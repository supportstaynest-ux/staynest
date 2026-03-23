import { state, isLoggedIn, isVendor, isAdmin, formatPrice, avgRating, renderStars, getAmenityIcon, showToast, CITIES } from '../state.js';
import { navigate } from '../router.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { getListings, saveListing, unsaveListing, getThumbnail, searchLocations, createReport } from '../supabase.js';

export async function renderHome() {
    const app = document.getElementById('app');

    // Show skeleton loading state immediately
    app.innerHTML = `
    <div class="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      ${renderNavbar('StayNest')}
      <main class="flex-grow">
        <section class="relative h-[500px] flex items-center justify-center overflow-hidden bg-slate-200 dark:bg-slate-800 animate-pulse"></section>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div class="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-8"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${[1, 2, 3].map(() => `
                <div class="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                    <div class="h-56 bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
                    <div class="p-5 space-y-3">
                        <div class="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                        <div class="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                        <div class="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                    </div>
                </div>`).join('')}
            </div>
        </div>
      </main>
    </div>`;
    initNavbarEvents();

    let featured = [];
    try { featured = await getListings({ featured: true, limit: 6 }); } catch (e) { }
    if (!featured.length) try { featured = await getListings({ limit: 6 }); } catch (e) { }


    app.innerHTML = `
    <div class="relative flex min-h-screen w-full flex-col">
      ${renderNavbar('StayNest')}
      <main class="flex-grow animate-in">
        <!-- Hero Section -->
        <section class="relative overflow-hidden bg-[#faf9f7] dark:bg-slate-900">
            <!-- Desktop: Full background image -->
            <div class="hidden sm:flex relative h-[440px] md:h-[500px] items-center justify-center">
                <div class="absolute inset-0 z-0">
                    <div class="absolute inset-0 bg-gradient-to-b from-slate-900/40 to-slate-900/20 z-10"></div>
                    <img src="/hero-skyline.jpg" alt="Indian Landmarks Skyline" class="w-full h-full object-cover object-center" />
                </div>
                <div class="relative z-20 w-full max-w-4xl mx-auto px-4 text-center">
                    <div class="animate-in slideInDown duration-700">
                        <h1 class="text-4xl md:text-6xl font-black text-white drop-shadow-lg mb-6 tracking-wide" style="line-height:1.2;">
                            Find Your <span class="bg-primary text-white px-5 py-1 rounded-xl shadow-lg shadow-primary/30 inline-block transform -translate-y-1">Perfect</span> PG Stay
                        </h1>
                        <p class="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-white drop-shadow-md font-medium">Premium living spaces for students and working professionals across India.</p>
                    </div>
                    <div class="relative max-w-3xl mx-auto animate-in slideInUp duration-700 delay-200">
                        <div class="flex items-center bg-white rounded-2xl p-2 shadow-2xl" style="border:1px solid #e2e8f0;">
                            <span class="material-symbols-outlined px-4" style="color:#94a3b8; font-size:24px;">search</span>
                            <input id="hero-search" class="w-full border-none focus:ring-0 outline-none bg-transparent py-3 font-semibold text-slate-900" placeholder="Search city, area, college..." type="text" style="font-size:15px;"/>
                            <button id="hero-near-me-btn" class="flex items-center justify-center p-2.5 rounded-lg text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all mr-2" title="Use my location">
                                <span class="material-symbols-outlined text-[20px]">my_location</span>
                            </button>
                            <button id="hero-search-btn" class="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 shadow-md shadow-primary/20 transition-all">Search</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile: Stacked layout (text on top, skyline visible at bottom) -->
            <div class="sm:hidden relative flex flex-col pt-12 pb-0">
                <div class="relative z-20 px-4 text-center mb-6">
                    <div class="animate-in slideInDown duration-700">
                        <h1 class="text-3xl font-black text-slate-900 dark:text-white mb-4" style="line-height:1.2;">
                            Find Your <span class="bg-primary text-white px-3 py-1 rounded-lg shadow-lg shadow-primary/30 inline-block transform -translate-y-1">Perfect</span> PG Stay
                        </h1>
                        <p class="text-base text-slate-600 dark:text-slate-400 font-medium mb-6">Premium living spaces for students and working professionals across India.</p>
                    </div>
                    <div class="relative w-full max-w-md mx-auto animate-in slideInUp duration-700 delay-200">
                        <div class="flex items-center bg-white rounded-2xl p-2 shadow-xl" style="border:1px solid #e2e8f0;">
                            <span class="material-symbols-outlined px-2" style="color:#94a3b8; font-size:20px;">search</span>
                            <input id="mobile-hero-search" class="w-full border-none focus:ring-0 outline-none bg-transparent py-2 font-semibold text-slate-900" placeholder="Search city..." type="text" style="font-size:14px;"/>
                            <button id="mobile-hero-near-me-btn" class="flex items-center justify-center p-2 rounded-lg text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all mr-1" title="Use my location">
                                <span class="material-symbols-outlined text-[18px]">my_location</span>
                            </button>
                            <button id="mobile-hero-search-btn" class="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:brightness-110 shadow-md shadow-primary/20 transition-all text-sm">Search</button>
                        </div>
                    </div>
                </div>
                <!-- Skyline Image at bottom -->
                <div class="relative w-full h-48 mt-2 pointer-events-none">
                    <img src="/hero-skyline.jpg" alt="Indian Landmarks Skyline" class="w-full h-full object-cover object-top opacity-90" />
                </div>
            </div>
        </section>
        <script>
            // Need to handle event listeners after render
        </script>


        <!-- Filters Section -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-30">
            <div class="flex gap-4 items-center overflow-x-auto no-scrollbar pb-2">
                <span class="text-[13px] font-bold uppercase tracking-widest mr-2 whitespace-nowrap text-slate-400">QUICK FILTERS:</span>
                ${['Budget', 'Single Room', 'Double Sharing', 'AC', 'Food Included', 'Near College'].map(f => `
                <button onclick="window.location.hash='/explore?q=${encodeURIComponent(f)}'" class="flex items-center justify-center px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap bg-[#f4f6f9] text-slate-700 hover:bg-[#e2e8f0] rounded-xl">
                    ${f}
                </button>
                `).join('')}
            </div>
        </div>

        <!-- Popular Cities -->
        <section class="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-end justify-between mb-8">
                <div>
                    <h2 class="text-3xl font-bold">Popular Cities</h2>
                    <p class="text-slate-500 dark:text-slate-400 mt-2">Find stays in top educational and tech hubs.</p>
                </div>
                <a href="#/explore" class="text-primary font-semibold hover:underline flex items-center gap-1">View All <span class="material-symbols-outlined">arrow_forward</span></a>
            </div>
            
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                ${[
            { name: 'Lucknow', img: '/images/lucknow.jpg' },
            { name: 'Delhi', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=800&auto=format&fit=crop' },
            { name: 'Mumbai', img: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?q=80&w=800&auto=format&fit=crop' },
            { name: 'Bangalore', img: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=800&auto=format&fit=crop' }
        ].map((city) => `
                <div class="group relative overflow-hidden rounded-xl h-64 shadow-md cursor-pointer" onclick="window.location.hash='/explore?city=${city.name}'">
                    <img src="${city.img}" alt="${city.name} architecture" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                        <h3 class="text-white text-2xl font-bold">${city.name}</h3>
                        <div class="flex justify-between items-center mt-2">
                            <span class="text-white/80 text-sm">Explore PGs</span>
                            <button class="bg-primary/20 backdrop-blur-md text-white border border-white/30 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary transition-colors">Explore</button>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </section>

        <!-- Featured PG Listings -->
        <section class="py-16" style="background:#f8fafc;">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-end justify-between mb-8">
                    <h2 class="text-3xl font-bold text-slate-900">Featured PG Listings</h2>
                    <a href="#/explore" class="font-semibold hover:underline flex items-center gap-1" style="color:#0ea5e9;">View All <span class="material-symbols-outlined">arrow_forward</span></a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${featured.length ? featured.map(pg => renderPGCard(pg)).join('') : '<div class="col-span-1 md:col-span-3 text-center py-12"><span class="material-symbols-outlined text-6xl text-slate-300">holiday_village</span><h3 class="text-xl font-bold mt-4 text-slate-500">No listings yet</h3></div>'}
                </div>
            </div>
        </section>

        <!-- Why StayNest Section -->
        <section class="relative py-20 overflow-hidden">
            <!-- Subtle Indian Culture Background -->
            <div class="absolute inset-0 z-0 pointer-events-none">
                <img src="/hero-skyline.jpg" alt="" class="w-full h-full object-contain object-bottom" style="opacity:0.25;" />
            </div>
            <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <span class="inline-block bg-primary/10 text-primary text-sm font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide uppercase">Our Promise</span>
                <h2 class="text-3xl md:text-4xl font-black">Why Choose <span class="text-primary">StayNest</span>?</h2>
                <p class="text-slate-500 dark:text-slate-400 mt-4 max-w-2xl mx-auto">We redefine the way students and professionals find and book their living spaces.</p>
                <div class="w-16 h-1 bg-primary rounded-full mx-auto mt-4"></div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div class="flex flex-col items-center text-center group">
                    <div class="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                        <span class="material-symbols-outlined text-3xl text-primary group-hover:text-white transition-colors">verified_user</span>
                    </div>
                    <h3 class="text-xl font-bold mb-3">Verified Listings</h3>
                    <p class="text-slate-500 dark:text-slate-400">Every property on StayNest is personally visited and verified by our field officers to ensure 100% authenticity.</p>
                </div>
                <div class="flex flex-col items-center text-center group">
                    <div class="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                        <span class="material-symbols-outlined text-3xl text-primary group-hover:text-white transition-colors">search_check</span>
                    </div>
                    <h3 class="text-xl font-bold mb-3">Easy Search</h3>
                    <p class="text-slate-500 dark:text-slate-400">Advanced filters help you find rooms based on your budget, preferred area, and necessary amenities in seconds.</p>
                </div>
                <div class="flex flex-col items-center text-center group">
                    <div class="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                        <span class="material-symbols-outlined text-3xl text-primary group-hover:text-white transition-colors">contact_support</span>
                    </div>
                    <h3 class="text-xl font-bold mb-3">Secure Contact</h3>
                    <p class="text-slate-500 dark:text-slate-400">Communicate directly with PG owners through our secure messaging platform without sharing personal details early.</p>
                </div>
            </div>
            </div>
        </section>

        <!-- Call to Action Banner -->
        ${(isVendor() || isAdmin()) ? `
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            <div class="bg-primary rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
                <div class="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div class="relative z-10 max-w-xl text-center md:text-left mb-8 md:mb-0">
                    <h2 class="text-3xl md:text-5xl font-black text-white mb-4">Are you a PG Owner?</h2>
                    <p class="text-white/80 text-lg">List your property with us and reach thousands of potential tenants daily. No middlemen, no hassle.</p>
                </div>
                <button onclick="window.location.hash='/vendor/add-listing'" class="relative z-10 bg-white text-primary px-10 py-5 rounded-2xl text-xl font-black hover:bg-slate-50 transition-all shadow-xl whitespace-nowrap">List Your PG</button>
            </div>
        </section>` : ''}
      </main>
      ${renderFooter()}
    </div>
  `;

    const searchInput = document.getElementById('hero-search');
    const searchButton = document.getElementById('hero-search-btn');
    const nearMeBtn = document.getElementById('hero-near-me-btn');
    
    const mSearchInput = document.getElementById('mobile-hero-search');
    const mSearchButton = document.getElementById('mobile-hero-search-btn');
    const mNearMeBtn = document.getElementById('mobile-hero-near-me-btn');

    // Attach search logic for both desktop and mobile
    const attachSearch = (inputEl, btnEl) => {
        if (!inputEl || !btnEl) return;
        btnEl.addEventListener('click', () => {
            const query = inputEl.value.trim();
            let hash = '/explore?';
            if (query) hash += `q=${encodeURIComponent(query)}`;
            if (!query) hash += 'q=';
            navigate(hash);
        });
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnEl.click();
        });
    };

    attachSearch(searchInput, searchButton);
    attachSearch(mSearchInput, mSearchButton);

    const attachNearMe = (btnEl) => {
        if (!btnEl) return;
        btnEl.addEventListener('click', () => {
            if (navigator.geolocation) {
                btnEl.disabled = true;
                const origHtml = btnEl.innerHTML;
                btnEl.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>';
                navigator.geolocation.getCurrentPosition(
                    (pos) => navigate(`/explore?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`),
                    () => { btnEl.disabled = false; btnEl.innerHTML = origHtml; }
                );
            }
        });
    };
    
    attachNearMe(nearMeBtn);
    attachNearMe(mNearMeBtn);

    initNavbarEvents();
    bindPGCardEvents();

}

export function renderPGCard(pg) {
    const rating = avgRating(pg.reviews);
    const amenities = (pg.amenities || []).slice(0, 4);
    const img = pg.images?.[0] ? getThumbnail(pg.images[0], 400) : '';
    const isSaved = state.savedListings?.has?.(pg.id);

    return `
    <article class="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.16)] transition-all flex flex-col group h-full" data-purpose="pg-card">
        <div class="relative h-48 sm:h-56 overflow-hidden">
            ${img ?
            `<img src="${img}" alt="${pg.name}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />` :
            `<div class="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><span class="material-symbols-outlined text-5xl text-slate-300">image</span></div>`
        }
            <button class="save-btn absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 p-2 rounded-full ${isSaved ? 'text-red-500' : 'text-slate-400'} hover:text-red-500 shadow-md transition-all active:scale-90 z-10" data-id="${pg.id}" aria-label="Save listing">
                <span class="material-symbols-outlined text-[20px] ${isSaved ? 'icon-filled' : ''}">${isSaved ? 'favorite' : 'favorite_border'}</span>
            </button>
            ${pg.is_featured ? '<div class="absolute top-3 left-3 flex items-center gap-1 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg" style="background:#f59e0b;"><span class="material-symbols-outlined text-[14px]">star</span> FEATURED</div>' : ''}
            <div class="absolute top-3 ${pg.is_featured ? 'right-12' : 'left-3'} flex gap-1.5">
                <span class="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">${pg.gender_allowed === 'female' ? 'Girls' : pg.gender_allowed === 'male' ? 'Boys' : 'Unisex'}</span>
            </div>
        </div>
        
        <div class="p-4 flex-grow flex flex-col">
            <div class="flex justify-between items-start mb-1.5 gap-2">
                <h3 class="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                    ${pg.name}
                </h3>
                <div class="flex items-center gap-1 text-amber-500 shrink-0 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md">
                    <span class="material-symbols-outlined text-[14px] fill-current">star</span>
                    <span class="text-xs font-bold">${rating > 0 ? rating.toFixed(1) : 'New'}</span>
                </div>
            </div>
            
            <p class="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 mb-4">
                <span class="material-symbols-outlined text-[14px] shrink-0">location_on</span> ${pg.address || pg.city}
            </p>
            
            <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                ${pg.room_size ? `
                <div class="flex flex-col items-center p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex-1 min-w-[50px]">
                    <span class="material-symbols-outlined text-primary text-[18px]">square_foot</span>
                    <span class="text-[9px] uppercase font-bold text-slate-400 mt-1 truncate w-full text-center">${pg.room_size} sq ft</span>
                </div>` : ''}
                ${amenities.map(a => {
            const am = getAmenityIcon(a);
            return `
                    <div class="flex flex-col items-center p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex-1 min-w-[50px]">
                        <span class="material-symbols-outlined text-primary text-[18px]">${am.icon}</span>
                        <span class="text-[9px] uppercase font-bold text-slate-400 mt-1 truncate w-full text-center">${am.label.split(' ')[0]}</span>
                    </div>`;
        }).join('')}
            </div>
            
            <div class="mt-auto flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div class="flex flex-col">
                    <span class="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Starts from</span>
                    <span class="text-lg font-black text-slate-900 dark:text-white">${formatPrice(pg.monthly_rent)}<span class="text-xs font-normal text-slate-500 ml-0.5">/mo</span></span>
                </div>
                <div class="flex items-center gap-2">
                    <button class="report-btn size-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors" data-id="${pg.id}" title="Report Listing">
                        <span class="material-symbols-outlined text-[16px]">flag</span>
                    </button>
                    <button onclick="window.location.hash='/pg/${pg.id}'" class="text-white px-5 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition-all active:scale-95" style="background:#0ea5e9;">Details</button>
                </div>
            </div>
        </div>
    </article>
  `;
}

export function bindPGCardEvents() {
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            if (!isLoggedIn()) { navigate('/auth'); return; }
            const id = btn.dataset.id;
            const icon = btn.querySelector('span');
            try {
                if (state.savedListings.has(id)) {
                    await unsaveListing(state.user.id, id);
                    state.savedListings.delete(id);
                    icon.textContent = 'favorite_border';
                    icon.classList.remove('icon-filled');
                    btn.classList.remove('text-red-500');
                    btn.classList.add('text-slate-400');
                    showToast('Removed from saved', 'info');
                } else {
                    await saveListing(state.user.id, id);
                    state.savedListings.add(id);
                    icon.textContent = 'favorite';
                    icon.classList.add('icon-filled');
                    btn.classList.remove('text-slate-400');
                    btn.classList.add('text-red-500');
                    showToast('PG Saved ❤️', 'success');
                }
            } catch (err) { showToast(err.message, 'error'); }
        };
    });

    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (!isLoggedIn()) { navigate('/auth'); return; }
            const id = btn.dataset.id;
            
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
                const submitBtn = document.getElementById('submit-report-btn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Submitting...';
                
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
    });
}
