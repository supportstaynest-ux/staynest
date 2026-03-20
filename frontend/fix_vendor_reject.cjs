const fs = require('fs');
let content = fs.readFileSync('src/js/pages/vendor.js', 'utf8');

// Replace handleStatusUpdate using regex
content = content.replace(
    /const handleStatusUpdate = async \(id, newStatus, visitUserId, listingName\)([\s\S]*?)hideLoading\(\);\n    };\n/g,
    `const handleStatusUpdate = async (id, newStatus, visitUserId, listingName, rejectionReason = null) => {
        showLoading();
        try {
            const updates = { status: newStatus };
            if (newStatus === 'rejected') {
                updates.rejection_reason = rejectionReason || 'No reason provided';
            }
            
            await updateVisitRequestStatus(id, updates);
            
            showToast(\`Visit \${newStatus} successfully\`, 'success');
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
            renderVendorEnquiries();
        } catch (e) {
            console.error(e);
            showToast('Failed to update visit status', 'error');
        }
        hideLoading();
    };\n`
);

// Replace reject-visit click
content = content.replace(
    /document\.querySelectorAll\('\.reject-visit'\)\.forEach\(btn => \{[\s\S]*?btn\.onclick = \(\) => handleStatusUpdate\([\s\S]*?btn\.dataset\.listingName[\s\S]*?\);\n    \}\);\n/g,
    `document.querySelectorAll('.reject-visit').forEach(btn => {
        btn.onclick = () => {
            const reason = prompt('Please enter a mandatory reason for rejecting this visit:');
            if (reason === null) return;
            if (reason.trim() === '') {
                showToast('A reason is required to reject a visit.', 'error');
                return;
            }
            handleStatusUpdate(
                btn.dataset.id, 'rejected', btn.dataset.userId, btn.dataset.listingName, reason.trim()
            );
        };
    });\n`
);

fs.writeFileSync('src/js/pages/vendor.js', content, 'utf8');
console.log("Applied regex replace to vendor.js");
