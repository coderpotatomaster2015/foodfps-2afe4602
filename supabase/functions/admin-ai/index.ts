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
        
        return new Response(JSON.stringify({ 
          response: `Stats:\n- Total Users: ${profiles?.length || 0}\n- Active Rooms: ${rooms?.length || 0}\n- Website Enabled: ${settings?.website_enabled || false}`
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
          banned_by: profile.user_id, // Will be overwritten by proper admin ID in frontend
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
    }

    // AI Chat response
    const systemPrompt = `You are the Admin AI Assistant for Food FPS, a multiplayer shooting game. You have full control over the game and website.

You can help admins with:
1. Website Management: Enable/disable the website
2. User Management: Ban users, grant command permissions
3. Game Stats: View player counts, active rooms
4. Game Information: Explain game mechanics, weapons, modes

Available weapons: Pistol, Shotgun, Sword, Rifle, Sniper, SMG, Knife, RPG, Axe, Flamethrower, Minigun, Railgun

Game modes: Solo (vs bots), Host (create multiplayer room), Join (join room), Offline (no account needed)

Admin commands available in-game:
- /godmode - Invincibility
- /speed [num] - Change speed
- /nuke - Kill all enemies
- /rain ammo - Spawn ammo
- /revive - Restore health
- /give - Unlock all weapons
- /ban - Ban management
- /join - See online players

When asked to perform actions, respond with specific instructions. If asked to ban a user or enable/disable the website, confirm you'll do it and the action will be taken.

Be helpful, concise, and professional.`;

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
