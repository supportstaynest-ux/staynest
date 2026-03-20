const fs = require('fs');

let vendorContent = fs.readFileSync('src/js/pages/vendor.js', 'utf8');

const handleOld = `    const handleStatusUpdate = async (id, newStatus, visitUserId, listingName) => {
        showLoading();
        try {
            await updateVisitRequestStatus(id, { status: newStatus });
            showToast(\`Visit \${newStatus} successfully\`, 'success');
            // Notify the user who made the visit request
            if (visitUserId) {
                const emoji = newStatus === 'approved' ? '✅' : '❌';
                const statusLabel = newStatus === 'approved' ? 'Approved' : 'Rejected';
                sendTargetedNotification(
                    visitUserId,
                    \`\${emoji} Visit Request \${statusLabel}\`,
                    \`Your visit request for "\${listingName || 'a property'}" has been \${newStatus} by the vendor.\`,
                    \`visit_\${newStatus}\`
                );
            }
            renderVendorEnquiries(); // Refresh view
        } catch (e) {
            console.error(e);
            showToast('Failed to update visit status', 'error');
        }
        hideLoading();
    };`;

const handleNew = `    const handleStatusUpdate = async (id, newStatus, visitUserId, listingName, rejectionReason = null) => {
        showLoading();
        try {
            const updates = { status: newStatus };
            if (newStatus === 'rejected') {
                updates.rejection_reason = rejectionReason || 'No reason provided';
            }
            
            await updateVisitRequestStatus(id, updates);
            
            showToast(\`Visit \${newStatus} successfully\`, 'success');
            // Notify the user who made the visit request
            if (visitUserId) {
                const emoji = newStatus === 'approved' ? '✅' : '❌';
                const statusLabel = newStatus === 'approved' ? 'Approved' : 'Rejected';
                let msg = \`Your visit request for "\${listingName || 'a property'}" has been \${newStatus} by the vendor.\`;
                if (rejectionReason) msg += \` Reason: "\${rejectionReason}"\`;
                
                sendTargetedNotification(
                    visitUserId,
                    \`\${emoji} Visit Request \${statusLabel}\`,
                    msg,
                    \`visit_\${newStatus}\`
                );
            }
            renderVendorEnquiries(); // Refresh view
        } catch (e) {
            console.error(e);
            showToast('Failed to update visit status', 'error');
        }
        hideLoading();
    };`;

if (vendorContent.includes(handleOld)) {
    vendorContent = vendorContent.replace(handleOld, handleNew);
    console.log("vendor.js: Updated handleStatusUpdate for rejection reasons");
} else {
    console.log("vendor.js: Failed to find handleStatusUpdate old code");
    // fallback replace
    vendorContent = vendorContent.replace(/const handleStatusUpdate \= async \(id, newStatus, visitUserId, listingName\) \=\> \{[\s\S]*?hideLoading\(\);\n    \};\n/m, handleNew + "\n");
}

const rejectOld = `    document.querySelectorAll('.reject-visit').forEach(btn => {
        btn.onclick = () => handleStatusUpdate(
            btn.dataset.id, 'rejected', btn.dataset.userId, btn.dataset.listingName
        );
    });`;

const rejectNew = `    document.querySelectorAll('.reject-visit').forEach(btn => {
        btn.onclick = () => {
            const reason = prompt('Please enter a mandatory reason for rejecting this visit:');
            if (reason === null) return; // User cancelled prompt
            if (reason.trim() === '') {
                showToast('A reason is required to reject a visit.', 'error');
                return;
            }
            handleStatusUpdate(
                btn.dataset.id, 'rejected', btn.dataset.userId, btn.dataset.listingName, reason.trim()
            );
        };
    });`;

if (vendorContent.includes(rejectOld)) {
    vendorContent = vendorContent.replace(rejectOld, rejectNew);
    console.log("vendor.js: Updated .reject-visit click handlers");
} else {
    console.log("vendor.js: Failed to find .reject-visit old code");
    // fallback
    vendorContent = vendorContent.replace(/document\.querySelectorAll\('\.reject-visit'\)\.forEach\(btn \=\> \{[\s\S]*?\}\);\n/m, rejectNew + "\n");
}

fs.writeFileSync('src/js/pages/vendor.js', vendorContent, 'utf8');

// --- pg-details.js fixes ---
// Also, the user visits tab: wait, user visits tab is `user-pages.js`.
// Let's check `user-pages.js`. It renders visits fine.
// But we need to make sure the user visits tab works. We fixed its data source in supabase.js so it should work now.

// Let's also verify that in `pg-details.js`, if the visit is rejected, it displays the rejection reason!
let pgContent = fs.readFileSync('src/js/pages/pg-details.js', 'utf8');
// Look for renderBookingButton inside pg-details.js

const renderBookingOld = `            if (v.status === 'rejected') {
                return \`
                    <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-3 text-sm text-red-600 dark:text-red-400">
                        <p class="font-bold flex items-center gap-1 mb-1"><span class="material-symbols-outlined text-[18px]">cancel</span> Request Rejected</p>
                        <p>The vendor is unable to accommodate this visit at the requested time.</p>
                    </div>
                    <button id="book-visit-btn" class="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold py-3 rounded-xl border border-transparent hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">
                        <span class="material-symbols-outlined text-[20px]">calendar_month</span> Book Another Visit
                    </button>
                \`;
            }`;

const renderBookingNew = `            if (v.status === 'rejected') {
                return \`
                    <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-3 text-sm text-red-600 dark:text-red-400">
                        <p class="font-bold flex items-center gap-1 mb-1"><span class="material-symbols-outlined text-[18px]">cancel</span> Request Rejected</p>
                        <p>\${v.rejection_reason ? \`Reason: "\${v.rejection_reason}"\` : 'The vendor is unable to accommodate this visit at the requested time.'}</p>
                    </div>
                    <button id="book-visit-btn" class="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold py-3 rounded-xl border border-transparent hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">
                        <span class="material-symbols-outlined text-[20px]">calendar_month</span> Book Another Visit
                    </button>
                \`;
            }`;

if (pgContent.includes(renderBookingOld)) {
    pgContent = pgContent.replace(renderBookingOld, renderBookingNew);
    console.log("pg-details.js: Updated rejection reason display");
}
fs.writeFileSync('src/js/pages/pg-details.js', pgContent, 'utf8');

// I also want to make sure the user visits page shows the rejection reason.
let userPgContent = fs.readFileSync('src/js/pages/user-pages.js', 'utf8');
const userVisitMsgOld = `                    \${v.message ? \`
                    <p class="text-sm text-slate-500 mt-3 italic text-xs border-l-2 border-slate-200 dark:border-slate-700 pl-2">"\${v.message}"</p>
                    \` : ''}`;

const userVisitMsgNew = `                    \${(v.status === 'rejected' && v.rejection_reason) ? \`
                    <div class="mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border-l-4 border-red-500">
                        <span class="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block mb-1">Rejection Reason</span>
                        <p class="text-sm text-slate-700 dark:text-slate-300">"\${v.rejection_reason}"</p>
                    </div>\` : ''}
                    \${v.message ? \`
                    <p class="text-sm text-slate-500 mt-3 italic text-xs border-l-2 border-slate-200 dark:border-slate-700 pl-2">"\${v.message}"</p>
                    \` : ''}`;

if (userPgContent.includes(userVisitMsgOld) && !userPgContent.includes('Rejection Reason')) {
    userPgContent = userPgContent.replace(userVisitMsgOld, userVisitMsgNew);
    console.log("user-pages.js: Updated to display rejection reason on visits tab");
    fs.writeFileSync('src/js/pages/user-pages.js', userPgContent, 'utf8');
}

