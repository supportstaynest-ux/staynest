// ── StayNest Performance Engine ──────────────────────────
// Prefetching, caching, lazy-loading, and transition system

// ▸ 1. Supabase Data Prefetch Cache
const _dataCache = new Map();
const DATA_CACHE_TTL = 120_000; // 2 minutes

export function setCacheData(key, data) {
    _dataCache.set(key, { data, ts: Date.now() });
}

export function getCacheData(key) {
    const entry = _dataCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > DATA_CACHE_TTL) { _dataCache.delete(key); return null; }
    return entry.data;
}

// ▸ 2. Background Route Prefetcher
// After initial page load, preload critical routes' JS modules via dynamic imports
const _prefetched = new Set();

export function prefetchRouteModules() {
    // Wait until the page is fully idle, then prefetch key modules
    const idleCb = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));

    idleCb(() => {
        const criticalModules = [
            () => import('./pages/explore.js'),
            () => import('./pages/pg-details.js'),
            () => import('./pages/auth.js'),
            () => import('./pages/legal.js'),
        ];

        const secondaryModules = [
            () => import('./pages/dashboard.js'),
            () => import('./pages/vendor.js'),
            () => import('./pages/admin.js'),
            () => import('./pages/user-pages.js'),
            () => import('./pages/onboarding.js'),
            () => import('./pages/complete-profile.js'),
        ];

        // Prefetch critical modules first
        criticalModules.forEach(load => {
            load().catch(() => { }); // silently prefetch
        });

        // Prefetch secondary modules after a delay
        setTimeout(() => {
            secondaryModules.forEach(load => {
                load().catch(() => { });
            });
        }, 3000);
    });
}

// ▸ 3. Smart Image Lazy Loader with IntersectionObserver
let _imageObserver = null;

function getImageObserver() {
    if (_imageObserver) return _imageObserver;

    _imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                if (src) {
                    // Create a hidden image to preload
                    const preloader = new Image();
                    preloader.onload = () => {
                        img.src = src;
                        img.classList.remove('lazy-img');
                        img.classList.add('lazy-loaded');
                        img.removeAttribute('data-src');
                    };
                    preloader.src = src;
                }
                // For background images
                const bgSrc = img.dataset.bgSrc;
                if (bgSrc) {
                    const preloader = new Image();
                    preloader.onload = () => {
                        img.style.backgroundImage = `url('${bgSrc}')`;
                        img.classList.remove('lazy-bg');
                        img.classList.add('lazy-loaded');
                        img.removeAttribute('data-bg-src');
                    };
                    preloader.src = bgSrc;
                }
                _imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '200px 0px',  // Start loading 200px before visible
        threshold: 0.01
    });

    return _imageObserver;
}

// Call this after any page render to activate lazy loading
export function activateLazyImages() {
    requestAnimationFrame(() => {
        const observer = getImageObserver();
        document.querySelectorAll('[data-src], [data-bg-src]').forEach(el => {
            observer.observe(el);
        });
    });
}

// ▸ 4. Link Prefetch on Hover
// When user hovers a nav link, preload that route's data
const _hoverPrefetched = new Set();

export function setupLinkPrefetch() {
    document.addEventListener('pointerenter', async (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        const link = e.target.closest('a[href^="#/"]');
        if (!link) return;

        const route = link.getAttribute('href').replace('#', '');
        if (_hoverPrefetched.has(route)) return;
        _hoverPrefetched.add(route);

        // Prefetch data for known data-heavy routes
        if (route === '/explore' || route === '/home') {
            try {
                const { getListings } = await import('./supabase.js');
                const data = await getListings({ status: 'approved' });
                setCacheData(`listings_${route}`, data);
            } catch (e) { /* silent */ }
        }
    }, { passive: true, capture: true });
}

// ▸ 5. Page Transition System
export function pageTransition(direction = 'in') {
    const app = document.getElementById('app');
    if (!app) return Promise.resolve();

    if (direction === 'out') {
        app.style.opacity = '0';
        app.style.transform = 'translateY(6px)';
        return new Promise(r => setTimeout(r, 80));
    } else {
        // Reset and animate in
        app.style.opacity = '0';
        app.style.transform = 'translateY(8px)';
        requestAnimationFrame(() => {
            app.style.transition = 'opacity 0.2s ease-out, transform 0.25s ease-out';
            app.style.opacity = '1';
            app.style.transform = 'translateY(0)';
        });
        // Clean up transition property after animation
        setTimeout(() => {
            if (app) {
                app.style.transition = '';
            }
        }, 300);
        return Promise.resolve();
    }
}

// ▸ 6. Skeleton Loader for Content Areas
export function showSkeleton(container = 'app') {
    const el = document.getElementById(container);
    if (!el) return;
    el.innerHTML = `
    <div class="min-h-screen bg-[#F8FAFC] dark:bg-[#0f172a]">
      <div class="sticky top-0 z-50 w-full h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-sm border-b border-slate-100"></div>
      <div class="max-w-7xl mx-auto px-4 pt-8 animate-pulse">
        <div class="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48 mb-6"></div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${[1, 2, 3].map(() => `
            <div class="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <div class="h-48 bg-slate-200 dark:bg-slate-800"></div>
              <div class="p-4 space-y-3">
                <div class="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ▸ 7. Network-Aware Loading
export function getNetworkQuality() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return 'good';
    if (conn.saveData) return 'save-data';
    const ect = conn.effectiveType;
    if (ect === '4g') return 'good';
    if (ect === '3g') return 'medium';
    return 'slow';
}

export function shouldPrefetch() {
    const q = getNetworkQuality();
    return q === 'good' || q === 'medium';
}

// ▸ 8. Resource Preloader for Critical Assets
export function preloadCriticalAssets() {
    // Preload Leaflet CSS/JS (often needed on explore/details pages)
    const idleCb = window.requestIdleCallback || ((cb) => setTimeout(cb, 500));
    idleCb(() => {
        // Preload hero images or key assets if needed
        const criticalImages = document.querySelectorAll('img[data-priority="high"]');
        criticalImages.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            }
        });
    });
}

// ▸ 9. Initialize All Performance Systems
export function initPerformance() {
    // Activate lazy images on current page
    activateLazyImages();

    // Setup hover prefetch
    setupLinkPrefetch();

    // Prefetch route modules in background (only on good networks)
    if (shouldPrefetch()) {
        prefetchRouteModules();
    }

    // Preload critical assets
    preloadCriticalAssets();

    // Re-activate lazy images on every route change
    window.addEventListener('hashchange', () => {
        setTimeout(activateLazyImages, 100);
    });
}
