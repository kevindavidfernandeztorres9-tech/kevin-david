/*
 * Mapa de calor sobre la tienda real. Lo carga dwell.js cuando la URL trae
 * ?dwell_overlay=<token> (el boton "Ver sobre mi tienda" del panel).
 * Muestra el paso del cursor, los clics y hasta donde llega la gente.
 */
(function () {
  var me = document.currentScript;
  var BASE = new URL('/', me.src).href.replace(/\/$/, '');
  var TOKEN = me.getAttribute('data-token');
  var STORE = me.getAttribute('data-store') || '';
  var DEVICE = window.innerWidth < 768 ? 'movil' : 'escritorio';
  var RANGE = '7d';
  var data = null;
  var show = { moves: true, clicks: true, depth: true };

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646';
  var ctx = canvas.getContext('2d');

  var bar = document.createElement('div');
  bar.style.cssText = [
    'position:fixed;top:12px;right:12px;z-index:2147483647;font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif',
    'background:#1a1a19;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 12px',
    'box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:320px'
  ].join(';');

  function docHeight() {
    return Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, 1);
  }

  function renderBar(msg) {
    var d = data;
    bar.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center">' +
      '<strong>Dwell · mapa de calor</strong>' +
      '<button data-a="close" style="all:unset;cursor:pointer;padding:0 4px;font-size:16px" aria-label="Cerrar">✕</button></div>' +
      '<div style="color:#c3c2b7;margin:4px 0 8px">' +
      (msg || (d ? d.views + ' visitas en ' + (DEVICE === 'movil' ? 'celular' : 'computadora') + ' · ' + d.totalClicks + ' clics · últimos 7 días' : 'Cargando…')) +
      '</div>' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-t="moves"' + (show.moves ? ' checked' : '') + '>' +
      '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#eb6834"></span> Paso del cursor</label>' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-t="clicks"' + (show.clicks ? ' checked' : '') + '>' +
      '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;border:2px solid #fff"></span> Clics ' +
      '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#0ca30c;margin-left:6px"></span> de compra</label>' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-t="depth"' + (show.depth ? ' checked' : '') + '>' +
      '<span style="display:inline-block;width:12px;border-top:2px dashed #fab219"></span> Hasta dónde llegan</label>';
  }

  bar.addEventListener('click', function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute('data-a') === 'close') {
      var u = new URL(location.href);
      u.searchParams.delete('dwell_overlay');
      location.href = u.href;
      return;
    }
    var k = t.getAttribute && t.getAttribute('data-t');
    if (k) {
      show[k] = t.checked;
      draw();
    }
  });

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!data) return;
    var H = docHeight();
    var sy = window.scrollY || 0;
    var toY = function (y) { return (y / 1000) * H - sy; };
    var toX = function (x) { return (x / 1000) * w; };

    if (show.moves) {
      for (var i = 0; i < data.moves.length; i++) {
        var m = data.moves[i];
        var y = toY(m[1]);
        if (y < -40 || y > h + 40) continue;
        var x = toX(m[0]);
        var g = ctx.createRadialGradient(x, y, 0, x, y, 28);
        g.addColorStop(0, 'rgba(235,104,52,0.35)');
        g.addColorStop(1, 'rgba(235,104,52,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 28, y - 28, 56, 56);
      }
    }

    if (show.clicks) {
      for (var j = 0; j < data.clicks.length; j++) {
        var c = data.clicks[j];
        var cy = toY(c[1]);
        if (cy < -10 || cy > h + 10) continue;
        var cx = toX(c[0]);
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        if (c[2]) {
          ctx.fillStyle = '#0ca30c';
          ctx.fill();
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
    }

    if (show.depth && data.depth) {
      ctx.font = '600 12px system-ui,-apple-system,"Segoe UI",sans-serif';
      ctx.textAlign = 'right';
      data.depth.bands.forEach(function (b) {
        if (b.from === 0) return;
        var ly = (b.from / 100) * H - sy;
        if (ly < 0 || ly > h) return;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = b.biggestDrop ? '#d03b3b' : '#fab219';
        ctx.lineWidth = b.biggestDrop ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(w, ly);
        ctx.stroke();
        ctx.setLineDash([]);
        var label = b.from + '% de la página · llega el ' + Math.round(b.reachPct) + '% · ' + Math.round(b.avgMs / 1000) + ' s' +
          (b.biggestDrop ? ' · mayor caída' : '');
        var tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(26,26,25,.9)';
        ctx.fillRect(w - tw - 22, ly + 4, tw + 12, 20);
        ctx.fillStyle = b.biggestDrop ? '#ff8a8a' : '#fff';
        ctx.fillText(label, w - 16, ly + 18);
      });
    }
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; draw(); });
  }

  function load() {
    var q = new URLSearchParams({
      token: TOKEN, store: STORE, host: location.hostname, path: location.pathname, device: DEVICE, range: RANGE
    });
    fetch(BASE + '/api/heatmap?' + q.toString())
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) {
          renderBar(res.j.error === 'no autorizado' ? 'El enlace venció. Ábrelo de nuevo desde el panel.' : 'Error: ' + res.j.error);
          return;
        }
        data = res.j;
        renderBar(data.views ? '' : 'Aún no hay visitas de ' + (DEVICE === 'movil' ? 'celular' : 'computadora') + ' en esta página.');
        draw();
      })
      .catch(function () { renderBar('No se pudo cargar el mapa de calor.'); });
  }

  function start() {
    document.body.appendChild(canvas);
    document.body.appendChild(bar);
    renderBar();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
