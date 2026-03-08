import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a game designer for FoodFPS, a 2D top-down shooter. Generate a complete custom gamemode configuration based on the user's description.

You MUST respond using the generate_gamemode tool. Every field is required.

Available weapons: pistol, shotgun, sword, rifle, sniper, smg, knife, rpg, axe, flamethrower, minigun, railgun, crossbow, laser_pistol, grenade_launcher, katana, dual_pistols, plasma_rifle, boomerang, whip, freeze_ray, harpoon_gun

Be creative but keep values balanced and playable. The name should be catchy and unique (max 50 chars). Description max 500 chars.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_gamemode",
              description: "Generate a complete gamemode configuration",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Gamemode name (max 50 chars)" },
                  description: { type: "string", description: "Short description (max 500 chars)" },
                  enemy_health: { type: "integer", minimum: 10, maximum: 500 },
                  player_health: { type: "integer", minimum: 25, maximum: 500 },
                  allowed_weapons: { type: "array", items: { type: "string" }, minItems: 1 },
                  show_score: { type: "boolean" },
                  show_health_gui: { type: "boolean" },
                  enemy_speed_mult: { type: "number", minimum: 0.3, maximum: 3.0 },
                  player_speed_mult: { type: "number", minimum: 0.5, maximum: 3.0 },
                  spawn_interval: { type: "number", minimum: 0.3, maximum: 5.0 },
                  score_multiplier: { type: "number", minimum: 0.5, maximum: 5.0 },
                  enemy_color: { type: "string", description: "Hex color like #FF0000" },
                  bg_color_top: { type: "string", description: "Hex color for sky gradient top" },
                  bg_color_bottom: { type: "string", description: "Hex color for ground gradient bottom" },
                  max_enemies: { type: "integer", minimum: 3, maximum: 50 },
                  pickup_chance: { type: "number", minimum: 0, maximum: 1 },
                  gravity_mult: { type: "number", minimum: 0.1, maximum: 3.0 },
                  friendly_fire: { type: "boolean" },
                  auto_heal: { type: "boolean" },
                  auto_heal_rate: { type: "number", minimum: 0, maximum: 10 },
                  damage_mult: { type: "number", minimum: 0.1, maximum: 5.0 },
                  shield_on_spawn: { type: "boolean" },
                  shield_duration: { type: "number", minimum: 1, maximum: 15 },
                  lives: { type: "integer", minimum: 0, maximum: 10, description: "0 = infinite" },
                  time_limit: { type: "integer", minimum: 0, maximum: 600, description: "0 = none, in seconds" },
                  minimap_enabled: { type: "boolean" },
                  ammo_infinite: { type: "boolean" },
                  enemy_size_mult: { type: "number", minimum: 0.3, maximum: 3.0 },
                  player_size_mult: { type: "number", minimum: 0.5, maximum: 2.0 },
                  fog_enabled: { type: "boolean" },
                  fog_density: { type: "number", minimum: 0.1, maximum: 1.0 },
                  wave_mode: { type: "boolean" },
                  enemies_per_wave: { type: "integer", minimum: 3, maximum: 30 },
                  difficulty_ramp: { type: "number", minimum: 0.5, maximum: 3.0 },
                },
                required: ["name", "description", "enemy_health", "player_health", "allowed_weapons", "show_score", "show_health_gui", "enemy_speed_mult", "player_speed_mult", "spawn_interval", "score_multiplier", "enemy_color", "bg_color_top", "bg_color_bottom", "max_enemies", "pickup_chance", "gravity_mult", "friendly_fire", "auto_heal", "auto_heal_rate", "damage_mult", "shield_on_spawn", "shield_duration", "lives", "time_limit", "minimap_enabled", "ammo_infinite", "enemy_size_mult", "player_size_mult", "fog_enabled", "fog_density", "wave_mode", "enemies_per_wave", "difficulty_ramp"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_gamemode" } },
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return a valid gamemode" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gamemode = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ gamemode }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-gamemode error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
