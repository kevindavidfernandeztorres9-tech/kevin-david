// Convierte las visitas crudas en metricas por landing y por seccion.

import { buildInsights } from './insights';

const BOUNCE_MS = 10_000; // menos de 10 s activos = rebote

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function summarize(rows) {
  const n = rows.length;
  const pct = (count) => (n ? Math.round((count / n) * 1000) / 10 : 0);
  return {
    views: n,
    sessions: new Set(rows.map((r) => r.session_id).filter(Boolean)).size,
    medianDwellMs: median(rows.map((r) => r.dwell_ms)),
    bounceRate: pct(rows.filter((r) => r.dwell_ms < BOUNCE_MS).length),
    avgScroll: n ? Math.round(rows.reduce((a, r) => a + r.max_scroll, 0) / n) : 0,
    cartRate: pct(rows.filter((r) => r.add_to_cart).length),
    checkoutRate: pct(rows.filter((r) => r.checkout).length),
  };
}

// Por cada seccion: % de visitas que la vieron, tiempo mediano ahi, y % de
// visitas cuya seccion mas profunda fue esa (se fueron ahi). La seccion con
// mas salidas (sin contar la ultima de la pagina) es el cuello de botella.
function sectionFunnel(rows) {
  const byId = new Map();
  for (const r of rows) {
    const secs = Array.isArray(r.sections) ? r.sections : [];
    const deepestId = secs.find((s) => s.i === r.deepest_section)?.id;
    for (const s of secs) {
      let agg = byId.get(s.id);
      if (!agg) {
        agg = { id: s.id, label: s.label, order: [], reached: 0, exits: 0, times: [] };
        byId.set(s.id, agg);
      }
      agg.order.push(s.i);
      if (!agg.label && s.label) agg.label = s.label;
      if (s.seen) {
        agg.reached += 1;
        agg.times.push(s.ms);
      }
      if (s.id === deepestId) agg.exits += 1;
    }
  }

  const n = rows.length || 1;
  const list = [...byId.values()]
    .map((a) => ({
      id: a.id,
      label: a.label,
      position: median(a.order),
      reachPct: Math.round((a.reached / n) * 1000) / 10,
      exitPct: Math.round((a.exits / n) * 1000) / 10,
      medianMs: median(a.times),
    }))
    .sort((a, b) => a.position - b.position);

  let bottleneck = null;
  for (const s of list.slice(0, -1)) {
    if (s.exitPct > 0 && (!bottleneck || s.exitPct > bottleneck.exitPct)) bottleneck = s;
  }
  for (const s of list) s.bottleneck = bottleneck?.id === s.id;
  return { sections: list, bottleneck: bottleneck?.id ?? null };
}

export function buildStats(rows, liveSince) {
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.host}${r.path}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const landings = [...groups.entries()]
    .map(([key, list]) => {
      const funnel = sectionFunnel(list);
      const bottleneck = funnel.sections.find((s) => s.bottleneck);
      const landing = {
        key,
        host: list[0].host,
        path: list[0].path,
        store: list[0].store,
        ...summarize(list),
        devices: {
          movil: summarize(list.filter((r) => r.device === 'movil')),
          escritorio: summarize(list.filter((r) => r.device !== 'movil')),
        },
        live: list.filter((r) => r.updated_at >= liveSince).length,
        bottleneck: bottleneck ? { id: bottleneck.id, label: bottleneck.label, exitPct: bottleneck.exitPct } : null,
        sections: funnel.sections,
      };
      landing.insights = buildInsights(landing);
      return landing;
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 100);

  return {
    totals: { ...summarize(rows), live: rows.filter((r) => r.updated_at >= liveSince).length },
    landings,
  };
}
