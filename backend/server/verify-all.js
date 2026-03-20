import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Initialize Supabase with Service Role Key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || 'https://cqrcqaiaarqvenlcukci.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing in server/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAllExistingUsers() {
    console.log("⏳ Starting bulk verification of existing users...");

    try {
        // Update all profiles where is_verified is not true or is null
        const { data, error } = await supabase
            .from('profiles')
            .update({ is_verified: true })
            .neq('is_verified', true)
            .select('id, full_name, email, role');

        if (error) {
            console.error("❌ Error updating profiles:", error);
            return;
        }

        console.log(`✅ Successfully marked ${data.length} existing users as verified.`);
        if (data.length > 0) {
            console.log("Verified users:", data.map(u => u.email).join(", "));
        }
    } catch (err) {
        console.error("❌ Unexpected error:", err);
    }
}

verifyAllExistingUsers();
