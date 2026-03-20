const fs = require('fs');
let c = fs.readFileSync('src/js/pages/admin.js', 'utf8');

const correctHeader = `import { state, isLoggedIn, isAdmin, showToast, showLoading, hideLoading, formatPrice } from '../state.js';
import { navigate } from '../router.js';
import { signOut, getAdminStats, getAllUsers, getAllListingsAdmin, updateProfile, updateListing, deleteListing, sendNotification, getReports } from '../supabase.js';

export function adminLayout(content, active = 'dashboard', title = 'Admin Panel') {
  const p = state.user || {}; // use user data instead of undefined profile
  const items = [
    { key: 'dashboard', icon: 'dashboard', label: 'Home', href: '/admin' },
    { key: 'users', icon: 'group', label: 'Users', href: '/admin/users' },
    { key: 'support', icon: 'confirmation_number', label: 'Support', href: '/admin/support' },
    { key: 'payments', icon: 'payments', label: 'Payments', href: '/admin/payments' },
    { key: 'settings', icon: 'settings', label: 'Settings', href: '/admin/settings' },
  ];

  const bottomNavLinks = items.map(i => {
    const isActive = active === i.key;
    const activeIconClass = isActive
      ? 'bg-primary text-white'
      : 'text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-all';
    const activeTextClass = isActive ? 'text-primary' : 'text-slate-400';

    return \`
        <a class="flex flex-col items-center gap-1 group" href="#\${i.href}">
            <div class="p-2 rounded-xl \${activeIconClass} transition-all">
                <span class="material-symbols-outlined text-[24px]">\${i.icon}</span>
            </div>
            <span class="text-[10px] font-bold \${activeTextClass}">\${i.label}</span>
        </a>
    \`;
  }).join('');

// prettier-ignore
return \``;

// Remove the corrupted header block
let newC = c.replace(/import \{ state,[\s\S]*?return `/, correctHeader);

// And we need to fix the one extra line 15: `  }).join('');\n\nreturn \`` which is left over from the corruption.
// Wait, the regex `[\s\S]*?return \`` will match up to the first `return \`` which is line 6.
// Then the code still has lines 7-16 which is the second return! 
// Let's replace up to line 16 instead:

newC = c.replace(/import \{ state,[\s\S]*?return `[\s\S]*?return `/, correctHeader);

fs.writeFileSync('src/js/pages/admin.js', newC);
console.log('Fixed admin.js header');
