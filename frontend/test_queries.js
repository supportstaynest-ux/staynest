const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/pc/Desktop/staynest/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        console.log("Checking pg_listings...");
        const res1 = await supabase.from('pg_listings').select('id').limit(1);
        console.log("pg_listings result:", res1.error ? res1.error.message : "Success");

        console.log("Checking listings...");
        const res2 = await supabase.from('listings').select('id').limit(1);
        console.log("listings result:", res2.error ? res2.error.message : "Success");

        console.log("Checking listings join with reviews and visit_requests...");
        const res4 = await supabase.from('listings').select('*, visit_requests(count), reviews(count)').limit(1);
        console.log("listings join result:", res4.error ? res4.error.message : "Success");
    } catch (e) {
        console.error(e);
    }
}

check();
