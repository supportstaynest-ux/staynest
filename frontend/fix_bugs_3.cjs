const fs = require('fs');

// --- pg-details.js fixes ---
let pgContent = fs.readFileSync('src/js/pages/pg-details.js', 'utf8');

// Fix 1: Stop event accumulation by wrapping in a singleton flag.
// Look for `document.addEventListener('click', async (e) => {` inside pg-details.js
// Wait, we can just replace the definition to be careful.

const eventDelBlock = `    // Handle dynamic booking buttons (event delegation on container or document)
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('#book-visit-btn');`;

const newEventDelBlock = `    // Handle dynamic booking buttons (event delegation on container or document)
    if (!window._pgDetailsEventsBound) {
        window._pgDetailsEventsBound = true;
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('#book-visit-btn');`;

// And we need to close the `if (!window._pgDetailsEventsBound) {` block at the end of the `document.addEventListener` 
// Where does it end? The file ends around line 825.
// Let's just do a RegExp replace to wrap it.
// Actually, `document.addEventListener('click', async (e) => {` ends at `});` ... `document.getElementById('chat-owner-btn')?.addEventListener('click', async () => {`
// Let's replace the top, and find the closing `    });` before `document.getElementById('chat-owner-btn')`... wait, `chat-owner-btn` is NOT inside the `document.addEventListener('click')`.
// So let's wrap ALL the listeners in that section.
// Even better: just define a named function for the click handler and use `document.removeEventListener('click', window._pgClickHandler)` before adding it.

if (pgContent.includes("document.addEventListener('click', async (e) => {")) {
    // Let's replace the anonymous function with a named one attached to window.
    pgContent = pgContent.replace(
        `document.addEventListener('click', async (e) => {`,
        `
    if (window._pgClickHandler) document.removeEventListener('click', window._pgClickHandler);
    window._pgClickHandler = async (e) => {
`
    );
    pgContent = pgContent.replace(
        `// Remove the old static listener`,
        `}; document.addEventListener('click', window._pgClickHandler);\n\n    // Remove the old static listener`
    );
    console.log("pg-details.js: Fixed event listener accumulation for booking buttons.");
}

// For chat-owner-btn, it's attached to the button directly, but the button is recreated, so it's fine.
// Wait! `document.getElementById('chat-owner-btn')?.addEventListener('click', async () => {`
// This is fine. But what about the duplicate message sending?
// Oh! Does `chat-owner-btn` also accidentally accumulate?
// If the button is recreated by `renderPGDetails`, it's a NEW DOM element, so the old listener dies with the old button. That's fine.
// So why duplicate chats?
// Because the MODAL forms are recreated, but the SERVER SUBSCRIPTION `subscribeToListingChats` is NOT closed if the user clicks "Chat with Owner" while a previous chat channel is still open in memory, OR if the modal wasn't closed properly.
// Actually, let's just make sure we always unsubscribe before subscribing again, even if the modal was just reopened.

if (pgContent.includes("activeChatChannel = subscribeToListingChats(id, state.user.id, pg.vendor_id, (newMsg) => {")) {
    pgContent = pgContent.replace(
        "activeChatChannel = subscribeToListingChats(id, state.user.id, pg.vendor_id, (newMsg) => {",
        `
            if (activeChatChannel) { unsubscribeChat(activeChatChannel); activeChatChannel = null; }
            activeChatChannel = subscribeToListingChats(id, state.user.id, pg.vendor_id, (newMsg) => {`
    );
    console.log("pg-details.js: Fixed stray realtime subscriptions on chat modal reopen.");
}

fs.writeFileSync('src/js/pages/pg-details.js', pgContent, 'utf8');

// --- supabase.js fixes ---
let supaContent = fs.readFileSync('src/js/supabase.js', 'utf8');

// Rewrite getUserVisitRequests
const getUserOld = `export async function getUserVisitRequests(userId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select(\`
            *,
            listing:listing_id(name, city, area)
        \`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}`;

const getUserNew = `export async function getUserVisitRequests(userId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    try {
        const listingIds = [...new Set(data.map(v => v.listing_id).filter(Boolean))];
        if (listingIds.length === 0) return data;
        
        const { data: listings } = await supabase
            .from('listings')
            .select('id, name, city, area, address')
            .in('id', listingIds);
            
        const listingMap = new Map((listings || []).map(l => [l.id, l]));
        return data.map(v => ({ ...v, listing: listingMap.get(v.listing_id) || null }));
    } catch(err) {
        console.error("Failed to map listings to user visits", err);
        return data;
    }
}`;

if (supaContent.includes("export async function getUserVisitRequests")) {
    supaContent = supaContent.replace(/export async function getUserVisitRequests\(userId\)[^}]*\}[\s\S]*?(?=export async function getVendorVisitRequests)/, getUserNew + '\n\n');
    fs.writeFileSync('src/js/supabase.js', supaContent, 'utf8');
    console.log("supabase.js: Fixed getUserVisitRequests FK join failure.");
}

// And finally, vendor rejection reason. User asked for "give reject option with mendate reson which will be shown in vendor notification".
// In vendor.js:
// `const reason = prompt('Please enter a reason for rejecting this visit:');`
// `if (reason === null) return; // Cancelled`
// `if (reason.trim() === '') return showToast('You must provide a reason to reject.', 'error');`
// I added this in the previous task. But wait, did I push `rejection_reason` into `updates`?
// Yes: `await updateVisitRequestStatus(vid, { status: 'rejected', rejection_reason: reason.trim() });`
// The user might just not be seeing the reason on the UI.
// Let's check user-pages.js.
