import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, nome, especialidade, registro_profissional } = await req.json();
    log(`Starting bootstrap for: ${email}`);

    if (!email || !password || !nome || !especialidade || !registro_profissional) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists in auth
    log("Checking for existing user...");
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      log(`Found existing user: ${existingUser.id}, deleting...`);
      await supabaseAdmin.from("profiles").delete().eq("user_id", existingUser.id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", existingUser.id);
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      log("Deleted existing user");
    } else {
      log("No existing user found");
    }
    
    // Create fresh auth user
    log("Creating new auth user...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      log(`Auth error: ${authError.message}`);
      return new Response(JSON.stringify({ error: authError.message, logs }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const userId = authData.user.id;
    log(`Created auth user: ${userId}`);
    
    // Create profile
    log("Creating profile...");
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      nome,
      especialidade,
      registro_profissional,
      cargo: "admin",
    });

    if (profileError) {
      log(`Profile error: ${profileError.message}`);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Erro ao criar perfil: " + profileError.message, logs }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("Profile created");

    // Check if role already exists before inserting
    log("Checking for existing roles...");
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (existingRole) {
      log(`Role already exists: ${existingRole.id}`);
    } else {
      log("Adding admin role...");
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "admin",
      });

      if (roleError) {
        log(`Role error: ${roleError.message}`);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ error: "Erro ao criar role admin: " + roleError.message, logs }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      log("Admin role added");
    }

    // Check for equipe role
    const { data: existingEquipeRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "equipe")
      .maybeSingle();

    if (!existingEquipeRole) {
      log("Adding equipe role...");
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "equipe",
      });
      log("Equipe role added");
    }

    log("SUCCESS!");
    return new Response(
      JSON.stringify({ success: true, message: "Admin criado com sucesso!", userId, logs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log(`Catch error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message, logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
