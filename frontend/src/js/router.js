// ── Enhanced Client-Side Hash Router with Transitions ──
const routes = {};
let currentCleanup = null;

export function route(path, handler) {
    routes[path] = handler;
}

export function navigate(path) {
    window.location.hash = path;
}

export function getParams() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);
    return parts;
}

export function getCurrentPath() {
    const hash = window.location.hash || '';
    // Handle cases like #/path or #path or /path
    let path = hash.startsWith('#') ? hash.slice(1) : hash;
    if (path.startsWith('/')) path = path.slice(1);
    
    // Always ensure it starts with / for matching
    const cleanPath = '/' + path.split('?')[0];
    return cleanPath === '//' ? '/' : cleanPath;
}

function matchRoute(path) {
    if (routes[path]) return { handler: routes[path], params: {} };
    for (const pattern of Object.keys(routes)) {
        const patternParts = pattern.split('/').filter(Boolean);
        const pathParts = path.split('/').filter(Boolean);
        if (patternParts.length !== pathParts.length) continue;
        const params = {};
        let match = true;
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                params[patternParts[i].slice(1)] = pathParts[i];
            } else if (patternParts[i] !== pathParts[i]) {
                match = false;
                break;
            }
        }
        if (match) return { handler: routes[pattern], params };
    }
    return null;
}

let routeVersion = 0;
let _isFirstLoad = true;

export function getRouteVersion() { return routeVersion; }

async function handleRoute() {
    const rawHash = window.location.hash.slice(1) || '/';
    
    // Defer routing if this is a Supabase OAuth callback, let Supabase process it first
    if (rawHash.startsWith('access_token=') || rawHash.startsWith('error=')) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
              <div class="min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark">
                  <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
              </div>
            `;
        }
        return;
    }

    const path = getCurrentPath();
    const matched = matchRoute(path);
    const thisVersion = ++routeVersion;

    if (currentCleanup && typeof currentCleanup === 'function') {
        currentCleanup();
        currentCleanup = null;
    }

    const app = document.getElementById('app');

    // Transition out (skip on first load for instant render)
    if (!_isFirstLoad && app && app.children.length > 0) {
        app.style.opacity = '0';
        // Removed transform to prevent breaking fixed positioning of children
        await new Promise(r => setTimeout(r, 60));
    }

    if (matched) {
        // Track the page view
        import('./analytics.js').then(m => m.trackPageView(path)).catch(()=>{});
        
        try {
            const result = await matched.handler(matched.params);
            if (thisVersion === routeVersion && typeof result === 'function') currentCleanup = result;
        } catch (handlerErr) {
            console.error(`Error in route handler for ${path}:`, handlerErr);
            // Optionally show a generic error UI in #app
            if (app && thisVersion === routeVersion) {
                app.innerHTML = `
                    <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 text-center">
                        <span class="material-symbols-outlined text-6xl text-red-500 mb-4">report_problem</span>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h2>
                        <p class="text-slate-500 mb-6 max-w-sm">We encountered an error while loading this page. Please try refreshing or return home.</p>
                        <button onclick="window.location.hash='/home'" class="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg">Return Home</button>
                    </div>
                `;
            }
        }
    } else if (routes['/404']) {
        routes['/404']();
    }

    // Transition in
    if (thisVersion === routeVersion && app) {
        if (_isFirstLoad) {
            _isFirstLoad = false;
        } else {
            app.style.opacity = '0';
            // Removed transform to prevent breaking fixed positioning of children
            setTimeout(() => {
                app.style.transition = 'opacity 0.2s ease-out';
                app.style.opacity = '1';
            }, 10);
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

export function startRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}
