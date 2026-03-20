const fs = require('fs');
let content = fs.readFileSync('src/js/pages/vendor.js', 'utf8');

// The replacement logic: we find the actions block and append a "Message User" button to BOTH pending and approved requests.
const replaceStart = "                                    ${v.status === 'pending' || v.status === 'rescheduled' ? `";

if (content.indexOf(replaceStart) > -1) {
    // We already replaced the block in a previous step, so let's find the current block
    const blockStartIdx = content.indexOf(`                                    \${v.status === 'pending' || v.status === 'rescheduled' ? \``);
    const blockEndIdx = content.indexOf(`\` : \`<span class="text-xs text-slate-400 italic">No actions available</span>\`)}`);

    if (blockStartIdx > -1 && blockEndIdx > -1) {
        const replaceLen = blockEndIdx - blockStartIdx + 85; // end of closing tag roughly

        let newBlock = `                                    \${v.status === 'pending' || v.status === 'rescheduled' ? \`
                                    <div class="flex gap-1.5 flex-wrap">
                                        <button class="approve-visit bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-green-200 dark:border-green-800" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">Approve</button>
                                        <button class="reject-visit bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-red-200 dark:border-red-800" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">Reject</button>
                                        <button class="message-user bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-blue-200 dark:border-blue-800" data-listing="\${v.listing_id}" data-user="\${v.user_id}" data-user-name="\${v.name || 'User'}" data-listing-name="\${v.listing ? v.listing.name : 'Property'}"><span class="material-symbols-outlined text-[14px] align-bottom mr-1">chat</span>Message</button>
                                    </div>
                                    \` : (v.status === 'approved' ? \`
                                    <div class="flex gap-1.5 flex-wrap">
                                        <button class="cancel-visit text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors font-bold text-xs" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">Cancel</button>
                                        <button class="message-user bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-blue-200 dark:border-blue-800" data-listing="\${v.listing_id}" data-user="\${v.user_id}" data-user-name="\${v.name || 'User'}" data-listing-name="\${v.listing ? v.listing.name : 'Property'}"><span class="material-symbols-outlined text-[14px] align-bottom mr-1">chat</span>Message</button>
                                    </div>
                                    \` : \`
                                    <div class="flex gap-1.5 flex-wrap">
                                        <span class="text-xs text-slate-400 italic py-1.5">No actions</span>
                                        <button class="message-user bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-blue-200 dark:border-blue-800" data-listing="\${v.listing_id}" data-user="\${v.user_id}" data-user-name="\${v.name || 'User'}" data-listing-name="\${v.listing ? v.listing.name : 'Property'}"><span class="material-symbols-outlined text-[14px] align-bottom mr-1">chat</span>Message</button>
                                    </div>
                                    \`)}`;

        const before = content.substring(0, blockStartIdx);
        const after = content.substring(blockEndIdx + 88);

        let writeOk = true;
        if (after.includes('<tr><td colspan="5"')) {
            content = before + newBlock + after;
        } else {
            // fallback line replace
            const lines = content.split('\\n');
            const sl = lines.findIndex(l => l.includes("v.status === 'pending' || v.status === 'rescheduled' ? \`"));
            const el = lines.findIndex((l, idx) => idx > sl && l.includes("\`}"));
            if (sl > -1 && el > -1) {
                lines.splice(sl, el - sl + 1, newBlock);
                content = lines.join('\\n');
            }
        }
    }
} else {
    // line level string finding
    const lines = content.split('\n');
    let sl = -1, el = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("v.status === 'pending' || v.status === 'rescheduled' ? `")) sl = i;
        if (sl > -1 && i > sl && lines[i].includes('`}')) { el = i; break; }
    }
    if (sl > -1 && el > -1) {
        let newBlock = `                                    \${v.status === 'pending' || v.status === 'rescheduled' ? \`
                                    <div class="flex gap-1.5 flex-wrap">
                                        <button class="approve-visit bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-green-200 dark:border-green-800" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">Approve</button>
                                        <button class="reject-visit bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-red-200 dark:border-red-800" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">Reject</button>
                                        <button class="message-user bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-blue-200 dark:border-blue-800" data-listing="\${v.listing_id}" data-user="\${v.user_id}" data-user-name="\${v.name || 'User'}" data-listing-name="\${v.listing ? v.listing.name : 'Property'}"><span class="material-symbols-outlined text-[14px] align-bottom mr-1">chat</span>Message</button>
                                    </div>
                                    \` : (v.status === 'approved' ? \`
                                    <div class="flex gap-1.5 flex-wrap">
                                        <button class="cancel-visit text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors font-bold text-xs" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">Cancel</button>
                                        <button class="message-user bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-blue-200 dark:border-blue-800" data-listing="\${v.listing_id}" data-user="\${v.user_id}" data-user-name="\${v.name || 'User'}" data-listing-name="\${v.listing ? v.listing.name : 'Property'}"><span class="material-symbols-outlined text-[14px] align-bottom mr-1">chat</span>Message</button>
                                    </div>
                                    \` : \`
                                    <div class="flex gap-1.5 flex-wrap">
                                        <span class="text-xs text-slate-400 italic py-1.5">No actions</span>
                                        <button class="message-user bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border border-blue-200 dark:border-blue-800" data-listing="\${v.listing_id}" data-user="\${v.user_id}" data-user-name="\${v.name || 'User'}" data-listing-name="\${v.listing ? v.listing.name : 'Property'}"><span class="material-symbols-outlined text-[14px] align-bottom mr-1">chat</span>Message</button>
                                    </div>
                                    \`)}`;
        lines.splice(sl, el - sl + 1, newBlock);
        content = lines.join('\n');
    }
}

// Now add the event listener for .message-user
const jsToAdd = `
    // Handle Message User from Visit row
    document.querySelectorAll('.message-user').forEach(btn => {
        btn.onclick = () => {
            const listingId = btn.dataset.listing;
            const userId = btn.dataset.user;
            const userName = btn.dataset.userName;
            const listingName = btn.dataset.listingName;
            
            // Switch to chats tab
            switchTab('chats');
            
            // Find existing thread and select it if it exists
            const threads = document.querySelectorAll('.chat-thread');
            let found = false;
            threads.forEach(t => {
                if(t.dataset.listing === listingId && t.dataset.user === userId) {
                    t.click();
                    found = true;
                }
            });
            
            // If no history exists, manually start chat
            if (!found) {
                // Remove active classes
                threads.forEach(t => t.classList.remove('bg-white', 'dark:bg-slate-800/50', 'border-l-4', 'border-l-primary'));
                loadChat(listingId, userId, userName, null, listingName);
            }
        };
    });
`;

if (!content.includes('.message-user')) {
    const lines = content.split('\n');
    let insertAt = lines.findIndex(l => l.includes("document.querySelectorAll('.cancel-visit')"));
    if (insertAt > -1) {
        // Find end of cancel-visit block
        let depth = 0, started = false;
        for (let i = insertAt; i < lines.length; i++) {
            for (let c of lines[i]) {
                if (c === '{') { depth++; started = true; }
                if (c === '}') depth--;
            }
            if (started && depth === 0) {
                insertAt = i + 1;
                break;
            }
        }
        lines.splice(insertAt, 0, jsToAdd);
        content = lines.join('\n');
    }
}

fs.writeFileSync('src/js/pages/vendor.js', content, 'utf8');
console.log('vendor.js: Added Message buttons to visit requests');
