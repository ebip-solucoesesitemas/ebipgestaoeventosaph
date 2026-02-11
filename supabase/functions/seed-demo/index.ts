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
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Helper to create auth user + profile + role
    async function ensureUser(email: string, password: string, nome: string, especialidade: string, registro: string, cargo: "admin" | "equipe") {
      log(`Creating user: ${email}`);
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === email);
      
      let userId: string;
      if (existing) {
        userId = existing.id;
        log(`User already exists: ${userId}`);
        await supabase.auth.admin.updateUserById(userId, { password });
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email, password, email_confirm: true,
        });
        if (error) throw new Error(`Auth error for ${email}: ${error.message}`);
        userId = data.user.id;
        log(`Created auth user: ${userId}`);
      }

      // Upsert profile
      const { data: existingProfile } = await supabase
        .from("profiles").select("id").eq("user_id", userId).maybeSingle();
      
      let profileId: string;
      if (existingProfile) {
        profileId = existingProfile.id;
        await supabase.from("profiles").update({ nome, especialidade, registro_profissional: registro, cargo }).eq("id", profileId);
        log(`Updated profile: ${profileId}`);
      } else {
        const { data: prof, error: profErr } = await supabase
          .from("profiles").insert({ user_id: userId, nome, especialidade, registro_profissional: registro, cargo }).select("id").single();
        if (profErr) throw new Error(`Profile error: ${profErr.message}`);
        profileId = prof.id;
        log(`Created profile: ${profileId}`);
      }

      // Ensure roles
      await supabase.from("user_roles").upsert({ user_id: userId, role: "equipe" as any }, { onConflict: "user_id,role" });
      if (cargo === "admin") {
        await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" as any }, { onConflict: "user_id,role" });
      }
      log(`Roles set for ${email}`);

      return { userId, profileId };
    }

    // Helper to create profile WITHOUT auth account
    async function ensureProfileOnly(nome: string, especialidade: string, registro: string) {
      log(`Creating profile-only: ${nome}`);
      const { data: existing } = await supabase
        .from("profiles").select("id").eq("registro_profissional", registro).maybeSingle();
      
      if (existing) {
        // Make sure user_id is NULL (no auth account)
        await supabase.from("profiles").update({ nome, especialidade, user_id: null, cargo: "equipe" }).eq("id", existing.id);
        log(`Updated profile-only: ${existing.id}`);
        return existing.id;
      }

      const { data: prof, error } = await supabase
        .from("profiles").insert({ user_id: null, nome, especialidade, registro_profissional: registro, cargo: "equipe" }).select("id").single();
      if (error) throw new Error(`Profile-only error: ${error.message}`);
      log(`Created profile-only: ${prof.id}`);
      return prof.id;
    }

    // --- Step 0: Clean up extra auth users that should NOT exist ---
    log("Cleaning up extra auth users...");
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const extraEmails = ["medico.demo@example.com", "enfermeiro.demo@example.com"];
    for (const email of extraEmails) {
      const user = allUsers?.users?.find(u => u.email === email);
      if (user) {
        // Remove user_roles
        await supabase.from("user_roles").delete().eq("user_id", user.id);
        // Set profile user_id to NULL (keep profile)
        await supabase.from("profiles").update({ user_id: null }).eq("user_id", user.id);
        // Delete auth user
        await supabase.auth.admin.deleteUser(user.id);
        log(`Deleted auth user: ${email} (${user.id})`);
      }
    }

    // --- Step 1: Create only 2 auth users ---
    const admin = await ensureUser("evandrojosedfreitas@gmail.com", "admin123", "Evandro José de Freitas", "Médico", "CRM-12345", "admin");
    const socorrista = await ensureUser("baseviatura66@gmail.com", "exemplo", "Carlos Silva - Socorrista", "Socorrista", "SOC-001", "equipe");

    // --- Step 2: Create profile-only members (NO auth account) ---
    const medicoProfileId = await ensureProfileOnly("Dr. Ana Souza", "Médico", "CRM-54321");
    const enfermeiroProfileId = await ensureProfileOnly("João Oliveira - Enfermeiro", "Enfermeiro", "COREN-9876");

    log("All users/profiles created!");

    // --- Step 3: Create base ---
    const { data: base, error: baseErr } = await supabase
      .from("bases").upsert({ sigla: "BSP", nome: "Base São Paulo", endereco: "Av. Paulista, 1000 - São Paulo/SP" }, { onConflict: "sigla" }).select("id").single();
    if (baseErr) throw new Error(`Base error: ${baseErr.message}`);
    log(`Base: ${base.id}`);

    // --- Step 4: Create vehicle ---
    const { data: existingVehicle } = await supabase.from("vehicles").select("id").eq("placa", "ABC-1234").maybeSingle();
    let vehicleId: string;
    if (existingVehicle) {
      vehicleId = existingVehicle.id;
      await supabase.from("vehicles").update({ base_id: base.id, status: "em_uso" }).eq("id", vehicleId);
    } else {
      const { data: v, error: vErr } = await supabase
        .from("vehicles").insert({ prefixo: "VTR-01", modelo: "Sprinter 415", placa: "ABC-1234", base_id: base.id, status: "em_uso" }).select("id").single();
      if (vErr) throw new Error(`Vehicle error: ${vErr.message}`);
      vehicleId = v.id;
    }
    log(`Vehicle: ${vehicleId}`);

    // --- Step 5: Create client ---
    const { data: existingClient } = await supabase.from("clients").select("id").eq("documento", "12.345.678/0001-90").maybeSingle();
    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: c, error: cErr } = await supabase
        .from("clients").insert({
          nome: "Empresa ABC Eventos",
          documento: "12.345.678/0001-90",
          email: "contato@abceventos.com.br",
          telefone: "(11) 99999-0000",
          endereco: "Rua Augusta, 500 - São Paulo/SP",
          cep: "01305-000",
        }).select("id").single();
      if (cErr) throw new Error(`Client error: ${cErr.message}`);
      clientId = c.id;
    }
    log(`Client: ${clientId}`);

    // --- Step 6: Create active event ---
    const now = new Date();
    const startDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 22 * 60 * 60 * 1000);

    // Delete old demo data
    await supabase.from("event_assignments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("event_signatures").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { data: event, error: eventErr } = await supabase
      .from("events").insert({
        nome_evento: "Cobertura Show Rock in Rio SP",
        local: "Autódromo de Interlagos - São Paulo/SP",
        data_inicio: startDate.toISOString(),
        data_fim: endDate.toISOString(),
        base_id: base.id,
        viatura_id: vehicleId,
        valor_litro_combustivel: 5.89,
        consumo_medio_km_litro: 8,
        equipe_minima: 3,
      }).select("id").single();
    if (eventErr) throw new Error(`Event error: ${eventErr.message}`);
    log(`Event: ${event.id}`);

    // --- Step 7: Create assignments (all 3 profiles) ---
    const profiles = [socorrista.profileId, medicoProfileId, enfermeiroProfileId];
    for (const pid of profiles) {
      const { error: aErr } = await supabase
        .from("event_assignments").insert({ event_id: event.id, profile_id: pid });
      if (aErr) log(`Assignment error for ${pid}: ${aErr.message}`);
    }
    log("Assignments created!");

    // --- Step 8: Create professional rates ---
    const rates = [
      { profile_id: socorrista.profileId, valor_hora: 35, valor_evento: 0 },
      { profile_id: medicoProfileId, valor_hora: 80, valor_evento: 0 },
      { profile_id: enfermeiroProfileId, valor_hora: 50, valor_evento: 0 },
    ];
    for (const r of rates) {
      await supabase.from("professional_rates").upsert(r, { onConflict: "profile_id" });
    }
    log("Rates configured!");

    return new Response(JSON.stringify({ success: true, logs, eventId: event.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log(`Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message, logs }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
