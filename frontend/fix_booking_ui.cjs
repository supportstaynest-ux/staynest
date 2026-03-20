const fs = require('fs');

// --- pg-details.js fixes ---
let pgContent = fs.readFileSync('src/js/pages/pg-details.js', 'utf8');

// The replacement script failed to wrap the book-visit-btn in the #booking-button-container on initial load
// Let's find the static HTML and fix it
const staticBtn = `                            <button id="book-visit-btn" class="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold py-3 rounded-xl border border-transparent hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">
                                <span class="material-symbols-outlined text-[20px]">calendar_month</span> Book Your Visit
                            </button>`;

if (pgContent.includes(staticBtn)) {
    pgContent = pgContent.replace(
        staticBtn,
        `                            <div id="booking-button-container">\${renderBookingButton(currentVisit)}</div>`
    );
    console.log('pg-details.js: Fixed booking button container initial render');
} else {
    // Maybe it was replaced partially but without container? Let's check
    if (pgContent.includes('<div id="booking-button-container">${renderBookingButton(currentVisit)}</div>')) {
        console.log('pg-details.js: Booking container already exists');
    } else {
        console.log('pg-details.js: Could not find static button to replace');
    }
}

// Ensure the form submit removes the modal on success BEFORE we try to update the DOM, 
// and that currentVisit is updated properly
if (pgContent.includes('const container = document.getElementById(\'booking-button-container\');')) {
    // This part is good, the issue was it wasn't there on initial render.
}

// Check for duplicate chat submissions
// In pg-details.js, the chat listeners are added inside the `chat-owner-btn` click handler
// The issue is `.onclick` vs `addEventListener` or `.onsubmit` on identical elements.
// Looking at line 700ish, there is form submission.

const chatSendLogicOld = `            document.getElementById('chat-form').onsubmit = async (evt) => {
                evt.preventDefault();
                const msg = input.value.trim();
                if (!msg) return;

                const originalBtnText = btn2.innerHTML;
                btn2.disabled = true;
                btn2.innerHTML = '<span class="material-symbols-outlined animate-spin text-[16px]">refresh</span>';

                try {
                    await sendListingChatMessage(id, pg.vendor_id, state.user.id, msg, false);
                    input.value = '';
                } catch (err) {
                    showToast('Failed to send message', 'error');
                    console.error('Chat error:', err);
                }
                btn2.disabled = false;
                btn2.innerHTML = originalBtnText;
            };`;

// Above logic uses `onsubmit` which overrides previous ones, so it shouldn't trigger twice unless there's 
// an extra event listener. Let's make sure it's strictly `onsubmit` and look for any other `sendListingChatMessage`

// Actually, wait, when we click "Chat with Owner", what if the same modal is open multiple times or listeners pile up?
// The modal is recreated every time (modalObj.innerHTML = ...; document.body.appendChild(modalObj);)
// So `document.getElementById('chat-form')` gets a fresh element. `.onsubmit` shouldn't trigger twice.
// BUT `sendListingChatMessage` might be triggering twice because of Double Click, or `activeChatChannel` logic in `pg-details.js`?
// Let's modify `sendListingChatMessage` itself in supabase.js to ensure it doesn't duplicate if called wildly,
// but first let's see why it's duplicating on the vendor side.

// --- vendor.js fixes ---
let vendorContent = fs.readFileSync('src/js/pages/vendor.js', 'utf8');

// Looking for `vendor-send-chat` logic
const vendorChatLogicOld = `        sendBtn.onclick = async () => {
            const msg = inputMsg.value.trim();
            if (!msg || !currentChatContext) return;

            const originalContent = sendBtn.innerHTML;
            sendBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">refresh</span>';
            sendBtn.disabled = true;

            try {
                await sendListingChatMessage(
                    currentChatContext.listingId,
                    state.user.id,
                    currentChatContext.userId,
                    msg,
                    true
                );
                inputMsg.value = '';
                // Wait for realtime update to append message
            } catch (e) {
                console.error(e);
                showToast('Failed to send message', 'error');
            }
            sendBtn.innerHTML = originalContent;
            sendBtn.disabled = false;
        };`;

// This uses `.onclick` so it shouldn't attach multiple times.
// What if they press Enter in the input?
const vendorEnterLogicOld = `        inputMsg.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendBtn.click();
            }
        };`;

// Wait, the duplicate message might be coming from Realtime Subscriptions appending to the UI *and* the local code appending to the UI?
// No, the code says "Wait for realtime update to append message".
// Let's check `sendListingChatMessage` in supabase.js
// AND let's check `subscribeToListingChats` in supabase.js

fs.writeFileSync('src/js/pages/pg-details.js', pgContent, 'utf8');
console.log('Saved pg-details.js adjustments.');
