import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cols, error: e } = await supabase.rpc('exec_sql', {
    sql: "SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified'"
});

// Since exec_sql isn't available, we can just do an insert without the field
const testId = '11111111-1111-1111-1111-111111111111';

// Clean up first just in case
await supabase.from('profiles').delete().eq('id', testId);

const { data, error } = await supabase.from('profiles').insert({
    id: testId,
    email: 'test_default@example.com'
}).select('is_verified').single();

console.log('Default is_verified value when inserted:', data?.is_verified);

await supabase.from('profiles').delete().eq('id', testId);
console.log('Cleanup done');
process.exit(0);
