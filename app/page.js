'use client';

import { useCallback, useEffect, useState } from 'react';

const REFRESH_MS = 15000;
const RANGES = [
  ['1h', 'Última hora'],
  ['24h', 'Últimas 24 h'],
  ['7d', 'Últimos 7 días'],
  ['30d', 'Últimos 30 días'],
];

function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}
const fmtPct = (v) => `${v.toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`;
const fmtInt = (v) => v.toLocaleString('es-PE');

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

function Bar({ value, max, tip }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 1 : 0) : 0;
  return (
    <div className="bar" aria-label={tip}>
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

function SectionTable({ landing }) {
  const secs = landing.sections;
  if (!secs.length) {
    return (
      <p className="empty">
        No se detectaron secciones en esta página. Agrega <code>data-dwell="Nombre"</code> a los bloques que
        quieras medir.
      </p>
    );
  }
  const maxMs = Math.max(...secs.map((s) => s.medianMs), 1);
  return (
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
              <Bar value={s.reachPct} max={100} tip={`${s.label || s.id}: la vio el ${fmtPct(s.reachPct)} de las visitas`} />
            </td>
            <td className="num">{fmtTime(s.medianMs)}</td>
            <td className="bar-cell">
              <Bar value={s.medianMs} max={maxMs} tip={`${s.label || s.id}: ${fmtTime(s.medianMs)} en pantalla (mediana)`} />
            </td>
            <td className="num">{fmtPct(s.exitPct)}</td>
            <td>
              {s.bottleneck ? (
                <span className="badge">⚠ Cuello de botella</span>
              ) : (
                <span className="host">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Setup({ origin }) {
  return (
    <div className="card setup">
      <h2>Aún no hay datos en este rango</h2>
      <p className="sub">Pega esta línea en cada tienda (Shopify → Tienda online → Temas → Editar código → theme.liquid, justo antes de &lt;/head&gt;):</p>
      <pre>{`<script src="${origin}/dwell.js" data-store="airmaggnature" defer></script>`}</pre>
      <p className="sub">Cambia <code>data-store</code> por el nombre de cada tienda. Los datos aparecen aquí unos segundos después de la primera visita.</p>
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState('24h');
  const [store, setStore] = useState('');
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setRange(readPref('dwell_range', '24h'));
    setStore(readPref('dwell_store', ''));
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?range=${range}&store=${encodeURIComponent(store)}`, { cache: 'no-store' });
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
  }, [range, store]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const landings = data?.landings ?? [];
  const current = landings.find((l) => l.key === selected) ?? landings[0];
  const t = data?.totals;

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Dwell en tiempo real</h1>
          <div className="meta">
            <span className="live-dot" aria-hidden />
            {t ? `${fmtInt(t.live)} visitantes ahora · ` : ''}
            {data ? `actualizado ${new Date(data.updatedAt).toLocaleTimeString('es-PE')}` : 'cargando…'}
          </div>
        </div>
        <div className="filters">
          <select
            aria-label="Tienda"
            value={store}
            onChange={(e) => {
              setStore(e.target.value);
              setSelected('');
              writePref('dwell_store', e.target.value);
            }}
          >
            <option value="">Todas las tiendas</option>
            {(data?.stores ?? []).concat(store && !data?.stores?.includes(store) ? [store] : []).map((s) => (
              <option key={s} value={s}>{s}</option>
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
          <button onClick={load}>Actualizar</button>
        </div>
      </header>

      {error && <p className="error">⚠ {error}</p>}

      {t && (
        <section className="tiles">
          <Tile label="Visitas" value={fmtInt(t.views)} hint={`${fmtInt(t.sessions)} sesiones`} />
          <Tile label="Dwell mediano" value={fmtTime(t.medianDwellMs)} hint="tiempo activo en la página" />
          <Tile label="Rebote" value={fmtPct(t.bounceRate)} hint="menos de 10 s" />
          <Tile label="Scroll promedio" value={fmtPct(t.avgScroll)} />
          <Tile label="Agregan al carrito" value={fmtPct(t.cartRate)} />
          <Tile label="Van al checkout" value={fmtPct(t.checkoutRate)} />
        </section>
      )}

      {data && landings.length === 0 && <Setup origin={origin} />}

      {landings.length > 0 && (
        <section className="card">
          <h2>Landing pages</h2>
          <p className="sub">Toca una fila para ver dónde se van los visitantes.</p>
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
                <tr
                  key={l.key}
                  className={`clickable ${current?.key === l.key ? 'selected' : ''}`}
                  onClick={() => setSelected(l.key)}
                >
                  <td>
                    <div className="path">{l.path}</div>
                    <div className="host">{l.host} · {l.store}</div>
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
      )}

      {current && (
        <section className="card">
          <h2>Secciones de {current.path}</h2>
          <p className="sub">
            {current.host} · {fmtInt(current.views)} visitas. “Se fueron aquí” = la última sección que vieron antes de
            irse; la más alta (sin contar el final de la página) es el cuello de botella.
          </p>
          <SectionTable landing={current} />
        </section>
      )}

      {data?.truncated && <p className="meta">Mostrando las 50 000 visitas más recientes del rango.</p>}
    </div>
  );
}
