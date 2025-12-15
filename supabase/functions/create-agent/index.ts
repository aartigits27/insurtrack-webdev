// Edge function to create an insurance agent user and related records
// Path: supabase/functions/create-agent/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    console.log("create-agent: request received");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Get current user from the access token
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !currentUser) {
      console.error("create-agent: getUser failed", userError);
      return json({ error: "Unauthorized" }, 401);
    }

    // Ensure the caller is an admin using has_role helper
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc("has_role", { _user_id: currentUser.id, _role: "admin" });

    if (roleError || !isAdmin) {
      console.error("create-agent: role check failed", roleError);
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const { email, password, fullName, agentCode, commissionRate } = body as {
      email: string;
      password: string;
      fullName: string;
      agentCode: string;
      commissionRate: number;
    };

    if (!email || !password || !fullName || !agentCode) {
      return json({ error: "Missing required fields" }, 400);
    }

    // 1) Create the auth user (agent)
    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (createError || !createdUser.user) {
      console.error("create-agent: error creating auth user", createError);
      return json(
        { error: createError?.message || "Failed to create user" },
        400,
      );
    }

    const userId = createdUser.user.id;

    // 2) Ensure profile exists or create it
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      console.error("create-agent: error upserting profile", profileError);
      return json({ error: "Failed to create agent profile" }, 500);
    }

    // 3) Set role to 'agent' (replace any existing roles for this user)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    const { error: roleInsertError } = await supabaseAdmin.from("user_roles")
      .insert({
        user_id: userId,
        role: "agent",
      });

    if (roleInsertError) {
      console.error("create-agent: error inserting agent role", roleInsertError);
      return json({ error: "Failed to set agent role" }, 500);
    }

    // 4) Create agent record
    const { error: agentError } = await supabaseAdmin.from("agents").insert({
      user_id: userId,
      agent_code: agentCode,
      commission_rate: commissionRate ?? 10,
    });

    if (agentError) {
      console.error("create-agent: error creating agent record", agentError);
      return json({ error: "Failed to create agent record" }, 500);
    }

    console.log("create-agent: success", { userId });
    return json({ success: true }, 200);
  } catch (err) {
    console.error("create-agent: unexpected error", err);
    return json({ error: "Internal server error" }, 500);
  }
});

