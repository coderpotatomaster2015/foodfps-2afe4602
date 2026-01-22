

# Cross-Project Account Sync Implementation Plan

## Overview
You have two separate Lovable Cloud projects and want users who sign up on Website A to automatically have an account created on Website B (and potentially vice versa).

## The Challenge
Each Lovable Cloud project has its own isolated Supabase database with its own `auth.users` table. These are completely separate authentication systems, so a direct "shared login" is not possible out of the box.

## Recommended Solution: Webhook-Based Account Sync

The most reliable approach is to use Edge Functions as webhooks to sync accounts between projects.

### How It Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         ACCOUNT SYNC FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

  Website A                                              Website B
  ─────────                                              ─────────
      │                                                      │
      │  1. User signs up                                    │
      ▼                                                      │
 ┌─────────────┐                                             │
 │  auth.users │                                             │
 │  (created)  │                                             │
 └──────┬──────┘                                             │
        │                                                    │
        │  2. Database trigger fires                         │
        ▼                                                    │
 ┌──────────────────┐                                        │
 │  sync-account    │                                        │
 │  Edge Function   │                                        │
 └────────┬─────────┘                                        │
          │                                                  │
          │  3. POST to Website B with user data             │
          ▼                                                  │
    ──────────────────────────────────────────────────►      │
                                                             │
                                                      ┌──────┴──────────┐
                                                      │ receive-sync    │
                                                      │ Edge Function   │
                                                      └────────┬────────┘
                                                               │
                                                               │ 4. Create user via
                                                               │    Admin API
                                                               ▼
                                                        ┌─────────────┐
                                                        │  auth.users │
                                                        │  (created)  │
                                                        └─────────────┘
```

### Implementation Steps

#### Step 1: Set Up Shared Secret
Both projects need a shared secret to authenticate sync requests between them.

- Generate a strong random secret (e.g., 32+ character string)
- Add it as a secret in both Lovable Cloud projects (e.g., `SYNC_SECRET`)

#### Step 2: Create "Receive Sync" Edge Function on Website B

This function receives user data and creates the account:

```typescript
// supabase/functions/receive-account-sync/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify sync secret
    const syncSecret = req.headers.get('x-sync-secret')
    if (syncSecret !== Deno.env.get('SYNC_SECRET')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const { email, password, username } = await req.json()

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
      .single()

    if (existingUser) {
      return new Response(JSON.stringify({ message: 'User already exists' }), { 
        headers: corsHeaders 
      })
    }

    // Create user with Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, userId: data.user.id }), { 
      headers: corsHeaders 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
```

#### Step 3: Create "Send Sync" Edge Function on Website A

This function is called when a new user signs up:

```typescript
// supabase/functions/sync-account/index.ts
Deno.serve(async (req) => {
  try {
    const { email, password, username } = await req.json()

    // Send to Website B
    const response = await fetch('https://[WEBSITE_B_PROJECT_ID].supabase.co/functions/v1/receive-account-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': Deno.env.get('SYNC_SECRET')!
      },
      body: JSON.stringify({ email, password, username })
    })

    const result = await response.json()
    return new Response(JSON.stringify(result))

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

#### Step 4: Call Sync on Signup (Frontend)

Modify the signup flow to call the sync function:

```typescript
// After successful signup on Website A
const handleSignup = async () => {
  const { data, error } = await supabase.auth.signUp({
    email: `${username}@foodfps.local`,
    password,
    options: { data: { username } }
  })

  if (!error && data.user) {
    // Sync to other website
    await supabase.functions.invoke('sync-account', {
      body: { email: `${username}@foodfps.local`, password, username }
    })
  }
}
```

### Security Considerations

1. **Password Handling**: Sending plaintext passwords between services requires HTTPS and trusted endpoints
2. **Alternative**: Use OAuth tokens or JWT-based sync instead of passwords
3. **Rate Limiting**: Add rate limiting to the receive-sync function
4. **Logging**: Log all sync attempts for audit purposes

### Limitations

- Users need to sign up on the "primary" website first
- Password changes need to be synced separately
- Session tokens are NOT shared (user must log in on each site separately)

## Alternative: Single Shared Backend

If you want truly unified authentication:

1. Make one project the "auth hub"
2. Both websites connect to the same Lovable Cloud project
3. This requires restructuring but provides seamless SSO

---

## Recommendation

For your use case (two separate Lovable projects), the **webhook-based sync** is the most practical approach. It allows:
- Independent projects with their own data
- Automatic account creation on signup
- Future flexibility to add more sites

Would you like me to implement this when you switch to default mode?

