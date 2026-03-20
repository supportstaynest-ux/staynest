const fs = require('fs');

// ── 1. Add helpers to supabase.js ──────────────────────────────────────────
let supabase = fs.readFileSync('src/js/supabase.js', 'utf8');

// Insert after updateVisitRequestStatus function (after line with "return data;\n}\n" around line 759)
const insertAfter = 'export async function updateVisitRequestStatus(id, updates) {\n    const { data, error } = await supabase\n        .from(\'visit_requests\')\n        .update(updates)\n        .eq(\'id\', id)\n        .select()\n        .single();\n    if (error) throw error;\n    return data;\n}';

const newHelpers = `export async function updateVisitRequestStatus(id, updates) {
    const { data, error } = await supabase
        .from('visit_requests')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getUserListingVisitRequest(listingId, userId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('listing_id', listingId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data; // null if no request exists
}

export async function cancelVisitRequest(id) {
    const { data, error } = await supabase
        .from('visit_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}`;

if (supabase.includes(insertAfter)) {
    supabase = supabase.replace(insertAfter, newHelpers);
    fs.writeFileSync('src/js/supabase.js', supabase, 'utf8');
    console.log('supabase.js: added getUserListingVisitRequest, cancelVisitRequest, updated updateVisitRequestStatus');
} else {
    // Try line-based approach
    const lines = supabase.split('\n');
    let insertIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('export async function updateVisitRequestStatus')) {
            // Find closing brace
            let depth = 0, started = false;
            for (let j = i; j < i + 20; j++) {
                for (const c of lines[j]) {
                    if (c === '{') { depth++; started = true; }
                    if (c === '}') depth--;
                }
                if (started && depth === 0) { insertIdx = j; break; }
            }
            break;
        }
    }
    if (insertIdx === -1) {
        console.log('ERROR: Could not find updateVisitRequestStatus');
        process.exit(1);
    }

    const insertBlock = `
export async function getUserListingVisitRequest(listingId, userId) {
    const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('listing_id', listingId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function cancelVisitRequest(id) {
    const { data, error } = await supabase
        .from('visit_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}`;

    lines.splice(insertIdx + 1, 0, ...insertBlock.split('\n'));
    fs.writeFileSync('src/js/supabase.js', lines.join('\n'), 'utf8');
    console.log('supabase.js: inserted helpers after line ' + (insertIdx + 1));
}

console.log('Step 1 done');
