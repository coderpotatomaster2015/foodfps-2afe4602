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
    const { message, action, conversationHistory, adminId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Admin AI request:", { message, action, hasHistory: !!conversationHistory?.length });

    // Helper function to get game context
    const getGameContext = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: rooms } = await supabase.from("game_rooms").select("*").is("ended_at", null);
      const { data: settings } = await supabase.from("game_settings").select("*").single();
      const { data: updates } = await supabase.from("game_updates").select("*").order("created_at", { ascending: false }).limit(10);
      const { data: betaTesters } = await supabase.from("beta_testers").select("*, profiles!inner(username)");
      const { data: activePlayers } = await supabase.from("active_players").select("*").gte("last_seen", new Date(Date.now() - 5 * 60 * 1000).toISOString());
      const { data: pendingPosts } = await supabase.from("social_posts").select("*").eq("is_pending", true);
      const { data: bannedUsers } = await supabase.from("bans").select("*, profiles!inner(username)").gt("expires_at", new Date().toISOString());
      
      return {
        totalUsers: profiles?.length || 0,
        activeRooms: rooms?.length || 0,
        websiteEnabled: settings?.website_enabled ?? true,
        totalUpdates: updates?.length || 0,
        recentUpdates: updates?.slice(0, 5) || [],
        betaTesters: betaTesters?.map((b: any) => b.profiles?.username) || [],
        activePlayers: activePlayers?.map((p: any) => ({ username: p.username, mode: p.mode })) || [],
        pendingPosts: pendingPosts?.length || 0,
        bannedUsers: bannedUsers?.map((b: any) => ({ username: b.profiles?.username, reason: b.reason, expiresAt: b.expires_at })) || [],
        topPlayers: profiles?.sort((a: any, b: any) => (b.total_score || 0) - (a.total_score || 0)).slice(0, 5) || [],
      };
    };

    // Handle direct actions
    if (action) {
      if (action === "disable_website") {
        const { error } = await supabase
          .from("game_settings")
          .update({ website_enabled: false })
          .eq("id", "00000000-0000-0000-0000-000000000001");
        
        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: "🔒 Website has been disabled. All users will see a disabled message." 
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
          response: "✅ Website has been enabled. Users can now access the game." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get_stats") {
        const ctx = await getGameContext();
        return new Response(JSON.stringify({ 
          response: `📊 **Game Statistics**\n\n` +
            `👥 Total Users: ${ctx.totalUsers}\n` +
            `🎮 Active Rooms: ${ctx.activeRooms}\n` +
            `🌐 Website: ${ctx.websiteEnabled ? "Enabled" : "Disabled"}\n` +
            `📦 Total Updates: ${ctx.totalUpdates}\n` +
            `🧪 Beta Testers: ${ctx.betaTesters.length}\n` +
            `🎯 Active Players: ${ctx.activePlayers.length}\n` +
            `📝 Pending Posts: ${ctx.pendingPosts}\n` +
            `🚫 Active Bans: ${ctx.bannedUsers.length}\n\n` +
            `**Top Players:**\n${ctx.topPlayers.map((p: any, i: number) => `${i + 1}. ${p.username}: ${p.total_score || 0} pts`).join('\n')}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action.startsWith("ban_user:")) {
        const [targetUsername, hours, reason] = action.replace("ban_user:", "").split("|");
        const banHours = parseInt(hours) || 24;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", targetUsername)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ 
            response: `❌ User "${targetUsername}" not found.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + banHours);

        const { error } = await supabase.from("bans").insert({
          user_id: profile.user_id,
          banned_by: profile.user_id,
          hours: banHours,
          reason: reason || "Banned by admin via AI chatbot",
          expires_at: expiresAt.toISOString(),
        });

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `🚫 User "${targetUsername}" has been banned for ${banHours} hours.\nReason: ${reason || "No reason specified"}` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action.startsWith("unban_user:")) {
        const targetUsername = action.replace("unban_user:", "");
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", targetUsername)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ 
            response: `❌ User "${targetUsername}" not found.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("bans")
          .delete()
          .eq("user_id", profile.user_id);

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `✅ User "${targetUsername}" has been unbanned.` 
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
            response: `❌ User "${targetUsername}" not found.` 
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
          response: `⚡ Command access granted to "${targetUsername}".` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action.startsWith("revoke_commands:")) {
        const targetUsername = action.replace("revoke_commands:", "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", targetUsername)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ 
            response: `❌ User "${targetUsername}" not found.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("chat_permissions")
          .delete()
          .eq("user_id", profile.user_id);

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `🔒 Command access revoked from "${targetUsername}".` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create update action
      if (action.startsWith("create_update:")) {
        const parts = action.replace("create_update:", "").split("|");
        const name = parts[0];
        const description = parts[1] || "New update";

        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .single();

        if (!adminRole) {
          return new Response(JSON.stringify({ 
            response: "❌ No admin found to create update." 
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
          response: `✨ Update "${name}" has been created as a draft.\n\n📝 Description: ${description}\n\n🔄 Next steps:\n• Release to beta testers first\n• Then release publicly to all users` 
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
            response: `❌ Update "${updateName}" not found.` 
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
          response: `🧪 Update "${update.name}" released to BETA TESTERS ONLY.\n\nBeta testers can now access this update. Regular users will NOT see it until you release it publicly.` 
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
            response: `❌ Update "${updateName}" not found.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Generate public summary (hide admin features)
        const adminKeywords = ['admin', 'command', 'ban', 'godmode', 'infinite ammo', '/', 'cheat', 'hack'];
        const lines = update.description.split('\n');
        const publicLines = lines.filter((line: string) => {
          const lower = line.toLowerCase();
          return !adminKeywords.some(keyword => lower.includes(keyword));
        });
        const summary = publicLines.join('\n') || "New features and improvements!";

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
          response: `🚀 Update "${update.name}" RELEASED PUBLICLY!\n\nAll users can now see this in the Updates Hub.\n\n📣 Public Summary:\n${summary}` 
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
            response: `❌ User "${targetUsername}" not found.` 
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
          response: `🧪 "${targetUsername}" is now a beta tester!` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Revoke beta tester
      if (action.startsWith("revoke_beta:")) {
        const targetUsername = action.replace("revoke_beta:", "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", targetUsername)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ 
            response: `❌ User "${targetUsername}" not found.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("beta_testers")
          .delete()
          .eq("user_id", profile.user_id);

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `❌ "${targetUsername}" is no longer a beta tester.` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Approve social post
      if (action.startsWith("approve_post:")) {
        const postId = action.replace("approve_post:", "");
        
        const { error } = await supabase
          .from("social_posts")
          .update({ 
            is_approved: true, 
            is_pending: false,
            approved_at: new Date().toISOString()
          })
          .eq("id", postId);

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `✅ Post approved and now visible on Food Media!` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reject social post
      if (action.startsWith("reject_post:")) {
        const postId = action.replace("reject_post:", "");
        
        const { error } = await supabase
          .from("social_posts")
          .delete()
          .eq("id", postId);

        if (error) throw error;
        return new Response(JSON.stringify({ 
          response: `🗑️ Post rejected and deleted.` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Broadcast message
      if (action.startsWith("broadcast:")) {
        const broadcastMessage = action.replace("broadcast:", "");
        
        const { data: profiles } = await supabase.from("profiles").select("user_id, username");
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .single();

        if (profiles && adminRole) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", adminRole.user_id)
            .single();

          const messages = profiles.map((p: any) => ({
            from_user_id: adminRole.user_id,
            from_username: adminProfile?.username || "Admin",
            to_user_id: p.user_id,
            to_username: p.username,
            subject: "📢 Announcement",
            content: broadcastMessage,
          }));

          await supabase.from("messages").insert(messages);
        }

        return new Response(JSON.stringify({ 
          response: `📢 Broadcast sent to ${profiles?.length || 0} users!` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get game context for AI
    const gameContext = await getGameContext();

    // AI Chat response with conversation memory
    const systemPrompt = `You are the Admin AI Assistant for Food FPS, a multiplayer food-themed shooting game. You have FULL control over the game and you remember our entire conversation.

CURRENT GAME STATE:
- Total Users: ${gameContext.totalUsers}
- Active Rooms: ${gameContext.activeRooms}
- Website: ${gameContext.websiteEnabled ? "Enabled" : "Disabled"}
- Beta Testers: ${gameContext.betaTesters.join(", ") || "None"}
- Active Players: ${gameContext.activePlayers.map((p: any) => `${p.username} (${p.mode})`).join(", ") || "None"}
- Pending Posts: ${gameContext.pendingPosts}
- Banned Users: ${gameContext.bannedUsers.map((b: any) => b.username).join(", ") || "None"}
- Recent Updates: ${gameContext.recentUpdates.map((u: any) => `${u.name} (${u.is_released ? "Released" : u.is_beta ? "Beta" : "Draft"})`).join(", ") || "None"}

AVAILABLE COMMANDS (respond with these exact phrases to execute):
1. Website: "EXECUTE: disable_website" or "EXECUTE: enable_website"
2. Updates: 
   - "EXECUTE: create_update:UpdateName|Description here"
   - "EXECUTE: beta_release:UpdateName"
   - "EXECUTE: release_update:UpdateName"
3. Users:
   - "EXECUTE: ban_user:username|hours|reason"
   - "EXECUTE: unban_user:username"
   - "EXECUTE: grant_commands:username"
   - "EXECUTE: revoke_commands:username"
   - "EXECUTE: grant_beta:username"
   - "EXECUTE: revoke_beta:username"
4. Social: 
   - "EXECUTE: approve_post:postId"
   - "EXECUTE: reject_post:postId"
5. Broadcast: "EXECUTE: broadcast:Your message here"
6. Stats: "EXECUTE: get_stats"

GAME INFO:
- Weapons: Pistol → Shotgun → Sword → Sniper → Rifle → SMG → RPG → Flamethrower → Railgun (unlock by score)
- Minigun: Off-progression weapon
- Modes: Solo (vs bots), Host/Join (multiplayer), Offline
- Admin Commands: /godmode, /speed, /nuke, /rain ammo, /revive, /give, /infiniteammo

PERSONALITY:
- You are helpful, proactive, and remember everything we've discussed
- Suggest actions based on context (e.g., if many pending posts, offer to review them)
- Ask clarifying questions when needed
- When summarizing updates for public, HIDE admin-only features (commands, ban features, admin panel)
- Use emojis sparingly for important actions

MEMORY CONTEXT: You remember our entire conversation history. Reference previous messages when relevant.`;

    // Build messages array with conversation history
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    console.log("Sending to AI with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices?.[0]?.message?.content || "I couldn't process that request.";

    // Check if AI wants to execute a command
    const executeMatch = aiResponse.match(/EXECUTE:\s*(\S+)/);
    if (executeMatch) {
      const command = executeMatch[1];
      console.log("AI executing command:", command);
      
      // Remove the execute command from visible response
      aiResponse = aiResponse.replace(/EXECUTE:\s*\S+[^\n]*/g, "").trim();
      
      // Execute the command
      let actionResult = "";
      
      if (command.startsWith("create_update:") || command.startsWith("ban_user:") || 
          command.startsWith("unban_user:") || command.startsWith("grant_commands:") ||
          command.startsWith("revoke_commands:") || command.startsWith("grant_beta:") ||
          command.startsWith("revoke_beta:") || command.startsWith("beta_release:") ||
          command.startsWith("release_update:") || command.startsWith("broadcast:") ||
          command.startsWith("approve_post:") || command.startsWith("reject_post:")) {
        
        // Recursively call ourselves with the action
        const actionReq = new Request(req.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: command }),
        });
        
        // Process action inline
        if (command === "get_stats") {
          const ctx = await getGameContext();
          actionResult = `📊 Stats: ${ctx.totalUsers} users, ${ctx.activeRooms} rooms, ${ctx.activePlayers.length} playing now`;
        } else if (command === "disable_website") {
          await supabase.from("game_settings").update({ website_enabled: false }).eq("id", "00000000-0000-0000-0000-000000000001");
          actionResult = "✅ Website disabled";
        } else if (command === "enable_website") {
          await supabase.from("game_settings").update({ website_enabled: true }).eq("id", "00000000-0000-0000-0000-000000000001");
          actionResult = "✅ Website enabled";
        }
      }
      
      if (actionResult) {
        aiResponse = aiResponse + "\n\n" + actionResult;
      }
    }

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