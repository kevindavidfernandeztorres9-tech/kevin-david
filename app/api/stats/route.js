import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { AUTH_COOKIE, isAuthorized } from '@/lib/auth';
import { buildStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

const RANGES = { '1h': 1, '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };
const PAGE = 1000;
const MAX_ROWS = 50_000;
const COLUMNS =
  'view_id,session_id,store,host,path,device,referrer,utm_source,utm_campaign,dwell_ms,max_scroll,max_seen,depth_ms,deepest_section,sections,add_to_cart,checkout,started_at,updated_at';

export async function GET(request) {
  const jar = await cookies();
  if (!(await isAuthorized(jar.get(AUTH_COOKIE)?.value))) {
    return Response.json({ error: 'no autorizado' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const range = RANGES[params.get('range')] ? params.get('range') : '24h';
  const store = params.get('store') || '';
  const since = new Date(Date.now() - RANGES[range] * 3600_000).toISOString();
  const liveSince = new Date(Date.now() - 60_000).toISOString();
  const db = supabaseAdmin();

  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let q = db.from('dwell_views').select(COLUMNS).gte('started_at', since);
    if (store) q = q.eq('store', store);
    const { data, error } = await q.order('started_at', { ascending: false }).range(from, from + PAGE - 1);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  // Lista de tiendas (ultimos 30 dias) para el selector
  const { data: storeRows } = await db
    .from('dwell_views')
    .select('store')
    .gte('started_at', new Date(Date.now() - RANGES['30d'] * 3600_000).toISOString())
    .order('started_at', { ascending: false })
    .limit(5000);
  const stores = [...new Set((storeRows || []).map((r) => r.store))].sort();

  return Response.json({
    range,
    store,
    stores,
    truncated: rows.length >= MAX_ROWS,
    updatedAt: new Date().toISOString(),
    ...buildStats(rows, liveSince),
  });
}
