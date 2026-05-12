// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import JSZip from 'npm:jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const CRON_SECRET = Deno.env.get('BACKUP_CRON_SECRET')!;
const BUCKET = 'system-backups';
const RETENTION = 30;

const TABLES = [
  'audit_logs',
  'bases',
  'checklist_categories',
  'checklist_items',
  'checklist_submission_items',
  'checklist_submissions',
  'client_contracts',
  'client_payments',
  'clients',
  'clinical_attendances',
  'contract_templates',
  'event_assignments',
  'event_budgets',
  'event_expenses',
  'event_signatures',
  'events',
  'notice_acknowledgements',
  'operational_rates',
  'professional_payments',
  'professional_rates',
  'profiles',
  'regulation_phones',
  'role_permissions',
  'signatures',
  'support_tickets',
  'system_notices',
  'ticket_messages',
  'user_roles',
  'vehicles',
  'vital_signs',
];

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') v = JSON.stringify(v);
  const s = String(v);
  if (/[\",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function tableToCSV(svc: any, table: string): Promise<{ csv: string; rows: number }> {
  const PAGE = 1000;
  let from = 0;
  let header: string[] | null = null;
  let body = '';
  let rows = 0;
  for (;;) {
    const { data, error } = await svc.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    if (!header) {
      header = Object.keys(data[0]);
      body += header.map(csvEscape).join(',') + '\n';
    }
    for (const row of data) {
      body += header.map((c) => csvEscape(row[c])).join(',') + '\n';
    }
    rows += data.length;
    if (data.length < PAGE) break;
    from += PAGE;
  }
  if (!header) body = '\n';
  return { csv: body, rows };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

async function authorize(req: Request): Promise<{ ok: boolean; userId: string | null; reason?: string }> {
  const internal = req.headers.get('x-internal-secret');
  if (internal) {
    if (CRON_SECRET && internal === CRON_SECRET) return { ok: true, userId: null };
    // Compare against vault-stored secret used by the cron job
    try {
      const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data } = await svc
        .schema('vault' as any)
        .from('decrypted_secrets')
        .select('decrypted_secret')
        .eq('name', 'backup_cron_secret')
        .maybeSingle();
      if (data?.decrypted_secret && data.decrypted_secret === internal) {
        return { ok: true, userId: null };
      }
    } catch (_e) {
      // fall through to JWT path
    }
  }
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { ok: false, userId: null, reason: 'no auth' };
  const token = authHeader.slice(7);
  const cli = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error } = await cli.auth.getClaims(token);
  if (error || !claims?.claims) return { ok: false, userId: null, reason: 'invalid jwt' };
  const userId = claims.claims.sub as string;
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: prof } = await svc
    .from('profiles')
    .select('hidden')
    .eq('user_id', userId)
    .maybeSingle();
  if (!prof?.hidden) return { ok: false, userId, reason: 'not super-admin' };
  return { ok: true, userId };
}

async function generateBackup(svc: any, source: 'auto' | 'manual', userId: string | null) {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const path = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/backup-ebip-${stamp}-${source}.zip`;

  const zip = new JSZip();
  const manifest: any = {
    generated_at: now.toISOString(),
    source,
    created_by: userId,
    version: 1,
    tables: {} as Record<string, { rows: number; ok: boolean; error?: string }>,
  };
  let totalRows = 0;
  let okCount = 0;
  const errors: string[] = [];

  for (const t of TABLES) {
    try {
      const { csv, rows } = await tableToCSV(svc, t);
      zip.file(`${t}.csv`, csv);
      manifest.tables[t] = { rows, ok: true };
      totalRows += rows;
      okCount++;
    } catch (e: any) {
      manifest.tables[t] = { rows: 0, ok: false, error: e?.message || String(e) };
      errors.push(`${t}: ${e?.message || e}`);
    }
  }

  zip.file('_manifesto.json', JSON.stringify(manifest, null, 2));

  const content = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

  const { error: upErr } = await svc.storage.from(BUCKET).upload(path, content, {
    contentType: 'application/zip',
    upsert: false,
  });
  if (upErr) throw upErr;

  const status = errors.length === 0 ? 'success' : okCount > 0 ? 'partial' : 'failed';

  const { data: row, error: insErr } = await svc
    .from('system_backups')
    .insert({
      created_by: userId,
      source,
      storage_path: path,
      file_size_bytes: content.byteLength,
      total_rows: totalRows,
      tables_count: okCount,
      status,
      error_message: errors.length ? errors.join(' | ').slice(0, 4000) : null,
      manifest,
    })
    .select('*')
    .single();
  if (insErr) throw insErr;

  const { data: extra } = await svc
    .from('system_backups')
    .select('id, storage_path')
    .order('created_at', { ascending: false })
    .range(RETENTION, RETENTION + 200);
  if (extra && extra.length > 0) {
    const paths = extra.map((r: any) => r.storage_path);
    await svc.storage.from(BUCKET).remove(paths);
    await svc
      .from('system_backups')
      .delete()
      .in(
        'id',
        extra.map((r: any) => r.id)
      );
  }

  return row;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const auth = await authorize(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized', reason: auth.reason }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (action === 'signed-url') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: b, error: bErr } = await svc
        .from('system_backups')
        .select('storage_path')
        .eq('id', id)
        .single();
      if (bErr || !b) {
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: signed, error: sErr } = await svc.storage
        .from(BUCKET)
        .createSignedUrl(b.storage_path, 300);
      if (sErr) throw sErr;
      return new Response(JSON.stringify({ url: signed.signedUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
    }
    const source: 'auto' | 'manual' = body?.source === 'auto' ? 'auto' : 'manual';
    const row = await generateBackup(svc, source, auth.userId);
    return new Response(JSON.stringify({ ok: true, backup: row }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('backup error', e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
