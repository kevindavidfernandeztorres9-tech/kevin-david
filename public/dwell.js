/*
 * Dwell tracker. Pegalo en Shopify (theme.liquid, antes de </head>):
 *   <script src="https://TU-APP.vercel.app/dwell.js" data-store="airmaggnature" defer></script>
 *
 * Mide, por cada visita: tiempo activo en la pagina, % de scroll, tiempo que
 * cada seccion estuvo en pantalla, la seccion mas profunda alcanzada y si el
 * visitante agrego al carrito o fue al checkout.
 * Opcional: pon data-dwell="Nombre" en cualquier bloque para medirlo con ese nombre.
 */
(function () {
  var me = document.currentScript;
  if (!me || window.__dwellLoaded) return;
  window.__dwellLoaded = true;

  var STORE = me.getAttribute('data-store') || location.hostname;
  var ENDPOINT = new URL('/api/collect', me.src).href;

  // Modo "ver mapa de calor en la pagina real": no se registra la visita.
  var overlayToken = new URLSearchParams(location.search).get('dwell_overlay');
  if (overlayToken) {
    var o = document.createElement('script');
    o.src = new URL('/dwell-overlay.js', me.src).href;
    o.setAttribute('data-token', overlayToken);
    o.setAttribute('data-store', STORE);
    (document.head || document.documentElement).appendChild(o);
    return;
  }
  var HEARTBEAT_MS = 15000;
  var MAX_CLICKS = 150;
  var MAX_MOVES = 400;
  var MOVE_EVERY_MS = 400;
  var VISIBLE_RATIO = 0.4; // seccion "vista" si ocupa >= 40% de ella o de la pantalla

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
  }

  var sessionId;
  try {
    sessionId = sessionStorage.getItem('dwell_sid');
    if (!sessionId) { sessionId = uuid(); sessionStorage.setItem('dwell_sid', sessionId); }
  } catch (e) { sessionId = uuid(); }

  var startedAt = Date.now();
  var params = new URLSearchParams(location.search);
  var view = {
    view_id: uuid(),
    session_id: sessionId,
    store: STORE,
    host: location.hostname,
    path: location.pathname,
    referrer: document.referrer ? new URL(document.referrer).hostname : '',
    utm_source: params.get('utm_source') || '',
    utm_campaign: params.get('utm_campaign') || '',
    device: window.innerWidth < 768 ? 'movil' : 'escritorio',
    started_at: new Date().toISOString()
  };

  var dwellMs = 0;
  var maxScroll = 0;
  var maxSeen = 0;
  var depthMs = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // ms con el centro de la pantalla en cada 10% de altura
  var clicks = [];
  var moves = [];
  var lastMove = 0;
  var lastMoveXY = [-1, -1];
  var addToCart = false;
  var checkout = false;
  var lastTick = Date.now();
  var sections = []; // {el, id, label, index, ms, seen, visible}

  function active() { return document.visibilityState === 'visible'; }

  function tick() {
    var now = Date.now();
    var delta = Math.min(now - lastTick, 5000); // ignora saltos (pestana dormida)
    lastTick = now;
    if (!active()) return;
    dwellMs += delta;
    for (var i = 0; i < sections.length; i++) if (sections[i].visible) sections[i].ms += delta;
    var band = Math.floor(((window.scrollY || 0) + window.innerHeight / 2) / docHeight() * 10);
    depthMs[Math.min(Math.max(band, 0), 9)] += delta;
  }

  function docHeight() {
    return Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, 1);
  }

  // Posicion en milesimas: x del ancho de la ventana, y del alto total de la pagina
  function pagePoint(clientX, clientY) {
    var x = Math.round((clientX / (window.innerWidth || 1)) * 1000);
    var y = Math.round(((clientY + (window.scrollY || 0)) / docHeight()) * 1000);
    return [Math.min(Math.max(x, 0), 1000), Math.min(Math.max(y, 0), 1000)];
  }

  function sectionIndexOf(el) {
    for (var i = 0; i < sections.length; i++) if (sections[i].el.contains(el)) return i;
    return -1;
  }

  // Describe a donde lleva el clic: ruta del enlace o texto del boton
  function destinationOf(el) {
    var a = el.closest ? el.closest('a[href]') : null;
    if (a) {
      try {
        var u = new URL(a.getAttribute('href'), location.href);
        if (u.hostname === location.hostname) return (u.pathname + u.hash).slice(0, 80);
        return (u.hostname + u.pathname).slice(0, 80);
      } catch (e) { return String(a.getAttribute('href')).slice(0, 80); }
    }
    var b = el.closest ? el.closest('button,[role=button],input[type=submit],summary,label,select') : null;
    var target = b || el;
    var text = (target.getAttribute('aria-label') || target.value || target.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) return text.slice(0, 60);
    if (target.tagName === 'IMG') return 'imagen: ' + (target.getAttribute('alt') || 'sin texto').slice(0, 50);
    return '<' + target.tagName.toLowerCase() + '>';
  }

  function kindOf(el, isBuy) {
    if (isBuy) return 'buy';
    if (el.closest && el.closest('a[href]')) return 'link';
    if (el.closest && el.closest('button,[role=button],input,select,summary,label')) return 'button';
    if (el.tagName === 'IMG' || (el.closest && el.closest('img,picture,video'))) return 'media';
    return 'other';
  }

  function recordClick(e, isBuy) {
    if (clicks.length >= MAX_CLICKS) return;
    var el = e.target;
    if (!el || el.nodeType !== 1) return;
    var p = pagePoint(e.clientX, e.clientY);
    clicks.push({
      x: p[0], y: p[1],
      t: Math.round((Date.now() - startedAt) / 1000),
      s: sectionIndexOf(el),
      k: kindOf(el, isBuy),
      d: destinationOf(el)
    });
    // Enviar pronto para que el clic se vea "en vivo" en el panel
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function () { send(false); }, 1500);
  }
  var clickTimer = null;

  function recordMove(e) {
    var now = Date.now();
    if (now - lastMove < MOVE_EVERY_MS || moves.length >= MAX_MOVES) return;
    var p = pagePoint(e.clientX, e.clientY);
    if (Math.abs(p[0] - lastMoveXY[0]) < 15 && Math.abs(p[1] - lastMoveXY[1]) < 5) return;
    lastMove = now;
    lastMoveXY = p;
    moves.push(p);
  }

  function labelFor(el) {
    var own = el.getAttribute('data-dwell');
    if (own) return own;
    var h = el.querySelector('h1,h2,h3');
    var text = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    return text.slice(0, 60);
  }

  function idFor(el, i) {
    var own = el.getAttribute('data-dwell');
    if (own) return own;
    var id = el.id || '';
    // shopify-section-template--123__image_banner_AbC -> image_banner_AbC
    var m = id.match(/__(.+)$/);
    if (m) return m[1];
    return id.replace(/^shopify-section-/, '') || 'seccion-' + (i + 1);
  }

  function collectSections() {
    var nodes = document.querySelectorAll('[data-dwell], main .shopify-section, #MainContent > .shopify-section');
    var seen = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (seen.indexOf(el) !== -1) continue;
      // Evita contar un bloque dentro de otro ya medido
      var nested = false;
      for (var j = 0; j < seen.length; j++) if (seen[j].contains(el)) nested = true;
      if (nested) continue;
      seen.push(el);
    }
    // Si el tema no usa <main>, cae a todas las secciones de Shopify
    if (!seen.length) seen = Array.prototype.slice.call(document.querySelectorAll('.shopify-section'));
    sections = seen.map(function (el, i) {
      return { el: el, id: idFor(el, i), label: labelFor(el), index: i, ms: 0, seen: false, visible: false };
    });
  }

  function observe() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      tick();
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var s = null;
        for (var j = 0; j < sections.length; j++) if (sections[j].el === e.target) s = sections[j];
        if (!s) continue;
        var ofSection = e.intersectionRatio;
        var ofScreen = e.intersectionRect.height / (window.innerHeight || 1);
        s.visible = e.isIntersecting && (ofSection >= VISIBLE_RATIO || ofScreen >= VISIBLE_RATIO);
        if (s.visible) s.seen = true;
      }
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    sections.forEach(function (s) { io.observe(s.el); });
  }

  function onScroll() {
    var doc = document.documentElement;
    var height = Math.max(doc.scrollHeight - window.innerHeight, 1);
    var pct = Math.round(((window.scrollY || doc.scrollTop) / height) * 100);
    if (pct > maxScroll) maxScroll = Math.min(pct, 100);
    var seen = Math.round((((window.scrollY || doc.scrollTop) + window.innerHeight) / docHeight()) * 100);
    if (seen > maxSeen) maxSeen = Math.min(seen, 100);
  }

  function deepest() {
    var d = -1;
    for (var i = 0; i < sections.length; i++) if (sections[i].seen) d = i;
    return d;
  }

  function payload() {
    tick();
    var out = {};
    for (var k in view) out[k] = view[k];
    out.dwell_ms = dwellMs;
    out.max_scroll = maxScroll;
    out.max_seen = maxSeen;
    out.depth_ms = depthMs;
    out.clicks = clicks;
    out.moves = moves;
    out.deepest_section = deepest();
    out.add_to_cart = addToCart;
    out.checkout = checkout;
    out.sections = sections.map(function (s) {
      return { id: s.id, label: s.label, i: s.index, ms: s.ms, seen: s.seen };
    });
    return JSON.stringify(out);
  }

  var lastSent = '';
  function send(final) {
    var body = payload();
    if (body === lastSent) return;
    lastSent = body;
    // text/plain evita el preflight CORS; el servidor lo lee como JSON
    if (final && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
      return;
    }
    try {
      fetch(ENDPOINT, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } });
    } catch (e) { /* sin red: se reintenta en el siguiente latido */ }
  }

  function markCart() { if (!addToCart) { addToCart = true; send(false); } }
  function markCheckout() { if (!checkout) { checkout = true; send(false); } }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    var action = (f && f.getAttribute && f.getAttribute('action')) || '';
    if (action.indexOf('/cart/add') !== -1) markCart();
    if (action.indexOf('/cart') !== -1 && f.querySelector('[name="checkout"]')) markCheckout();
  }, true);

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a,button,input') : null;
    var isBuy = false;
    if (el) {
      var name = el.getAttribute('name') || '';
      var href = el.getAttribute('href') || '';
      var cart = name === 'add' || el.matches('[data-add-to-cart], .product-form__submit, add-to-cart-component button, [name="add"]');
      var pay = name === 'checkout' || href.indexOf('/checkout') !== -1 || el.matches('.shopify-payment-button__button, [data-shopify="payment-button"] *');
      isBuy = cart || pay;
    }
    recordClick(e, isBuy); // antes de markCart para que viaje en el mismo envio
    if (isBuy && cart) markCart();
    if (isBuy && pay) markCheckout();
  }, true);

  document.addEventListener('mousemove', recordMove, { passive: true });

  // Carritos por AJAX (fetch a /cart/add.js)
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function (input) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.indexOf('/cart/add') !== -1) markCart();
      } catch (e) {}
      return origFetch.apply(this, arguments);
    };
  }

  function start() {
    collectSections();
    observe();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') send(true); // payload() cierra el conteo
      else lastTick = Date.now(); // no contar el tiempo que estuvo oculta
    });
    window.addEventListener('pagehide', function () { send(true); });
    setInterval(tick, 1000);
    setInterval(function () { if (active()) send(false); }, HEARTBEAT_MS);
    setTimeout(function () { send(false); }, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
