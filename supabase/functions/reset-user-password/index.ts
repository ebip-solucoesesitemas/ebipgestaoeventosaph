import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://ebipgestaoeventosaph.lovable.app",
  "https://id-preview--a5144428-c06d-43e5-bd87-819b0c1e4023.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is SUPER-ADMIN (hidden = true)
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, hidden")
      .eq("user_id", userData.user.id)
      .eq("hidden", true)
      .maybeSingle();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Forbidden: Super-Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profileId, newPassword } = await req.json();

    // Input validation
    if (!profileId || typeof profileId !== "string") {
      return new Response(JSON.stringify({ error: "profileId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 72) {
      return new Response(JSON.stringify({ error: "Senha deve ter entre 6 e 72 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target user_id from profile
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, nome")
      .eq("id", profileId)
      .maybeSingle();

    if (targetError || !targetProfile || !targetProfile.user_id) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado ou sem conta vinculada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reset password
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      targetProfile.user_id,
      { password: newPassword }
    );

    if (resetError) {
      return new Response(JSON.stringify({ error: resetError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit log
    await supabaseAdmin.rpc("log_audit_event", {
      p_user_id: userData.user.id,
      p_action: "reset_password",
      p_target_id: profileId,
      p_details: { target_nome: targetProfile.nome },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
