const fs = require('fs');
let content = fs.readFileSync('src/js/pages/vendor.js', 'utf8');

const lines = content.split('\n');

let startOldActions = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("v.status === 'pending' || v.status === 'rescheduled' ? `")) {
        startOldActions = i;
        break;
    }
}

if (startOldActions > -1) {
    let endOldActions = startOldActions;
    for (let i = startOldActions; i < lines.length; i++) {
        if (lines[i].includes('` : `<span class="text-xs text-slate-400 italic">No actions available</span>`}')) {
            endOldActions = i;
            break;
        }
    }

    if (endOldActions > startOldActions) {
        const newActionsBlock = `                                    \${v.status === 'pending' || v.status === 'rescheduled' ? \`
                                    <div class="flex gap-2">
                                        <button class="approve-visit bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border border-green-200 dark:border-green-800" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">
                                            Approve
                                        </button>
                                        <button class="reject-visit bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border border-red-200 dark:border-red-800" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">
                                            Reject
                                        </button>
                                    </div>
                                    \` : (v.status === 'approved' ? \`<button class="cancel-visit text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors font-bold text-xs" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">Cancel Booking</button>\` : \`<span class="text-xs text-slate-400 italic">No actions available</span>\`)}`;

        lines.splice(startOldActions, endOldActions - startOldActions + 1, newActionsBlock);
        fs.writeFileSync('src/js/pages/vendor.js', lines.join('\n'), 'utf8');
        console.log('Replaced visit request actions column.');
    } else {
        console.log('Could not find end of block.');
    }
} else {
    console.log('Could not find start of block.');
}
