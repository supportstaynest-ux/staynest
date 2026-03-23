import { getSiteSettings } from '../supabase.js';

// In-memory settings for synchronous footer rendering
let _footerSettings = null;

// Pre-load settings (called at app init)
export async function loadFooterSettings() {
    try {
        _footerSettings = await getSiteSettings();
    } catch (e) {
        console.warn('loadFooterSettings fallback:', e.message);
    }
}

export function renderFooter() {
  const s = _footerSettings || {
    support_email: 'support@staynest.in',
    support_phone: '+91 (800) 123-4567',
    address: '123 Tech Park, Hitech City, Lucknow, UP 226010',
    website_url: '#',
    site_name: 'StayNest'
  };

  const year = new Date().getFullYear();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;
  const cleanPhone = s.support_phone.replace(/[^+\d]/g, '');

  return `
    <footer class="hidden md:block bg-slate-900 text-slate-400 py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-slate-800 pb-12">
              <div class="col-span-1 md:col-span-1">
                  <div class="flex items-center gap-2 text-white mb-6">
                      <span class="material-symbols-outlined text-primary text-3xl">home_pin</span>
                      <h2 class="text-xl font-bold tracking-tight">${s.site_name || 'StayNest'}</h2>
                  </div>
                  <p class="text-sm leading-relaxed mb-6">Simplifying accommodation for thousands of students and professionals. Find your second home with ease.</p>
                  <div class="flex gap-4">
                      <a href="${s.website_url || '#'}" target="_blank" rel="noopener" class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all" title="Website"><span class="material-symbols-outlined text-lg">language</span></a>
                      <a href="mailto:${s.support_email}" class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all" title="Email Us"><span class="material-symbols-outlined text-lg">alternate_email</span></a>
                      <a href="tel:${cleanPhone}" class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all" title="Call Us"><span class="material-symbols-outlined text-lg">call</span></a>
                  </div>
              </div>
              <div>
                  <h4 class="text-white font-bold mb-6">Quick Links</h4>
                  <ul class="space-y-4 text-sm">
                      <li><a href="#/home" class="hover:text-primary transition-colors">Home</a></li>
                      <li><a href="#/explore" class="hover:text-primary transition-colors">Explore PGs</a></li>
                      <li><a href="#/safety" class="hover:text-primary transition-colors">Safety Tips</a></li>
                      <li><a href="#/faq" class="hover:text-primary transition-colors">FAQ</a></li>
                  </ul>
              </div>
              <div>
                  <h4 class="text-white font-bold mb-6">Legal</h4>
                  <ul class="space-y-4 text-sm">
                      <li><a href="#/about" class="hover:text-primary transition-colors">About Us</a></li>
                      <li><a href="#/privacy" class="hover:text-primary transition-colors">Privacy Policy</a></li>
                      <li><a href="#/terms" class="hover:text-primary transition-colors">Terms of Service</a></li>
                      <li><a href="#/contact" class="hover:text-primary transition-colors">Contact</a></li>
                  </ul>
              </div>
              <div>
                  <h4 class="text-white font-bold mb-6">Contact Us</h4>
                  <ul class="space-y-4 text-sm mb-8">
                      <li class="flex items-start gap-3">
                          <span class="material-symbols-outlined text-primary">mail</span>
                          <a href="mailto:${s.support_email}" class="hover:text-primary transition-colors">${s.support_email}</a>
                      </li>
                      <li class="flex items-start gap-3">
                          <span class="material-symbols-outlined text-primary">phone</span>
                          <a href="tel:${cleanPhone}" class="hover:text-primary transition-colors">${s.support_phone}</a>
                      </li>
                      <li class="flex items-start gap-3">
                          <span class="material-symbols-outlined text-primary">location_on</span>
                          <a href="${mapsUrl}" target="_blank" rel="noopener" class="hover:text-primary transition-colors">${s.address}</a>
                      </li>
                  </ul>
                  
                  <div class="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                      <h5 class="text-white font-bold mb-2 text-sm">Own a property?</h5>
                      <p class="text-xs text-slate-400 mb-4 leading-relaxed">List your PG with us and reach thousands of students instantly.</p>
                      <a href="mailto:${s.support_email}?subject=Join%20StayNest%20as%20Vendor" class="inline-flex items-center justify-center w-full px-4 py-2.5 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl font-bold transition-all text-sm gap-2">
                          <span class="material-symbols-outlined text-[18px]">real_estate_agent</span> Join Us
                      </a>
                  </div>
              </div>
          </div>
          <div class="flex flex-col md:flex-row justify-between items-center gap-4">
              <p class="text-xs">&copy; ${year} ${s.site_name || 'StayNest'} Accommodation Services Pvt Ltd. All rights reserved.</p>
              <div class="flex gap-6 text-xs">
                  <a href="#/privacy" class="hover:text-white">Privacy</a>
                  <a href="#/terms" class="hover:text-white">Terms</a>
                  <a href="#" class="hover:text-white">Cookies</a>
              </div>
          </div>
      </div>
    </footer>
  `;
}
