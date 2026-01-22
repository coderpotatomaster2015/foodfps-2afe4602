import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify sync secret
    const syncSecret = req.headers.get('x-sync-secret')
    if (syncSecret !== Deno.env.get('SYNC_SECRET')) {
      console.error('Invalid sync secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, username } = await req.json()

    if (!email || !password || !username) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize email to use this project's domain
    const normalizedEmail = `${username}@foodfps.game`

    console.log('Receiving account sync for:', username)

    // Use service role to create user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username)
      .maybeSingle()

    if (existingUser) {
      console.log('User already exists:', username)
      return new Response(
        JSON.stringify({ message: 'User already exists', exists: true }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user with Admin API using normalized email
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { username }
    })

    if (error) throw error

    console.log('Account created successfully for:', username, 'userId:', data.user.id)

    return new Response(
      JSON.stringify({ success: true, userId: data.user.id }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Receive sync error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
