import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cqrcqaiaarqvenlcukci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmNxYWlhYXJxdmVubGN1a2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTE2OTYsImV4cCI6MjA4ODE4NzY5Nn0.MaxlJ1dx9huliyTwL-iONxp2L2tU0Xa1dTybgQch3OU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setup() {
    console.log('Creating Admin...');
    const adminEmail = 'testadmin' + Date.now() + '@example.com';
    let res = await supabase.auth.signUp({ email: adminEmail, password: 'password123' });
    const adminId = res.data.user.id;

    console.log('Creating Vendor...');
    const vendorEmail = 'testvendor' + Date.now() + '@example.com';
    res = await supabase.auth.signUp({ email: vendorEmail, password: 'password123' });
    const vendorId = res.data.user.id;

    console.log('Updating Roles in Profiles...');
    // Force update roles - might fail if RLS prevents anon/user from updating to admin
    let updateRes = await supabase.from('profiles').update({ role: 'admin' }).eq('id', adminId);
    console.log('Admin update:', updateRes.error ? updateRes.error.message : 'Success');

    updateRes = await supabase.from('profiles').update({ role: 'vendor' }).eq('id', vendorId);
    console.log('Vendor update:', updateRes.error ? updateRes.error.message : 'Success');

    console.log('Admin:', adminEmail);
    console.log('Vendor:', vendorEmail);
}

setup().catch(console.error);
