import { state, isLoggedIn, isMobile } from '../state.js';
import { navigate } from '../router.js';
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { getUserBroadcasts, dismissMessage } from '../supabase.js';

export async function renderNotifications() {
    if (!isLoggedIn()) { navigate('/auth'); return; }
    const app = document.getElementById('app');

    // Initial loading state
    app.innerHTML = `
        <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-display">
            ${renderNavbar('Notifications')}
            <main class="flex-grow p-4 flex items-center justify-center">
                <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </main>
        </div>
    `;

    let notifications = [];
    try {
        notifications = await getUserBroadcasts(state.user.id);
    } catch (e) {
        console.error('Error fetching notifications:', e);
    }

    const renderNotificationCard = (n) => {
        const timeAgo = (() => {
            const diff = Date.now() - new Date(n.created_at).getTime();
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
            if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
            return Math.floor(diff / 86400000) + 'd ago';
        })();

        return `
            <article class="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative group transition-all hover:shadow-md" data-id="${n.id}">
                <div class="flex gap-4">
                    <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span class="material-symbols-outlined text-primary text-2xl">notifications</span>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-1">
                            <span class="text-xs font-bold text-primary uppercase tracking-wider">${n.type || 'Alert'}</span>
                            <span class="text-[10px] text-slate-400">${timeAgo}</span>
                        </div>
                        <h2 class="text-sm font-semibold mb-1 text-slate-900 dark:text-white">${n.title}</h2>
                        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">${n.message}</p>
                        <div class="mt-3 flex items-center justify-between">
                            <button class="dismiss-notif text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors" data-id="${n.id}">Dismiss</button>
                            <button class="text-xs font-bold text-primary flex items-center gap-1">
                                View Details
                                <span class="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    };

    app.innerHTML = `
        <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 pb-20">
            ${renderNavbar('Notifications')}
            
            <nav class="bg-white dark:bg-slate-900 px-4 py-2 sticky top-[56px] md:top-[64px] z-40 border-b border-slate-100 dark:border-slate-800 transition-all overflow-x-auto no-scrollbar">
                <div class="flex gap-2 py-2">
                    <button class="whitespace-nowrap px-5 py-2 rounded-full bg-primary text-white text-xs font-bold shadow-md shadow-primary/20">All</button>
                    <button class="whitespace-nowrap px-5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 transition-colors">Price Drops</button>
                    <button class="whitespace-nowrap px-5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 transition-colors">Alerts</button>
                    <button class="whitespace-nowrap px-5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 transition-colors">Visits</button>
                </div>
            </nav>

            <main class="max-w-2xl mx-auto w-full px-4 py-6 space-y-4 animate-in slideInUp">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Notifications</h3>
                    <button id="mark-all-read" class="text-xs font-bold text-primary hover:underline">Mark all as read</button>
                </div>
                
                <div id="notif-list" class="space-y-4">
                    ${notifications.length ? notifications.map(n => renderNotificationCard(n)).join('') : `
                        <div class="py-20 text-center">
                            <div class="inline-block p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                                <span class="material-symbols-outlined text-4xl text-slate-300">notifications_off</span>
                            </div>
                            <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">No notifications</h3>
                            <p class="text-sm text-slate-500 mt-1">We'll notify you when something important happens.</p>
                        </div>
                    `}
                </div>

                ${notifications.length > 0 ? `
                    <div class="pt-8 text-center">
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">No more notifications</p>
                    </div>
                ` : ''}
            </main>
            ${!isMobile() ? renderFooter() : ''}
        </div>
    `;

    // Bind events
    document.querySelectorAll('.dismiss-notif').forEach(btn => {
        btn.onclick = async (e) => {
            const id = btn.dataset.id;
            const card = btn.closest('article');
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), 300);
            try {
                await dismissMessage(state.user.id, id);
            } catch (err) { console.error(err); }
        };
    });

    document.getElementById('mark-all-read').onclick = async () => {
        showToast('Marking all as read...', 'info');
        // Implement mark all as read logic if available in supabase.js
    };
}
