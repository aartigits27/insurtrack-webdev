// Edge function for agents to onboard client users
// Path: supabase/functions/onboard-client/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
    console.log("onboard-client: request received");

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
      console.error("onboard-client: getUser failed", userError);
      return json({ error: "Unauthorized" }, 401);
    }

    // Ensure the caller is an agent using has_role helper
    const { data: isAgent, error: roleError } = await supabaseAdmin
      .rpc("has_role", { _user_id: currentUser.id, _role: "agent" });

    if (roleError || !isAgent) {
      console.error("onboard-client: role check failed", roleError);
      return json({ error: "Forbidden - Only agents can onboard clients" }, 403);
    }

    // Get the agent's record
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from("agents")
      .select("id, agent_code")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (agentError || !agentData) {
      console.error("onboard-client: agent record not found", agentError);
      return json({ error: "Agent record not found" }, 404);
    }

    const body = await req.json();
    const { email, password, fullName, age, gender, dateOfBirth } = body as {
      email: string;
      password: string;
      fullName: string;
      age?: number;
      gender?: string;
      dateOfBirth?: string;
    };

    if (!email || !password || !fullName) {
      return json({ error: "Missing required fields (email, password, fullName)" }, 400);
    }

    // 1) Create the auth user (client)
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
      console.error("onboard-client: error creating auth user", createError);
      return json(
        { error: createError?.message || "Failed to create user" },
        400,
      );
    }

    const userId = createdUser.user.id;

    // 2) Create/update profile with onboarded_by_agent
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        age: age || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        onboarded_by_agent: agentData.id,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      console.error("onboard-client: error upserting profile", profileError);
      return json({ error: "Failed to create client profile" }, 500);
    }

    // 3) Set role to 'user'
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    const { error: roleInsertError } = await supabaseAdmin.from("user_roles")
      .insert({
        user_id: userId,
        role: "user",
      });

    if (roleInsertError) {
      console.error("onboard-client: error inserting user role", roleInsertError);
      return json({ error: "Failed to set user role" }, 500);
    }

    // 4) Automatically assign the client to the agent
    const { error: assignError } = await supabaseAdmin.from("agent_clients")
      .insert({
        agent_id: agentData.id,
        client_id: userId,
      });

    if (assignError) {
      console.error("onboard-client: error assigning client to agent", assignError);
      // Not critical, can continue
    }

    console.log("onboard-client: success", { userId, agentId: agentData.id });
    return json({ 
      success: true, 
      clientId: userId,
      agentCode: agentData.agent_code,
      message: `Client created. They can login with email: ${email} and the password you set, using agent code: ${agentData.agent_code}`
    }, 200);
  } catch (err) {
    console.error("onboard-client: unexpected error", err);
    return json({ error: "Internal server error" }, 500);
  }
});
