import { state, formatPrice, AMENITIES_LIST, CITIES, showToast } from '../state.js';
import { navigate } from '../router.js';
import { getListings, searchLocations, saveSearchAlert } from '../supabase.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { renderPGCard, bindPGCardEvents } from './home.js';
import { requestNotificationPermission, getPlayerId } from '../onesignal.js';

export async function renderExplore(params) {
  const app = document.getElementById('app');
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  let filters = {
    search: urlParams.get('q') || '',
    city: urlParams.get('city') || '',
    lat: urlParams.get('lat') ? parseFloat(urlParams.get('lat')) : null,
    lng: urlParams.get('lng') ? parseFloat(urlParams.get('lng')) : null,
    sort: 'newest',
    limit: 12,
    offset: 0
  };
  let listings = [];
  let isMapView = false;
  let map = null;
  let markers = [];
  let markerCluster = null;

  const updateMapMarkers = () => {
    if (!map) return;

    if (markerCluster) {
      map.removeLayer(markerCluster);
    }
    markerCluster = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50
    });

    const bounds = L.latLngBounds();
    let hasValidCoords = false;

    listings.forEach(pg => {
      if (pg.latitude && pg.longitude) {
        hasValidCoords = true;

        const customIcon = L.divIcon({
          className: 'custom-price-pin',
          html: `<div class="bg-primary text-white font-bold text-xs px-2 py-1 rounded shadow -mt-8 whitespace-nowrap">₹${pg.monthly_rent}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });

        const marker = L.marker([pg.latitude, pg.longitude], { icon: customIcon });

        marker.bindPopup(`
            <div class="text-center font-display min-w-[150px] p-1">
                <b class="text-sm border-b border-slate-100 pb-2 mb-2 block truncate text-slate-900">${pg.name}</b>
                <p class="text-primary font-bold m-0 text-lg">₹${pg.monthly_rent}/mo</p>
                <a href="#/pg/${pg.id}" class="text-xs text-blue-500 hover:text-blue-700 hover:underline mt-2 inline-block font-medium">View Details &rarr;</a>
            </div>
        `);

        markerCluster.addLayer(marker);
        bounds.extend([pg.latitude, pg.longitude]);
      }
    });

    map.addLayer(markerCluster);

    if (hasValidCoords) {
      if (listings.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        map.setView(bounds.getCenter(), 15);
      }
    } else if (filters.lat && filters.lng) {
      map.setView([filters.lat, filters.lng], 12);

      L.circle([filters.lat, filters.lng], {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.1,
        radius: (filters.radius || 5) * 1000
      }).addTo(map);
    }
  };

  async function loadListings() {
    try {
      if (filters.lat && filters.lng) filters.limit = 100; // fetch more for local filtering
      listings = await getListings(filters);

      if (filters.lat && filters.lng && filters.radius) {
        const calcLocalDistance = (lat1, lon1, lat2, lon2) => {
          const R = 6371;
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLon = (lon2 - lon1) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };
        listings = listings.filter(pg => {
          if (!pg.latitude || !pg.longitude) return false;
          const dist = calcLocalDistance(filters.lat, filters.lng, pg.latitude, pg.longitude);
          return dist <= filters.radius;
        });
      }

    } catch (e) {
      listings = [];
    }
    renderResults();
    if (typeof updateMapMarkers === 'function') updateMapMarkers();

    // ── Search Alert: Save when no PGs found ──
    if (listings.length === 0 && state.user && (filters.search || filters.city)) {
      const searchedLocation = filters.search || filters.city;
      try {
        const permGranted = await requestNotificationPermission();
        if (permGranted) {
          const playerId = await getPlayerId();
          if (playerId) {
            await saveSearchAlert({
              userId: state.user.id,
              location: searchedLocation,
              onesignalPlayerId: playerId
            });
          }
        }
      } catch (err) {
        console.warn('Search alert flow error:', err);
      }
    }
  }

  function renderResults() {
    const el = document.getElementById('results-grid');
    const countEl = document.getElementById('results-count');
    if (el) {
      const hasSearch = !!(filters.search || filters.city);
      const isLoggedIn = !!state.user;
      el.innerHTML = listings.length
        ? listings.map(pg => renderPGCard(pg)).join('')
        : `<div class="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <span class="material-symbols-outlined text-6xl text-slate-300 mb-4">${hasSearch && isLoggedIn ? 'notifications_active' : 'search_off'}</span>
                    <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300">No PGs found</h3>
                    <p class="text-slate-500 mt-2 max-w-md">${hasSearch && isLoggedIn
                      ? 'No PGs found in this area. We\'ll notify you when one becomes available! 🔔'
                      : (hasSearch && !isLoggedIn
                        ? 'No PGs found in this area. <a href="#/auth" class="text-primary font-bold hover:underline">Log in</a> to get notified when new PGs are added here.'
                        : 'Try adjusting your filters or searching another area')}</p>
                   </div>`;
    }
    if (countEl) countEl.innerHTML = `<span class="font-bold text-slate-900 dark:text-white">${listings.length}</span> PGs found`;
    bindPGCardEvents();
  }

  app.innerHTML = `
    <div class="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display">
      ${renderNavbar('Explore PGs')}
      
      <!-- Breadcrumbs & Header -->
      <div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-40 lg:static shadow-sm lg:shadow-none transition-all">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="hidden md:flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <a href="#/home" class="hover:text-primary transition-colors">Home</a>
                  <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span class="text-slate-900 dark:text-white font-bold">Explore PGs</span>
              </div>
              
              <div class="relative w-full sm:w-80 sm:ml-auto flex items-center gap-2">
                <button id="btn-use-location" class="p-2.5 bg-white dark:bg-slate-800 text-primary border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex-shrink-0 flex items-center gap-1" title="Find PGs near you">
                    <span class="material-symbols-outlined text-[20px]">my_location</span>
                </button>
                <div class="relative w-full">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">search</span>
                  <input id="filter-search" value="${filters.search}" type="text" placeholder="Search city, area..." class="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary shadow-inner outline-none text-slate-900 dark:text-white placeholder:text-slate-400">
                  <div id="explore-suggestions" class="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden z-50 transition-all max-h-60 overflow-y-auto"></div>
                </div>
              </div>
          </div>
      </div>

      <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 items-start">
        

        <!-- Sidebar / Filters -->
        <aside id="filter-sidebar" class="w-full lg:w-72 shrink-0 hidden lg:block">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:sticky lg:top-24">
            
            <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
               <h3 class="text-lg font-bold flex items-center gap-2"><span class="material-symbols-outlined text-primary">tune</span> Filters</h3>
               <button id="clear-filters" class="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider transition-colors">Clear All</button>
            </div>

            <div class="space-y-6">
                <!-- City -->
                <div>
                    <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">City</label>
                    <select id="filter-city" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none">
                        <option value="">All Cities</option>
                        ${CITIES.map(c => `<option value="${c}"${filters.city === c ? ' selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>

                <!-- Budget -->
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div class="flex items-center justify-between mb-2">
                        <label class="block text-sm font-bold text-slate-900 dark:text-white">Monthly Rent</label>
                        <span id="budget-display" class="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">₹0 - ₹50K</span>
                    </div>
                    <div class="flex flex-col gap-3 mt-4">
                        <input type="range" id="filter-max-price" min="5000" max="50000" step="1000" value="50000" class="w-full accent-primary pointer-events-auto">
                        <div class="flex justify-between text-xs font-medium text-slate-400">
                            <span>₹5,000</span>
                            <span id="max-price-readout">₹50,000+</span>
                        </div>
                    </div>
                </div>

                <!-- Distance / Radius -->
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div class="flex items-center justify-between mb-2">
                        <label class="block text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1"><span class="material-symbols-outlined text-[16px] text-primary">radar</span> Radius</label>
                        <span id="radius-display" class="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">5 km</span>
                    </div>
                    <div class="flex flex-col gap-3 mt-4">
                        <input type="range" id="filter-radius" min="1" max="20" step="1" value="5" class="w-full accent-primary">
                        <div class="flex justify-between text-xs font-medium text-slate-400">
                            <span>1 km</span>
                            <span id="max-radius-readout">20 km</span>
                        </div>
                    </div>
                </div>

                <!-- Gender/Room Type -->
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label class="block text-sm font-bold text-slate-900 dark:text-white mb-3">Suitable For</label>
                    <div class="grid grid-cols-2 gap-2">
                        <label class="relative flex items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                           <input type="radio" name="gender" value="" class="peer sr-only" checked>
                           <span class="text-sm font-medium text-slate-500 peer-checked:text-primary peer-checked:font-bold">Any</span>
                           <div class="absolute inset-0 rounded-lg border-2 border-transparent peer-checked:border-primary pointer-events-none"></div>
                        </label>
                        <label class="relative flex items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                           <input type="radio" name="gender" value="male" class="peer sr-only">
                           <span class="text-sm font-medium text-slate-500 peer-checked:text-primary peer-checked:font-bold">Men</span>
                           <div class="absolute inset-0 rounded-lg border-2 border-transparent peer-checked:border-primary pointer-events-none"></div>
                        </label>
                        <label class="relative flex items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                           <input type="radio" name="gender" value="female" class="peer sr-only">
                           <span class="text-sm font-medium text-slate-500 peer-checked:text-primary peer-checked:font-bold">Women</span>
                           <div class="absolute inset-0 rounded-lg border-2 border-transparent peer-checked:border-primary pointer-events-none"></div>
                        </label>
                    </div>
                </div>

                <!-- Must Have Amenities -->
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label class="block text-sm font-bold text-slate-900 dark:text-white mb-3">Must Haves</label>
                    <div class="space-y-3">
                        ${['ac', 'food', 'bathroom', 'furnished', 'wifi', 'parking'].map(a => {
    const am = AMENITIES_LIST.find(x => x.key === a);
    return `
                            <label class="flex items-center justify-between cursor-pointer group">
                                <span class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    <span class="material-symbols-outlined text-[18px] opacity-70">${am?.icon}</span>
                                    ${am?.label}
                                </span>
                                <div class="relative shrink-0 mt-0.5">
                                    <input type="checkbox" class="amenity-filter peer sr-only" data-key="${a}">
                                    <div class="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/30 peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:shadow-sm after:rounded-full after:h-4 after:w-4 after:transition-all border border-slate-300 dark:border-slate-500 shadow-inner"></div>
                                </div>
                            </label>`;
  }).join('')}
                    </div>
                </div>

                <button id="apply-filters" class="w-full bg-primary hover:brightness-110 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-primary/20 mt-4">
                    Show Results
                </button>
            </div>
          </div>
        </aside>

        <!-- Results Column -->
        <div class="flex-1 min-w-0 w-full animate-in slideInRight">
          
          <div class="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
            <span id="results-count" class="text-slate-500 text-sm">
                <span class="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></span> Loading...
            </span>
            
            <div class="flex flex-wrap items-center gap-2 text-sm justify-center sm:justify-end w-full sm:w-auto">
              <span class="font-bold text-slate-900 dark:text-white mt-2 sm:mt-0">Sort by:</span>
              <select id="sort-select" class="bg-slate-50 dark:bg-slate-800 border-none outline-none font-medium text-slate-700 dark:text-slate-300 rounded-lg py-1.5 focus:ring-0 cursor-pointer appearance-none px-3 mt-2 sm:mt-0">
                <option value="newest">Newest First</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
              </select>
            </div>
          </div>

          <!-- PG Grid & Map Area -->
          <div class="flex gap-6 relative" id="results-area">
            <div id="results-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 transition-all duration-300"></div>
            
            <div id="explore-map-container" class="hidden w-1/2 lg:w-[40%] xl:w-[45%] h-[calc(100dvh-200px)] sticky top-24 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-md overflow-hidden z-10 transition-all duration-300">
                <div id="explore-map" class="w-full h-full"></div>
            </div>
          </div>
          
        </div>
      </main>
      ${renderFooter()}
    </div>
  `;

  initNavbarEvents();
  loadListings();

  const toggleMapViewBtn = document.getElementById('toggle-map-view');
  const resultsGrid = document.getElementById('results-grid');
  const mapContainer = document.getElementById('explore-map-container');

  if (toggleMapViewBtn) {
    toggleMapViewBtn.onclick = () => {
      isMapView = !isMapView;

      if (isMapView) {
        toggleMapViewBtn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-primary');
        toggleMapViewBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">grid_view</span> Grid View`;

        resultsGrid.classList.remove('md:grid-cols-2', 'xl:grid-cols-3');
        resultsGrid.classList.add('xl:grid-cols-2');
        mapContainer.classList.remove('hidden');
        mapContainer.classList.add('block');

        if (!map) {
          setTimeout(() => {
            const mapContainer = document.getElementById('explore-map');
            if (mapContainer) {
              map = L.map(mapContainer).setView([20.5937, 78.9629], 5);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
              }).addTo(map);

              // Sync bounds
              map.on('moveend', () => {
                if (!isMapView) return;
                const bnds = map.getBounds();
                if (bnds && listings.length > 0) {
                  const visibleListings = listings.filter(pg => {
                    if (!pg.latitude || !pg.longitude) return false;
                    return bnds.contains([pg.latitude, pg.longitude]);
                  });

                  const el = document.getElementById('results-grid');
                  if (el) {
                    el.innerHTML = visibleListings.length
                      ? visibleListings.map(pg => renderPGCard(pg)).join('')
                      : `<div class="col-span-full py-20 flex flex-col items-center justify-center text-center text-slate-500 font-medium">No PGs in this map area</div>`;
                  }
                  const countEl = document.getElementById('results-count');
                  if (countEl) countEl.innerHTML = `<span class="font-bold text-slate-900 dark:text-white">${visibleListings.length}</span> PGs in map area`;
                  bindPGCardEvents();
                }
              });

              updateMapMarkers();
            }
          }, 100);
        } else {
          map.invalidateSize();
          updateMapMarkers();
        }
      } else {
        toggleMapViewBtn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-primary');
        toggleMapViewBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">map</span> Map View`;

        resultsGrid.classList.remove('xl:grid-cols-2');
        resultsGrid.classList.add('md:grid-cols-2', 'xl:grid-cols-3');
        mapContainer.classList.remove('block');
        mapContainer.classList.add('hidden');
      }
    };
  }


  // Budget display
  const maxP = document.getElementById('filter-max-price');
  const bDisplay = document.getElementById('budget-display');
  const rDisplay = document.getElementById('max-price-readout');
  const updateB = () => {
    const val = +maxP.value;
    const text = val >= 50000 ? '₹50,000+' : `₹${val.toLocaleString('en-IN')}`;
    bDisplay.textContent = `₹0 - ${text}`;
    rDisplay.textContent = text;
  };
  maxP.oninput = updateB;

  // Radius display
  const radP = document.getElementById('filter-radius');
  const radBDisplay = document.getElementById('radius-display');
  const updateRad = () => {
    const val = +radP.value;
    radBDisplay.textContent = `${val} km`;
  };
  if (radP) radP.oninput = updateRad;

  document.getElementById('apply-filters').onclick = () => {
    filters.search = document.getElementById('filter-search').value;
    filters.city = document.getElementById('filter-city').value;

    const maxVal = +maxP.value;
    filters.maxPrice = maxVal;
    if (filters.maxPrice >= 50000) delete filters.maxPrice;

    if (radP) filters.radius = +radP.value;

    const genderEl = document.querySelector('input[name="gender"]:checked');
    filters.gender = genderEl ? genderEl.value : undefined;
    if (!filters.gender) delete filters.gender;

    // Amenities
    const checkedAmenities = [];
    document.querySelectorAll('.amenity-filter:checked').forEach(cb => {
        checkedAmenities.push(cb.dataset.key);
    });
    filters.amenities = checkedAmenities.length > 0 ? checkedAmenities : undefined;
    if (!filters.amenities) delete filters.amenities;

    // --- Analytics Tracking ---
    import('../analytics.js').then(m => {
        if (filters.search) m.trackSearch(filters.search, filters);
        if (filters.city) m.trackFilterUsed('location', filters.city);
        if (filters.maxPrice) m.trackFilterUsed('price', filters.maxPrice);
        if (filters.gender) m.trackFilterUsed('room_type', filters.gender);
    });

    if (window.innerWidth < 1024) {
      sidebar.classList.add('hidden');
      if (document.getElementById('filter-chevron')) {
        document.getElementById('filter-chevron').style.transform = 'rotate(0deg)';
      }
    }

    document.getElementById('results-grid').innerHTML = `<div class="col-span-full py-12 flex justify-center"><div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>`;
    loadListings();
  };

  document.getElementById('btn-use-location')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    showToast('Requesting location access...', 'info');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        filters.lat = pos.coords.latitude;
        filters.lng = pos.coords.longitude;
        filters.search = '';
        document.getElementById('filter-search').value = '';

        if (!isMapView) {
          document.getElementById('toggle-map-view')?.click();
        }

        document.getElementById('results-grid').innerHTML = `<div class="col-span-full py-12 flex justify-center"><div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>`;
        loadListings();
      },
      (err) => {
        showToast('Location access denied. Please enable it in browser settings.', 'error');
      }
    );
  });

  document.getElementById('sort-select').onchange = (e) => {
    filters.sort = e.target.value;
    document.getElementById('results-grid').innerHTML = `<div class="col-span-full py-12 flex justify-center"><div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>`;
    loadListings();
  };

  document.getElementById('filter-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('explore-suggestions')?.classList.add('hidden');
      document.getElementById('apply-filters').click();
    }
  });

  // Search suggestions (same as home page) + auto-filter
  const exploreSearchInput = document.getElementById('filter-search');
  const exploreSuggestionsBox = document.getElementById('explore-suggestions');
  if (exploreSearchInput && exploreSuggestionsBox) {
    let exploreSearchTimer = null;
    let autoFilterTimer = null;
    exploreSearchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (!val) {
        exploreSuggestionsBox.classList.add('hidden');
        // Auto-clear search filter and reload
        clearTimeout(autoFilterTimer);
        autoFilterTimer = setTimeout(() => {
          filters.search = '';
          document.getElementById('results-grid').innerHTML = `<div class="col-span-full py-12 flex justify-center"><div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>`;
          loadListings();
        }, 300);
        return;
      }
      clearTimeout(exploreSearchTimer);
      clearTimeout(autoFilterTimer);

      // Show suggestions
      exploreSearchTimer = setTimeout(async () => {
        exploreSuggestionsBox.innerHTML = `<div class="px-4 py-3 text-sm text-slate-400 flex items-center gap-2"><span class="inline-block w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin"></span> Searching...</div>`;
        exploreSuggestionsBox.classList.remove('hidden');
        try {
          const results = await searchLocations(val);
          if (results.length > 0) {
            exploreSuggestionsBox.innerHTML = results.map(loc => `
              <div class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0 explore-sug-item" data-val="${loc}">
                <span class="material-symbols-outlined text-primary/60 text-[18px]">location_on</span>
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">${loc}</span>
              </div>`).join('');
            document.querySelectorAll('.explore-sug-item').forEach(item => {
              item.addEventListener('click', () => {
                exploreSearchInput.value = item.dataset.val;
                exploreSuggestionsBox.classList.add('hidden');
                filters.search = item.dataset.val;
                document.getElementById('results-grid').innerHTML = `<div class="col-span-full py-12 flex justify-center"><div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>`;
                loadListings();
              });
            });
          } else {
            exploreSuggestionsBox.innerHTML = `<div class="px-4 py-3 text-sm text-slate-500 italic">No results for "${val}"</div>`;
          }
        } catch (err) { exploreSuggestionsBox.classList.add('hidden'); }
      }, 250);

      // Auto-filter after 500ms of no typing
      autoFilterTimer = setTimeout(() => {
        filters.search = val;
        document.getElementById('results-grid').innerHTML = `<div class="col-span-full py-12 flex justify-center"><div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>`;
        loadListings();
      }, 500);
    });
    document.addEventListener('click', (e) => {
      if (!exploreSearchInput.contains(e.target) && !exploreSuggestionsBox.contains(e.target)) {
        exploreSuggestionsBox.classList.add('hidden');
      }
    });
  }

  // Clear filters
  document.getElementById('clear-filters').onclick = () => {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-city').value = '';
    maxP.value = 50000; updateB();
    document.querySelector('input[name="gender"][value=""]').checked = true;
    document.querySelectorAll('.amenity-filter').forEach(cb => cb.checked = false);
    document.getElementById('apply-filters').click();
  }
}
