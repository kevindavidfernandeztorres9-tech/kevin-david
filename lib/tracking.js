// "Mis landings": seguimiento de las paginas que registraste, periodo actual
// contra el anterior y visitas dia por dia.

import { summarize } from './stats';

const DAY_MS = 86_400_000;
const LIMA_OFFSET_MS = -5 * 3_600_000; // Peru, sin horario de verano
export const TREND_DAYS = 14;

const dayKey = (t) => new Date(new Date(t).getTime() + LIMA_OFFSET_MS).toISOString().slice(0, 10);

// Una visita cuenta para la landing si es la misma ruta, o si Shopify la abrio
// dentro de una coleccion (/collections/x/products/y).
export function matchesPath(rowPath, trackedPath) {
  if (rowPath === trackedPath) return true;
  return trackedPath.startsWith('/products/') && rowPath.endsWith(trackedPath);
}

export function normalizeLanding(input, defaultHost) {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('Pega la dirección de la landing');
  if (raw.startsWith('/')) raw = `https://${defaultHost}${raw}`;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Esa dirección no es válida');
  }
  let path = decodeURIComponent(u.pathname).replace(/\/+$/, '') || '/';
  if (path.length > 300) throw new Error('La dirección es demasiado larga');
  return { host: u.hostname.toLowerCase(), path, url: `https://${u.hostname.toLowerCase()}${path}` };
}

function metrics(rows) {
  const s = summarize(rows);
  const seen = rows.filter((r) => r.max_seen > 0);
  return {
    ...s,
    avgSeen: seen.length ? Math.round(seen.reduce((a, r) => a + r.max_seen, 0) / seen.length) : 0,
  };
}

export function buildTracking(tracked, rows, { rangeMs, now = Date.now() }) {
  const curFrom = now - rangeMs;
  const prevFrom = now - 2 * rangeMs;
  const trendFrom = now - TREND_DAYS * DAY_MS;
  const days = Array.from({ length: TREND_DAYS }, (_, i) => dayKey(now - (TREND_DAYS - 1 - i) * DAY_MS));

  const landings = tracked.map((t) => {
    const mine = rows.filter((r) => matchesPath(r.path, t.path));
    const at = (r) => new Date(r.started_at).getTime();
    const cur = mine.filter((r) => at(r) >= curFrom);
    const prev = mine.filter((r) => at(r) >= prevFrom && at(r) < curFrom);
    const byDay = new Map(days.map((d) => [d, []]));
    for (const r of mine) {
      if (at(r) < trendFrom) continue;
      const k = dayKey(r.started_at);
      if (byDay.has(k)) byDay.get(k).push(r);
    }
    const last = mine.reduce((a, r) => (r.updated_at > a ? r.updated_at : a), '');
    return {
      ...t,
      current: metrics(cur),
      previous: metrics(prev),
      daily: days.map((d) => {
        const m = summarize(byDay.get(d));
        return { day: d, views: m.views, medianDwellMs: m.medianDwellMs, cartRate: m.cartRate };
      }),
      lastVisit: last || null,
    };
  });

  // Paginas con visitas que todavia no sigues
  const trackedPaths = tracked.map((t) => t.path);
  const counts = new Map();
  for (const r of rows) {
    if (new Date(r.started_at).getTime() < curFrom) continue;
    if (r.path === '/' || trackedPaths.some((p) => matchesPath(r.path, p))) continue;
    const key = `${r.host}${r.path}`;
    const c = counts.get(key) || { host: r.host, path: r.path, views: 0 };
    c.views += 1;
    counts.set(key, c);
  }
  const suggested = [...counts.values()].sort((a, b) => b.views - a.views).slice(0, 10);

  return { days, landings, suggested };
}
