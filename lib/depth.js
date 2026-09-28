// "Donde se caen" y "donde esta el dwell" por altura de la pagina, en tramos de 10%.

const hasDepth = (r) => Array.isArray(r.depth_ms) && r.depth_ms.length === 10;

export function depthFunnel(rows) {
  const valid = rows.filter(hasDepth);
  const n = valid.length;
  if (!n) return null;
  const bands = Array.from({ length: 10 }, (_, i) => {
    const top = (i + 1) * 10; // tramo i = de i*10% a (i+1)*10%
    const reached = valid.filter((r) => r.max_seen >= top - 5).length; // vio al menos la mitad del tramo
    const totalMs = valid.reduce((a, r) => a + (Number(r.depth_ms[i]) || 0), 0);
    return {
      from: i * 10,
      to: top,
      reachPct: Math.round((reached / n) * 1000) / 10,
      avgMs: Math.round(totalMs / n),
    };
  });

  // Mayor caida entre un tramo y el siguiente
  let drop = null;
  for (let i = 1; i < bands.length; i++) {
    const d = bands[i - 1].reachPct - bands[i].reachPct;
    if (!drop || d > drop.d) drop = { d: Math.round(d * 10) / 10, index: i };
  }
  if (drop) bands[drop.index].biggestDrop = true;

  // Tramo donde mas tiempo pasan
  let hot = 0;
  bands.forEach((b, i) => { if (b.avgMs > bands[hot].avgMs) hot = i; });
  bands[hot].hottest = true;

  const half = bands.findLast((b) => b.reachPct >= 50);
  return {
    views: n,
    bands,
    noScrollPct: Math.round((valid.filter((r) => r.max_scroll < 5).length / n) * 1000) / 10,
    halfAt: half ? half.to : 0,
    biggestDrop: drop,
    hottest: hot,
  };
}
