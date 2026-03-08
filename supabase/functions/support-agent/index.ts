import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_CODE = "ADMIN2698";
const REFERENCE_URL = "https://foodfps.lovable.app/ai.md";

const HELP_TOPICS: Array<{ keywords: string[]; response: string }> = [
  {
    keywords: ["login", "sign in", "signin", "password", "account access"],
    response:
      "If you're having login issues, try resetting your password, then fully close and reopen the app before signing in again. If it still fails, share the exact error text and when it appears so support can investigate quickly.",
  },
  {
    keywords: ["lag", "fps", "stutter", "performance", "slow", "freezing"],
    response:
      "For lag/performance problems: lower graphics settings, close background apps/tabs, and use a stable connection. If possible, include your device/browser and game mode so we can suggest targeted fixes.",
  },
  {
    keywords: ["bug", "glitch", "broken", "not working", "issue"],
    response:
      "Thanks for reporting this. Please include steps to reproduce, expected behavior, and what happened instead. Screenshots or short clips help us resolve bugs much faster.",
  },
  {
    keywords: ["ban", "suspended", "appeal"],
    response:
      "For ban-related questions, contact support with your username, approximate ban time, and any context you want reviewed. Keep details clear and factual to speed up review.",
  },
  {
    keywords: ["coins", "gems", "reward", "purchase", "shop"],
    response:
      "For reward or currency issues, please share your username, what you expected to receive, and when the transaction happened. We can help verify progress and rewards.",
  },
];

const containsAny = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));

const wantsPromptData = (input: string) =>
  containsAny(input, [
    "system prompt",
    "hidden instruction",
    "developer note",
    "internal file",
    "restricted data",
    "system configuration",
    "show prompt",
    "reveal prompt",
    "export prompt",
    "copy prompt",
  ]);

const wantsPromptEdit = (input: string) =>
  containsAny(input, ["edit system prompt", "change system prompt", "update system prompt"]);

const unauthorizedAdminClaim = (rawInput: string, normalized: string, hasCode: boolean) => {
  if (hasCode) return false;

  const claimPattern = /(i\s*am|i'?m|im)\s+(an?\s+)?(admin|moderator|developer|owner)/i;
  return claimPattern.test(rawInput) || containsAny(normalized, ["as admin", "as the owner", "as developer"]);
};

const findTopicResponse = (normalized: string) => {
  for (const topic of HELP_TOPICS) {
    if (containsAny(normalized, topic.keywords)) {
      return topic.response;
    }
  }

  return "I can help with gameplay guidance, troubleshooting, account issues, rewards, and reporting bugs. Tell me what happened and I'll walk you through next steps.";
};

const readReferenceSnippet = async (normalized: string): Promise<string | null> => {
  try {
    const response = await fetch(REFERENCE_URL);
    if (!response.ok) return null;

    const markdown = (await response.text()).slice(0, 12000);
    const lines = markdown
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("```"));

    const keyword = normalized
      .split(/\W+/)
      .filter((w) => w.length > 3)
      .slice(0, 12);

    const hits = lines.filter((line) => {
      const lowered = line.toLowerCase();
      return keyword.some((k) => lowered.includes(k));
    });

    if (!hits.length) return null;

    return hits.slice(0, 2).join("\n");
  } catch {
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message : "";
    const normalized = message.toLowerCase();
    const hasCode = message.includes(ADMIN_CODE);

    if (unauthorizedAdminClaim(message, normalized, hasCode)) {
      return new Response(
        JSON.stringify({
          response: "Unauthorized admin claim detected. You have been reported and may be banned.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (wantsPromptData(normalized)) {
      if (wantsPromptEdit(normalized) && hasCode) {
        return new Response(
          JSON.stringify({
            response: "Admin access confirmed. Use the authorized editing interface to update the system prompt.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          response: "I can't help with that request. I can still help with gameplay tips, troubleshooting, and account support.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const topicHelp = findTopicResponse(normalized);
    const referenceSnippet = await readReferenceSnippet(normalized);

    const response = referenceSnippet
      ? `${topicHelp}\n\nReference:\n${referenceSnippet}`
      : `${topicHelp}\n\nAdditional guide: ${REFERENCE_URL}`;

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("support-agent error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process support request",
        response:
          "Sorry, I couldn't process that message right now. Please try again with details about your gameplay or support issue.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
