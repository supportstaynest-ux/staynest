import { state, isLoggedIn, isAdmin, showToast, showLoading, hideLoading, formatPrice } from '../state.js';
import { navigate } from '../router.js';
import { supabase, signOut, getAdminStats, getAllUsers, getUsersPaginated, getAllListingsAdmin, updateProfile, updateListing, deleteListing, sendNotification, sendBroadcastMessage, getBroadcastHistory, deleteBroadcastMessage, getReports, updateReport, getAdminChatMonitoringStats, getAdminVendorDetails, getAdminListingChats, getPaymentRequestsAdmin, updatePaymentRequestStatus, getPlans, createPlan, updatePlan, deletePlan, resetPassword, getAccessToken } from '../supabase.js';

import { renderNavbar } from '../components/navbar.js';

export function adminLayout(content, active = 'dashboard', title = 'Admin Panel') {
  if (!isAdmin()) {
    return `<div class="p-8 text-center"><h2 class="text-2xl font-bold">Access Denied</h2></div>`;
  }

  const p = state.user || {};
  const items = [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard', href: '/admin' },
    { key: 'analytics', icon: 'monitoring', label: 'Live Analytics', href: '/admin/analytics' },
    { key: 'realtime-monitor', icon: 'radar', label: 'Live Monitor', href: '/admin/realtime-monitor' },
    { key: 'user-activity', icon: 'timeline', label: 'User Activity', href: '/admin/user-activity' },
    { key: 'conversion-funnel', icon: 'conversion_path', label: 'Conversion Funnel', href: '/admin/conversion-funnel' },
    { key: 'demand-prediction', icon: 'online_prediction', label: 'Demand Prediction', href: '/admin/demand-prediction' },
    { key: 'demand-heatmap', icon: 'public', label: 'Demand Heatmap', href: '/admin/demand-heatmap' },
    { key: 'vendor-performance', icon: 'storefront', label: 'Vendor Performance', href: '/admin/vendor-performance' },
    { key: 'fraud-detection', icon: 'gpp_bad', label: 'Fraud Detection', href: '/admin/fraud-detection' },
    { key: 'users', icon: 'group', label: 'User Management', href: '/admin/users' },
    { key: 'listings', icon: 'business_center', label: 'PG Listings', href: '/admin/listings' },
    { key: 'featured', icon: 'star', label: 'Featured Listings', href: '/admin/featured' },
    { key: 'reports', icon: 'flag', label: 'Reports', href: '/admin/reports' },
    { key: 'payments', icon: 'payments', label: 'Payments', href: '/admin/payments' },
    { key: 'plans', icon: 'card_membership', label: 'Subscription Plans', href: '/admin/plans' },
    { key: 'boost', icon: 'rocket_launch', label: 'Boost Plans', href: '/admin/boost-plans' },
    { key: 'notifications', icon: 'mail', label: 'Messaging', href: '/admin/notifications' },
    { key: 'chat-monitoring', icon: 'forum', label: 'Chat Monitoring', href: '/admin/chat-monitoring' },
    { key: 'support', icon: 'forum', label: 'Support Chat', href: '/admin/support' },
    { key: 'settings', icon: 'settings', label: 'Site Settings', href: '/admin/settings' },
  ];

  const sidebarLinks = items.map(i => {
    const isActive = active === i.key;
    const activeClass = isActive
      ? 'bg-primary/10 text-primary font-semibold'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors';
    return `
        <a href="#${i.href}" class="admin-link flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeClass}">
            <span class="material-symbols-outlined text-[20px]">${i.icon}</span>
            <span class="text-sm">${i.label}</span>
        </a>
    `;
  }).join('');

  return `
    <div class="flex min-h-screen relative font-display text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900">
        <!-- Desktop Sidebar -->
        <aside id="admin-sidebar" class="w-64 border-r border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-50 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out h-full">
            <div class="p-6 flex items-center justify-between md:justify-start gap-3">
                                <a href="#/home" class="flex items-center gap-3 w-full">
                    <div class="size-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                        <span class="material-symbols-outlined font-bold text-lg">meeting_room</span>
                    </div>
                    <div>
                        <h1 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">StayNest</h1>
                        <p class="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">ADMIN</p>
                    </div>
                </a>
                <button id="close-sidebar-btn" class="md:hidden text-slate-400 hover:text-slate-600 p-1 shrink-0">
                    <span class="material-symbols-outlined relative top-1">close</span>
                </button>
            </div>
            
            <nav class="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar py-2">
                ${sidebarLinks}
            </nav>
            <div class="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
                <button id="logout-btn" class="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <span class="material-symbols-outlined text-[20px]">logout</span>
                    <span class="text-sm font-semibold">Logout</span>
                </button>
            </div>
        </aside>

        <!-- Mobile Layout -->
        <div class="md:hidden">
            ${renderNavbar(title)}
        </div>

        <!-- Dynamic Overlay for mobile sidebar -->
        <div id="admin-overlay" class="fixed inset-0 bg-black/50 z-40 hidden md:hidden transition-opacity"></div>

        <!-- Main Content Area -->
        <main class="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-50 dark:bg-slate-900">
            <!-- Desktop Only Header -->
            <header class="hidden md:flex h-16 border-b border-slate-200 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-8 items-center justify-between shrink-0">
                <div class="flex-1 flex items-center">
                    <span class="font-bold text-lg tracking-tight">StayNest Admin</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-primary"></span> Super Admin</span>
                    <button class="admin-logout-trigger p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors">
                        <span class="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                </div>
            </header>
            
            <div class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-24 md:pb-8">
                ${content}
            </div>
        </main>
    </div>
  `;
}

function initAdminEvents() {
  setTimeout(() => {
    const toggleBtn = document.getElementById('admin-menu-toggle');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('admin-overlay');

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

    document.querySelectorAll('.admin-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768 && !sidebar.classList.contains('-translate-x-full')) {
          toggleSidebar();
        }
      });
    });

    const doLogout = async (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      if (btn.disabled) return;
      btn.disabled = true;
      try { await signOut(); } catch (err) { console.error(err); }
      window.location.hash = '/home';
      setTimeout(() => window.location.reload(), 100);
    };
    
    const mainBtn = document.getElementById('logout-btn');
    if (mainBtn) mainBtn.onclick = doLogout;
    
    document.querySelectorAll('.admin-logout-trigger').forEach(b => b.onclick = doLogout);
  }, 50);
}

export async function renderAdminDashboard() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

  showLoading();
  let stats = { users: 0, vendors: 0, listings: 0, leads: 0, monthly_signups: [] };
  let allUsers = [];
  let allListings = [];
  try {
    const [fetchedStats, fetchedUsers, fetchedListings] = await Promise.all([
      getAdminStats(),
      getAllUsers(),
      getAllListingsAdmin()
    ]);
    stats = fetchedStats;
    allUsers = fetchedUsers;
    allListings = fetchedListings;
  } catch (e) { console.error('Error fetching admin data', e); }
  hideLoading();

  const activities = [
    ...allUsers.map(u => ({ type: u.role === 'vendor' ? 'vendor' : 'user', data: u, date: new Date(u.created_at).getTime() })),
    ...allListings.map(l => ({ type: 'listing', data: l, date: new Date(l.created_at).getTime() }))
  ].sort((a, b) => b.date - a.date).slice(0, 5);

  const generateGrowthChart = (days) => {
    const growth = Array(days).fill(0);
    const now = new Date();
    allUsers.forEach(u => {
      const d = new Date(u.created_at);
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays < days && diffDays >= 0) {
        growth[(days - 1) - diffDays]++;
      }
    });
    const max = Math.max(...growth, 1);
    const bars = growth.map((c, i) => {
      const h = Math.max(5, (c/max) * 100);
      const op = i === days-1 ? 'bg-primary' : (c > 0 ? 'bg-primary/60' : 'bg-primary/20');
      return `<div class="flex-1 ${op} hover:bg-primary/80 transition-colors rounded-t-sm" style="height: ${h}%;" title="${c} signups"></div>`;
    }).join('');
    return bars;
  };

  const initialDays = 10;
  let growthBarsHTML = generateGrowthChart(initialDays);

  const timeAgo = (date) => {
    const min = Math.floor((Date.now() - date) / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };

  const activitiesHTML = activities.map(act => {
    if (act.type === 'listing') {
      return `
      <div class="p-4 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined text-amber-500 text-xl">add_home</span>
                </div>
                <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">New Listing Added</p>
                    <p class="text-xs text-slate-500">${act.data.name || 'Listing'} by ${act.data.profiles?.full_name || 'Vendor'}</p>
                </div>
                <span class="text-[10px] text-slate-400 whitespace-nowrap">${timeAgo(act.date)}</span>
            </div> `;
    } else if (act.type === 'vendor') {
      return `
    <div class="p-4 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined text-emerald-500 text-xl">storefront</span>
                </div>
                <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">New Vendor Registered</p>
                    <p class="text-xs text-slate-500">${act.data.full_name || 'Unknown'} joined StayNest</p>
                </div>
                <span class="text-[10px] text-slate-400 whitespace-nowrap">${timeAgo(act.date)}</span>
            </div> `;
    } else {
      return `
    <div class="p-4 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined text-primary text-xl">person_add</span>
                </div>
                <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">New User Registration</p>
                    <p class="text-xs text-slate-500">${act.data.full_name || 'Unknown'} joined StayNest</p>
                </div>
                <span class="text-[10px] text-slate-400 whitespace-nowrap">${timeAgo(act.date)}</span>
            </div> `;
    }
  }).join('');

  // prettier-ignore
  const content = `
    <div class="p-0">
      <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Admin Dashboard</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">Platform overview and general statistics</p>
        </div>
      </header>

      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-primary/30 transition-colors">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-indigo-500">group</span>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-900 dark:text-white">${stats.users}</p>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Users</p>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-primary/30 transition-colors">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-emerald-500">storefront</span>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-900 dark:text-white">${stats.vendors}</p>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vendors</p>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-primary/30 transition-colors">
          <div class="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-sky-500">business_center</span>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-900 dark:text-white">${stats.listings}</p>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">PG Listings</p>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-primary/30 transition-colors">
          <div class="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-primary">verified_user</span>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-900 dark:text-white">Active</p>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Platform</p>
          </div>
        </div>
      </section>

      <section class="mb-8">
        <div class="bg-gradient-to-r from-primary to-teal-500 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md border border-primary/20">
          <div class="text-white">
            <h3 class="text-2xl font-black mb-2">Platform Administration</h3>
            <p class="text-teal-50 text-sm md:text-base max-w-xl">Ensure a safe and high-quality environment. Review new PG listings frequently and handle user reports promptly.</p>
          </div>
          <button onclick="window.location.hash='/admin/listings'" class="bg-white text-primary hover:bg-teal-50 font-bold py-3 px-8 rounded-xl whitespace-nowrap transition-all shadow-sm self-start md:self-auto hover:scale-105 active:scale-95">
            Review Listings
          </button>
        </div>
      </section>

      <section class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="font-black text-slate-900 dark:text-white">User Growth Trend</h3>
            <p class="text-xs text-slate-500 uppercase font-bold tracking-tight">Monthly active user signups</p>
          </div>
          <select id="admin-chart-time-range" class="text-xs font-bold border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:ring-primary focus:border-primary outline-none px-3 py-1.5">
            <option value="10">Last 10 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>

        <div class="p-6 pt-10 relative h-48 w-full flex items-end gap-1.5" id="admin-growth-chart-container">
          <!-- Background Grid Lines -->
          <div class="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none opacity-30">
            <div class="border-b border-slate-200 dark:border-slate-700 w-full h-0"></div>
            <div class="border-b border-slate-200 dark:border-slate-700 w-full h-0"></div>
            <div class="border-b border-slate-200 dark:border-slate-700 w-full h-0"></div>
          </div>
          <!-- Bars Container -->
          <div id="admin-growth-chart-bars" class="absolute inset-0 p-6 flex items-end gap-1.5 pt-10">
            ${growthBarsHTML}
          </div>
        </div>
        <div class="px-6 pb-6 flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest" id="admin-growth-chart-labels">
          <span>10d ago</span>
          <span>5d ago</span>
          <span>Today</span>
        </div>
      </section>

      <section class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">map</span> Global Listings Map
            </h3>
            <p class="text-xs text-slate-500 uppercase font-bold tracking-tight mt-1">View all ${allListings.length} properties across the platform</p>
          </div>
        </div>
        <div id="admin-global-map" class="w-full h-[400px] z-0"></div>
      </section>

      <section class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 class="font-black">Recent Activities</h3>
          <a href="#/admin/user-activity" class="text-primary text-xs font-bold hover:underline uppercase tracking-wider">View All</a>
        </div>
        <div class="divide-y divide-slate-100 dark:divide-slate-800" id="admin-recent-activities">
          ${activitiesHTML || '<div class="p-12 text-center text-slate-400 font-medium">No recent activities</div>'}
        </div>
      </section>
    </div>
  `;
  document.getElementById('app').innerHTML = adminLayout(content, 'dashboard', 'Overview');
  initAdminEvents();

  setTimeout(() => {
    const mapEl = document.getElementById('admin-global-map');
    if (mapEl) {
      const map = L.map(mapEl).setView([20.5937, 78.9629], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const markerCluster = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 50
      });

      allListings.forEach(pg => {
        if (pg.latitude && pg.longitude) {
          const color = pg.status === 'approved' ? 'bg-green-500' : 'bg-amber-500';
          const customIcon = L.divIcon({
            className: 'custom-admin-pin',
            html: `<div class="${color} size-4 border border-white rounded-full shadow-sm" ></div> `,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const marker = L.marker([pg.latitude, pg.longitude], { icon: customIcon });
          marker.bindPopup(`
    <div class="p-2 font-display text-center">
                    <b class="text-sm border-b pb-1 mb-1 block">${pg.name}</b>
                    <p class="text-xs text-slate-500 mb-2">${pg.city}</p>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pg.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${pg.status}</span>
                    <br><a href="#/pg/${pg.id}" class="text-blue-500 text-xs hover:underline mt-2 inline-block">View</a>
                </div>
  `);
          markerCluster.addLayer(marker);
        }
      });
      map.addLayer(markerCluster);
    }

    const chartSelect = document.getElementById('admin-chart-time-range');
    if (chartSelect) {
      chartSelect.addEventListener('change', (e) => {
        const days = parseInt(e.target.value) || 10;
        const newBars = generateGrowthChart(days);
        const barsContainer = document.getElementById('admin-growth-chart-bars');
        const labelsContainer = document.getElementById('admin-growth-chart-labels');
        if (barsContainer) barsContainer.innerHTML = newBars;
        if (labelsContainer) {
           labelsContainer.innerHTML = `<span>${days}d ago</span><span>${Math.floor(days/2)}d ago</span><span>Today</span>`;
        }
      });
    }

  }, 100);
}

export async function renderAdminUsers() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }
  let users = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let totalUsers = 0;

  try { 
      const res = await getUsersPaginated(currentPage, PAGE_SIZE); 
      users = res.data;
      totalUsers = res.total;
  } catch (e) { console.error('Error fetching users:', e); }

  const renderUserRow = (u) => {
      const isVendor = u.role === 'vendor';
      const isAdminUser = u.role === 'admin';
      const isSuspended = !!u.is_suspended;
      const avatar = u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'U')}&background=random`;
      
      return `
      <div class="user-row bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md ${isSuspended ? 'opacity-60 border-red-200 bg-red-50/10' : ''}" 
            data-name="${(u.full_name || '').toLowerCase()}" 
            data-email="${(u.email || u.id || '').toLowerCase()}" 
            data-role="${u.role || 'user'}">
          <div class="flex items-center gap-4 mb-4">
              <div class="relative">
                  <img class="size-14 rounded-2xl object-cover ${isSuspended ? 'grayscale' : ''}" src="${avatar}"/>
                  <div class="absolute -bottom-1 -right-1 size-4 rounded-full ${isAdminUser ? 'bg-primary' : isVendor ? 'bg-primary' : isSuspended ? 'bg-red-500' : 'bg-emerald-500'} border-2 border-white dark:border-slate-900"></div>
              </div>
              <div class="min-w-0">
                  <h4 class="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                      ${u.full_name || 'Anonymous'} 
                      ${isAdminUser ? '<span class="material-symbols-outlined text-xs text-primary">verified</span>' : ''}
                  </h4>
                  <p class="text-xs text-slate-500 truncate font-medium">${u.email || 'No email'}</p>
                  <span class="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${isAdminUser ? 'bg-primary/10 text-primary' : isVendor ? 'bg-primary/10 text-primary' : isSuspended ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}">
                      ${u.role} ${isSuspended ? '(Suspended)' : ''}
                  </span>
              </div>
          </div>
          
          <div class="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
              <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  Joined ${new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
              <div class="flex items-center gap-1">
                  ${!isAdminUser ? `
                      <button class="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all" onclick="window._sendResetLink('${u.email || ''}')" title="Reset Password">
                          <span class="material-symbols-outlined text-lg">lock_reset</span>
                      </button>
                      <button class="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all" onclick="window._suspendUser('${u.id}', ${isSuspended})" title="${isSuspended ? 'Reactivate' : 'Suspend'}">
                          <span class="material-symbols-outlined text-lg">${isSuspended ? 'settings_backup_restore' : 'block'}</span>
                      </button>
                      <button class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" onclick="window._adminDeleteUser('${u.id}', '${u.full_name || 'User'}')" title="Delete Permanently">
                          <span class="material-symbols-outlined text-lg text-red-500">delete_forever</span>
                      </button>
                      <label class="relative inline-flex items-center cursor-pointer ml-1" title="Toggle Vendor">
                          <input type="checkbox" class="vendor-toggle sr-only peer" data-id="${u.id}" ${isVendor ? 'checked' : ''} ${isSuspended ? 'disabled' : ''}>
                          <div class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                      </label>
                  ` : `<span class="text-[10px] text-slate-400 font-bold uppercase italic tracking-tighter">System Protected</span>`}
              </div>
          </div>
      </div>
      `;
  };
  
  const content = `
    <div class="space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">User Management</h2>
                <p class="text-slate-500 text-sm">Manage platform users, vendors, and account statuses.</p>
            </div>
            <div class="flex items-center gap-2">
                <div class="relative flex-1 md:w-64">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input id="user-search" class="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 transition-all outline-none" placeholder="Search name or email..."/>
                </div>
                <select id="role-filter" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/50">
                    <option value="all">All Roles</option>
                    <option value="user">Users</option>
                    <option value="vendor">Vendors</option>
                    <option value="admin">Admins</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="users-list">
            ${users.map(u => renderUserRow(u)).join('')}
        </div>
        
        <div id="admin-user-loading-indicator" class="hidden justify-center py-4"><span class="material-symbols-outlined animate-spin text-primary opacity-50 text-3xl">refresh</span></div>
        <button id="adminLoadMoreUsersBtn" class="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${users.length >= totalUsers ? 'hidden' : ''}">
            Load More Users
        </button>
    </div>
  `;
  document.getElementById('app').innerHTML = adminLayout(content, 'users', 'Users');
  initAdminEvents();
  
  if (users.length === 0) {
      document.getElementById('adminLoadMoreUsersBtn')?.classList.add('hidden');
  }

  // Load More Logic
  const loadMoreBtn = document.getElementById('adminLoadMoreUsersBtn');
  const loader = document.getElementById('admin-user-loading-indicator');
  
  // Create a function to attach event listeners to dynamically added rows
  const attachRowListeners = (rowHtmlStr) => {
      // The event listeners for toggling vendor are globally attached in the lines below
      // so we don't need inline attachments for vendor toggle, but we do need the querySelector hookup later
  };

  if (loadMoreBtn) {
      loadMoreBtn.onclick = async () => {
          loadMoreBtn.classList.add('hidden');
          loader.classList.remove('hidden');
          loader.classList.add('flex');
          
          try {
              currentPage++;
              const res = await getUsersPaginated(currentPage, PAGE_SIZE);
              
              if (res.data && res.data.length > 0) {
                  const listEl = document.getElementById('users-list');
                  
                  // Need to append raw HTML correctly and then hookup vendor toggles
                  listEl.insertAdjacentHTML('beforeend', res.data.map(u => renderUserRow(u)).join(''));
                  users.push(...res.data);
                  
                  // Re-attach vendor toggles to ONLY the new ones, or globally re-evaluate
                  attachVendorToggles();
              }
              
              if (users.length >= res.total) {
                  loadMoreBtn.classList.add('hidden'); // keep hidden
              } else {
                  loadMoreBtn.classList.remove('hidden'); 
              }
          } catch (e) {
              console.error(e);
              showToast('Failed to load more users', 'error');
              loadMoreBtn.classList.remove('hidden');
          } finally {
              loader.classList.remove('flex');
              loader.classList.add('hidden');
          }
      };
  }

  const filterUsers = () => {
    const q = (document.getElementById('user-search')?.value || '').toLowerCase();
    const role = document.getElementById('role-filter')?.value || 'all';
    document.querySelectorAll('.user-row').forEach(r => {
      const matchSearch = r.dataset.name.includes(q) || r.dataset.email.includes(q);
      const matchRole = role === 'all' || r.dataset.role === role;
      r.style.display = (matchSearch && matchRole) ? '' : 'none';
    });
  };

  document.getElementById('user-search')?.addEventListener('input', filterUsers);
  document.getElementById('role-filter')?.addEventListener('change', filterUsers);

  const attachVendorToggles = () => {
    document.querySelectorAll('.vendor-toggle').forEach(t => {
      // Prevent multiple bindings
      t.onchange = null;
      t.onchange = async () => {
        try {
          const id = t.dataset.id;
          const isChecked = t.checked;
          const token = await getAccessToken();
          const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/update-user-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId: id, role: isChecked ? 'vendor' : 'user' })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Failed to update role');
          
          showToast(`User ${isChecked ? 'promoted to vendor' : 'set back to user'} `, 'success');
          // Update local data array so filter continues working
          const userObj = users.find(u => u.id === id);
          if (userObj) userObj.role = isChecked ? 'vendor' : 'user';
        }
        catch (e) { 
          console.error('Role update error:', e);
          showToast(e.message, 'error'); 
          t.checked = !t.checked; 
        }
      };
    });
  };

  attachVendorToggles();

  window._suspendUser = async (id, currentSuspensionState) => {
    const isSuspended = !!currentSuspensionState;
    if (!confirm(isSuspended ? 'Reactivate this user?' : 'Suspend this user? They will lose access to the platform.')) return;
    
    showLoading();
    try {
      const token = await getAccessToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/suspend-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: id, suspend: !isSuspended })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update suspension status');

      showToast(isSuspended ? 'User Reactivated' : 'User Suspended', 'success');
      renderAdminUsers();
    } catch (e) {
      console.error('Suspension error:', e);
      showToast(e.message, 'error');
    }
    hideLoading();
  };

  window._sendResetLink = async (email) => {
    if (!email) {
      showToast('User has no valid email address', 'error');
      return;
    }
    if (!confirm(`Send password reset link to ${email}?`)) return;
    showLoading();
    try {
      await resetPassword(email);
      showToast(`Password reset link sent to ${email}`, 'success');
    } catch (e) {
      showToast(`Failed to send reset link: ${e.message}`, 'error');
    }
    hideLoading();
  }

  window._adminDeleteUser = async (userId, userName) => {
    if (!confirm(`🚨 CRITICAL WARNING: Permanently delete user "${userName}"?\n\nThis will remove them from Supabase Auth AND the database. This action is irreversible and will delete all their associated data (listings, reviews, etc. if cascading).`)) return;
    
    showLoading();
    try {
      const token = await getAccessToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();
      if (!response.ok) {
        const errorMsg = result.error || 'Failed to delete user';
        // Provide user-friendly messages for known error patterns
        if (errorMsg.includes('check constraint') || errorMsg.includes('role_check')) {
          throw new Error('Database constraint error. Please contact the system administrator to verify database triggers.');
        }
        throw new Error(errorMsg);
      }

      showToast(`User ${userName} deleted permanently`, 'success');
      renderAdminUsers();
    } catch (e) {
      console.error('Delete user error:', e);
      showToast(`Delete failed: ${e.message}`, 'error');
    }
    hideLoading();
  };
}

export async function renderAdminListings() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }
  let listings = [];
  try { listings = await getAllListingsAdmin(); } catch (e) { }

  // Initial Filter State
  window._adminListingFilter = window._adminListingFilter || 'pending';

  const r = () => {
    const filteredListings = listings.filter(l => {
      if (window._adminListingFilter === 'pending') return l.status !== 'approved';
      if (window._adminListingFilter === 'approved') return l.status === 'approved';
      return true; // 'all'
    });

    const content = `
      <div class="space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Manage Listings</h2>
            <p class="text-slate-500 text-sm">Review and manage all PG properties on the platform.</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative flex-1 md:w-64">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input id="listing-search" class="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="Search properties..."/>
            </div>
          </div>
        </div>

        <div class="flex gap-2 overflow-x-auto pb-2 hidden-scrollbar">
          <button class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${window._adminListingFilter === 'pending' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}" onclick="window._adminFilterTabs('pending')">
            Pending Review (${listings.filter(l => l.status !== 'approved').length})
          </button>
          <button class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${window._adminListingFilter === 'approved' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}" onclick="window._adminFilterTabs('approved')">
            Active Properties
          </button>
          <button class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${window._adminListingFilter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}" onclick="window._adminFilterTabs('all')">
            All Listings
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="listings-container">
          ${filteredListings.map(l => {
            const isPending = l.status !== 'approved';
            const isWomenOnly = l.gender_allowed === 'female';
            const image = l.images?.[0] || 'https://placehold.co/600x400';
            
            return `
            <div class="listing-row bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1" 
                 data-name="${l.name.toLowerCase()}" 
                 data-id="${l.id}" 
                 data-vendor="${(l.profiles?.full_name || '').toLowerCase()}">
                <div class="relative aspect-[16/10] overflow-hidden group">
                    <img src="${image}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        ${isPending ? `<span class="bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shadow-lg">Pending Review</span>` : ''}
                        ${l.is_featured ? `<span class="bg-primary text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shadow-lg">Featured</span>` : ''}
                        ${l.is_verified ? `<span class="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shadow-lg">Verified</span>` : ''}
                        ${isWomenOnly ? `<span class="bg-pink-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shadow-lg">Women Only</span>` : ''}
                    </div>
                    
                    <div class="absolute bottom-3 left-4 right-4">
                        <h3 class="text-white font-black text-lg truncate drop-shadow-md">${l.name}</h3>
                        <p class="text-white/80 text-xs font-bold flex items-center gap-1 drop-shadow-sm">
                            <span class="material-symbols-outlined text-[14px]">location_on</span> ${l.city}
                        </p>
                    </div>
                </div>
                
                <div class="p-5 space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <img src="${l.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=V'}" class="size-6 rounded-full object-cover">
                            <span class="text-xs font-bold text-slate-600 truncate max-w-[100px]">${l.profiles?.full_name || 'Vendor'}</span>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Rent</p>
                            <p class="text-sm font-black text-primary">${formatPrice(l.monthly_rent)}/mo</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                        ${isPending ? `
                            <button onclick="window._adminApprove('${l.id}', ${isWomenOnly})" class="bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">check_circle</span> Approve
                            </button>
                            <button onclick="window._adminReject('${l.id}')" class="bg-red-50 text-red-600 py-2.5 rounded-xl text-xs font-black hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">cancel</span> Reject
                            </button>
                        ` : `
                            <button onclick="window._adminToggleBoost('${l.id}', ${!l.is_featured})" class="bg-slate-50 text-slate-600 py-2.5 rounded-xl text-xs font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">${l.is_featured ? 'star_half' : 'stars'}</span> ${l.is_featured ? 'Unboost' : 'Boost'}
                            </button>
                            <button onclick="window._adminVerify('${l.id}', ${!l.is_verified})" class="bg-slate-50 text-slate-600 py-2.5 rounded-xl text-xs font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">${l.is_verified ? 'gpp_bad' : 'verified'}</span> ${l.is_verified ? 'Unverify' : 'Verify'}
                            </button>
                        `}
                        <a href="#/pg/${l.id}" class="col-span-2 bg-primary/10 text-primary py-2.5 rounded-xl text-xs font-black hover:bg-primary/20 transition-all flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-sm">visibility</span> Preview Listing
                        </a>
                    </div>
                </div>
            </div>
            `;
          }).join('')}
          ${filteredListings.length === 0 ? `<div class="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No listings found</div>` : ''}
        </div>
      </div>
    `;

    document.getElementById('app').innerHTML = adminLayout(content, 'listings', 'Listings');
    initAdminEvents();

    document.getElementById('listing-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.listing-row').forEach(row => {
        row.style.display = (row.dataset.name.includes(q) || row.dataset.id.toLowerCase().includes(q) || row.dataset.vendor.includes(q)) ? '' : 'none';
      });
    });
  };

  r();

  window._adminFilterTabs = (tab) => { window._adminListingFilter = tab; r(); };

  window._adminApprove = async (id, verify = false) => { try { const updates = { status: 'approved' }; if (verify) updates.is_verified = true; await updateListing(id, updates); showToast('PG Approved! Vendor notified.', 'success'); listings = await getAllListingsAdmin(); r(); } catch (e) { showToast(e.message, 'error'); } };
  window._adminReject = async (id) => { 
    const reason = prompt('Are you sure you want to reject this PG?\\nOptional: Enter rejection reason to notify the vendor:');
    if (reason !== null) { 
      try { 
        const updates = { status: 'rejected' };
        if (reason.trim()) updates.rejection_reason = reason.trim();
        await updateListing(id, updates); 
        showToast('PG Rejected.', 'success'); 
        listings = await getAllListingsAdmin(); 
        r(); 
      } catch (e) { 
        // If rejection_reason column doesn't exist, fallback to just status update
        if (e.message?.includes('rejection_reason')) {
          try {
            await updateListing(id, { status: 'rejected' });
            showToast('PG Rejected (reason not saved due to DB schema).', 'success');
            listings = await getAllListingsAdmin();
            r();
          } catch (err) {
            showToast(err.message, 'error');
          }
        } else {
          showToast(e.message, 'error'); 
        }
      } 
    } 
  };
  window._adminVerify = async (id, status) => { try { await updateListing(id, { is_verified: status }); showToast(status ? 'PG marked as Verified.' : 'PG Unverified.', 'success'); listings = await getAllListingsAdmin(); r(); } catch (e) { showToast(e.message, 'error'); } };
  window._adminToggleBoost = async (id, status) => { try { await updateListing(id, { is_featured: status }); showToast(status ? 'PG has been Boosted!' : 'Boost removed.', 'success'); listings = await getAllListingsAdmin(); r(); } catch (e) { showToast(e.message, 'error'); } };
  window._adminDelete = async (id) => { if (confirm('WARNING: Permanently delete this listing from the database? This cannot be undone.')) { try { await deleteListing(id); showToast('PG permanently deleted.', 'success'); listings = await getAllListingsAdmin(); r(); } catch (e) { showToast(e.message, 'error'); } } };
}


export async function renderAdminFeatured() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }
  let listings = [];
  try { listings = await getAllListingsAdmin(); listings = listings.filter(l => l.status === 'approved'); } catch (e) { }

  const content = `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Featured Properties</h2>
        <p class="text-slate-500 text-sm">Control which properties appear on the home page and top search results.</p>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Property</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Location</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Home Featured</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Top Search</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
              ${listings.map(l => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <img src="${l.images?.[0] || 'https://placehold.co/100x100'}" class="size-10 rounded-xl object-cover">
                        <span class="font-bold text-slate-900 dark:text-white text-sm">${l.name}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">${l.city}</td>
                  <td class="px-6 py-4 text-center">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" class="feat-toggle sr-only peer" data-id="${l.id}" data-field="is_featured" ${l.is_featured ? 'checked' : ''}>
                      <div class="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                    </label>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" class="feat-toggle sr-only peer" data-id="${l.id}" data-field="is_top_search" ${l.is_top_search ? 'checked' : ''}>
                      <div class="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                    </label>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  document.getElementById('app').innerHTML = adminLayout(content, 'featured', 'Featured');
  initAdminEvents();
  document.querySelectorAll('.feat-toggle').forEach(t => {
    t.onchange = async () => { 
      try { 
        await updateListing(t.dataset.id, { [t.dataset.field]: t.checked }); 
        showToast('Promotion status updated!', 'success'); 
      } catch (e) { 
        showToast(e.message, 'error'); 
        t.checked = !t.checked; 
      } 
    };
  });
}

export async function renderAdminNotifications() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

  let broadcastHistory = [];
  try { broadcastHistory = await getBroadcastHistory(); } catch (e) { console.error(e); }

  let activeTab = window._msgTab || 'all_users';

  const tabClass = (t) => t === activeTab
    ? 'bg-primary text-white shadow-lg shadow-primary/20'
    : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 hover:bg-slate-50';

  const targetLabel = (t) => {
    if (t === 'all_users') return { label: 'All Users', icon: 'group', color: 'bg-blue-100 text-blue-700' };
    if (t === 'all_vendors') return { label: 'All Vendors', icon: 'storefront', color: 'bg-emerald-100 text-emerald-700' };
    return { label: 'Everyone', icon: 'public', color: 'bg-purple-100 text-purple-700' };
  };

  const content = `
    <div class="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Messaging Center</h2>
        <p class="text-slate-500 text-sm">Send platform-wide broadcast messages to users and vendors.</p>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-2 hidden-scrollbar">
        <button class="msg-tab flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${tabClass('all_users')}" data-tab="all_users">
            <span class="material-symbols-outlined text-sm">group</span> Users
        </button>
        <button class="msg-tab flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${tabClass('all_vendors')}" data-tab="all_vendors">
            <span class="material-symbols-outlined text-sm">storefront</span> Vendors
        </button>
        <button class="msg-tab flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${tabClass('all')}" data-tab="all">
            <span class="material-symbols-outlined text-sm">public</span> Everyone
        </button>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 class="text-sm font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1.5 h-6 bg-primary rounded-full"></span> Compose Broadcast
        </h3>
        <div class="space-y-5">
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Message Title</label>
            <input id="notif-title" required placeholder="e.g. Scheduled Maintenance Notice" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all">
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Message Content</label>
            <textarea id="notif-message" rows="4" placeholder="Write your announcement here..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none transition-all"></textarea>
          </div>
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">campaign</span>
              Sending to <span class="text-primary font-black">${targetLabel(activeTab).label}</span>
            </p>
            <button id="send-notif-btn" class="bg-primary text-white font-black py-4 px-10 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95">
              <span class="material-symbols-outlined text-lg">send</span> Send Message
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <h3 class="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Broadcast History</h3>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${broadcastHistory.length} Sent</span>
        </div>
        <div class="divide-y divide-slate-50 dark:divide-slate-800 max-h-[400px] overflow-y-auto no-scrollbar">
          ${broadcastHistory.length ? broadcastHistory.map(n => {
            const tl = targetLabel(n.receiver_type || 'all');
            const date = new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `
            <div class="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1.5">
                    <h4 class="font-black text-sm text-slate-900 dark:text-white truncate">${n.title}</h4>
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${tl.color} bg-opacity-10">${tl.label}</span>
                  </div>
                  <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">${n.message}</p>
                </div>
                <div class="flex flex-col items-end gap-2 shrink-0">
                  <span class="text-[10px] text-slate-400 font-bold mt-1">${date}</span>
                  <button class="p-1.5 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all flex items-center justify-center bg-white dark:bg-slate-800" onclick="window._deleteBroadcast('${n.id}')" title="Delete Announcement">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>`;
          }).join('') : `
            <div class="p-16 text-center text-slate-300">
              <span class="material-symbols-outlined text-5xl mb-3">history</span>
              <p class="text-sm font-bold uppercase tracking-widest">No history available</p>
            </div>`}
        </div>
      </div>
    </div>`;

  document.getElementById('app').innerHTML = adminLayout(content, 'notifications', 'Messaging');
  initAdminEvents();

  document.querySelectorAll('.msg-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      window._msgTab = btn.dataset.tab;
      renderAdminNotifications();
    });
  });

  document.getElementById('send-notif-btn')?.addEventListener('click', async () => {
    const title = document.getElementById('notif-title').value.trim();
    const message = document.getElementById('notif-message').value.trim();
    if (!title || !message) { showToast('Please fill in both title and message', 'error'); return; }
    showLoading();
    try {
      await sendBroadcastMessage({ title, message, receiverType: activeTab, senderId: state.user?.id });
      showToast(`Broadcast sent successfully!`, 'success');
      renderAdminNotifications();
    } catch (e) { showToast(e.message, 'error'); }
    hideLoading();
  });

  window._deleteBroadcast = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement? It will be removed from all user and vendor notification panels globally.')) return;
    showLoading();
    try {
      await deleteBroadcastMessage(id);
      showToast('Announcement deleted successfully!', 'success');
      renderAdminNotifications();
    } catch (e) {
      showToast(e.message || 'Failed to delete announcement', 'error');
    }
    hideLoading();
  };
}

export async function renderAdminSettings() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }
  
  showLoading();
  let settings = {};
  try {
    const { getSiteSettings } = await import('../supabase.js');
    settings = await getSiteSettings();
  } catch (e) { console.error('Failed to load site settings:', e); }
  hideLoading();

  const content = `
    <div class="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Platform Configuration</h2>
        <p class="text-slate-500 text-sm">Update global website parameters and contact information.</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Website Name</label>
              <input id="ss-site-name" value="${settings.site_name || 'StayNest'}" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Support Email</label>
              <input id="ss-email" type="email" value="${settings.support_email || ''}" placeholder="support@staynest.com" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Support Phone</label>
              <input id="ss-phone" type="tel" value="${settings.support_phone || ''}" placeholder="+91 9876543210" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Website URL</label>
              <input id="ss-website" type="url" value="${settings.website_url || ''}" placeholder="https://staynest.com" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all">
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Office Address</label>
            <input id="ss-address" value="${settings.address || ''}" placeholder="123 Street, City, State PIN" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all">
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Homepage Hero Title</label>
            <textarea id="ss-banner" rows="2" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none transition-all">${settings.banner_text || 'Find Your Perfect PG Stay'}</textarea>
          </div>

          <div class="pt-4">
            <button id="save-site-settings-btn" class="w-full bg-primary text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
              <span class="material-symbols-outlined">save</span>
              Apply Configuration
            </button>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('app').innerHTML = adminLayout(content, 'settings', 'Settings');
  initAdminEvents();

  document.getElementById('save-site-settings-btn')?.addEventListener('click', async () => {
    const updates = {
      site_name: document.getElementById('ss-site-name').value.trim(),
      support_email: document.getElementById('ss-email').value.trim(),
      support_phone: document.getElementById('ss-phone').value.trim(),
      address: document.getElementById('ss-address').value.trim(),
      website_url: document.getElementById('ss-website').value.trim(),
      banner_text: document.getElementById('ss-banner').value.trim()
    };
    if (!updates.support_email) { showToast('Support email is required', 'error'); return; }
    showLoading();
    try {
      const { updateSiteSettings } = await import('../supabase.js');
      await updateSiteSettings(updates);
      const { loadFooterSettings } = await import('../components/footer.js');
      await loadFooterSettings();
      showToast('Configuration updated successfully!', 'success');
    } catch (e) { showToast('Failed to save: ' + e.message, 'error'); }
    hideLoading();
  });
}

export async function renderAdminReports() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }
  
  window._adminReportState = window._adminReportState || { tab: 'pending', reasonFilter: 'all' };

  showLoading();
  let allReports = [];
  try { allReports = await getReports(); } catch (e) { }
  hideLoading();

  const pendingCount = allReports.filter(r => r.status === 'pending').length;
  const resolvedCount = allReports.filter(r => r.status !== 'pending').length;
  const uniqueReasons = [...new Set(allReports.map(r => r.reason))].filter(Boolean);

  let filteredReports = allReports.filter(r => {
    const s = window._adminReportState;
    if (s.tab === 'pending' && r.status !== 'pending') return false;
    if (s.tab === 'resolved' && r.status === 'pending') return false;
    if (s.reasonFilter !== 'all' && r.reason !== s.reasonFilter) return false;
    return true;
  });

  const getTabClass = (tab) => window._adminReportState.tab === tab 
    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
    : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700';

  const content = `
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Moderation Queue</h2>
          <p class="text-slate-500 text-sm">Review reported properties and user accounts.</p>
        </div>
        <select id="reason-filter" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/50">
          <option value="all">All Reasons</option>
          ${uniqueReasons.map(rs => `<option value="${rs}" ${window._adminReportState.reasonFilter === rs ? 'selected' : ''}>${rs}</option>`).join('')}
        </select>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-2 hidden-scrollbar">
        <button onclick="window._setAdminReportTab('pending')" class="px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${getTabClass('pending')}">
          Pending Review (${pendingCount})
        </button>
        <button onclick="window._setAdminReportTab('resolved')" class="px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${getTabClass('resolved')}">
          Resolved History (${resolvedCount})
        </button>
        <button onclick="window._setAdminReportTab('all')" class="px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${getTabClass('all')}">
          All Reports
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${filteredReports.length ? filteredReports.map(r => {
          const isUserReport = !!r.reported_user_id;
          const isPending = r.status === 'pending';
          const avatar = isUserReport 
            ? (r.reported_user?.avatar_url || `https://ui-avatars.com/api/?name=U`)
            : (r.listings?.images?.[0] || 'https://placehold.co/100x100');
          
          return `
          <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 ${!isPending ? 'opacity-60' : ''}">
            <div class="flex items-center justify-between">
              <span class="px-2 py-0.5 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-wider">
                ${r.reason}
              </span>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                ${new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>

            <div class="flex gap-4">
              <img src="${avatar}" class="size-16 rounded-2xl object-cover bg-slate-50">
              <div class="min-w-0 flex-1">
                <h4 class="font-black text-slate-900 dark:text-white truncate">
                  ${isUserReport ? (r.reported_user?.full_name || 'User') : (r.listings?.name || 'Property')}
                </h4>
                <p class="text-xs text-slate-500 truncate">
                  Reported by ${r.profiles?.full_name || 'Anonymous'}
                </p>
                <p class="text-xs text-slate-400 mt-1 italic line-clamp-2">"${r.description || 'No additional details provided.'}"</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
              ${isPending ? `
                <button onclick="window._adminResolveReport('${r.id}', 'reviewed')" class="bg-emerald-500 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-1">
                  <span class="material-symbols-outlined text-sm">check_circle</span> Dismiss
                </button>
                <button onclick="${isUserReport ? `window._adminSuspendUser('${r.id}', '${r.reported_user_id}')` : `window._adminRemoveReportedListing('${r.id}', '${r.listing_id}')`}" class="bg-red-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-1">
                  <span class="material-symbols-outlined text-sm">block</span> ${isUserReport ? 'Suspend' : 'Delete'}
                </button>
              ` : `
                <div class="col-span-2 py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 rounded-xl">
                  Resolved (${r.status})
                </div>
              `}
            </div>
          </div>`;
        }).join('') : `
          <div class="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest">
            Queue is clear
          </div>
        `}
      </div>
    </div>`;

  document.getElementById('app').innerHTML = adminLayout(content, 'reports', 'Reports');
  initAdminEvents();
  
  document.getElementById('reason-filter')?.addEventListener('change', (e) => {
    window._adminReportState.reasonFilter = e.target.value;
    renderAdminReports();
  });

  window._setAdminReportTab = (tab) => {
    window._adminReportState.tab = tab;
    renderAdminReports();
  };

  window._adminResolveReport = async (id, status) => {
    try {
      showLoading();
      await updateReport(id, { status: status });
      showToast('Report status updated', 'success');
      renderAdminReports();
    } catch (e) { showToast(e.message, 'error'); hideLoading(); }
  };

  window._adminRemoveReportedListing = async (reportId, listingId) => {
    if (!confirm('Permanently remove this property?')) return;
    try {
      showLoading();
      await deleteListing(listingId);
      await updateReport(reportId, { status: 'removed' });
      showToast('Listing removed successfully', 'success');
      renderAdminReports();
    } catch (e) { showToast(e.message, 'error'); hideLoading(); }
  };
  
  window._adminSuspendUser = async (reportId, userId) => {
    if (!confirm('Suspend this user account?')) return;
    try {
      showLoading();
      const { supabase } = await import('../supabase.js');
      await supabase.from('profiles').update({ role: 'suspended' }).eq('id', userId);
      await updateReport(reportId, { status: 'suspended' });
      showToast('User suspended successfully', 'success');
      renderAdminReports();
    } catch (e) { showToast('Error: ' + e.message, 'error'); hideLoading(); }
  };
}

// ── Boost Plans Management ──────────────────────────────────────
const DEFAULT_BOOST_PLANS = [
  { id: 'basic', title: 'Basic Boost', price: 499, duration: '7 days', badge: 'Featured', features: ['Top of search results', '"Featured" badge'], color: 'slate' },
  { id: 'standard', title: 'Standard Boost', price: 999, duration: '14 days', badge: 'Most Popular', features: ['Top of search results', '"Featured" badge', '3 days on Home page'], color: 'blue' },
  { id: 'premium', title: 'Premium Boost', price: 1999, duration: '30 days', badge: 'VIP', features: ['Guaranteed #1 in City Search', 'Premium "VIP" badge', '14 days on Home page full banner'], color: 'gold' }
];

export async function getBoostPlans() {
  try {
    const { data, error } = await supabase.from('boost_plans').select('*').order('price', { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) return data;
  } catch (e) { console.error('Error fetching boost plans:', e); }
  return DEFAULT_BOOST_PLANS;
}

async function saveBoostPlans(plans) {
  try {
    const { error } = await supabase.from('boost_plans').upsert(plans);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error saving boost plans:', e);
    return false;
  }
}

export async function renderAdminBoostPlans() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

  showLoading();
  const plans = await getBoostPlans();
  hideLoading();

  // prettier-ignore
  const planCard = (p, idx) => `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md flex flex-col" data-plan-idx="${idx}"><div class="flex items-center justify-between mb-4"><span class="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border
                ${p.color === 'blue' ? 'bg-blue-100 text-blue-700 border-blue-200' :
      p.color === 'gold' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
        'bg-slate-100 text-slate-700 border-slate-200'}">${p.badge_label || p.badge || ''}</span>
            <span class="text-xs text-slate-500">Plan ${idx + 1}</span>
        </div>
        
        <div class="space-y-4 flex-1"><div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Plan Title</label>
                <input class="bp-title w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value="${p.title}"></div>
            <div class="grid grid-cols-2 gap-3"><div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Price (₹)</label>
                    <input type="number" class="bp-price w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value="${p.price}"></div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duration (Days)</label>
                    <input class="bp-duration w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value="${p.duration_days || p.duration || 7}"></div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Badge Label</label>
                <input class="bp-badge w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value="${p.badge_label || p.badge || ''}"></div>
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Features (one per line)</label>
                <textarea class="bp-features w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none resize-y" rows="4">${(p.features || []).join('\n')}</textarea>
            </div>
        </div>
    </div> `;

  // prettier-ignore
  const content = `
    <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800" ><div>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Boost Plans</h2>
            <p class="text-slate-500 mt-1">Edit the boost plan cards visible to vendors.</p>
        </div>
        <button id="save-boost-plans-btn" class="bg-primary hover:brightness-110 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">save</span> Save All Plans
        </button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${plans.map((p, i) => planCard(p, i)).join('')}
    </div>
    
    <div class="mt-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-start gap-3"><span class="material-symbols-outlined text-emerald-500 shrink-0">cloud_done</span>
        <p class="text-sm text-emerald-700 dark:text-emerald-400">Boost Plans are now synchronized directly with the database across all devices.</p>
    </div>`;

  document.getElementById('app').innerHTML = adminLayout(content, 'boost', 'Boost Plans');
  initAdminEvents();

  document.getElementById('save-boost-plans-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-boost-plans-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Saving...';
    btn.disabled = true;

    const cards = document.querySelectorAll('[data-plan-idx]');
    const updated = [];
    cards.forEach(card => {
      const idx = parseInt(card.dataset.planIdx);
      const original = plans[idx];
      updated.push({
        id: original.id,
        title: card.querySelector('.bp-title').value.trim(),
        price: parseInt(card.querySelector('.bp-price').value) || 0,
        duration_days: parseInt(card.querySelector('.bp-duration').value) || parseInt(original.duration_days) || 7,
        badge_label: card.querySelector('.bp-badge').value.trim(),
        features: card.querySelector('.bp-features').value.split('\n').map(f => f.trim()).filter(f => f),
        color: original.color
      });
    });

    const success = await saveBoostPlans(updated);
    if (success) {
        showToast('Boost plans saved to database!', 'success');
    } else {
        showToast('Failed to save to database', 'error');
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
  });
}

export async function renderAdminVendors() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }
  let users = [];
  let allListings = [];
  try {
    const [fetchedUsers, fetchedListings] = await Promise.all([
      getAllUsers(),
      getAllListingsAdmin()
    ]);
    users = fetchedUsers;
    allListings = fetchedListings;
  } catch (e) { console.error('Error fetching admin vendors data', e); }

  const vendors = users.filter(u => u.role === 'vendor');

  // Calculate verified vendors for the stat card
  // Let's assume vendors without pending/rejected listings are active, or just count those with avatar_url for now, or total minus something.
  // We'll replace the Avg Rating with Total Listings by Vendors
  const vendorListingsCount = allListings.filter(l => l.vendor_id).length;

  // prettier-ignore
  const content = `
    <div class="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10" ><h2 class="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 ml-4">Vendor Management</h2>
        <div class="flex items-center gap-2"><button class="flex size-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"><span class="material-symbols-outlined">search</span>
            </button>
            <button class="flex size-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20"><span class="material-symbols-outlined">person_add</span>
            </button>
        </div>
    </div>
    
    <div class="flex gap-4 p-4 overflow-x-auto hidden-scrollbar"><div class="flex min-w-[160px] flex-1 flex-col gap-2 rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"><div class="flex items-center justify-between"><p class="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Vendors</p>
                <span class="material-symbols-outlined text-primary text-xl">groups</span>
            </div>
            <div class="flex items-baseline gap-2"><p class="text-slate-900 dark:text-white text-2xl font-extrabold">${vendors.length}</p>
                <p class="text-emerald-500 text-xs font-bold leading-normal flex items-center"><span class="material-symbols-outlined text-xs">trending_up</span> 12%
                </p>
            </div>
        </div>
        <div class="flex min-w-[160px] flex-1 flex-col gap-2 rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"><div class="flex items-center justify-between"><p class="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Listings</p>
                <span class="material-symbols-outlined text-amber-500 text-xl">holiday_village</span>
            </div>
            <div class="flex items-baseline gap-2"><p class="text-slate-900 dark:text-white text-2xl font-extrabold">${vendorListingsCount}</p>
                <p class="text-emerald-500 text-xs font-bold leading-normal flex items-center"><span class="material-symbols-outlined text-xs">arrow_drop_up</span> +5%
                </p>
            </div>
        </div>
    </div>

    <div class="px-4 pt-2"><div class="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto hidden-scrollbar"><a class="flex flex-col items-center justify-center border-b-2 border-primary text-primary pb-3 pt-2 whitespace-nowrap" href="#"><p class="text-sm font-bold leading-normal tracking-tight">All Vendors</p>
            </a>
            <a class="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-500 dark:text-slate-400 pb-3 pt-2 whitespace-nowrap" href="#"><p class="text-sm font-bold leading-normal tracking-tight">Pending Approval</p>
            </a>
            <a class="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-500 dark:text-slate-400 pb-3 pt-2 whitespace-nowrap" href="#"><p class="text-sm font-bold leading-normal tracking-tight">Verified</p>
            </a>
        </div>
    </div>

    <div class="p-4 space-y-4">${vendors.map(v => `
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"><div class="p-4"><div class="flex items-start justify-between mb-4"><div class="flex items-center gap-3"><div class="size-12 rounded-full flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0 ${v.avatar_url ? '' : 'bg-primary/10 text-primary'}">${v.avatar_url ? `<img class="w-full h-full object-cover" src="${v.avatar_url}"/>` : `<span class="font-bold text-lg">${(v.full_name || 'V').charAt(0)}</span>`}
                        </div>
                        <div class="min-w-0"><h3 class="font-bold text-slate-900 dark:text-white truncate">${v.full_name || 'Vendor'}</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400">Joined ${new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <span class="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"><span class="material-symbols-outlined text-[14px]">verified</span> Verified
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4"><div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg overflow-hidden"><p class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 truncate">Listings</p>
                        <p class="text-lg font-bold text-slate-900 dark:text-white truncate">${allListings.filter(l => l.vendor_id === v.id).length} Active</p>
                    </div>
                        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg overflow-hidden"><p class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 truncate">Contact</p>
                        <p class="text-sm font-bold text-slate-900 dark:text-white truncate" title="${v.email}">${v.email?.split('@')[0] || '—'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2"><button class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2" onclick="window._suspendVendor('${v.id}')"><span class="material-symbols-outlined text-lg">block</span> Suspend
                    </button>
                    <button class="flex-1 bg-primary/10 text-primary py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2" onclick="window._demoteVendor('${v.id}')"><span class="material-symbols-outlined text-lg">cancel</span> Demote
                    </button>
                </div>
            </div>
        </div>
        `).join('')}
        ${vendors.length === 0 ? `<p class="text-center text-slate-500 font-medium py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl">No vendors found.</p>` : ''}
    </div>
  `;
  document.getElementById('app').innerHTML = adminLayout(content, 'vendors', 'Vendors');
  initAdminEvents();

  window._demoteVendor = async (id) => {
    if (!confirm('Demote this vendor to a regular user? Their listings will be preserved but inaccessible to them until they are a vendor again.')) return;
    try {
      await updateProfile(id, { role: 'user' });
      showToast('Vendor demoted to regular user', 'success');
      renderAdminVendors();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  window._suspendVendor = async (id) => {
    if (!confirm('Suspend this vendor? They will not be able to log in or manage listings.')) return;
    try {
      await updateProfile(id, { role: 'suspended' });
      showToast('Vendor suspended and removed from vendor list', 'success');
      renderAdminVendors();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };
}

export async function renderAdminSupport() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

  const { getChatMessages, sendChatMessage, markChatRead, getAdminConversations, subscribeToChatMessages, unsubscribeChat, supabase } = await import('../supabase.js');
  const adminId = state.user?.id;
  let activeConvId = window._adminActiveConv || null;
  let chatChannel = null;

  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const timeStr = (d) => {
    const dt = new Date(d);
    const diff = Date.now() - dt.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  async function renderInbox() {
    if (chatChannel) { try { unsubscribeChat(chatChannel); chatChannel = null; } catch (e) { } }
    let conversations = [];
    try { conversations = await getAdminConversations(); } catch (e) { console.error('Failed to load conversations', e); }
    const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

    const content = `
      <div class="max-w-4xl mx-auto">
        <header class="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-red-500">forum</span> Support Inbox
              ${totalUnread > 0 ? `<span class="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">${totalUnread}</span>` : ''}
            </h2>
            <p class="text-slate-500 text-sm mt-1">Manage vendor conversations</p>
          </div>
        </header>
        <div class="space-y-2">
          ${conversations.length === 0 ? `
            <div class="py-20 flex flex-col items-center text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span class="material-symbols-outlined text-5xl text-slate-300 mb-4">inbox</span>
              <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">No Conversations</h3>
              <p class="text-slate-500 text-sm mt-1">When vendors message support, conversations will appear here.</p>
            </div>
          ` : conversations.map(c => `
            <button class="admin-conv-btn w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border ${c.unread > 0 ? 'border-primary/30 bg-primary/5' : 'border-slate-200 dark:border-slate-800'} hover:border-primary/50 hover:shadow-sm transition-all text-left" data-conv="${c.conversation_id}">
              <div class="relative shrink-0">
                ${c.vendor?.avatar_url ? `<img src="${c.vendor.avatar_url}" class="w-12 h-12 rounded-full object-cover border-2 ${c.unread > 0 ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}" />` : `<div class="w-12 h-12 rounded-full ${c.unread > 0 ? 'bg-primary/10 text-primary border-2 border-primary' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-2 border-slate-200 dark:border-slate-700'} flex items-center justify-center font-bold text-lg">${(c.vendor?.full_name || 'V').charAt(0)}</div>`}
                ${c.unread > 0 ? `<span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">${c.unread}</span>` : ''}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-slate-900 dark:text-white truncate text-sm">${c.vendor?.full_name || 'Unknown Vendor'}</h4>
                  <span class="text-[10px] text-slate-400 shrink-0 ml-2">${timeAgo(c.last_time)}</span>
                </div>
                <p class="text-xs text-slate-500 truncate mt-0.5">${c.is_from_admin ? '<span class="text-red-500 font-semibold">You: </span>' : ''}${c.last_message}</p>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block">${c.total} messages</span>
              </div>
              <span class="material-symbols-outlined text-slate-400 text-lg shrink-0">chevron_right</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.getElementById('app').innerHTML = adminLayout(content, 'support', 'Support');
    initAdminEvents();
    document.querySelectorAll('.admin-conv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeConvId = btn.dataset.conv;
        window._adminActiveConv = activeConvId;
        renderThread(activeConvId);
      });
    });
  }

  async function renderThread(convId) {
    let messages = [];
    let vendor = null;
    try {
      messages = await getChatMessages(convId);
      await markChatRead(convId, adminId);
      const { data } = await supabase.from('profiles').select('*').eq('id', convId).single();
      vendor = data;
    } catch (e) { console.error('Thread load error:', e); }

    const renderMsgs = (msgs) => {
      if (msgs.length === 0) return '<div class="flex-1 flex items-center justify-center text-slate-400 text-sm">No messages yet</div>';
      return msgs.map(m => {
        const isAdminMsg = m.sender_id === adminId || m.is_from_admin;
        return `<div class="flex ${isAdminMsg ? 'justify-end' : 'justify-start'} mb-3">
          <div class="flex items-end gap-2 max-w-[75%] ${isAdminMsg ? 'flex-row-reverse' : ''}">
            <div class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${isAdminMsg ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary'}">
              ${isAdminMsg ? 'A' : (vendor?.full_name?.charAt(0) || 'V')}
            </div>
            <div>
            <div class="px-4 py-2.5 chat-bubble rounded-2xl text-[15px] leading-relaxed ${isAdminMsg ? 'bg-red-500 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/50 rounded-bl-sm shadow-sm'}">${m.message}</div>
              <p class="text-[10px] text-slate-400 mt-1 ${isAdminMsg ? 'text-right' : ''}">${timeStr(m.created_at)}</p>
            </div>
          </div>
        </div>`;
      }).join('');
    };

    const content = `
      <div class="flex flex-col h-[calc(100dvh-140px)] max-w-3xl mx-auto chat-layout">
        <header class="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-1">
          <button id="back-to-inbox" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="flex items-center gap-3 flex-1 min-w-0">
            ${vendor?.avatar_url ? `<img src="${vendor.avatar_url}" class="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />` : `<div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">${(vendor?.full_name || 'V').charAt(0)}</div>`}
            <div class="min-w-0">
              <h3 class="font-bold text-slate-900 dark:text-white truncate text-sm">${vendor?.full_name || 'Vendor'}</h3>
              <p class="text-[10px] text-slate-500">${vendor?.email || ''} &bull; ${vendor?.role || 'vendor'}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            <span class="text-[10px] text-green-600 font-bold">Active</span>
          </div>
        </header>

        <div id="admin-chat-messages" class="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
          ${renderMsgs(messages)}
        </div>

        <div class="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 chat-input-area">
          <form id="admin-chat-form" class="flex items-end gap-2">
            <textarea id="admin-chat-input" rows="1" class="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none placeholder:text-slate-400" placeholder="Reply as Admin..."></textarea>
            <button type="submit" class="h-11 w-11 shrink-0 rounded-xl bg-red-500 text-white flex items-center justify-center hover:brightness-110 transition-all shadow-md shadow-red-500/20">
              <span class="material-symbols-outlined text-xl">send</span>
            </button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('app').innerHTML = adminLayout(content, 'support', 'Support');
    initAdminEvents();

    const container = document.getElementById('admin-chat-messages');
    const input = document.getElementById('admin-chat-input');
    const form = document.getElementById('admin-chat-form');
    if (container) container.scrollTop = container.scrollHeight;

    input?.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    document.getElementById('back-to-inbox')?.addEventListener('click', () => {
      activeConvId = null;
      window._adminActiveConv = null;
      renderInbox();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = input?.value?.trim();
      if (!msg) return;
      input.value = '';
      input.style.height = 'auto';

      const tempBubble = document.createElement('div');
      tempBubble.className = 'flex justify-end mb-3';
      tempBubble.innerHTML = `<div class="flex items-end gap-2 max-w-[75%] flex-row-reverse">
        <div class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white">A</div>
        <div>
          <div class="px-4 py-2.5 rounded-2xl text-sm leading-relaxed bg-red-500 text-white rounded-br-md">${msg}</div>
          <p class="text-[10px] text-slate-400 mt-1 text-right">Sending...</p>
        </div>
      </div>`;
      container?.appendChild(tempBubble);
      container.scrollTop = container.scrollHeight;

      try {
        await sendChatMessage({ senderId: adminId, receiverId: convId, message: msg, isFromAdmin: true, conversationId: convId });
        messages = await getChatMessages(convId);
        container.innerHTML = renderMsgs(messages);
        container.scrollTop = container.scrollHeight;
      } catch (err) {
        showToast('Failed to send: ' + err.message, 'error');
        tempBubble.remove();
      }
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form?.dispatchEvent(new Event('submit')); }
    });

    try {
      chatChannel = subscribeToChatMessages(convId, async (newMsg) => {
        if (newMsg.sender_id !== adminId) {
          messages.push(newMsg);
          container.innerHTML = renderMsgs(messages);
          container.scrollTop = container.scrollHeight;
          try { await markChatRead(convId, adminId); } catch (e) { }
        }
      });
    } catch (e) { console.warn('Realtime error:', e); }
  }

  if (activeConvId) { await renderThread(activeConvId); }
  else { await renderInbox(); }

  return () => { if (chatChannel) { try { unsubscribeChat(chatChannel); } catch (e) { } } };
}

// ----------------------------------------------------------------------------
// CHAT MONITORING (ALL VENDORS)
// ----------------------------------------------------------------------------
export async function renderAdminChatMonitoring() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

  showLoading();
  let vendors = [];
  try {
    vendors = await getAdminChatMonitoringStats();
  } catch (e) {
    console.error('Error fetching chat monitoring stats', e);
    showToast('Failed to load chat monitoring data', 'error');
  }
  hideLoading();

  const vendorRows = vendors.map(v => `
    <tr class="vendor-monitoring-row border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="window.location.hash='/admin/vendor-detail?id=${v.id}'" data-name="${(v.full_name || '').toLowerCase()}" data-email="${(v.email || '').toLowerCase()}">
      <td class="p-4">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
            ${v.avatar_url ? `<img src="${v.avatar_url}" class="h-full w-full object-cover">` : '<span class="material-symbols-outlined h-full w-full flex items-center justify-center text-slate-400">person</span>'}
          </div>
          <div>
            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              ${v.full_name || 'Unknown Vendor'}
              ${v.subscription_plan && v.subscription_plan !== 'free' ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">${v.subscription_plan}</span>` : ''}
            </div>
            <div class="text-xs text-slate-500">${v.email || 'No email'}</div>
          </div>
        </div>
      </td>
      <td class="p-4 text-center">
        <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          ${v.total_listings}
        </span>
      </td>
      <td class="p-4 text-center">
        <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
          ${v.total_leads}
        </span>
      </td>
      <td class="p-4 text-center">
        <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400">
          ${v.total_chats}
        </span>
      </td>
      <td class="p-4 text-sm text-slate-500 text-right whitespace-nowrap">
        ${new Date(v.last_activity).toLocaleDateString()}
      </td>
      <td class="p-4 text-right">
        <button class="text-primary hover:text-primary-dark font-medium text-sm flex items-center justify-end gap-1 ml-auto">
          Monitor <span class="material-symbols-outlined text-sm">visibility</span>
        </button>
      </td>
    </tr>
  `).join('');

  const content = `
    <div class="p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto">
      <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-primary font-bold mb-1">
            <span class="material-symbols-outlined">monitoring</span>
            <span>Platform Oversight</span>
          </div>
          <h2 class="text-xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Chat & Lead Monitoring</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">Monitor real-time interactions between users and vendors to ensure compliance.</p>
        </div>
      </header>

      <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900 dark:text-white">Vendor Performance</h3>
            <span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-bold">${vendors.length}</span>
          </div>
          
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <div class="relative flex-1 sm:w-64">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
              <input type="text" id="admin-chat-search" placeholder="Search vendors..." class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow">
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th class="p-4 w-1/3">Vendor Details</th>
                <th class="p-4 text-center">Total Listings</th>
                <th class="p-4 text-center">Total Leads</th>
                <th class="p-4 text-center">Active Chats</th>
                <th class="p-4 text-right">Last Activity</th>
                <th class="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              ${vendorRows || '<tr><td colspan="6" class="p-8 text-center text-slate-500">No vendor data found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  document.getElementById('app').innerHTML = adminLayout(content, 'chat-monitoring', 'Chat Monitoring');
  initAdminEvents();

  document.getElementById('admin-chat-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.vendor-monitoring-row').forEach(row => {
      row.style.display = (row.dataset.name.includes(q) || row.dataset.email.includes(q)) ? '' : 'none';
    });
  });
}

// ----------------------------------------------------------------------------
// VENDOR DETAIL & CHAT OVERSIGHT
// ----------------------------------------------------------------------------
export async function renderAdminVendorDetail() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const vendorId = urlParams.get('id');

  if (!vendorId) { navigate('/admin/chat-monitoring'); return; }

  showLoading();
  let data = null;
  try {
    data = await getAdminVendorDetails(vendorId);
  } catch (e) {
    console.error('Error fetching vendor details', e);
    showToast('Failed to load vendor details', 'error');
    hideLoading();
    navigate('/admin/chat-monitoring');
    return;
  }
  hideLoading();

  const { vendor, listings, chat_threads } = data;

  const chatRows = chat_threads.map(t => `
    <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="window.location.hash='/admin/listing-chat?listing_id=${t.listing_id}&user_id=${t.user_id}'">
      <td class="p-4 font-medium text-slate-900 dark:text-white">
        ${t.listing_name}
      </td>
      <td class="p-4 text-slate-600 dark:text-slate-300">
        ${t.user_name}
      </td>
      <td class="p-4 text-sm text-slate-500 max-w-xs truncate">
        ${t.last_message || 'N/A'}
      </td>
      <td class="p-4 text-center hidden sm:table-cell">
        <span class="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          ${t.message_count} msgs
        </span>
      </td>
      <td class="p-4 text-sm text-slate-500 text-right whitespace-nowrap">
        ${new Date(t.last_time).toLocaleString()}
      </td>
      <td class="p-4 text-right">
        <button class="text-primary hover:underline text-sm font-medium">Read Chat</button>
      </td>
    </tr>
  `).join('');

  const content = `
    <div class="p-4 md:p-6 w-full max-w-6xl mx-auto">
      <div class="mb-6">
        <a href="#/admin/chat-monitoring" class="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-4">
          <span class="material-symbols-outlined text-[20px] mr-1">arrow_back</span> Back to Vendors
        </a>
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 ring-4 ring-white dark:ring-slate-900 shadow-sm">
              ${vendor.avatar_url ? `<img src="${vendor.avatar_url}" class="h-full w-full object-cover">` : '<span class="material-symbols-outlined h-full w-full flex items-center justify-center text-slate-400 text-3xl">storefront</span>'}
            </div>
            <div>
              <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                ${vendor.full_name || 'Vendor Profile'}
                ${vendor.subscription_plan && vendor.subscription_plan !== 'free' ? `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">${vendor.subscription_plan}</span>` : '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">Free</span>'}
              </h2>
              <div class="text-slate-500 mt-1 flex items-center gap-4 text-sm">
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">mail</span> ${vendor.email}</span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">call</span> ${vendor.phone || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <div class="px-4 py-2 text-center border-r border-slate-100 dark:border-slate-800">
                <div class="text-2xl font-bold text-slate-900 dark:text-white">${listings.length}</div>
                <div class="text-[10px] font-bold text-slate-500 uppercase">Listings</div>
             </div>
             <div class="px-4 py-2 text-center border-r border-slate-100 dark:border-slate-800">
                <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${listings.reduce((acc, curr) => acc + (curr.visit_requests?.[0]?.count || 0), 0)}</div>
                <div class="text-[10px] font-bold text-slate-500 uppercase">Total Leads</div>
             </div>
             <div class="px-4 py-2 text-center">
                <div class="text-2xl font-bold text-sky-600 dark:text-sky-400">${chat_threads.length}</div>
                <div class="text-[10px] font-bold text-slate-500 uppercase">Active Chats</div>
             </div>
          </div>
        </div>
      </div>

      <section class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 class="font-bold text-lg flex items-center gap-2"><span class="material-symbols-outlined text-primary">forum</span> Chat Oversight Log</h3>
          <p class="text-sm text-slate-500 mt-1">Review all active conversations for this vendor's listings to ensure policy compliance.</p>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr class="border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th class="p-4">Listing</th>
                <th class="p-4">User</th>
                <th class="p-4">Last Message</th>
                <th class="p-4 text-center hidden sm:table-cell">Messages</th>
                <th class="p-4 text-right">Last Interaction</th>
                <th class="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              ${chatRows || '<tr><td colspan="6" class="p-8 text-center text-slate-500">No active chats for this vendor.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  document.getElementById('app').innerHTML = adminLayout(content, 'chat-monitoring');
}

// ----------------------------------------------------------------------------
// FULL CHAT INSPECTION
// ----------------------------------------------------------------------------
export async function renderAdminListingChat() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const listingId = urlParams.get('listing_id');
  const userId = urlParams.get('user_id');

  if (!listingId || !userId) { navigate('/admin/chat-monitoring'); return; }

  showLoading();
  let messages = [];
  try {
    messages = await getAdminListingChats(listingId, userId);
  } catch (e) {
    console.error('Error fetching chat history', e);
    showToast('Failed to load chat history', 'error');
    hideLoading();
    navigate('/admin/chat-monitoring');
    return;
  }
  hideLoading();

  if (messages.length === 0) {
    navigate('/admin/chat-monitoring');
    return;
  }

  const vendor = messages[0].vendor;
  const user = messages[0].user;
  const listingName = messages[0].listing || 'Listing ID: ' + listingId;

  const chatBubbles = messages.map(m => {
    const isVendor = m.is_from_vendor;
    const timeStr = new Date(m.created_at).toLocaleString();
    return `
      <div class="flex w-full mb-6 ${isVendor ? 'justify-end' : 'justify-start'}">
        <div class="flex flex-col ${isVendor ? 'items-end' : 'items-start'} max-w-[80%]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[11px] font-bold text-slate-500">${isVendor ? vendor.full_name : user.full_name}</span>
            ${isVendor ? '<span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] uppercase font-bold">Vendor</span>' : '<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] uppercase font-bold">User</span>'}
          </div>
          <div class="px-4 py-3 chat-bubble rounded-2xl ${isVendor ? 'bg-primary text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm'} shadow-sm">
            ${m.message}
          </div>
          <span class="text-[10px] text-slate-400 mt-1">${timeStr}</span>
        </div>
      </div>
    `;
  }).join('');

  const content = `
    <div class="p-4 md:p-6 lg:p-8 w-full max-w-5xl mx-auto h-screen flex flex-col pt-4 pb-[80px] md:pb-8">
      <div class="flex items-center gap-3 mb-6 shrink-0">
        <button onclick="window.history.back()" class="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Chat Oversight <span class="material-symbols-outlined text-red-500 text-sm">visibility</span>
          </h2>
          <p class="text-xs text-slate-500">Monitoring conversation for listing ${listingId}</p>
        </div>
      </div>
      
      <div class="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between shrink-0">
           <div class="flex items-center gap-3">
             <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center relative overflow-hidden">
                ${user.avatar_url ? `<img src="${user.avatar_url}" class="h-full w-full object-cover">` : '<span class="material-symbols-outlined text-slate-500">person</span>'}
             </div>
             <div>
               <div class="font-bold text-sm text-slate-900 dark:text-white">${user.full_name}</div>
               <div class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">User</div>
             </div>
           </div>
           
           <div class="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-4 hidden sm:block"></div>
           
           <div class="flex items-center gap-3 text-right">
             <div class="hidden sm:block">
               <div class="font-bold text-sm text-slate-900 dark:text-white">${vendor.full_name}</div>
               <div class="text-[10px] text-primary uppercase tracking-widest font-bold">Vendor</div>
             </div>
             <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center relative overflow-hidden">
                ${vendor.avatar_url ? `<img src="${vendor.avatar_url}" class="h-full w-full object-cover">` : '<span class="material-symbols-outlined text-primary">storefront</span>'}
             </div>
           </div>
        </div>

        <div class="p-4 text-center bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30">
           <p class="text-xs font-bold text-amber-800 dark:text-amber-500 flex items-center justify-center gap-1">
             <span class="material-symbols-outlined text-[14px]">warning</span> You are viewing this chat in monitoring mode. Neither party is notified of your presence.
           </p>
        </div>
        
        <div class="flex-1 p-6 overflow-y-auto w-full max-w-3xl mx-auto custom-scrollbar">
           ${chatBubbles}
        </div>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = adminLayout(content, 'chat-monitoring');
}

export async function renderAdminPayments() {
  if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

  showLoading();
  let paymentRequests = [];
  try {
    paymentRequests = await getPaymentRequestsAdmin() || [];
  } catch (e) {
    console.error('Failed fetching payment requests', e);
  }
  hideLoading();

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Approved</span>';
      case 'rejected': return '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Rejected</span>';
      default: return '<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider animate-pulse">Pending</span>';
    }
  };

  const tableRows = paymentRequests.length > 0 ? paymentRequests.map(req => {
    const isPending = req.payment_status === 'pending';
    return `
      <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-bold text-slate-900 dark:text-white">${req.plan_name}</div>
          <div class="text-xs text-slate-500">${req.payment_type || 'Subscription'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-slate-900 dark:text-white">${req.vendor_email || req.vendor_id}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-bold text-slate-900 dark:text-white">₹${req.price}</div>
          <div class="text-xs text-slate-400">${new Date(req.created_at).toLocaleDateString()}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <a href="${req.screenshot_url}" target="_blank" class="text-primary hover:underline text-xs flex items-center gap-1 font-semibold group">
            <span class="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">receipt_long</span> View Receipt
          </a>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
          ${getStatusBadge(req.payment_status)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          ${isPending ? `
            <div class="flex items-center justify-end gap-2">
              <button onclick="window.updatePaymentStatus('${req.id}', 'approved')" class="text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 text-xs">
                <span class="material-symbols-outlined text-[16px]">check_circle</span> Approve
              </button>
              <button onclick="window.updatePaymentStatus('${req.id}', 'rejected')" class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 text-xs">
                <span class="material-symbols-outlined text-[16px]">cancel</span> Reject
              </button>
            </div>
          ` : `
            <span class="text-slate-400 text-xs italic">Processed</span>
          `}
        </td>
      </tr>
    `;
  }).join('') : `
    <tr><td colspan="6" class="px-6 py-12 text-center text-slate-500">No payment requests found.</td></tr>
  `;

  const content = `
    <div class="p-6 md:p-8 w-full max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h2 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Payment Requests</h2>
                <p class="text-slate-500 mt-1">Verify UPI screenshot uploads for Vendor Subscriptions & Promotions.</p>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
             <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Plan Details</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Vendor</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount / Date</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Screenshot</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  `;

  document.getElementById('app').innerHTML = adminLayout(content, 'payments');

  window.updatePaymentStatus = async (id, status) => {
    if (!confirm(`Are you sure you want to ${status} this payment?`)) return;
    
    // Optimistic UI: update DOM instantly before waiting for Supabase
    const row = document.querySelector(`button[onclick*="'${id}'"]`)?.closest('tr');
    if (row) {
      const badgeCell = row.querySelectorAll('td')[4];
      if (badgeCell) {
        badgeCell.innerHTML = status === 'approved'
          ? '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Approved</span>'
          : '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Rejected</span>';
      }
      const actionCell = row.querySelectorAll('td')[5];
      if (actionCell) {
        actionCell.innerHTML = '<span class="text-slate-400 text-xs italic">Processed</span>';
      }
    }

    // Fire DB update in background
    try {
      await updatePaymentRequestStatus(id, status);
      showToast(`Payment ${status} successfully`, 'success');
    } catch (e) {
      console.error(e);
      showToast(`Failed to update payment status: ${e.message}`, 'error');
    }
  };
}

export async function renderAdminPlans() {
    if (!isLoggedIn() || !isAdmin()) { navigate('/home'); return; }

    showLoading();
    let plans = [];
    try {
        plans = await getPlans() || [];
    } catch (e) {
        console.error("Error fetching plans:", e);
        showToast("Error fetching plans.", "error");
    }
    hideLoading();

    const planRows = plans.length > 0 ? plans.map(p => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">${p.plan_name}</td>
            <td class="px-6 py-4 font-bold text-primary">₹${p.price.toLocaleString('en-IN')}</td>
            <td class="px-6 py-4 text-slate-500">${p.listing_limit}</td>
            <td class="px-6 py-4 text-slate-500">${p.duration_days} days</td>
            <td class="px-6 py-4">
                <div class="flex flex-col gap-1 text-xs text-slate-500">
                    <span class="${p.show_contact_details ? 'text-green-500 font-bold' : 'text-slate-400'}"><span class="material-symbols-outlined text-[14px] align-middle">${p.show_contact_details ? 'check_circle' : 'cancel'}</span> Contact Access</span>
                    <span class="${p.analytics_access ? 'text-green-500 font-bold' : 'text-slate-400'}"><span class="material-symbols-outlined text-[14px] align-middle">${p.analytics_access ? 'check_circle' : 'cancel'}</span> Analytics</span>
                    <span class="${p.leads_access ? 'text-green-500 font-bold' : 'text-slate-400'}"><span class="material-symbols-outlined text-[14px] align-middle">${p.leads_access ? 'check_circle' : 'cancel'}</span> Leads</span>
                    <span class="${p.featured_pg ? 'text-green-500 font-bold' : 'text-slate-400'}"><span class="material-symbols-outlined text-[14px] align-middle">${p.featured_pg ? 'check_circle' : 'cancel'}</span> Featured PG</span>
                    <span class="${p.top_search ? 'text-green-500 font-bold' : 'text-slate-400'}"><span class="material-symbols-outlined text-[14px] align-middle">${p.top_search ? 'check_circle' : 'cancel'}</span> Top Search</span>
                    <span class="${p.homepage_listing ? 'text-green-500 font-bold' : 'text-slate-400'}"><span class="material-symbols-outlined text-[14px] align-middle">${p.homepage_listing ? 'check_circle' : 'cancel'}</span> Homepage</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <button class="edit-plan-btn text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors" data-id="${p.id}" data-name="${p.plan_name}" data-price="${p.price}" data-limit="${p.listing_limit}" data-duration="${p.duration_days}" data-contact="${p.show_contact_details}" data-analytics="${p.analytics_access}" data-leads="${p.leads_access}" data-featured="${p.featured_pg}" data-topsearch="${p.top_search}" data-homepage="${p.homepage_listing}">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button class="delete-plan-btn text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" data-id="${p.id}">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No subscription plans found. Add one below.</td></tr>`;

    const content = `
        <div class="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in zoom-in duration-300">
            <div class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Subscription Plans</h1>
                    <p class="text-slate-500 font-medium mt-1">Manage vendor subscription plans and privileges</p>
                </div>
                <button onclick="document.getElementById('plan-modal').classList.remove('hidden')" class="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-primary/30 flex items-center gap-2">
                    <span class="material-symbols-outlined">add</span> Create Plan
                </button>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Plan Name</th>
                                <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Price</th>
                                <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Listings Limit</th>
                                <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Duration</th>
                                <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Features</th>
                                <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                            ${planRows}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Plan Modal (Hidden by default) -->
            <div id="plan-modal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                    <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-white" id="modal-title">Create Plan</h3>
                        <button type="button" onclick="document.getElementById('plan-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <form id="plan-form" class="p-6 space-y-4">
                        <input type="hidden" id="plan-id" value="">
                        
                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Name</label>
                            <input type="text" id="plan-name" required class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Pro Plan">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Price (₹)</label>
                                <input type="number" id="plan-price" required min="0" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Duration (Days)</label>
                                <input type="number" id="plan-duration" required min="1" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value="30">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Listing Limit</label>
                            <input type="number" id="plan-limit" required min="1" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value="1">
                        </div>
                        
                        <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
                            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Feature Toggles</h4>
                            <div class="space-y-3">
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" id="plan-contact" class="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer">
                                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Show Contact Details (Unmasks phone numbers)</span>
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" id="plan-analytics" class="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer">
                                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Full Analytics Access</span>
                                </label>
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" id="plan-leads" class="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer">
                                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Leads Access (View &amp; Chat with visits)</span>
                                </label>
                                <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Listing Visibility Boosts</p>
                                    <div class="space-y-3">
                                        <label class="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" id="plan-featured" class="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer">
                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">⭐ Featured PG (Highlighted badge on listing)</span>
                                        </label>
                                        <label class="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" id="plan-topsearch" class="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer">
                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">🔍 Top Search (Priority position in search results)</span>
                                        </label>
                                        <label class="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" id="plan-homepage" class="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer">
                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">🏠 Homepage Listing (Shown in Featured on home page)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="pt-4 flex justify-end gap-3 mt-6">
                            <button type="button" onclick="document.getElementById('plan-modal').classList.add('hidden')" class="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                            <button type="submit" class="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md">Save Plan</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('app').innerHTML = adminLayout(content, 'plans');
    
    // Attach event listeners
    const form = document.getElementById('plan-form');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('plan-id').value;
            const payload = {
                plan_name: document.getElementById('plan-name').value,
                price: parseInt(document.getElementById('plan-price').value),
                duration_days: parseInt(document.getElementById('plan-duration').value),
                listing_limit: parseInt(document.getElementById('plan-limit').value),
                show_contact_details: document.getElementById('plan-contact').checked,
                analytics_access: document.getElementById('plan-analytics').checked,
                leads_access: document.getElementById('plan-leads').checked,
                featured_pg: document.getElementById('plan-featured').checked,
                top_search: document.getElementById('plan-topsearch').checked,
                homepage_listing: document.getElementById('plan-homepage').checked,
            };
            
            showLoading();
            try {
                if (id) {
                    await updatePlan(id, payload);
                    showToast('Plan updated successfully', 'success');
                } else {
                    await createPlan(payload);
                    showToast('Plan created successfully', 'success');
                }
                document.getElementById('plan-modal').classList.add('hidden');
                renderAdminPlans(); // Refresh the view
            } catch (err) {
                console.error(err);
                showToast(err.message || 'Error saving plan', 'error');
            }
            hideLoading();
        });
    }
    
    document.querySelectorAll('.edit-plan-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modal-title').textContent = 'Edit Plan';
            document.getElementById('plan-id').value = btn.dataset.id;
            document.getElementById('plan-name').value = btn.dataset.name;
            document.getElementById('plan-price').value = btn.dataset.price;
            document.getElementById('plan-duration').value = btn.dataset.duration;
            document.getElementById('plan-limit').value = btn.dataset.limit;
            document.getElementById('plan-contact').checked = btn.dataset.contact === 'true';
            document.getElementById('plan-analytics').checked = btn.dataset.analytics === 'true';
            document.getElementById('plan-leads').checked = btn.dataset.leads === 'true';
            document.getElementById('plan-featured').checked = btn.dataset.featured === 'true';
            document.getElementById('plan-topsearch').checked = btn.dataset.topsearch === 'true';
            document.getElementById('plan-homepage').checked = btn.dataset.homepage === 'true';
            document.getElementById('plan-modal').classList.remove('hidden');
        });
    });
    
    document.querySelectorAll('.delete-plan-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if(!confirm("Are you sure you want to delete this subscription plan?")) return;
            
            showLoading();
            try {
                await deletePlan(btn.dataset.id);
                showToast('Plan deleted successfully', 'success');
                renderAdminPlans(); // Refresh
            } catch (err) {
                console.error(err);
                showToast(err.message || 'Error deleting plan', 'error');
            }
            hideLoading();
        });
    });
}
