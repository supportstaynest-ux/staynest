// Test dummy script to see events
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSignup() {
    console.log("Testing Signup Event Flow...");
    const testEmail = `test.signup.${Date.now()}@example.com`;
    console.log('Test email:', testEmail);
    
    // We can't use service role to sign up a user with a password in the same way the client does
    // Let's create a regular client
    const pubSupabase = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    pubSupabase.auth.onAuthStateChange((event, session) => {
        console.log(`AUTH EVENT: ${event}`, session?.user?.id ? 'User present' : 'No user');
    });

    try {
        console.log('Calling signUp()...');
        const { data, error } = await pubSupabase.auth.signUp({
            email: testEmail,
            password: 'Password123!',
            options: {
                data: {
                    full_name: 'Test Setup User'
                }
            }
        });
        
        console.log('SignUp result:', error ? 'ERROR - ' + error.message : 'SUCCESS - User ID: ' + (data?.user?.id || 'null'));
        
        // Wait 2 seconds to see if any events trigger
        await new Promise(r => setTimeout(r, 2000));
        
        // Check profiles table to see if user was inserted and what verification status they have
        if (data?.user) {
            const { data: prof } = await supabase.from('profiles').select('is_verified, role').eq('id', data.user.id).single();
            console.log('Profile created by triggers:', prof);
            
            // Clean up
            await supabase.auth.admin.deleteUser(data.user.id);
            console.log('Test user deleted.');
        }
    } catch (e) {
        console.error('Test error:', e);
    }
}

testSignup();
