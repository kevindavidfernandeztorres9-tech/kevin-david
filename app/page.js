'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const REFRESH_MS = 15000;
const HEAT_REFRESH_MS = 30000;
const RANGES = [
  ['1h', 'Última hora'],
  ['24h', 'Últimas 24 h'],
  ['7d', 'Últimos 7 días'],
  ['30d', 'Últimos 30 días'],
];
const VIEWS = [
  { group: 'Seguimiento' },
  { id: 'mis', icon: '★', label: 'Mis landings' },
  { group: 'En vivo' },
  { id: 'vivo', icon: '∿', label: 'Todo en vivo' },
  { id: 'visitantes', icon: '◉', label: 'Visitantes ahora' },
  { group: 'Tu landing' },
  { id: 'caen', icon: '▽', label: 'Dónde se caen' },
  { id: 'calor', icon: '▦', label: 'Mapa de calor' },
  { id: 'clics', icon: '➚', label: 'Dónde hacen clic' },
  { id: 'secciones', icon: '☰', label: 'Secciones' },
  { group: 'Decidir' },
  { id: 'arreglar', icon: '◎', label: 'Qué arreglar' },
];
const DEVICES = [
  ['', 'Todos'],
  ['movil', 'Celular'],
  ['escritorio', 'Computadora'],
];
const KIND_LABEL = { buy: 'Compra', link: 'Enlace', button: 'Botón', media: 'Imagen/video', other: 'Sin acción' };

function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}
const fmtPct = (v) => `${(v ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`;
const fmtInt = (v) => (v ?? 0).toLocaleString('es-PE');

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function Bar({ value, max, tip, tone }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 1 : 0) : 0;
  return (
    <div className={`bar ${tone || ''}`} aria-label={tip}>
      <span style={{ width: `${width}%` }} />
      <div className="tip" role="tooltip">{tip}</div>
    </div>
  );
}

function Tile({ label, value, hint }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

const LEVELS = {
  critical: { icon: '⛔', label: 'Arregla esto primero' },
  warning: { icon: '⚠', label: 'Mejorable' },
  info: { icon: 'ℹ', label: 'Dato' },
  good: { icon: '✓', label: 'Esto ya está bien' },
};

function Insights({ items }) {
  if (!items?.length) return <p className="empty">Todavía no hay suficientes datos para sacar conclusiones.</p>;
  return (
    <ul className="insights">
      {items.map((it, i) => (
        <li key={i} className={`insight ${it.level}`}>
          <span className="insight-tag">
            <span aria-hidden>{LEVELS[it.level].icon}</span> {LEVELS[it.level].label}
          </span>
          <div>
            <strong>{it.title}</strong>
            <p>{it.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function NeedPage({ what }) {
  return <p className="empty">Elige una página arriba (en “Todas las páginas”) para ver {what}.</p>;
}

/* ---------------------------- Vistas ---------------------------- */

function ViewVivo({ data, onPick }) {
  const t = data.totals;
  const landings = data.landings;
  return (
    <>
      <section className="tiles">
        <Tile label="Visitas" value={fmtInt(t.views)} hint={`${fmtInt(t.sessions)} sesiones`} />
        <Tile label="Dwell mediano" value={fmtTime(t.medianDwellMs)} hint="tiempo activo en la página" />
        <Tile label="Rebote" value={fmtPct(t.bounceRate)} hint="menos de 10 s" />
        <Tile label="Scroll promedio" value={fmtPct(t.avgScroll)} />
        <Tile label="Agregan al carrito" value={fmtPct(t.cartRate)} />
        <Tile label="Van al checkout" value={fmtPct(t.checkoutRate)} />
      </section>
      <section className="card">
        <h2>Landing pages</h2>
        <p className="sub">Toca una fila para analizarla.</p>
        <table>
          <thead>
            <tr>
              <th>Página</th>
              <th className="num">Visitas</th>
              <th className="num">Ahora</th>
              <th className="num">Dwell mediano</th>
              <th className="num">Rebote</th>
              <th className="num">Scroll</th>
              <th className="num">Carrito</th>
              <th className="num">Checkout</th>
              <th>Cuello de botella</th>
            </tr>
          </thead>
          <tbody>
            {landings.map((l) => (
              <tr key={l.key} className="clickable" onClick={() => onPick(l.key)}>
                <td>
                  <div className="path">{l.path}</div>
                  <div className="host">{l.host}</div>
                </td>
                <td className="num">{fmtInt(l.views)}</td>
                <td className="num">{fmtInt(l.live)}</td>
                <td className="num">{fmtTime(l.medianDwellMs)}</td>
                <td className="num">{fmtPct(l.bounceRate)}</td>
                <td className="num">{fmtPct(l.avgScroll)}</td>
                <td className="num">{fmtPct(l.cartRate)}</td>
                <td className="num">{fmtPct(l.checkoutRate)}</td>
                <td>
                  {l.bottleneck ? (
                    <span className="badge">⚠ {l.bottleneck.label || l.bottleneck.id} ({fmtPct(l.bottleneck.exitPct)} se van)</span>
                  ) : (
                    <span className="host">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function ViewVisitantes({ data, page }) {
  const list = page ? data.visitors.filter((v) => `${v.host}${v.path}` === page.key) : data.visitors;
  return (
    <section className="card">
      <h2>Visitantes ahora</h2>
      <p className="sub">Personas con la página abierta en el último minuto. Se actualiza solo.</p>
      {list.length === 0 ? (
        <p className="empty">Nadie en este momento.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Página</th>
              <th>Dispositivo</th>
              <th className="num">Lleva</th>
              <th className="num">Llegó a ver</th>
              <th>Va por</th>
              <th>Viene de</th>
              <th>Compra</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id}>
                <td>
                  <div className="path">{v.path}</div>
                  <div className="host">{v.host}</div>
                </td>
                <td>{v.device === 'movil' ? 'Celular' : 'Computadora'}</td>
                <td className="num">{fmtTime(v.dwellMs)}</td>
                <td className="num">{fmtPct(v.seen)}</td>
                <td>{v.section || '—'}</td>
                <td>
                  {v.source}
                  {v.campaign && <div className="host">{v.campaign}</div>}
                </td>
                <td>{v.checkout ? '✓ Checkout' : v.cart ? '✓ Carrito' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ViewCaen({ depth, title }) {
  if (!depth) return <p className="empty">Aún no hay visitas con la medición por altura (llega con las visitas nuevas).</p>;
  const maxMs = Math.max(...depth.bands.map((b) => b.avgMs), 1);
  return (
    <section className="card">
      <h2>Dónde se caen {title}</h2>
      <p className="sub">
        Qué porcentaje de la gente llegó a ver cada altura de la página y cuánto tiempo pasó ahí. La caída más grande es la
        línea que hay que arreglar primero. {fmtInt(depth.views)} visitas.
      </p>
      <table className="depth">
        <thead>
          <tr>
            <th>Altura</th>
            <th className="num">Llegan</th>
            <th className="bar-cell">Cuántos llegan</th>
            <th className="num">Tiempo ahí</th>
            <th className="bar-cell">Dwell por altura</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {depth.bands.map((b) => (
            <tr key={b.from} className={b.biggestDrop ? 'bottleneck' : ''}>
              <td className="num">{b.from}–{b.to}%</td>
              <td className="num">{fmtPct(b.reachPct)}</td>
              <td className="bar-cell">
                <Bar value={b.reachPct} max={100} tip={`El ${fmtPct(b.reachPct)} llega a ver el tramo ${b.from}–${b.to}%`} />
              </td>
              <td className="num">{fmtTime(b.avgMs)}</td>
              <td className="bar-cell">
                <Bar value={b.avgMs} max={maxMs} tone="warm" tip={`${fmtTime(b.avgMs)} por visita en el tramo ${b.from}–${b.to}%`} />
              </td>
              <td>
                {b.biggestDrop && <span className="badge">⚠ Mayor caída (−{fmtPct(depth.biggestDrop.d)})</span>}
                {b.hottest && !b.biggestDrop && <span className="tag-hot">● Aquí está tu dwell</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="meta">
        El {fmtPct(depth.noScrollPct)} no hizo nada de scroll · la mitad de la gente llega hasta el {depth.halfAt}% de la página.
      </p>
    </section>
  );
}

function HeatCanvas({ heat, show, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !heat) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(canvas);
    const grid = css.getPropertyValue('--grid').trim() || '#e1e0d9';
    const muted = css.getPropertyValue('--muted').trim() || '#898781';
    const ink = css.getPropertyValue('--ink').trim() || '#0b0b0b';
    const surface = css.getPropertyValue('--surface').trim() || '#fcfcfb';
    ctx.clearRect(0, 0, w, h);

    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * (h - 1);
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
      ctx.fillStyle = muted;
      if (i < 10) ctx.fillText(`${i * 10}%`, 4, y + 9);
    }

    if (show.moves) {
      for (const [x, y] of heat.moves) {
        const px = (x / 1000) * w;
        const py = (y / 1000) * h;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 16);
        g.addColorStop(0, 'rgba(235,104,52,0.30)');
        g.addColorStop(1, 'rgba(235,104,52,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - 16, py - 16, 32, 32);
      }
    }
    if (show.clicks) {
      for (const [x, y, buy] of heat.clicks) {
        const px = (x / 1000) * w;
        const py = (y / 1000) * h;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        if (buy) {
          ctx.fillStyle = '#0ca30c';
          ctx.fill();
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = surface;
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = buy ? '#0ca30c' : ink;
        ctx.stroke();
      }
    }
    // Capa "ahora": lo que hacen las visitas activas en este momento
    if (show.live && heat.live) {
      ctx.fillStyle = 'rgba(57,135,229,0.55)';
      for (const [x, y] of heat.live.moves) {
        ctx.beginPath();
        ctx.arc((x / 1000) * w, (y / 1000) * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [x, y] of heat.live.clicks) {
        const px = (x / 1000) * w;
        const py = (y / 1000) * h;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = surface;
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#3987e5';
        ctx.stroke();
      }
    }
  }, [heat, show]);
  return (
    <canvas ref={ref} className={className || 'heat-canvas'} role="img" aria-label="Mapa de calor de la página, de arriba abajo" />
  );
}

function DeviceFilter({ device, setDevice }) {
  return (
    <div className="seg" role="group" aria-label="Dispositivo">
      {DEVICES.map(([v, l]) => (
        <button key={v} className={device === v ? 'on' : ''} onClick={() => setDevice(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

function ViewCalor({ heat, page, device, setDevice }) {
  const [show, setShow] = useState({ moves: true, clicks: true });
  const overlayUrl =
    page && heat?.overlayToken ? `https://${page.host}${page.path}?dwell_overlay=${encodeURIComponent(heat.overlayToken)}` : '';
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Mapa de calor {page ? `de ${page.path}` : ''}</h2>
          <p className="sub">
            Por dónde pasó el cursor y dónde hicieron clic, sobre la página entera de arriba abajo. Los puntos verdes son clics de
            compra.
          </p>
        </div>
        <DeviceFilter device={device} setDevice={setDevice} />
      </div>
      {!page && (
        <p className="warn">
          ⚠ Con “Todas las páginas” se mezclan páginas de distinto alto: elige una página arriba para que sea exacto.
        </p>
      )}
      {!heat ? (
        <p className="empty">Cargando…</p>
      ) : (
        <div className="heat-wrap">
          <HeatCanvas heat={heat} show={show} />
          <div className="heat-side">
            <div className="legend">
              <label>
                <input type="checkbox" checked={show.moves} onChange={(e) => setShow({ ...show, moves: e.target.checked })} />
                <span className="sw heat" /> Paso del cursor
              </label>
              <label>
                <input type="checkbox" checked={show.clicks} onChange={(e) => setShow({ ...show, clicks: e.target.checked })} />
                <span className="sw ring" /> Clic <span className="sw buy" /> Clic de compra
              </label>
            </div>
            <p className="meta">
              {fmtInt(heat.views)} visitas · {fmtInt(heat.totalMoves)} puntos de cursor · {fmtInt(heat.totalClicks)} clics ·{' '}
              {fmtInt(heat.buyClicks)} de compra
            </p>
            <p className="meta">El cursor solo se mide en computadora; en celular cuentan los toques (clics).</p>
            {overlayUrl ? (
              <a className="btn" href={overlayUrl} target="_blank" rel="noreferrer">
                Ver sobre mi tienda ↗
              </a>
            ) : (
              <p className="meta">Elige una página para verla sobre tu tienda real.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ViewClics({ heat, page, device, setDevice }) {
  const bands = heat?.clickBands || [];
  const maxBand = Math.max(...bands, 1);
  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Dónde hacen clic {page ? `en ${page.path}` : ''}</h2>
            <p className="sub">Cada destino de clic: a dónde lleva, cuántos lo tocaron y a qué altura de la página está.</p>
          </div>
          <DeviceFilter device={device} setDevice={setDevice} />
        </div>
        {!heat ? (
          <p className="empty">Cargando…</p>
        ) : heat.destinations.length === 0 ? (
          <p className="empty">Aún no hay clics registrados en este rango.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Destino</th>
                <th>Tipo</th>
                <th className="num">Clics</th>
                <th className="num">Visitas que lo tocan</th>
                <th className="num">Altura</th>
                <th className="num">Segundo</th>
                <th>Sección</th>
              </tr>
            </thead>
            <tbody>
              {heat.destinations.map((d, i) => (
                <tr key={i} className={d.k === 'buy' ? 'buy-row' : ''}>
                  <td className="path">{d.d}</td>
                  <td>{d.k === 'buy' ? '✓ ' : ''}{KIND_LABEL[d.k]}</td>
                  <td className="num">{fmtInt(d.count)}</td>
                  <td className="num">{fmtPct(d.visitorPct)}</td>
                  <td className="num">{Math.round(d.avgY / 10)}%</td>
                  <td className="num">{d.avgT} s</td>
                  <td>{d.section || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {heat && heat.totalClicks > 0 && (
        <section className="card">
          <h2>Clics por altura de la página</h2>
          <p className="sub">Dónde tienes su dedo: qué parte de la página concentra los clics.</p>
          <table>
            <tbody>
              {bands.map((c, i) => (
                <tr key={i}>
                  <td className="num">{i * 10}–{i * 10 + 10}%</td>
                  <td className="bar-cell">
                    <Bar value={c} max={maxBand} tip={`${fmtInt(c)} clics entre el ${i * 10}% y el ${i * 10 + 10}%`} />
                  </td>
                  <td className="num">{fmtInt(c)}</td>
                  <td className="num">{fmtPct((c / heat.totalClicks) * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

function ViewSecciones({ page }) {
  if (!page) return <NeedPage what="sus secciones" />;
  const secs = page.sections;
  if (!secs.length) {
    return (
      <p className="empty">
        No se detectaron secciones en esta página. Agrega <code>data-dwell="Nombre"</code> a los bloques que quieras medir.
      </p>
    );
  }
  const maxMs = Math.max(...secs.map((s) => s.medianMs), 1);
  return (
    <section className="card">
      <h2>Secciones de {page.path}</h2>
      <p className="sub">
        “Se fueron aquí” = la última sección que vieron antes de irse; la más alta (sin contar el final) es el cuello de botella.
      </p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Sección</th>
            <th className="num">La vieron</th>
            <th className="bar-cell">Alcance</th>
            <th className="num">Tiempo mediano</th>
            <th className="bar-cell">Tiempo</th>
            <th className="num">Se fueron aquí</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {secs.map((s, i) => (
            <tr key={s.id} className={s.bottleneck ? 'bottleneck' : ''}>
              <td className="num">{i + 1}</td>
              <td>
                <div className="path">{s.label || s.id}</div>
                {s.label && <div className="host">{s.id}</div>}
              </td>
              <td className="num">{fmtPct(s.reachPct)}</td>
              <td className="bar-cell">
                <Bar value={s.reachPct} max={100} tip={`${s.label || s.id}: la vio el ${fmtPct(s.reachPct)}`} />
              </td>
              <td className="num">{fmtTime(s.medianMs)}</td>
              <td className="bar-cell">
                <Bar value={s.medianMs} max={maxMs} tone="warm" tip={`${s.label || s.id}: ${fmtTime(s.medianMs)} en pantalla`} />
              </td>
              <td className="num">{fmtPct(s.exitPct)}</td>
              <td>{s.bottleneck ? <span className="badge">⚠ Cuello de botella</span> : <span className="host">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ViewArreglar({ data, page, heat, onPick }) {
  if (!page) {
    const worst = data.landings
      .map((l) => ({ l, top: l.insights?.find((i) => i.level === 'critical' || i.level === 'warning') }))
      .filter((x) => x.top);
    return (
      <section className="card">
        <h2>Qué arreglar</h2>
        <p className="sub">El problema principal de cada landing. Toca una para ver el diagnóstico completo.</p>
        {worst.length === 0 ? (
          <p className="empty">Sin problemas claros todavía (o faltan visitas).</p>
        ) : (
          <table>
            <tbody>
              {worst.map(({ l, top }) => (
                <tr key={l.key} className="clickable" onClick={() => onPick(l.key)}>
                  <td>
                    <div className="path">{l.path}</div>
                    <div className="host">{fmtInt(l.views)} visitas</div>
                  </td>
                  <td>
                    <span className={top.level === 'critical' ? 'badge' : 'tag-warn'}>
                      {LEVELS[top.level].icon} {top.title}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    );
  }
  const items = [...(page.insights || []), ...(heat?.insights || [])];
  const order = { critical: 0, warning: 1, info: 2, good: 3 };
  items.sort((a, b) => order[a.level] - order[b.level]);
  const main = items.find((i) => i.level === 'critical') || items.find((i) => i.level === 'warning');
  return (
    <section className="card">
      <h2>Qué arreglar en {page.path}</h2>
      <p className="sub">
        Dónde se atasca tu landing y qué cambiar, sacado de tus propios datos. {fmtInt(page.views)} visitas
        {page.devices ? ` (${fmtInt(page.devices.movil.views)} celular · ${fmtInt(page.devices.escritorio.views)} computadora)` : ''}.
      </p>
      {main && (
        <div className="hero-issue">
          <div className="eyebrow">El cuello de botella</div>
          <div className="hero-title">{main.title}</div>
        </div>
      )}
      <Insights items={items} />
    </section>
  );
}

function Setup({ origin }) {
  return (
    <div className="card setup">
      <h2>Aún no hay datos en este rango</h2>
      <p className="sub">
        Pega esta línea en airmaggnature (Shopify → Tienda online → Temas → Editar código → theme.liquid, justo antes de
        &lt;/head&gt;):
      </p>
      <pre>{`<script src="${origin}/dwell.js" data-store="airmaggnature" defer></script>`}</pre>
    </div>
  );
}

const RANGE_PREV = { '1h': 'la hora anterior', '24h': 'las 24 h anteriores', '7d': 'los 7 días anteriores', '30d': 'los 30 días anteriores' };

function Delta({ cur, prev, lowerIsBetter, unit }) {
  if (!prev && !cur) return <span className="delta">—</span>;
  if (!prev) return <span className="delta">nuevo</span>;
  const diff = cur - prev;
  if (Math.abs(diff) < 0.05) return <span className="delta">= igual</span>;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const txt = unit === 'pp' ? `${diff > 0 ? '+' : ''}${fmtPct(diff).replace('%', '')} pts` : `${diff > 0 ? '+' : ''}${Math.round((diff / prev) * 100)}%`;
  return (
    <span className={`delta ${better ? 'up' : 'down'}`}>
      {diff > 0 ? '▲' : '▼'} {txt}
    </span>
  );
}

function MiniDays({ daily }) {
  const max = Math.max(...daily.map((d) => d.views), 1);
  return (
    <div className="mini-days" role="img" aria-label="Visitas por día, últimos 14 días">
      {daily.map((d) => (
        <div key={d.day} className="mini-col" title={`${d.day}: ${d.views} visitas · dwell ${fmtTime(d.medianDwellMs)} · carrito ${fmtPct(d.cartRate)}`}>
          <span style={{ height: `${d.views ? Math.max((d.views / max) * 100, 4) : 0}%` }} />
        </div>
      ))}
    </div>
  );
}

const LIVE_SHOW = { moves: true, clicks: true, live: true };

function LandingLive({ t, range, st }) {
  const [heat, setHeat] = useState(null);
  const load = useCallback(async () => {
    const q = new URLSearchParams({ range, host: t.host, path: t.path });
    try {
      const res = await fetch(`/api/heatmap?${q}`, { cache: 'no-store' });
      if (res.ok) setHeat(await res.json());
    } catch {}
  }, [range, t.host, t.path]);
  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const order = { critical: 0, warning: 1, info: 2, good: 3 };
  const issues = [...(st?.insights || []), ...(heat?.insights || [])]
    .filter((i) => i.level === 'critical' || i.level === 'warning')
    .sort((a, b) => order[a.level] - order[b.level]);
  const overlayUrl = heat?.overlayToken ? `https://${t.host}${t.path}?dwell_overlay=${encodeURIComponent(heat.overlayToken)}` : '';

  return (
    <div className="track-live">
      <div className="live-head">
        <span className={`live-dot ${heat?.live?.visitors ? '' : 'off'}`} aria-hidden />
        <strong>{heat ? `${fmtInt(heat.live.visitors)} ahora en la página` : 'Cargando…'}</strong>
      </div>
      {heat && <HeatCanvas heat={heat} show={LIVE_SHOW} className="heat-mini" />}
      <div className="legend small">
        <span><span className="sw heat" /> cursor</span>
        <span><span className="sw ring" /> clic</span>
        <span><span className="sw buy" /> compra</span>
        <span><span className="sw live" /> ahora</span>
      </div>
      {heat && heat.destinations.length > 0 && (
        <div className="top-clicks">
          <span className="label">Donde más hacen clic</span>
          {heat.destinations.slice(0, 3).map((d, i) => (
            <div key={i} className="top-click">
              <span className="path">{d.k === 'buy' ? '✓ ' : ''}{d.d}</span>
              <span className="num">{fmtInt(d.count)} · {Math.round(d.avgY / 10)}% alto</span>
            </div>
          ))}
        </div>
      )}
      {issues[0] && (
        <div className={`fix ${issues[0].level}`}>
          <span className="label">Mejora para convertir más</span>
          <strong>{issues[0].title}</strong>
          <p>{issues[0].detail}</p>
        </div>
      )}
      {overlayUrl && (
        <a className="btn small" href={overlayUrl} target="_blank" rel="noreferrer">Ver sobre la página ↗</a>
      )}
    </div>
  );
}

function ViewMis({ range, landings, onAnalyze }) {
  const [track, setTrack] = useState(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/landings?range=${range}`, { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const json = await res.json();
      if (res.ok) setTrack(json);
      else setMsg(json.error || 'Error al cargar');
    } catch (e) {
      setMsg(e.message);
    }
  }, [range]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  const add = async (u, n) => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/landings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u, name: n }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar');
      setUrl('');
      setName('');
      setMsg(`✓ Guardada: ${json.path}`);
      await load();
    } catch (e) {
      setMsg(`⚠ ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`¿Dejar de seguir ${t.name || t.path}? Las visitas ya guardadas no se borran.`)) return;
    await fetch(`/api/landings?id=${t.id}`, { method: 'DELETE' });
    load();
  };

  const statsFor = (path) =>
    landings
      .filter((l) => l.path === path || (path.startsWith('/products/') && l.path.endsWith(path)))
      .sort((a, b) => b.views - a.views)[0];

  return (
    <>
      <section className="card">
        <h2>Mis landings</h2>
        <p className="sub">
          Las páginas que sigues. Cada una se compara con {RANGE_PREV[range]} y muestra sus visitas día por día. Se actualiza sola.
        </p>
        <form
          className="add-form"
          onSubmit={(e) => {
            e.preventDefault();
            add(url, name);
          }}
        >
          <input
            aria-label="Dirección de la landing"
            placeholder="https://airmaggnature.myshopify.com/products/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <input aria-label="Nombre (opcional)" placeholder="Nombre (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : '+ Guardar landing'}</button>
        </form>
        {msg && <p className="meta">{msg}</p>}
      </section>

      {!track ? (
        <p className="empty">Cargando…</p>
      ) : (
        <>
          {track.landings.length === 0 && <p className="empty">Aún no sigues ninguna landing. Pega su dirección arriba.</p>}
          <div className="track-list">
            {track.landings.map((t) => {
              const c = t.current;
              const p = t.previous;
              const st = statsFor(t.path);
              return (
                <section key={t.id} className="card track">
                  <div className="track-head">
                    <div>
                      <div className="track-name">{t.name || t.path}</div>
                      <a className="host" href={t.url} target="_blank" rel="noreferrer">{t.url} ↗</a>
                      <div className="host">
                        Siguiendo desde {new Date(t.created_at).toLocaleDateString('es-PE')} ·{' '}
                        {t.lastVisit ? `última visita ${new Date(t.lastVisit).toLocaleString('es-PE')}` : 'sin visitas todavía'}
                      </div>
                    </div>
                    <div className="track-actions">
                      <button className="btn" disabled={!st} onClick={() => st && onAnalyze(st.key)} title={st ? '' : 'Aún no tiene visitas en este rango'}>
                        Analizar
                      </button>
                      <button className="btn ghost small" onClick={() => remove(t)}>Quitar</button>
                    </div>
                  </div>
                  <div className="track-body">
                    <div>
                      <div className="track-metrics">
                        <div>
                          <span className="label">Visitas</span>
                          <strong>{fmtInt(c.views)}</strong>
                          <Delta cur={c.views} prev={p.views} />
                        </div>
                        <div>
                          <span className="label">Dwell mediano</span>
                          <strong>{fmtTime(c.medianDwellMs)}</strong>
                          <Delta cur={c.medianDwellMs} prev={p.medianDwellMs} />
                        </div>
                        <div>
                          <span className="label">Rebote</span>
                          <strong>{fmtPct(c.bounceRate)}</strong>
                          <Delta cur={c.bounceRate} prev={p.bounceRate} lowerIsBetter unit="pp" />
                        </div>
                        <div>
                          <span className="label">Llegan a ver</span>
                          <strong>{fmtPct(c.avgSeen)}</strong>
                          <Delta cur={c.avgSeen} prev={p.avgSeen} unit="pp" />
                        </div>
                        <div>
                          <span className="label">Agregan al carrito</span>
                          <strong>{fmtPct(c.cartRate)}</strong>
                          <Delta cur={c.cartRate} prev={p.cartRate} unit="pp" />
                        </div>
                        <div>
                          <span className="label">Cuello de botella</span>
                          <strong className="small-strong">
                            {st?.bottleneck ? `⚠ ${st.bottleneck.label || st.bottleneck.id}` : '—'}
                          </strong>
                        </div>
                      </div>
                      <div className="track-days">
                        <span className="label">Visitas por día (14 días)</span>
                        <MiniDays daily={t.daily} />
                        <div className="mini-axis">
                          <span>{t.daily[0]?.day.slice(5)}</span>
                          <span>hoy</span>
                        </div>
                      </div>
                    </div>
                    <LandingLive t={t} range={range} st={st} />
                  </div>
                </section>
              );
            })}
          </div>
          {track.suggested.length > 0 && (
            <section className="card">
              <h2>Páginas con visitas que no sigues</h2>
              <p className="sub">Si es una landing nueva, pulsa “Seguir” para agregarla.</p>
              <table>
                <tbody>
                  {track.suggested.map((s) => (
                    <tr key={s.host + s.path}>
                      <td>
                        <div className="path">{s.path}</div>
                        <div className="host">{s.host}</div>
                      </td>
                      <td className="num">{fmtInt(s.views)} visitas</td>
                      <td className="num">
                        <button className="btn ghost small" onClick={() => add(`https://${s.host}${s.path}`, '')}>+ Seguir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </>
  );
}

/* ---------------------------- App ---------------------------- */

export default function Dashboard() {
  const [view, setView] = useState('mis');
  const [range, setRange] = useState('24h');
  const [pageKey, setPageKey] = useState('');
  const [device, setDevice] = useState('');
  const [data, setData] = useState(null);
  const [heat, setHeat] = useState(null);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setView(readPref('dwell_view', 'mis'));
    setRange(readPref('dwell_range', '24h'));
    setPageKey(readPref('dwell_page', ''));
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?range=${range}`, { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar');
      setData(json);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [range]);

  const landings = data?.landings ?? [];
  const page = landings.find((l) => l.key === pageKey) || null;
  const needsHeat = view === 'calor' || view === 'clics' || view === 'arreglar';

  const loadHeat = useCallback(async () => {
    const q = new URLSearchParams({ range, device });
    if (page) {
      q.set('host', page.host);
      q.set('path', page.path);
    }
    try {
      const res = await fetch(`/api/heatmap?${q}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setHeat(json);
    } catch {}
  }, [range, device, page?.host, page?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    if (paused) return;
    const id = setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load, paused]);

  useEffect(() => {
    if (!needsHeat) return;
    setHeat(null);
    loadHeat();
    if (paused) return;
    const id = setInterval(() => document.visibilityState === 'visible' && loadHeat(), HEAT_REFRESH_MS);
    return () => clearInterval(id);
  }, [needsHeat, loadHeat, paused]);

  const go = (v) => {
    setView(v);
    writePref('dwell_view', v);
  };
  const pick = (key) => {
    setPageKey(key);
    writePref('dwell_page', key);
    go('arreglar');
  };

  const t = data?.totals;
  const title = page ? `en ${page.path}` : '';

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <strong>Dwell</strong>
          <span>airmaggnature</span>
        </div>
        <nav>
          {VIEWS.map((v, i) =>
            v.group ? (
              <div key={i} className="nav-group">{v.group}</div>
            ) : (
              <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => go(v.id)}>
                <span aria-hidden className="nav-icon">{v.icon}</span> {v.label}
              </button>
            ),
          )}
        </nav>
        <div className="side-foot">
          <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? '▶ Reanudar' : '❚❚ Pausar'}</button>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div className="meta">
            <span className={`live-dot ${paused ? 'off' : ''}`} aria-hidden />
            {paused ? 'PAUSADO' : 'EN VIVO'} · {t ? `${fmtInt(t.live)} visitantes ahora` : 'cargando…'}
            {data ? ` · actualizado ${new Date(data.updatedAt).toLocaleTimeString('es-PE')}` : ''}
          </div>
          <div className="filters">
            <select
              aria-label="Página"
              value={page ? pageKey : ''}
              onChange={(e) => {
                setPageKey(e.target.value);
                writePref('dwell_page', e.target.value);
              }}
            >
              <option value="">Todas las páginas</option>
              {landings.map((l) => (
                <option key={l.key} value={l.key}>{l.path} ({l.views})</option>
              ))}
            </select>
            <select
              aria-label="Rango de tiempo"
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                writePref('dwell_range', e.target.value);
              }}
            >
              {RANGES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </header>

        {error && <p className="error">⚠ {error}</p>}
        {view === 'mis' && data && <ViewMis range={range} landings={landings} onAnalyze={pick} />}
        {data && landings.length === 0 && view !== 'mis' && <Setup origin={origin} />}

        {data && landings.length > 0 && (
          <>
            {view === 'vivo' && <ViewVivo data={data} onPick={pick} />}
            {view === 'visitantes' && <ViewVisitantes data={data} page={page} />}
            {view === 'caen' && <ViewCaen depth={page ? page.depth : data.depth} title={title} />}
            {view === 'calor' && <ViewCalor heat={heat} page={page} device={device} setDevice={setDevice} />}
            {view === 'clics' && <ViewClics heat={heat} page={page} device={device} setDevice={setDevice} />}
            {view === 'secciones' && <ViewSecciones page={page || landings[0]} />}
            {view === 'arreglar' && <ViewArreglar data={data} page={page} heat={heat} onPick={pick} />}
          </>
        )}
        {data?.truncated && <p className="meta">Mostrando las 50 000 visitas más recientes del rango.</p>}
      </main>
    </div>
  );
}
