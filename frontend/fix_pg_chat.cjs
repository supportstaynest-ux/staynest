const fs = require('fs');
let content = fs.readFileSync('src/js/pages/pg-details.js', 'utf8');

// We need to fix the duplicate message issue in pg-details.js
// By removing the optimistic UI update since Supabase Realtime handles it.

const optimisticBlock = `            const tempMsg = {
                message: text,
                is_from_vendor: false,
                created_at: new Date().toISOString()
            };

            if (messagesContainer.innerHTML.includes('Start the conversation')) messagesContainer.innerHTML = '';
            messagesContainer.insertAdjacentHTML('beforeend', renderMessage(tempMsg));
            messagesContainer.scrollTop = messagesContainer.scrollHeight;`;

if (content.includes(optimisticBlock)) {
    content = content.replace(optimisticBlock, '');
    console.log('Removed optimistic chat append in pg-details.js');
}

// Ensure the Enter key works without issues in pg-details.js
if (!content.includes('sendBtn.click();') && content.includes('inputMsg.addEventListener(\'input\', function () {')) {
    const enterLogic = `
        inputMsg.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) sendBtn.click();
            }
        });
`;
    content = content.replace(
        `        // Auto-resize textarea
        inputMsg.addEventListener('input', function () {`,
        enterLogic + `        // Auto-resize textarea
        inputMsg.addEventListener('input', function () {`
    );
    console.log('Added Enter key support for user chat.');
}

fs.writeFileSync('src/js/pages/pg-details.js', content, 'utf8');
console.log('pg-details.js updated for chat.');
