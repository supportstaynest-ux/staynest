const fs = require('fs');
let content = fs.readFileSync('src/js/pages/vendor.js', 'utf8');

// We need to fix the duplicate message issue in vendor.js
// By removing the optimistic UI update since Supabase Realtime handles it.

const optimisticVendorBlock = `        const tempMsg = {
            message: text,
            is_from_vendor: true,
            created_at: new Date().toISOString()
        };

        if(messagesContainer.innerHTML.includes('No message history')) messagesContainer.innerHTML = '';
        messagesContainer.insertAdjacentHTML('beforeend', renderMessage(tempMsg));
        messagesContainer.scrollTop = messagesContainer.scrollHeight;`;

if (content.includes(optimisticVendorBlock)) {
    content = content.replace(optimisticVendorBlock, '');
    console.log('Removed optimistic chat append in vendor.js');
}

// Add Enter key listener for vendor chat input
if (!content.includes("if(e.key === 'Enter' && !e.shiftKey)") && content.includes("inputMsg?.addEventListener('input', function() {")) {
    const enterVendorLogic = `
    inputMsg?.addEventListener('keypress', function(e) {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if(!sendBtn.disabled) sendBtn.click();
        }
    });
`;
    content = content.replace(
        `    inputMsg?.addEventListener('input', function() {`,
        enterVendorLogic + `    inputMsg?.addEventListener('input', function() {`
    );
    console.log('Added Enter key support for vendor chat.');
}

fs.writeFileSync('src/js/pages/vendor.js', content, 'utf8');
console.log('vendor.js updated for chat.');
