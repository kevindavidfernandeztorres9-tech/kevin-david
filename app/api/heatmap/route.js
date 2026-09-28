import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { AUTH_COOKIE, createOverlayToken, isAuthorized, isValidOverlayToken } from '@/lib/auth';
import { buildHeatmap } from '@/lib/heatmap';

export const dynamic = 'force-dynamic';

const RANGES = { '1h': 1, '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };
const PAGE = 1000;
const MAX_ROWS = 20_000;
const COLUMNS = 'view_id,device,max_scroll,max_seen,depth_ms,sections,clicks,moves';
const CORS = { 'Access-Control-Allow-Origin': '*' };

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const token = params.get('token');
  const jar = await cookies();
  const byCookie = await isAuthorized(jar.get(AUTH_COOKIE)?.value);
  // Con token (vista sobre la tienda real) solo se entrega la pagina pedida.
  if (!byCookie && !(token && (await isValidOverlayToken(token)))) {
    return Response.json({ error: 'no autorizado' }, { status: 401, headers: CORS });
  }

  const range = RANGES[params.get('range')] ? params.get('range') : '7d';
  const store = params.get('store') || '';
  const host = params.get('host') || '';
  const path = params.get('path') || '';
  const device = params.get('device') || '';
  if (!byCookie && !path) return Response.json({ error: 'falta la pagina' }, { status: 400, headers: CORS });

  const since = new Date(Date.now() - RANGES[range] * 3600_000).toISOString();
  const db = supabaseAdmin();
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let q = db.from('dwell_views').select(COLUMNS).gte('started_at', since);
    if (store) q = q.eq('store', store);
    if (host) q = q.eq('host', host);
    if (path) q = q.eq('path', path);
    if (device === 'movil') q = q.eq('device', 'movil');
    if (device === 'escritorio') q = q.neq('device', 'movil');
    const { data, error } = await q.order('started_at', { ascending: false }).range(from, from + PAGE - 1);
    if (error) return Response.json({ error: error.message }, { status: 500, headers: CORS });
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  const body = { range, device: device || 'todos', ...buildHeatmap(rows) };
  if (byCookie) body.overlayToken = await createOverlayToken();
  return Response.json(body, { headers: CORS });
}
