// Junta clics y paso del cursor de muchas visitas para el mapa de calor
// y la lista de "a donde hacen clic".

import { depthFunnel } from './depth';
import { buildClickInsights } from './insights';

const MAX_MOVE_POINTS = 8000;
const MAX_CLICK_POINTS = 5000;

function sample(list, max) {
  if (list.length <= max) return list;
  const step = list.length / max;
  return Array.from({ length: max }, (_, i) => list[Math.floor(i * step)]);
}

export function buildHeatmap(rows, liveSince = '') {
  const moves = [];
  const clicks = [];
  const dest = new Map();
  const clickBands = new Array(10).fill(0);
  let buyClicks = 0;
  let buyY = 0;

  for (const r of rows) {
    const secs = Array.isArray(r.sections) ? r.sections : [];
    for (const m of Array.isArray(r.moves) ? r.moves : []) moves.push(m);
    for (const c of Array.isArray(r.clicks) ? r.clicks : []) {
      clicks.push([c.x, c.y, c.k === 'buy' ? 1 : 0]);
      clickBands[Math.min(9, Math.floor(c.y / 100))] += 1;
      if (c.k === 'buy') {
        buyClicks += 1;
        buyY += c.y;
      }
      const key = `${c.k}|${c.d}`;
      let a = dest.get(key);
      if (!a) {
        a = { d: c.d || '(sin texto)', k: c.k, count: 0, views: new Set(), ySum: 0, tSum: 0, section: '' };
        dest.set(key, a);
      }
      a.count += 1;
      a.views.add(r.view_id);
      a.ySum += c.y;
      a.tSum += c.t;
      if (!a.section && c.s >= 0) {
        const s = secs.find((x) => x.i === c.s);
        if (s) a.section = s.label || s.id;
      }
    }
  }

  // Lo que estan haciendo ahora mismo (visitas activas en el ultimo minuto)
  const liveRows = liveSince ? rows.filter((r) => r.updated_at >= liveSince) : [];
  const live = {
    visitors: liveRows.length,
    moves: sample(liveRows.flatMap((r) => (Array.isArray(r.moves) ? r.moves.slice(-60) : [])), 1500),
    clicks: liveRows.flatMap((r) => (Array.isArray(r.clicks) ? r.clicks : []).map((c) => [c.x, c.y, c.k === 'buy' ? 1 : 0])),
    seen: liveRows.map((r) => r.max_seen || 0),
  };

  const totalClicks = clicks.length;
  const destinations = [...dest.values()]
    .map((a) => ({
      d: a.d,
      k: a.k,
      count: a.count,
      visitors: a.views.size,
      visitorPct: rows.length ? Math.round((a.views.size / rows.length) * 1000) / 10 : 0,
      avgY: Math.round(a.ySum / a.count),
      avgT: Math.round(a.tSum / a.count),
      section: a.section,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);

  const result = {
    views: rows.length,
    totalClicks,
    totalMoves: moves.length,
    buyClicks,
    buyAvgY: buyClicks ? Math.round(buyY / buyClicks) : 0,
    clickBands,
    moves: sample(moves, MAX_MOVE_POINTS),
    clicks: sample(clicks, MAX_CLICK_POINTS),
    destinations,
    depth: depthFunnel(rows),
    live,
  };
  result.insights = buildClickInsights(result);
  return result;
}
