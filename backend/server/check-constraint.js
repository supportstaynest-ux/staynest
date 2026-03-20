import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Find yogendra's profile
const { data: yogendra, error: yErr } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', '%yogendra%')
    .single();

console.log('Yogendra profile:', JSON.stringify(yogendra, null, 2));
console.log('Error:', yErr?.message);

// Check if the error happens when we try to update yogendra's role
if (yogendra) {
    // Try toggling vendor
    console.log('\nTrying to set yogendra to vendor...');
    const { data: d1, error: e1 } = await supabase.from('profiles').update({ role: 'vendor' }).eq('id', yogendra.id);
    console.log('Result:', e1 ? 'ERROR: ' + e1.message + ' | code: ' + e1.code + ' | details: ' + e1.details : 'SUCCESS');
    
    // Restore
    if (!e1) {
        await supabase.from('profiles').update({ role: 'user' }).eq('id', yogendra.id);
    }
    
    // Try delete operation
    console.log('\nChecking delete-related operations...');
    // Don't actually delete, just check if there's an issue with the profile data
    console.log('Role:', yogendra.role);
    console.log('is_verified:', yogendra.is_verified);
    console.log('login_method:', yogendra.login_method);
}

process.exit(0);
