const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

// Service role client — bypasses RLS.
// Safe because every route verifies the user's identity via requireAuth()
// middleware before touching the database.
const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey)

module.exports = { supabase }
