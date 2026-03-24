// Global state - trigger HMR
export const state = {
    user: null,
    profile: null,
    savedListings: new Set(),
    compareList: [],
    notifications: [],
    sidebarOpen: false,
};

let greetingShown = false;

export function subscribe(fn) {
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
}

export function setState(updates) {
    Object.assign(state, updates);
    listeners.forEach(fn => fn(state));
    
    if (!greetingShown && state.user && state.profile?.full_name) {
        greetingShown = true;
        showSmartGreeting(state.profile.full_name.split(' ')[0]);
    }
}

function showSmartGreeting(username) {
    if (!username) return;
    
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const lsKeyFirst = 'staynest_first_login_done';
    const lsKeyDate = 'staynest_last_greeting_date';
    
    const isFirstLogin = !localStorage.getItem(lsKeyFirst);
    const lastGreetingDate = localStorage.getItem(lsKeyDate);
    
    if (isFirstLogin) {
        localStorage.setItem(lsKeyFirst, 'true');
        localStorage.setItem(lsKeyDate, todayStr);
        renderGreetingToast(`👋🏼 Hi ${username}, welcome to StayNest!`);
        return;
    }
    
    if (lastGreetingDate === todayStr) return;
    
    localStorage.setItem(lsKeyDate, todayStr);
    
    const hour = now.getHours();
    let msg = '';
    if (hour >= 5 && hour < 12) {
        msg = `☀️ Good Morning, ${username}`;
    } else if (hour >= 12 && hour < 17) {
        msg = `🌤 Good Afternoon, ${username}`;
    } else if (hour >= 17 && hour < 22) {
        msg = `🌙 Good Evening, ${username}`;
    } else {
        msg = `🌙 Welcome back, ${username}`;
    }
    
    renderGreetingToast(msg);
}

function renderGreetingToast(message) {
    if (document.getElementById('smart-greeting-toast')) return;
    
    const toast = document.createElement('div');
    toast.id = 'smart-greeting-toast';
    toast.className = 'fixed top-20 right-4 z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-md border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 max-w-xs flex items-center justify-between gap-3 transform translate-x-full opacity-0 transition-all duration-300 ease-out cursor-default group';
    
    toast.innerHTML = `
        <span class="text-sm font-medium text-slate-800 dark:text-slate-200 tracking-tight whitespace-nowrap">${message}</span>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100 flex items-center shrink-0 justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });
    });
    
    let timeout;
    let isHovered = false;
    
    const startDismiss = () => {
        if (isHovered) return;
        timeout = setTimeout(() => {
            if (toast && document.body.contains(toast)) {
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    };
    
    startDismiss();
    
    toast.addEventListener('mouseenter', () => {
        isHovered = true;
        clearTimeout(timeout);
    });
    
    toast.addEventListener('mouseleave', () => {
        isHovered = false;
        startDismiss();
    });
}

export function isLoggedIn() { return !!state.user; }
export function isMobile() { return window.innerWidth <= 768; }
export function isVendor() {
    return state.profile?.role === 'vendor';
}
export function isAdmin() {
    return state.profile?.role === 'admin';
}
export function getUserRole() {
    return state.profile?.role || 'user';
}

export function addToCompare(listing) {
    if (state.compareList.length >= 4) return false;
    if (state.compareList.find(l => l.id === listing.id)) return false;
    state.compareList.push(listing);
    setState({ compareList: [...state.compareList] });
    return true;
}

export function removeFromCompare(id) {
    setState({ compareList: state.compareList.filter(l => l.id !== id) });
}

export function isInCompare(id) {
    return state.compareList.some(l => l.id === id);
}

// Toast helper
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Loading
export function showLoading() {
    if (document.getElementById('global-loading')) return;
    const ov = document.createElement('div');
    ov.className = 'loading-overlay flex flex-col items-center justify-center';
    ov.id = 'global-loading';
    ov.innerHTML = `
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p class="text-slate-700 dark:text-slate-300 font-semibold text-sm">Processing...</p>
            </div>
        </div>
    `;
    document.body.appendChild(ov);
}

export function hideLoading() {
    document.getElementById('global-loading')?.remove();
}

// Modal
export function showModal(content) {
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = content;
    overlay.classList.add('active');
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

export function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    overlay.innerHTML = '';
}

// Helpers
export function formatPrice(p) { return '₹' + (p || 0).toLocaleString('en-IN'); }

export function avgRating(reviews) {
    if (!reviews?.length) return 0;
    return Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1));
}

export function renderStars(rating) {
    let html = '<div class="stars">';
    for (let i = 1; i <= 5; i++) {
        html += `<i class="fa${i <= Math.round(rating) ? 's' : 'r'} fa-star${i > Math.round(rating) ? ' empty' : ''}"></i>`;
    }
    return html + '</div>';
}

export function formatTimeAgo(date) {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
}

export function hasOnboarded() { return localStorage.getItem('staynest_onboarded') === 'true'; }
export function setOnboarded() { localStorage.setItem('staynest_onboarded', 'true'); }

export const CITIES = ['Lucknow', 'Prayagraj', 'Delhi', 'Noida', 'Gurgaon', 'Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai'];

export const AMENITIES_LIST = [
    { key: 'wifi', icon: 'wifi', label: 'WiFi' },
    { key: 'ac', icon: 'ac_unit', label: 'AC' },
    { key: 'food', icon: 'restaurant', label: 'Food' },
    { key: 'parking', icon: 'local_parking', label: 'Parking' },
    { key: 'laundry', icon: 'local_laundry_service', label: 'Laundry' },
    { key: 'gym', icon: 'fitness_center', label: 'Gym' },
    { key: 'power_backup', icon: 'electrical_services', label: 'Power Backup' },
    { key: 'cctv', icon: 'videocam', label: 'CCTV' },
    { key: 'water', icon: 'water_drop', label: 'Water Supply' },
    { key: 'bathroom', icon: 'shower', label: 'Attached Bathroom' },
    { key: 'furnished', icon: 'chair', label: 'Furnished' },
    { key: 'tv', icon: 'tv', label: 'TV' },
];

export function getAmenityIcon(key) {
    return AMENITIES_LIST.find(a => a.key === key) || { icon: 'circle', label: key };
}
