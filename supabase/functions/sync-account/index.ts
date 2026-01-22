import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, username } = await req.json()

    if (!email || !password || !username) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const websiteBUrl = Deno.env.get('WEBSITE_B_URL')
    const syncSecret = Deno.env.get('SYNC_SECRET')

    if (!websiteBUrl || !syncSecret) {
      console.error('Missing WEBSITE_B_URL or SYNC_SECRET environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send account data to Website B
    const syncUrl = `${websiteBUrl}/functions/v1/receive-account-sync`
    
    console.log(`Syncing account for ${username} to ${syncUrl}`)

    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': syncSecret
      },
      body: JSON.stringify({ email, password, username })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Sync failed:', result)
      return new Response(
        JSON.stringify({ error: 'Sync failed', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Account sync successful:', result)

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Sync error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
