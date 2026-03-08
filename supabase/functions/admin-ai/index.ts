import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Handle direct quick actions (non-AI)
    if (action) {
      if (action === "disable_website") {
        await supabase.from("game_settings").update({ website_enabled: false }).eq("id", "00000000-0000-0000-0000-000000000001");
        return new Response(JSON.stringify({ response: "🔒 Website has been disabled." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (action === "enable_website") {
        await supabase.from("game_settings").update({ website_enabled: true }).eq("id", "00000000-0000-0000-0000-000000000001");
        return new Response(JSON.stringify({ response: "✅ Website has been enabled." }), {
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
            `🧪 Beta Testers: ${ctx.betaTesters.length}\n` +
            `🎯 Active Players: ${ctx.activePlayers.length}\n` +
            `📝 Pending Posts: ${ctx.pendingPosts}\n` +
            `🚫 Active Bans: ${ctx.bannedUsers.length}\n\n` +
            `**Top Players:**\n${ctx.topPlayers.map((p: any, i: number) => `${i + 1}. ${p.username}: ${p.total_score || 0} pts`).join('\n')}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ═══════════════════════════════════════════════════
    // Tool-calling AI with DB read/write capabilities
    // ═══════════════════════════════════════════════════

    const gameContext = await getGameContext();

    const DB_TABLES = [
      "profiles", "bans", "user_roles", "player_currencies", "player_progress",
      "game_settings", "game_updates", "game_rooms", "room_players", "active_players",
      "broadcasts", "global_chat", "messages", "feedback_messages", "social_posts",
      "beta_testers", "beta_tasks", "chat_permissions", "chat_warnings",
      "admin_abuse_events", "admin_abuse_schedule", "abuse_requests",
      "redeem_codes", "redeemed_codes", "custom_gamemodes", "custom_skins",
      "player_skins", "player_owned_skins", "player_custom_skins", "player_inventory",
      "equipped_loadout", "shop_items", "food_pass_tiers", "food_pass_progress",
      "daily_rewards", "login_streaks", "kill_stats", "game_recordings",
      "ads", "ad_signups", "ad_exemptions", "class_codes", "class_members",
      "class_math_problems", "ip_bans", "rate_limit_log", "ai_conversations"
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "db_read",
          description: "Read/query rows from any database table. Supports filtering, ordering, and limits. Use this to look up users, check bans, view settings, etc.",
          parameters: {
            type: "object",
            properties: {
              table: { type: "string", description: "Table name", enum: DB_TABLES },
              select: { type: "string", description: "Columns to select (default: *). Can include joins like 'id, username, profiles!inner(username)'" },
              filters: {
                type: "array",
                description: "Array of filter conditions to apply",
                items: {
                  type: "object",
                  properties: {
                    column: { type: "string" },
                    operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in"] },
                    value: { type: "string", description: "Value to compare. For 'is' use 'null'/'true'/'false'. For 'in' use comma-separated values." }
                  },
                  required: ["column", "operator", "value"]
                }
              },
              order_by: { type: "string", description: "Column to order by" },
              ascending: { type: "boolean", description: "Sort ascending (default: true)" },
              limit: { type: "integer", description: "Max rows to return (default: 50, max: 200)" },
              single: { type: "boolean", description: "Expect exactly one row (use for lookups)" }
            },
            required: ["table"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "db_insert",
          description: "Insert one or more rows into a database table. Use for creating bans, broadcasts, updates, granting roles, etc.",
          parameters: {
            type: "object",
            properties: {
              table: { type: "string", description: "Table name", enum: DB_TABLES },
              rows: {
                type: "array",
                description: "Array of row objects to insert",
                items: { type: "object" },
                minItems: 1
              }
            },
            required: ["table", "rows"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "db_update",
          description: "Update rows in a database table matching filter conditions. Use for toggling settings, updating scores, modifying user data, etc.",
          parameters: {
            type: "object",
            properties: {
              table: { type: "string", description: "Table name", enum: DB_TABLES },
              values: { type: "object", description: "Column-value pairs to update" },
              filters: {
                type: "array",
                description: "Filter conditions to identify which rows to update (REQUIRED - never update without filters)",
                items: {
                  type: "object",
                  properties: {
                    column: { type: "string" },
                    operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in"] },
                    value: { type: "string" }
                  },
                  required: ["column", "operator", "value"]
                },
                minItems: 1
              }
            },
            required: ["table", "values", "filters"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "db_delete",
          description: "Delete rows from a database table matching filter conditions. Use for unbanning, removing entries, etc.",
          parameters: {
            type: "object",
            properties: {
              table: { type: "string", description: "Table name", enum: DB_TABLES },
              filters: {
                type: "array",
                description: "Filter conditions (REQUIRED - never delete without filters)",
                items: {
                  type: "object",
                  properties: {
                    column: { type: "string" },
                    operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in"] },
                    value: { type: "string" }
                  },
                  required: ["column", "operator", "value"]
                },
                minItems: 1
              }
            },
            required: ["table", "filters"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "db_rpc",
          description: "Call a database function (RPC). Available functions: get_ban_info(_user_id), is_user_banned(_user_id), has_role(_user_id, _role), add_player_currency(_user_id, _coins, _gems, _gold), gift_currency(_target_username, _coins, _gems, _gold), get_class_info(_user_id)",
          parameters: {
            type: "object",
            properties: {
              function_name: { type: "string" },
              args: { type: "object", description: "Arguments to pass to the function" }
            },
            required: ["function_name"]
          }
        }
      }
    ];

    // Execute a tool call
    const executeTool = async (name: string, args: any): Promise<string> => {
      try {
        if (name === "db_read") {
          let query = supabase.from(args.table).select(args.select || "*");
          if (args.filters) {
            for (const f of args.filters) {
              let val: any = f.value;
              if (f.operator === "is") {
                val = f.value === "null" ? null : f.value === "true" ? true : f.value === "false" ? false : f.value;
              }
              if (f.operator === "in") {
                val = f.value.split(",").map((v: string) => v.trim());
              }
              (query as any) = (query as any)[f.operator](f.column, val);
            }
          }
          if (args.order_by) {
            query = query.order(args.order_by, { ascending: args.ascending ?? true });
          }
          query = query.limit(Math.min(args.limit || 50, 200));
          
          if (args.single) {
            const { data, error } = await query.maybeSingle();
            if (error) return `Error: ${error.message}`;
            return JSON.stringify(data, null, 2);
          }
          
          const { data, error } = await query;
          if (error) return `Error: ${error.message}`;
          return JSON.stringify(data, null, 2);
        }

        if (name === "db_insert") {
          const { data, error } = await supabase.from(args.table).insert(args.rows).select();
          if (error) return `Error: ${error.message}`;
          return `Inserted ${data?.length || 0} row(s): ${JSON.stringify(data, null, 2)}`;
        }

        if (name === "db_update") {
          let query = supabase.from(args.table).update(args.values);
          for (const f of args.filters) {
            let val: any = f.value;
            if (f.operator === "is") val = f.value === "null" ? null : f.value === "true" ? true : f.value === "false" ? false : f.value;
            if (f.operator === "in") val = f.value.split(",").map((v: string) => v.trim());
            (query as any) = (query as any)[f.operator](f.column, val);
          }
          const { data, error } = await query.select();
          if (error) return `Error: ${error.message}`;
          return `Updated ${data?.length || 0} row(s): ${JSON.stringify(data, null, 2)}`;
        }

        if (name === "db_delete") {
          let query = supabase.from(args.table).delete();
          for (const f of args.filters) {
            let val: any = f.value;
            if (f.operator === "is") val = f.value === "null" ? null : f.value === "true" ? true : f.value === "false" ? false : f.value;
            if (f.operator === "in") val = f.value.split(",").map((v: string) => v.trim());
            (query as any) = (query as any)[f.operator](f.column, val);
          }
          const { data, error } = await query.select();
          if (error) return `Error: ${error.message}`;
          return `Deleted ${data?.length || 0} row(s)`;
        }

        if (name === "db_rpc") {
          const { data, error } = await supabase.rpc(args.function_name, args.args || {});
          if (error) return `Error: ${error.message}`;
          return JSON.stringify(data, null, 2);
        }

        return `Unknown tool: ${name}`;
      } catch (e) {
        return `Tool error: ${e instanceof Error ? e.message : String(e)}`;
      }
    };

    const systemPrompt = `You are FoodFPS Admin AI — an advanced admin assistant with FULL database access. You can read, write, update, and delete any data in the game database using the provided tools.

CURRENT GAME STATE:
- Total Users: ${gameContext.totalUsers}
- Website: ${gameContext.websiteEnabled ? "Enabled" : "Disabled"}
- Beta Testers: ${gameContext.betaTesters.join(", ") || "None"}
- Active Players: ${gameContext.activePlayers.map((p: any) => \`\${p.username} (\${p.mode})\`).join(", ") || "None"}
- Pending Posts: ${gameContext.pendingPosts}
- Banned Users: ${gameContext.bannedUsers.map((b: any) => b.username).join(", ") || "None"}
- Recent Updates: ${gameContext.recentUpdates.map((u: any) => \`\${u.name} (\${u.is_released ? "Released" : u.is_beta ? "Beta" : "Draft"})\`).join(", ") || "None"}

DATABASE TABLES AVAILABLE:
${DB_TABLES.join(", ")}

KEY TABLE SCHEMAS:
- profiles: id, user_id (uuid), username, total_score, boss_level, bio, avatar_url, ranked_rank, ranked_tier, tutorial_completed, terms_accepted
- bans: id, user_id, banned_by, hours, reason, expires_at, banned_at
- user_roles: id, user_id, role (admin/moderator/user/teacher/owner)
- player_currencies: id, user_id, coins, gems, gold
- game_settings: id (00000000-0000-0000-0000-000000000001), website_enabled, solo_disabled, multiplayer_disabled, boss_disabled, school_disabled, normal_disabled, ranked_disabled, leaderboard_public, disabled_message
- game_updates: id, name, description, is_released, is_beta, is_seasonal, season, summary, created_by, released_at
- broadcasts: id, message, title, is_active, expires_at, created_by, target_user_id, target_username
- custom_gamemodes: id, name, slug, creator_id, creator_username, status (pending/approved/rejected), is_public, + many gameplay params
- chat_permissions: id, user_id, can_use_commands
- beta_testers: id, user_id, granted_by
- social_posts: id, user_id, username, content, is_approved, is_pending
- redeem_codes: id, code, reward_type, reward_value, max_uses, current_uses, is_active, created_by
- active_players: id, user_id, username, mode, room_code, last_seen
- messages: id, from_user_id, from_username, to_user_id, to_username, subject, content, is_read, is_appeal, is_feedback
- ip_bans: id, ip_address, reason, banned_by, expires_at

IMPORTANT RULES:
1. When looking up a user, ALWAYS search profiles by username first to get their user_id
2. For bans, use the bans table. Set hours=999999 for permanent bans. expires_at must be calculated.
3. game_settings has a single row with id "00000000-0000-0000-0000-000000000001"
4. You have service_role access — all RLS is bypassed. Be careful with destructive operations.
5. Always confirm destructive actions (mass deletes, permanent bans) before executing
6. When inserting broadcasts, set created_by to the adminId: "${adminId}"
7. Available RPC functions: get_ban_info, is_user_banned, has_role, add_player_currency, gift_currency, get_class_info

PERSONALITY:
- Helpful, proactive, and thorough
- Show data in formatted tables/lists when returning query results
- Suggest follow-up actions based on context
- Use emojis for key status indicators
- You have full DB access — if the admin asks you to do something with the database, DO IT using the tools`;

    // Build messages
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt }
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    aiMessages.push({ role: "user", content: message });

    // Tool-calling loop (max 5 iterations to prevent infinite loops)
    let finalResponse = "";
    let currentMessages = [...aiMessages];
    
    for (let iteration = 0; iteration < 5; iteration++) {
      console.log(`AI iteration ${iteration + 1}, ${currentMessages.length} messages`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: currentMessages,
          tools,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      
      if (!choice) {
        finalResponse = "I encountered an issue processing your request. Please try again.";
        break;
      }

      const assistantMessage = choice.message;

      // If the AI wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Add assistant message with tool calls to history
        currentMessages.push(assistantMessage);

        // Execute all tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs;
          try {
            toolArgs = JSON.parse(toolCall.function.arguments);
          } catch {
            toolArgs = {};
          }

          console.log(`Executing tool: ${toolName}`, JSON.stringify(toolArgs).slice(0, 200));
          const result = await executeTool(toolName, toolArgs);
          console.log(`Tool result (truncated):`, result.slice(0, 300));

          // Add tool result to messages
          currentMessages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          } as any);
        }

        // Continue loop to let AI process tool results
        continue;
      }

      // No tool calls — we have the final text response
      finalResponse = assistantMessage.content || "";
      break;
    }

    if (!finalResponse || finalResponse.trim() === "") {
      finalResponse = "I've processed your request. Is there anything else you'd like me to do?";
    }

    return new Response(JSON.stringify({ response: finalResponse }), {
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
