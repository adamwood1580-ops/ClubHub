// Create a connection to your Supabase project

const supabase = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY
);

console.log("Supabase connected");