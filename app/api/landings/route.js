import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { AUTH_COOKIE, isAuthorized } from '@/lib/auth';
import { STORE } from '@/lib/store';
import { TREND_DAYS, buildTracking, normalizeLanding } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

const RANGES = { '1h': 1, '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };
const PAGE = 1000;
const MAX_ROWS = 50_000;
const COLUMNS = 'session_id,host,path,dwell_ms,max_scroll,max_seen,add_to_cart,checkout,started_at,updated_at';
const DEFAULT_HOST = `${STORE}.myshopify.com`;

async function guard() {
  const jar = await cookies();
  return isAuthorized(jar.get(AUTH_COOKIE)?.value);
}

export async function GET(request) {
  if (!(await guard())) return Response.json({ error: 'no autorizado' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const range = RANGES[params.get('range')] ? params.get('range') : '7d';
  const rangeMs = RANGES[range] * 3600_000;
  const now = Date.now();
  const since = new Date(now - Math.max(2 * rangeMs, TREND_DAYS * 86_400_000)).toISOString();
  const db = supabaseAdmin();

  const { data: tracked, error: e1 } = await db
    .from('dwell_landings')
    .select('id,host,path,name,url,created_at')
    .order('created_at', { ascending: true });
  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await db
      .from('dwell_views')
      .select(COLUMNS)
      .eq('store', STORE)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  return Response.json({ range, updatedAt: new Date().toISOString(), ...buildTracking(tracked, rows, { rangeMs, now }) });
}

export async function POST(request) {
  if (!(await guard())) return Response.json({ error: 'no autorizado' }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  let landing;
  try {
    landing = normalizeLanding(body.url, DEFAULT_HOST);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
  const name = String(body.name || '').trim().slice(0, 80) || landing.path.split('/').pop() || landing.path;
  const { data, error } = await supabaseAdmin()
    .from('dwell_landings')
    .upsert({ ...landing, name }, { onConflict: 'path' })
    .select('id,host,path,name,url,created_at')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request) {
  if (!(await guard())) return Response.json({ error: 'no autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'id inválido' }, { status: 400 });
  const { error } = await supabaseAdmin().from('dwell_landings').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
