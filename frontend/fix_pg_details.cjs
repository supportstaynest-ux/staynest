const fs = require('fs');
let content = fs.readFileSync('src/js/pages/pg-details.js', 'utf8');

// 1. Add new imports
if (!content.includes('getUserListingVisitRequest')) {
    content = content.replace(
        "import { getListing, getListingReviews, addReview, toggleSaveListing, addRecentlyViewed, incrementListingViews, getListingChatMessages, sendListingChatMessage, subscribeToListingChats, unsubscribeChat, getNearbyPlaces, sendTargetedNotification, insertRecentActivity, createVisitRequest",
        "import { getListing, getListingReviews, addReview, toggleSaveListing, addRecentlyViewed, incrementListingViews, getListingChatMessages, sendListingChatMessage, subscribeToListingChats, unsubscribeChat, getNearbyPlaces, sendTargetedNotification, insertRecentActivity, createVisitRequest, getUserListingVisitRequest, cancelVisitRequest"
    );
}

// 2. Add the status rendering logic inside renderPGDetails right before `app.innerHTML = ...`
// Look for `areaScore = Math.min(10, areaScore).toFixed(1);`
const currentVisitLogic = `
    areaScore = Math.min(10, areaScore).toFixed(1);

    // Fetch user's current visit request status if logged in
    let currentVisit = null;
    if (isLoggedIn()) {
        try {
            currentVisit = await getUserListingVisitRequest(id, state.user.id);
        } catch(e) { console.error('Error fetching visit status:', e); }
    }

    const renderBookingButton = (visit) => {
        if (!visit || visit.status === 'cancelled') {
            return '<button id="book-visit-btn" class="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold py-3 rounded-xl border border-transparent hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">' +
                   '<span class="material-symbols-outlined text-[20px]">calendar_month</span> Book Your Visit</button>';
        }
        if (visit.status === 'pending') {
            return '<div class="w-full text-center space-y-1">' +
                   '<button class="flex items-center justify-center gap-2 w-full bg-amber-100 text-amber-700 font-bold py-3 rounded-xl cursor-default border border-amber-200">' +
                   '<span class="material-symbols-outlined text-[20px] animate-pulse">hourglass_empty</span> Visit Pending...</button>' +
                   '<p class="text-[10px] text-slate-500 font-medium">You\\'ll be notified once vendor confirms.</p></div>';
        }
        if (visit.status === 'approved') {
            return '<div class="w-full text-center space-y-2">' +
                   '<button class="flex items-center justify-center gap-2 w-full bg-green-100 text-green-700 font-bold py-3 rounded-xl cursor-default border border-green-200">' +
                   '<span class="material-symbols-outlined text-[20px]">check_circle</span> Visit Approved</button>' +
                   '<button id="cancel-visit-btn" data-id="' + visit.id + '" class="text-xs text-red-500 hover:text-red-600 font-bold w-full text-center py-1">Cancel Booking</button></div>';
        }
        if (visit.status === 'rejected') {
            return '<div class="w-full space-y-3">' +
                   '<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">' +
                   '<p class="text-red-800 font-bold flex items-center justify-center gap-1.5 mb-1"><span class="material-symbols-outlined text-[16px]">cancel</span> Visit Rejected</p>' +
                   (visit.rejection_reason ? '<p class="text-red-600 text-xs text-center italic">"'+visit.rejection_reason+'"</p>' : '<p class="text-red-600 text-xs text-center">Dates not available.</p>') +
                   '</div>' +
                   '<button id="book-visit-btn" class="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold py-3 rounded-xl border border-transparent hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">' +
                   '<span class="material-symbols-outlined text-[20px]">refresh</span> Book Again</button>' +
                   '</div>';
        }
        return '';
    };
`;

if (!content.includes('let currentVisit = null;')) {
    content = content.replace(
        'areaScore = Math.min(10, areaScore).toFixed(1);',
        currentVisitLogic
    );
}

// 3. Replace the static HTML button with the dynamic render function
const staticBtnStr = `                            <button id="book-visit-btn" class="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold py-3 rounded-xl border border-transparent hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">
                                <span class="material-symbols-outlined text-[20px]">calendar_month</span> Book Your Visit
                            </button>`;

if (content.includes(staticBtnStr)) {
    content = content.replace(
        staticBtnStr,
        `                            <div id="booking-button-container">\${renderBookingButton(currentVisit)}</div>`
    );
}

// 4. Update the event listener binding to use event delegation since the button changes
const existingListener = `    document.getElementById('book-visit-btn')?.addEventListener('click', () => {`;
const newListener = `    // Handle dynamic booking buttons (event delegation on container or document)
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('#book-visit-btn');
        if (btn) {
            if (!isLoggedIn()) { navigate('/auth'); return; }

            const modalId = 'book-visit-modal';
            if (document.getElementById(modalId)) document.getElementById(modalId).remove();

            const today = new Date().toISOString().split('T')[0];

            const modalObj = document.createElement('div');
            modalObj.id = modalId;
            modalObj.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in';
            modalObj.innerHTML = \`
                <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 md:mx-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 class="font-bold text-lg flex items-center gap-2"><span class="material-symbols-outlined text-primary">calendar_month</span> Book a Visit</h3>
                        <button id="close-visit-modal" class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="p-5 overflow-y-auto">
                        <form id="book-visit-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Select Date <span class="text-red-500">*</span></label>
                                <input type="date" id="visit-date" required min="\${today}" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white dark:color-scheme-dark">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Time <span class="text-red-500">*</span></label>
                                    <input type="time" id="visit-time" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white dark:color-scheme-dark">
                                </div>
                                <div>
                                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone <span class="text-red-500">*</span></label>
                                    <input type="tel" id="visit-phone" required placeholder="10-digit number" pattern="[0-9]{10}" maxlength="10" value="\${state.profile?.phone || ''}" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Message (Optional)</label>
                                <textarea id="visit-message" rows="2" placeholder="Any specific requirements or questions?" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"></textarea>
                            </div>
                            <button type="submit" id="submit-visit-btn" class="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-md hover:shadow-lg disabled:opacity-70">
                                Confirm Booking
                            </button>
                        </form>
                    </div>
                </div>
            \`;
            document.body.appendChild(modalObj);

            document.getElementById('close-visit-modal').onclick = () => modalObj.remove();
            
            // Handle Form Submits
            document.getElementById('book-visit-form').onsubmit = async (evt) => {
                evt.preventDefault();
                const btn2 = document.getElementById('submit-visit-btn');
                btn2.disabled = true;
                btn2.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Processing...';

                try {
                    const dt = document.getElementById('visit-date').value;
                    const tm = document.getElementById('visit-time').value;
                    const ph = document.getElementById('visit-phone').value;
                    const ms = document.getElementById('visit-message').value;

                    const newVisit = await createVisitRequest({
                        listing_id: id,
                        vendor_id: pg.vendor_id,
                        user_id: state.user.id, // User who is requesting
                        visit_date: dt,
                        visit_time: tm,
                        name: state.user.user_metadata?.full_name || 'User',
                        phone: ph,
                        message: ms
                    });

                    showToast('Visit request sent successfully!', 'success');
                    modalObj.remove();

                    // Update UI immediately to Pending
                    currentVisit = newVisit;
                    const container = document.getElementById('booking-button-container');
                    if(container) container.innerHTML = renderBookingButton(currentVisit);

                    // Notify Vendor
                    sendTargetedNotification(
                        pg.vendor_id,
                        '📅 New Visit Request',
                        \`\${state.user.user_metadata?.full_name || 'A user'} wants to visit "\${pg.name}" on \${new Date(dt).toLocaleDateString()} at \${tm}.\`,
                        'visit_request'
                    ).catch(console.error);

                    insertRecentActivity(pg.vendor_id, 'visit_request', \`New visit request for \${pg.name}\`, { listing_id: id }).catch(console.error);
                } catch (err) {
                    console.error('Visit error:', err);
                    showToast(err.message || 'Failed to request visit', 'error');
                    btn2.disabled = false;
                    btn2.innerHTML = 'Confirm Booking';
                }
            };
        }

        // Cancel Booking Logic
        const cancelBtn = e.target.closest('#cancel-visit-btn');
        if (cancelBtn) {
            const vid = cancelBtn.dataset.id;
            if(confirm('Are you sure you want to cancel this approved visit?')) {
                const prevHtml = cancelBtn.innerHTML;
                cancelBtn.innerHTML = 'Cancelling...';
                cancelBtn.disabled = true;
                try {
                    await cancelVisitRequest(vid);
                    showToast('Visit cancelled', 'success');
                    
                    // Notify Vendor
                    sendTargetedNotification(
                        pg.vendor_id,
                        '⚠️ Visit Cancelled',
                        \`\${state.user.user_metadata?.full_name || 'A user'} has cancelled their approved visit to "\${pg.name}".\`,
                        'visit_cancelled'
                    ).catch(console.error);

                    // Reset button
                    currentVisit = null;
                    const container = document.getElementById('booking-button-container');
                    if(container) container.innerHTML = renderBookingButton(currentVisit);
                } catch(err) {
                    console.error(err);
                    showToast('Failed to cancel', 'error');
                    cancelBtn.innerHTML = prevHtml;
                    cancelBtn.disabled = false;
                }
            }
        }
    });

    // Remove the old static listener
`;

// Replace the old listener using text bounds. We find "document.getElementById('book-visit-btn')?.addEventListener('click',"
// and replace up down to the "modalObj.remove();" and the try-catch block
const lines = content.split('\n');
let startOldListener = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("document.getElementById('book-visit-btn')?.addEventListener('click',")) {
        startOldListener = i;
        break;
    }
}

if (startOldListener > -1) {
    let braceDepth = 0;
    let foundStart = false;
    let endOldListener = startOldListener;
    for (let i = startOldListener; i < lines.length; i++) {
        for (const c of lines[i]) {
            if (c === '{') { braceDepth++; foundStart = true; }
            if (c === '}') braceDepth--;
        }
        if (foundStart && braceDepth === 0) {
            endOldListener = i;
            break;
        }
    }
    lines.splice(startOldListener, endOldListener - startOldListener + 1, newListener);
    fs.writeFileSync('src/js/pages/pg-details.js', lines.join('\n'), 'utf8');
    console.log('pg-details.js: updated UI to show dynamic booking status.');
} else {
    // Already replaced or not found
    console.log('pg-details.js: listener part not found, skipping replacement.');
}
