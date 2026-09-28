import { supabaseAdmin } from '@/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SECTIONS = 60;
const MAX_DWELL_MS = 6 * 60 * 60 * 1000;
const MAX_CLICKS = 150;
const MAX_MOVES = 400;
const KINDS = new Set(['buy', 'link', 'button', 'media', 'other']);

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v, min, max) => Math.min(Math.max(Math.round(Number(v) || 0), min), max);

function allowedHost(host) {
  const list = (process.env.ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(host.toLowerCase());
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response('bad json', { status: 400, headers: CORS });
  }

  const host = str(body.host, 200);
  if (!UUID.test(body.view_id || '') || !host || !allowedHost(host)) {
    return new Response('rejected', { status: 400, headers: CORS });
  }

  const sections = (Array.isArray(body.sections) ? body.sections : [])
    .slice(0, MAX_SECTIONS)
    .map((s, i) => ({
      id: str(s?.id, 120) || `seccion-${i + 1}`,
      label: str(s?.label, 80),
      i: int(s?.i, 0, MAX_SECTIONS),
      ms: int(s?.ms, 0, MAX_DWELL_MS),
      seen: Boolean(s?.seen),
    }));

  const clicks = (Array.isArray(body.clicks) ? body.clicks : []).slice(0, MAX_CLICKS).map((c) => ({
    x: int(c?.x, 0, 1000),
    y: int(c?.y, 0, 1000),
    t: int(c?.t, 0, 6 * 3600),
    s: int(c?.s, -1, MAX_SECTIONS),
    k: KINDS.has(c?.k) ? c.k : 'other',
    d: str(c?.d, 80),
  }));
  const moves = (Array.isArray(body.moves) ? body.moves : [])
    .slice(0, MAX_MOVES)
    .filter((m) => Array.isArray(m) && m.length === 2)
    .map((m) => [int(m[0], 0, 1000), int(m[1], 0, 1000)]);
  const depthMs = Array.from({ length: 10 }, (_, i) => int(body.depth_ms?.[i], 0, MAX_DWELL_MS));

  const started = new Date(body.started_at);
  const row = {
    view_id: body.view_id,
    session_id: UUID.test(body.session_id || '') ? body.session_id : null,
    store: str(body.store, 80) || host,
    host,
    path: str(body.path, 300) || '/',
    referrer: str(body.referrer, 200),
    utm_source: str(body.utm_source, 100),
    utm_campaign: str(body.utm_campaign, 150),
    device: str(body.device, 20),
    dwell_ms: int(body.dwell_ms, 0, MAX_DWELL_MS),
    max_scroll: int(body.max_scroll, 0, 100),
    max_seen: int(body.max_seen, 0, 100),
    depth_ms: depthMs,
    clicks,
    moves,
    deepest_section: int(body.deepest_section, -1, MAX_SECTIONS),
    sections,
    add_to_cart: Boolean(body.add_to_cart),
    checkout: Boolean(body.checkout),
    started_at: isNaN(started) ? new Date().toISOString() : started.toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin().from('dwell_views').upsert(row, { onConflict: 'view_id' });
  if (error) {
    console.error('collect', error.message);
    return new Response('db error', { status: 500, headers: CORS });
  }
  return new Response(null, { status: 204, headers: CORS });
}
