import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // List all data for debugging
    const { data: allRoles } = await supabaseAdmin.from("user_roles").select("*");
    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("*");
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();

    return new Response(
      JSON.stringify({ 
        roles: allRoles, 
        profiles: allProfiles,
        auth_users: allUsers?.users?.map(u => ({ id: u.id, email: u.email }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
