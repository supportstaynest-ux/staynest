const fs = require('fs');
let content = fs.readFileSync('src/js/pages/vendor.js', 'utf8');

// 1. Add cancelVisitRequest to imports
if (!content.includes('cancelVisitRequest')) {
    content = content.replace(
        "import { signOut, getVendorStats, getVendorListings, createListing, updateListing, deleteListing, getEnquiries, replyEnquiry, replyReview, uploadListingImages, getVendorReviews, insertNearbyPlaces, getVendorBroadcasts, dismissMessage, getVendorVisitRequests, updateVisitRequestStatus, getVendorListingChats, getListingChatMessages, sendListingChatMessage, subscribeToListingChats, unsubscribeChat, sendTargetedNotification, insertRecentActivity } from '../supabase.js';",
        "import { signOut, getVendorStats, getVendorListings, createListing, updateListing, deleteListing, getEnquiries, replyEnquiry, replyReview, uploadListingImages, getVendorReviews, insertNearbyPlaces, getVendorBroadcasts, dismissMessage, getVendorVisitRequests, updateVisitRequestStatus, getVendorListingChats, getListingChatMessages, sendListingChatMessage, subscribeToListingChats, unsubscribeChat, sendTargetedNotification, insertRecentActivity, cancelVisitRequest } from '../supabase.js';"
    );
}

// 2. Add Cancel button for 'approved' status in visit requests row
// Look for `<td class="px-6 py-4">` that has the actions
const renderVisitRowStart = `v.status === 'pending' || v.status === 'rescheduled' ? \``;

if (content.includes(renderVisitRowStart)) {
    // We replace the actions block
    const oldActionsBlock = `v.status === 'pending' || v.status === 'rescheduled' ? \`
                                    <div class="flex gap-2">
                                        <button class="approve-visit text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1.5 rounded-lg transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-800" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}" title="Approve Visit">
                                            <span class="material-symbols-outlined text-[20px]">check_circle</span>
                                        </button>
                                        <button class="reject-visit text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}" title="Reject Visit">
                                            <span class="material-symbols-outlined text-[20px]">cancel</span>
                                        </button>
                                    </div>
                                    \` : \`<span class="text-xs text-slate-400 italic">No actions available</span>\``;

    const newActionsBlock = `v.status === 'pending' || v.status === 'rescheduled' ? \`
                                    <div class="flex gap-2">
                                        <button class="approve-visit bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 px-2 py-1 rounded transition-colors text-xs font-bold" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">
                                            Approve
                                        </button>
                                        <button class="reject-visit bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-1 rounded transition-colors text-xs font-bold" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">
                                            Reject
                                        </button>
                                    </div>
                                    \` : (v.status === 'approved' ? \`<button class="cancel-visit text-red-500 hover:text-red-700 font-bold text-xs" data-id="\${v.id}" data-user-id="\${v.user_id}" data-listing-name="\${v.listing ? v.listing.name : ''}">Cancel Booking</button>\` : \`<span class="text-xs text-slate-400 italic">No actions available</span>\`)`;

    content = content.replace(oldActionsBlock, newActionsBlock);
}

// 3. Update the handleStatusUpdate logic to prompt for reason on reject and handle custom modal or browser prompt
const oldHandleStatus = `    const handleStatusUpdate = async (id, newStatus, visitUserId, listingName) => {
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
    };

    document.querySelectorAll('.approve-visit').forEach(btn => {
        btn.onclick = () => handleStatusUpdate(
            btn.dataset.id, 'approved', btn.dataset.userId, btn.dataset.listingName
        );
    });
    document.querySelectorAll('.reject-visit').forEach(btn => {
        btn.onclick = () => handleStatusUpdate(
            btn.dataset.id, 'rejected', btn.dataset.userId, btn.dataset.listingName
        );
    });`;

const newHandleStatus = `    const handleStatusUpdate = async (id, newStatus, visitUserId, listingName, rejectionReason = null) => {
        showLoading();
        try {
            const updates = { status: newStatus };
            if (rejectionReason) updates.rejection_reason = rejectionReason;
            
            await updateVisitRequestStatus(id, updates);
            showToast(\`Visit \${newStatus} successfully\`, 'success');
            
            // Notify the user who made the visit request
            if (visitUserId) {
                if (newStatus === 'approved') {
                    sendTargetedNotification(
                        visitUserId, '✅ Visit Request Approved',
                        \`Your visit request for "\${listingName || 'a property'}" has been approved by the vendor.\`,
                        'visit_approved'
                    ).catch(console.error);
                } else if (newStatus === 'rejected') {
                    sendTargetedNotification(
                        visitUserId, '❌ Visit Request Rejected',
                        \`Your visit request for "\${listingName || 'a property'}" was rejected. Reason: \${rejectionReason || 'Vendor unavailable'}\`,
                        'visit_rejected'
                    ).catch(console.error);
                }
            }
            renderVendorEnquiries(); // Refresh view
        } catch (e) {
            console.error(e);
            showToast('Failed to update visit status', 'error');
        }
        hideLoading();
    };

    document.querySelectorAll('.approve-visit').forEach(btn => {
        btn.onclick = () => handleStatusUpdate(btn.dataset.id, 'approved', btn.dataset.userId, btn.dataset.listingName);
    });

    // Custom Rejection Modal
    document.querySelectorAll('.reject-visit').forEach(btn => {
        btn.onclick = () => {
            const reason = prompt('Please enter a reason for rejecting this visit:');
            if (reason !== null) {
                handleStatusUpdate(btn.dataset.id, 'rejected', btn.dataset.userId, btn.dataset.listingName, reason.trim() || 'No reason provided');
            }
        };
    });

    // Handle vendor-side Cancel
    document.querySelectorAll('.cancel-visit').forEach(btn => {
        btn.onclick = async () => {
            if (confirm('Are you sure you want to cancel this approved visit?')) {
                showLoading();
                try {
                    await cancelVisitRequest(btn.dataset.id);
                    showToast('Visit cancelled successfully', 'success');
                    sendTargetedNotification(
                        btn.dataset.userId, '⚠️ Visit Cancelled',
                        \`The vendor has cancelled the approved visit for "\${btn.dataset.listingName || 'a property'}".\`,
                        'visit_cancelled'
                    ).catch(console.error);
                    renderVendorEnquiries();
                } catch(e) {
                    console.error(e);
                    showToast('Failed to cancel visit', 'error');
                }
                hideLoading();
            }
        };
    });`;

if (content.includes('const handleStatusUpdate = async (id, newStatus, visitUserId, listingName) => {')) {
    content = content.replace(oldHandleStatus, newHandleStatus);
    console.log('vendor.js: replaced handleStatusUpdate block');
}

fs.writeFileSync('src/js/pages/vendor.js', content, 'utf8');
console.log('vendor.js: UI logic for Visit cancellation and rejection added.');
