// Diagnostico automatico de una landing: convierte las metricas en
// hallazgos concretos (que pasa, donde, y que probar).
// Cada hallazgo: { level: 'critical' | 'warning' | 'good' | 'info', title, detail }

const MIN_VIEWS = 30; // por debajo, los porcentajes todavia bailan mucho
const MIN_DEVICE_VIEWS = 10;

const pct = (v) => `${Math.round(v)}%`;
const secs = (ms) => `${Math.round(ms / 1000)} s`;
const name = (s) => (s.label ? `«${s.label}»` : `«${s.id}»`);

export function buildInsights(l) {
  const out = [];
  const secsList = l.sections || [];

  if (l.views < MIN_VIEWS) {
    out.push({
      level: 'info',
      title: `Pocos datos (${l.views} visitas)`,
      detail: `Los resultados se vuelven confiables desde unas ${MIN_VIEWS} visitas. Tómalos como pista, no como conclusión.`,
    });
  }

  // 0. Altura de la pagina: el muro en la entrada y donde esta el dwell
  const dp = l.depth;
  if (dp && dp.views >= 5) {
    if (dp.noScrollPct >= 40) {
      out.push({
        level: dp.noScrollPct >= 50 ? 'critical' : 'warning',
        title: `El muro está en la entrada: el ${pct(dp.noScrollPct)} no baja nada`,
        detail:
          'Ven la primera pantalla y se van sin hacer scroll. Pon el precio y el botón de compra en la primera pantalla y deja asomar el bloque siguiente para que se note que la página continúa.',
      });
    }
    const b = dp.biggestDrop;
    if (b && b.d >= 15) {
      const band = dp.bands[b.index];
      out.push({
        level: b.d >= 25 ? 'critical' : 'warning',
        title: `El abandono se concentra entre el ${band.from}% y el ${band.to}% de la página`,
        detail: `Ahí se pierde el ${pct(b.d)} de las visitas. Abre la página, mira qué bloque cae en esa altura y córtalo o cámbialo de sitio.`,
      });
    }
    const hot = dp.bands[dp.hottest];
    if (hot && hot.avgMs > 0) {
      out.push({
        level: 'info',
        title: `Tu dwell está entre el ${hot.from}% y el ${hot.to}% de la página (${secs(hot.avgMs)} por visita)`,
        detail: `Es la altura donde más tiempo pasan. La mitad de la gente llega hasta el ${dp.halfAt}% de la página: lo que quieras que vean tiene que estar antes.`,
      });
    }
  }

  // 1. Rebote: se van antes de 10 s
  if (l.bounceRate >= 50) {
    out.push({
      level: 'critical',
      title: `El ${pct(l.bounceRate)} se va en menos de 10 segundos`,
      detail:
        'El primer pantallazo no engancha. Revisa que cargue rápido, que el titular diga en una línea qué ganas y que la imagen principal muestre el producto en uso.',
    });
  } else if (l.bounceRate >= 35) {
    out.push({
      level: 'warning',
      title: `Rebote alto: ${pct(l.bounceRate)}`,
      detail: 'Prueba un titular más directo y pon la oferta o el beneficio principal arriba, sin tener que bajar.',
    });
  }

  // 2. Cuello de botella: la seccion donde mas gente se va
  const bottleneck = secsList.find((s) => s.bottleneck);
  if (bottleneck && bottleneck.exitPct >= 15) {
    const idx = secsList.indexOf(bottleneck);
    const next = secsList[idx + 1];
    out.push({
      level: bottleneck.exitPct >= 30 ? 'critical' : 'warning',
      title: `Cuello de botella en ${name(bottleneck)}: ahí se va el ${pct(bottleneck.exitPct)}`,
      detail:
        (next ? `Solo el ${pct(next.reachPct)} llega a ${name(next)}. ` : '') +
        'Acorta esa sección o pon antes de ella lo que más convence (precio con descuento, reseñas, botón de compra).',
    });
  }

  // 3. Mayor caida de alcance entre dos secciones seguidas
  let drop = null;
  for (let i = 1; i < secsList.length; i++) {
    const d = secsList[i - 1].reachPct - secsList[i].reachPct;
    if (!drop || d > drop.d) drop = { d, from: secsList[i - 1], to: secsList[i] };
  }
  if (drop && drop.d >= 25 && drop.from.id !== bottleneck?.id) {
    out.push({
      level: 'warning',
      title: `Caída fuerte entre ${name(drop.from)} y ${name(drop.to)}`,
      detail: `Se pierde el ${pct(drop.d)} de las visitas de una sección a la siguiente. Algo en ${name(drop.from)} hace que dejen de bajar.`,
    });
  }

  // 4. Seccion donde se quedan mucho y luego se van (posible confusion)
  const times = secsList.filter((s) => s.medianMs > 0).map((s) => s.medianMs).sort((a, b) => a - b);
  const typical = times.length ? times[Math.floor(times.length / 2)] : 0;
  const stuck = secsList
    .filter((s) => typical > 0 && s.medianMs >= typical * 2 && s.medianMs >= 8000 && s.exitPct >= 15)
    .sort((a, b) => b.exitPct - a.exitPct)[0];
  if (stuck) {
    out.push({
      level: 'warning',
      title: `Se detienen en ${name(stuck)} (${secs(stuck.medianMs)}) y luego se van`,
      detail: 'Pasan mucho tiempo ahí pero no avanzan: puede haber dudas (precio poco claro, texto largo, falta de garantía o envío).',
    });
  }

  // 5. Secciones importantes que casi nadie ve
  const unseen = secsList.filter((s, i) => i > 0 && s.reachPct < 30);
  if (unseen.length && secsList.length > 2) {
    out.push({
      level: 'info',
      title: `${unseen.length} ${unseen.length === 1 ? 'sección la ve' : 'secciones las ve'} menos del 30%`,
      detail: `${unseen.slice(0, 4).map(name).join(', ')}. Si ahí están el precio, las reseñas o el botón de compra, súbelos.`,
    });
  }

  // 6. Scroll
  if (l.avgScroll > 0 && l.avgScroll < 40 && l.views >= 5) {
    out.push({
      level: 'warning',
      title: `En promedio bajan solo el ${pct(l.avgScroll)} de la página`,
      detail: 'La mayoría no ve la mitad de abajo. Lo importante tiene que estar en la primera mitad.',
    });
  }

  // 7. Leen pero no compran / carrito abandonado
  if (l.medianDwellMs >= 30000 && l.cartRate < 2 && l.views >= 10) {
    out.push({
      level: 'warning',
      title: 'Leen la página pero casi nadie agrega al carrito',
      detail: `Se quedan ${secs(l.medianDwellMs)} (mediana) pero solo el ${pct(l.cartRate)} agrega. Revisa la oferta, el precio y la confianza (reseñas, garantía, envío).`,
    });
  }
  if (l.cartRate >= 3 && l.checkoutRate < l.cartRate / 2) {
    out.push({
      level: 'warning',
      title: 'Agregan al carrito pero no van al checkout',
      detail: `El ${pct(l.cartRate)} agrega, pero solo el ${pct(l.checkoutRate)} va al pago. Revisa el carrito: costo de envío sorpresa, falta de confianza o botón de pago poco visible.`,
    });
  }

  // 8. Movil vs escritorio
  const m = l.devices?.movil;
  const e = l.devices?.escritorio;
  if (m && e && m.views >= MIN_DEVICE_VIEWS && e.views >= MIN_DEVICE_VIEWS) {
    if (m.bounceRate >= e.bounceRate + 15) {
      out.push({
        level: 'warning',
        title: `En celular rebotan mucho más (${pct(m.bounceRate)} vs ${pct(e.bounceRate)})`,
        detail: 'Abre la landing en tu celular: revisa que cargue rápido y que el texto y los botones se vean bien.',
      });
    } else if (e.bounceRate >= m.bounceRate + 15) {
      out.push({
        level: 'info',
        title: `En computadora rebotan más (${pct(e.bounceRate)} vs ${pct(m.bounceRate)})`,
        detail: 'Revisa cómo se ve la landing en pantalla grande.',
      });
    }
  }

  if (!out.some((i) => i.level === 'critical' || i.level === 'warning') && l.views >= MIN_VIEWS) {
    out.push({
      level: 'good',
      title: 'Sin cuellos de botella claros',
      detail: 'La gente avanza bien por la página. Para vender más, prueba variantes de oferta o de titular.',
    });
  }

  const order = { critical: 0, warning: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

// Hallazgos a partir de los clics (mapa de calor / destinos)
export function buildClickInsights(h) {
  const out = [];
  if (!h || !h.totalClicks) return out;
  const total = h.totalClicks;

  const dead = (h.destinations || []).find((d) => (d.k === 'media' || d.k === 'other') && d.count >= 5 && d.count / total >= 0.08);
  if (dead) {
    out.push({
      level: 'warning',
      title: `Hacen clic en «${dead.d}» y no pasa nada`,
      detail: `${dead.count} clics (${pct((dead.count / total) * 100)} del total) en algo que no lleva a ningún lado. Conviértelo en enlace o pon ahí el botón de compra.`,
    });
  }

  if (h.buyClicks === 0 && total >= 30) {
    out.push({
      level: 'critical',
      title: 'Mucho clic pero ninguno en comprar',
      detail: `${total} clics y ninguno en agregar al carrito o pagar. Revisa que el botón de compra se vea y esté arriba.`,
    });
  } else if (h.buyClicks > 0 && h.buyAvgY >= 600) {
    const reach = h.depth?.bands?.[Math.min(9, Math.floor(h.buyAvgY / 100))]?.reachPct;
    out.push({
      level: 'warning',
      title: `El botón de compra está muy abajo (al ${Math.round(h.buyAvgY / 10)}% de la página)`,
      detail: (reach != null ? `Solo el ${pct(reach)} de las visitas llega a esa altura. ` : '') + 'Repite el botón de compra más arriba.',
    });
  }

  const bands = h.clickBands || [];
  const top = bands.reduce((best, c, i) => (c > bands[best] ? i : best), 0);
  if (bands[top] > 0) {
    out.push({
      level: 'good',
      title: `Donde más tocan: entre el ${top * 10}% y el ${top * 10 + 10}% de la página`,
      detail: `${pct((bands[top] / total) * 100)} de los ${total} clics caen en esa franja. Es donde tienes su atención: lo que quieras que hagan tiene que estar ahí.`,
    });
  }
  return out;
}
