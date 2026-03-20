// src/js/mobile-init.js
// Injects the mobile UI components directly into the DOM
import { state } from './state.js';

const injectMobileUI = () => {
    // Only inject once
    if (document.getElementById('mobile-bottom-nav')) return;

    // 1. Create Bottom Navigation
    const bottomNav = document.createElement('nav');
    bottomNav.id = 'mobile-bottom-nav';
    bottomNav.innerHTML = `
        <a href="#/home" class="mobile-nav-item" data-route="home">
            <span class="material-symbols-outlined">home</span>
            <span class="nav-label">Home</span>
        </a>
        <a href="#/explore" class="mobile-nav-item" data-route="explore">
            <span class="material-symbols-outlined">search</span>
            <span class="nav-label">Search</span>
        </a>
        <a href="#/vendor/listings" class="mobile-nav-item" data-route="listings" id="nav-btn-listings" style="display: none;">
            <span class="material-symbols-outlined">format_list_bulleted</span>
            <span class="nav-label">Listings</span>
        </a>
        <a href="#/saved" class="mobile-nav-item" data-route="saved" id="nav-btn-saved">
            <span class="material-symbols-outlined">favorite</span>
            <span class="nav-label">Saved</span>
        </a>
        <a href="#/profile" class="mobile-nav-item" data-route="profile">
            <span class="material-symbols-outlined">person</span>
            <span class="nav-label">Profile</span>
        </a>
    `;

    document.body.appendChild(bottomNav);

    // 2. Create Mobile Sticky Header
    const topHeader = document.createElement('header');
    topHeader.id = 'mobile-top-header';
    topHeader.innerHTML = `
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center shadow-md">
                <span class="material-symbols-outlined text-white text-[18px]" style="font-variation-settings:'FILL' 1">home_pin</span>
            </div>
            <h2 id="mobile-page-title" class="text-lg font-extrabold text-slate-900 dark:text-white">StayNest</h2>
        </div>
        <div class="flex items-center gap-3">
            <button class="pwa-install-btn hidden text-white font-bold text-[11px] bg-primary px-3 py-1.5 rounded-full uppercase tracking-wide shadow-sm">Install</button>
            <a href="#/faq" class="text-slate-500 hover:text-primary transition-colors flex items-center justify-center">
                <span class="material-symbols-outlined text-xl">help</span>
            </a>
        </div>
    `;

    document.body.appendChild(topHeader);

    // 3. Handle Route Changes to Update Active States & Title
    const updateUIState = () => {
        const hash = window.location.hash.replace('#/', '').split('?')[0];
        let currentRoute = hash || 'home';

        let title = 'StayNest';
        let actRoute = '';

        if (currentRoute === 'home') { title = 'StayNest'; actRoute = 'home'; }
        else if (currentRoute === 'explore') { title = 'Explore PGs'; actRoute = 'explore'; }
        else if (currentRoute.includes('vendor/listings') || currentRoute === 'compare') { title = 'Listings'; actRoute = 'listings'; }
        else if (currentRoute === 'saved') { title = 'Saved PGs'; actRoute = 'saved'; }
        else if (currentRoute === 'profile' || currentRoute === 'dashboard' || currentRoute.includes('vendor') || currentRoute.includes('admin')) { title = 'Dashboard'; actRoute = 'profile'; }
        else if (currentRoute.includes('pg/')) { title = 'PG Details'; }

        // Update Title
        const titleEl = document.getElementById('mobile-page-title');
        if (titleEl) titleEl.innerText = title;

        // Adapt navigation based on role
        const isVendorOrAdmin = state?.profile?.role === 'vendor' || state?.profile?.role === 'admin';
        document.getElementById('nav-btn-listings').style.display = isVendorOrAdmin ? 'flex' : 'none';
        document.getElementById('nav-btn-saved').style.display = isVendorOrAdmin ? 'none' : 'flex';

        // Update Active Nav Item
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.route === actRoute) {
                item.classList.add('active');
            }
        });
    };

    window.addEventListener('hashchange', updateUIState);

    // Periodically check role changes (since state can update async)
    setInterval(updateUIState, 1000);

    setTimeout(updateUIState, 50);

    // Global intercept for install button if deferredPrompt exists
    document.addEventListener('click', async (e) => {
        const installBtn = e.target.closest('.pwa-install-btn');
        if (installBtn && window.deferredPrompt) {
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            console.log(`User ${outcome} the PWA installation`);
            window.deferredPrompt = null;
        }
    });

    if (window.deferredPrompt) {
        document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.classList.remove('hidden'));
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMobileUI);
} else {
    injectMobileUI();
}
