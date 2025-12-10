import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Admin AI request:", { message, action });

    // Handle direct actions
    if (action) {
      if (action === "disable_website") {
        const { error } = await supabase
          .from("game_settings")
          .update({ website_enabled: false })
          .eq("id", "00000000-0000-0000-0000-000000000001");
        
        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: "Website has been disabled. All users will see a disabled message." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (action === "enable_website") {
        const { error } = await supabase
          .from("game_settings")
          .update({ website_enabled: true })
          .eq("id", "00000000-0000-0000-0000-000000000001");
        
        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: "Website has been enabled. Users can now access the game." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get_stats") {
        const { data: profiles } = await supabase.from("profiles").select("*");
        const { data: rooms } = await supabase.from("game_rooms").select("*");
        const { data: settings } = await supabase.from("game_settings").select("*").single();
        const { data: updates } = await supabase.from("game_updates").select("*");
        const { data: betaTesters } = await supabase.from("beta_testers").select("*");
        
        return new Response(JSON.stringify({ 
          response: `📊 Stats:\n- Total Users: ${profiles?.length || 0}\n- Active Rooms: ${rooms?.length || 0}\n- Website Enabled: ${settings?.website_enabled || false}\n- Total Updates: ${updates?.length || 0}\n- Beta Testers: ${betaTesters?.length || 0}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action.startsWith("ban_user:")) {
        const targetUsername = action.replace("ban_user:", "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", targetUsername)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ 
            response: `User "${targetUsername}" not found.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const { error } = await supabase.from("bans").insert({
          user_id: profile.user_id,
          banned_by: profile.user_id,
          hours: 24,
          reason: "Banned by admin via AI chatbot",
          expires_at: expiresAt.toISOString(),
        });

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `User "${targetUsername}" has been banned for 24 hours.` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action.startsWith("grant_commands:")) {
        const targetUsername = action.replace("grant_commands:", "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", targetUsername)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ 
            response: `User "${targetUsername}" not found.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase.from("chat_permissions").upsert({
          user_id: profile.user_id,
          can_use_commands: true,
          granted_at: new Date().toISOString(),
        });

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `Command access granted to "${targetUsername}".` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create update action
      if (action.startsWith("create_update:")) {
        const parts = action.replace("create_update:", "").split("|");
        const name = parts[0];
        const description = parts[1] || "New update";

        // Get admin user (first admin role)
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .single();

        if (!adminRole) {
          return new Response(JSON.stringify({ 
            response: "No admin found to create update." 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase.from("game_updates").insert({
          name,
          description,
          created_by: adminRole.user_id,
          is_released: false,
          is_beta: false,
        });

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `✨ Update "${name}" has been created as a draft.\n\nDescription: ${description}\n\nYou can now:\n- Release it to beta testers first\n- Release it publicly to all users` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Beta release action
      if (action.startsWith("beta_release:")) {
        const updateName = action.replace("beta_release:", "").trim();
        
        const { data: update, error: findError } = await supabase
          .from("game_updates")
          .select("*")
          .ilike("name", `%${updateName}%`)
          .limit(1)
          .single();

        if (findError || !update) {
          return new Response(JSON.stringify({ 
            response: `Update "${updateName}" not found. Make sure the update exists.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("game_updates")
          .update({ 
            is_beta: true,
            is_released: false,
            released_at: new Date().toISOString()
          })
          .eq("id", update.id);

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `🧪 Update "${update.name}" has been released to BETA TESTERS ONLY.\n\nBeta testers can now access this update. Regular users will not see it until you release it publicly.` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Public release action
      if (action.startsWith("release_update:")) {
        const updateName = action.replace("release_update:", "").trim();
        
        const { data: update, error: findError } = await supabase
          .from("game_updates")
          .select("*")
          .ilike("name", `%${updateName}%`)
          .limit(1)
          .single();

        if (findError || !update) {
          return new Response(JSON.stringify({ 
            response: `Update "${updateName}" not found. Make sure the update exists.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Generate summary (hide admin-only features)
        const description = update.description.toLowerCase();
        let summary = update.description;
        
        // Filter out admin-related content for public summary
        const adminKeywords = ['admin', 'command', 'ban', 'godmode', 'infinite ammo', '/'];
        const lines = summary.split('\n');
        const publicLines = lines.filter((line: string) => {
          const lower = line.toLowerCase();
          return !adminKeywords.some(keyword => lower.includes(keyword));
        });
        summary = publicLines.join('\n') || "New features and improvements!";

        const { error } = await supabase
          .from("game_updates")
          .update({ 
            is_beta: false,
            is_released: true,
            released_at: new Date().toISOString(),
            summary: summary
          })
          .eq("id", update.id);

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `🚀 Update "${update.name}" has been RELEASED PUBLICLY!\n\nAll users can now see this update in the Updates Hub.\n\nPublic Summary: ${summary}` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Grant beta tester
      if (action.startsWith("grant_beta:")) {
        const targetUsername = action.replace("grant_beta:", "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", targetUsername)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ 
            response: `User "${targetUsername}" not found.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .single();

        const { error } = await supabase.from("beta_testers").insert({
          user_id: profile.user_id,
          granted_by: adminRole?.user_id || profile.user_id,
        });

        if (error && error.code !== '23505') throw error;
        return new Response(JSON.stringify({ 
          response: `🧪 "${targetUsername}" is now a beta tester and can access unreleased updates.` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // AI Chat response
    const systemPrompt = `You are the Admin AI Assistant for Food FPS, a multiplayer food-themed shooting game. You have FULL control over the game and website.

AVAILABLE ACTIONS YOU CAN PERFORM:
1. Website Management:
   - "Disable the website" → Blocks all non-admin users
   - "Enable the website" → Allows users to play
   
2. Update Management (IMPORTANT - Beta tester exclusivity):
   - "Create update [name] with: [description]" → Creates a new update draft
   - "Release [update name] to beta testers" → Makes update available ONLY to beta testers
   - "Release [update name] publicly" → Makes update available to ALL users
   
3. User Management:
   - "Ban [username]" → 24 hour ban
   - "Grant commands to [username]" → Gives admin commands
   - "Make [username] a beta tester" → Adds beta tester role
   
4. Stats: "Get stats" → Shows user counts, rooms, etc.

GAME INFO:
- Weapons: Pistol, Shotgun, Sword, Rifle, Sniper, SMG, Knife, RPG, Axe, Flamethrower, Minigun, Railgun
- Modes: Solo (vs bots), Host/Join (multiplayer), Offline
- Admin Commands: /godmode, /speed, /nuke, /rain ammo, /revive, /give, /infiniteammo

When summarizing updates for public release, HIDE admin-only features (commands, ban features, admin panel details).

EXAMPLES:
- "Create update v1.2 with: Added new weapons and fixed bugs" → Creates draft
- "Release v1.2 to beta testers" → Beta testers only see it
- "Release v1.2 publicly" → Everyone sees it

Be helpful, concise, and proactive. Confirm actions taken.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I couldn't process that request.";

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-ai error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
