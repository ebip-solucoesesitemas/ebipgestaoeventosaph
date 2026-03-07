import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { secret } = await req.json();
    if (secret !== "setup-214612") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = "ebipsolucoes.sistemas@gmail.com";
    const password = "214612_gestevent";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === email);
    if (existing) {
      // Just ensure profile is hidden and has admin role
      await supabaseAdmin.from("profiles").update({ hidden: true, cargo: "admin" }).eq("user_id", existing.id);
      await supabaseAdmin.from("user_roles").upsert({ user_id: existing.id, role: "admin" }, { onConflict: "user_id,role" });
      return new Response(JSON.stringify({ success: true, message: "User already exists, updated to hidden admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Create hidden profile
    await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      nome: "Sistema EBIP",
      especialidade: "Administrador",
      registro_profissional: "SISTEMA",
      cargo: "admin",
      hidden: true,
    });

    // Add roles
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "equipe" });

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
