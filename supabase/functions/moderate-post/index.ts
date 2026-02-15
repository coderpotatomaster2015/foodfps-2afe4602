import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, image_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages: any[] = [
      {
        role: "system",
        content: `You are a content moderator for a food-themed FPS game's social media platform called "Food Media". 
Your job is to check if posts are appropriate to be published.

Rules for approval:
- Posts about gaming, food, high scores, achievements, fun moments are APPROVED
- Posts with profanity, slurs, hate speech, bullying, harassment are DECLINED
- Posts with sexual content, violence (real-world), threats are DECLINED
- Posts with personal information (phone numbers, addresses, emails) are DECLINED
- Posts promoting illegal activities are DECLINED
- Posts with spam or advertising external links are DECLINED
- Mild trash talk or competitive banter is OK and APPROVED
- Posts in any language should be checked

You MUST reply with EXACTLY one word: either "Approve" or "Decline". Nothing else.`
      },
    ];

    // Build the user message
    let userContent: any;
    if (image_url && !image_url.startsWith("data:")) {
      // If there's an image URL (not base64), send it as multimodal
      userContent = [
        { type: "text", text: `Here is the post text: "${content}"\n\nAnd here is the attached photo. Is this appropriate to be posted? Reply with Approve or Decline.` },
        { type: "image_url", image_url: { url: image_url } }
      ];
    } else {
      userContent = `Here is the post text: "${content}"${image_url ? "\n\n(An image was attached but cannot be analyzed)" : ""}\n\nIs this appropriate to be posted? Reply with Approve or Decline.`;
    }

    messages.push({ role: "user", content: userContent });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later", decision: "pending" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted", decision: "pending" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI moderation unavailable", decision: "pending" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim() || "";
    
    // Parse decision
    const decision = aiResponse.toLowerCase().includes("approve") ? "approve" : 
                     aiResponse.toLowerCase().includes("decline") ? "decline" : "pending";

    console.log(`AI moderation result: "${aiResponse}" -> ${decision}`);

    return new Response(JSON.stringify({ decision, raw: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Moderation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", decision: "pending" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
