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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get current user from the access token
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !currentUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure the caller is an admin using has_role helper
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc("has_role", { _user_id: currentUser.id, _role: "admin" });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1) Create the auth user (agent)
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError || !createdUser.user) {
      console.error("Error creating auth user", createError);
      return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
      console.error("Error upserting profile", profileError);
      return new Response(JSON.stringify({ error: "Failed to create agent profile" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3) Set role to 'agent' (replace any existing roles for this user)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "agent",
    });

    if (roleInsertError) {
      console.error("Error inserting agent role", roleInsertError);
      return new Response(JSON.stringify({ error: "Failed to set agent role" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4) Create agent record
    const { error: agentError } = await supabaseAdmin.from("agents").insert({
      user_id: userId,
      agent_code: agentCode,
      commission_rate: commissionRate ?? 10,
    });

    if (agentError) {
      console.error("Error creating agent record", agentError);
      return new Response(JSON.stringify({ error: "Failed to create agent record" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error in create-agent function", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
