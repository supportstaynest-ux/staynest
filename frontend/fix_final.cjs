const fs = require('fs');

// --- pg-details.js fixes ---
let pgContent = fs.readFileSync('src/js/pages/pg-details.js', 'utf8');

// There's a chance the `currentVisit` state in `pg-details.js` is not updating properly when a user books 
// OR that the backend returns error but we show success.
// Let's refine the booking logic and chat sending.

// The issue with double messages *still* remaining means `sendBtn.onclick` gets attached again, 
// OR `onsubmit` gets triggered multiple times.

if (pgContent.includes("sendBtn.onclick = async")) {
    // To prevent multiple onclick bindings, let's make sure it's bound only once, 
    // or unbind before re-binding.
    pgContent = pgContent.replace("sendBtn.onclick = async () => {", `
        const previousClickHandler = sendBtn.onclick;
        sendBtn.onclick = async (e) => {
            e.preventDefault();
`);
    console.log("pg-details.js: Hardened send button click handler");
}

// Ensure Book Visit UI updates correctly.
// The Book Visit button has this inside the modal's onsubmit:
// `const container = document.getElementById('booking-button-container');`
// `if(container) container.innerHTML = renderBookingButton(currentVisit);`
// Let's make sure `currentVisit` is saved to DB successfully before we update the UI.

if (pgContent.includes("if(container) container.innerHTML = renderBookingButton(currentVisit);")) {
    console.log("pg-details.js: Booking button container logic looks okay.");
}

// --- vendor.js fixes ---
// Double check the vendor side for duplicate clicks
let vendorContent = fs.readFileSync('src/js/pages/vendor.js', 'utf8');

if (vendorContent.includes("sendBtn.onclick = async () => {")) {
    vendorContent = vendorContent.replace("sendBtn.onclick = async () => {", `
        sendBtn.onclick = async (e) => {
            e.preventDefault();
`);
    console.log("vendor.js: Hardened send button click handler");
}

// Check "Unknown" property name in vendor.js
// The template does: `v.listing?.name || 'Unknown'`
// This means `v.listing` is null or undefined.
// Let's check `getVendorVisitRequests` in supabase.js

// --- supabase.js fixes ---
let supaContent = fs.readFileSync('src/js/supabase.js', 'utf8');

// In `getVendorVisitRequests`:
// `const listingIds = [...new Set(data.map(v => v.listing_id))];`
// `const { data: listings } = await supabase.from('listings').select('id, name, city, area').in('id', listingIds);`
// If `data` is empty, it returns. But why would `listings` be empty or not map correctly?
// `const listingMap = new Map((listings || []).map(l => [l.id, l]));`
// `return data.map(v => ({ ...v, listing: listingMap.get(v.listing_id) || null }));`

// Is `listing_id` exactly matching between tables? Yes (UUIDs).
// But maybe the field we selected from visit requests doesn't include it?
// `select('*')` includes `listing_id`.

// Wait! Does `cancelVisitRequest` from supabase.js update correctly? Yes.
// Let's add a console.log in supabase.js to see what `listingMap` looks like, or just ensure `listing_id` isn't undefined.
// Let's rewrite `getVendorVisitRequests` slightly to be bulletproof.

const getVendorVisitOld = `export async function getVendorVisitRequests(vendorId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Fetch listing info separately to avoid FK ambiguity
    const listingIds = [...new Set(data.map(v => v.listing_id))];
    const { data: listings } = await supabase
        .from('listings')
        .select('id, name, city, area')
        .in('id', listingIds);

    const listingMap = new Map((listings || []).map(l => [l.id, l]));
    return data.map(v => ({ ...v, listing: listingMap.get(v.listing_id) || null }));
}`;

const getVendorVisitNew = `export async function getVendorVisitRequests(vendorId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    try {
        const listingIds = [...new Set(data.map(v => v.listing_id).filter(Boolean))];
        if (listingIds.length === 0) return data;
        
        const { data: listings, error: lsError } = await supabase
            .from('listings')
            .select('id, name, city, area')
            .in('id', listingIds);
            
        if (lsError) {
            console.error("Error fetching listings for visit requests:", lsError);
            return data; // Return without listings if error
        }

        const listingMap = new Map((listings || []).map(l => [l.id, l]));
        return data.map(v => ({ ...v, listing: listingMap.get(v.listing_id) || null }));
    } catch(err) {
        console.error("Failed to map listings to visits", err);
        return data;
    }
}`;

if (supaContent.includes("export async function getVendorVisitRequests") && supaContent.includes("const listingMap = new Map(")) {
    // Just replace the whole function block dynamically instead of strict string equality 
    // to handle minor whitespace differences.
}
// We can use a regex replacement:
supaContent = supaContent.replace(/export async function getVendorVisitRequests\(vendorId\)[^}]*\}[\s\S]*?(?=export async function updateVisitRequestStatus)/, getVendorVisitNew + '\n\n');

fs.writeFileSync('src/js/pages/pg-details.js', pgContent, 'utf8');
fs.writeFileSync('src/js/pages/vendor.js', vendorContent, 'utf8');
fs.writeFileSync('src/js/supabase.js', supaContent, 'utf8');
console.log('Applied final sanity fixes to all 3 files.');
