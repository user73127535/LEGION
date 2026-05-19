const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey)

function createUserClient(token) {
  return createClient(supabaseUrl, anonKey, {
    accessToken: async () => token,
  })
}

module.exports = { supabase, createUserClient }
