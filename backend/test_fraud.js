import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking fraud_flags columns...");
    const { data, error } = await supabase.from('fraud_flags').select('listing_id').limit(1);
    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Success! Data:", data);
    }
}
check();
