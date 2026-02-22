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
    const { action, adminUsername, adminPassword, targetUsername, newPassword } = await req.json();

    if (!adminUsername || !adminPassword) {
      return new Response(JSON.stringify({ error: "Missing admin credentials" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const anonClient = createClient(supabaseUrl, anonKey);

    let adminEmail = adminUsername;
    if (!adminUsername.includes("@")) {
      const { data: adminProfile } = await adminClient
        .from("profiles")
        .select("user_id")
        .ilike("username", adminUsername)
        .maybeSingle();

      if (!adminProfile?.user_id) {
        return new Response(JSON.stringify({ error: "Admin account not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: adminUserData, error: adminUserError } = await adminClient.auth.admin.getUserById(adminProfile.user_id);
      if (adminUserError || !adminUserData?.user?.email) {
        return new Response(JSON.stringify({ error: "Could not resolve admin email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      adminEmail = adminUserData.user.email;
    }

    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Invalid admin credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .in("role", ["admin", "owner"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "You are not an admin or owner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "reset") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!targetUsername || !newPassword) {
      return new Response(JSON.stringify({ error: "Missing target username or new password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("user_id, username")
      .ilike("username", targetUsername)
      .maybeSingle();

    if (!targetProfile?.user_id) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetProfile.user_id, {
      password: newPassword,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message || "Failed to update password" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, username: targetProfile.username }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin password reset error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
