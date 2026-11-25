/* Ready for Doom v5: view B, the TVA monitor (#tva).
   An original dark amber screen. The trunk runs straight across the middle, branches curve above and below and
   rejoin where branches.json says. Geometry comes from tva-layout.js; this file draws it, pans it, zooms it.
   Cards are real buttons. Branch names are drawn at a fixed 14px so they stay readable when the picture is fitted. */
(function () {
'use strict';
var RTD = window.RTD, S = RTD.S, U = RTD.util, esc = U.esc, TL = RTD.tva, Nv = RTD.nav;
var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
var B = RTD.tv = {};
var stage = null, world = null, labsEl = null, L = null, sig = '', tf = null, mode = 'fit', focusId = null, cards = {}, labs = [], lines = {}, cx = null, anim = 0, ro = null, built = false;
var dest = null, ptr = {}, drag = null, suppress = false, lastPinch = 0;

/* ---------- sizes ---------- */
function isDesk() { return window.innerWidth >= 900; }
function cssPx(name, d) { var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return isNaN(v) ? d : v; }
/* the drawing area with nothing covering it. On desktop the side panel is always allowed for, so opening the reader never changes the fit. */
function nominal() {
  var W = window.innerWidth - (window.innerHeight <= 500 && window.innerWidth > window.innerHeight && window.innerWidth < 900 ? 64 : 0), H = window.innerHeight, desk = isDesk(), head = $('#v-tva .tv-head');
  var sheetW = Math.min(440, 0.4 * W);
  return { vw: Math.round(desk ? W - sheetW : W), vh: Math.round(H - cssPx('--top-h', desk ? 64 : 56) - cssPx('--dock-h', desk ? 0 : 62) - cssPx('--bar-h', desk ? 68 : 114) - (head ? head.offsetHeight : 100)) };
}
function size() { return { w: stage ? stage.clientWidth : 0, h: stage ? stage.clientHeight : 0 }; }
function measure(t, px, bold) {
  if (!cx) { try { cx = document.createElement('canvas').getContext('2d'); } catch (e) { cx = false; } }
  if (!cx) return TL.estimate(t, px, bold);
  cx.font = (bold ? 700 : 500) + ' ' + px + 'px "Familjen Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  return cx.measureText(t).width * 1.05 + 1;
}
function labW(t) { return TL.labelWidth(t, measure); }

/* ---------- build ---------- */
function showError() {
  var box = $('#tv'); if (!box) return; $('#v-tva').classList.add('failed'); box.innerHTML = RTD.errorHTML(); Nv.renderErrorBar();
}
function branchChips() {
  return S.g.branches.map(function (o) { return '<button type="button" class="tv-chip" data-act="tvbranch" data-b="' + esc(o.id) + '" aria-pressed="false" style="--c:' + o.color + '">' + esc(o.title) + '</button>'; }).join('');
}
B.build = function () {
  stage = $('#tv'); if (!stage) return;
  if (!S.g) { showError(); return; }
  $('#v-tva').classList.remove('failed');
  var nm = nominal(); if (nm.vw < 200 || nm.vh < 120) return;
  var key = [nm.vw, nm.vh, S.g.order.length].join('x');
  if (built && key === sig) { B.paint(); return; }
  var keepFocus = focusId, keepTf = tf, had = built;
  sig = key; L = TL.layout(S.g, { vw: nm.vw, vh: nm.vh, measure: measure, meta: Nv.metaText });
  var g = S.g, i, h = '';
  /* lines */
  var svg = '<svg class="tv-lines" width="' + L.W.toFixed(0) + '" height="' + L.H.toFixed(0) + '" viewBox="0 0 ' + L.W.toFixed(0) + ' ' + L.H.toFixed(0) + '" aria-hidden="true" focusable="false"><path class="tv-trunk-g" d="' + L.trunkLine.d + '"/><path class="tv-trunk" d="' + L.trunkLine.d + '" data-act="whole"/>';
  L.lines.forEach(function (ln) { svg += '<g class="tv-br' + (ln.separate ? ' sep' : '') + '" data-b="' + esc(ln.id) + '" style="--c:' + ln.color + '"><path class="tv-lg" d="' + ln.d + '"/><path class="tv-hit" d="' + ln.d + '" data-act="tvbranch" data-b="' + esc(ln.id) + '"/><path class="tv-ln" d="' + ln.d + '"/></g>'; });
  var fz = size(), ff = 15 / Math.max(0.05, Math.min(fz.w / L.W, fz.h / L.H));
  svg += '<text class="tv-dd" x="' + (L.W - 10).toFixed(0) + '" y="' + (L.trunkY - 90).toFixed(0) + '" text-anchor="end" font-size="' + ff.toFixed(0) + '">Doomsday</text></svg>';
  /* cards in reading order, so Tab walks the story in the same order Next does */
  var cs = g.order.map(function (id) { return L.byCard[id]; }).map(function (c) {
    var b = g.byId[c.id];
    return Nv.cardHTML(b, { cls: 'tv-card' + (c.kind === 'end' ? ' tv-end' : '') + (c.kind === 'trunk' ? ' tv-trunkcard' : ''), color: Nv.cardColor(b), style: 'left:' + c.x.toFixed(1) + 'px;top:' + c.y.toFixed(1) + 'px;width:' + c.w + 'px;height:' + c.h + 'px' });
  }).join('');
  stage.innerHTML = '<div class="tv-glow" aria-hidden="true"></div><div class="tv-world" style="width:' + L.W.toFixed(0) + 'px;height:' + L.H.toFixed(0) + 'px">' + svg + cs + '</div><div class="tv-labs"></div><div class="tv-scan" aria-hidden="true"></div>';
  world = $('.tv-world', stage); labsEl = $('.tv-labs', stage);
  labsEl.innerHTML = L.labels.map(function (l) {
    return '<button type="button" class="tv-lab' + (l.trunk ? ' trunk' : '') + '" data-act="' + (l.trunk ? 'whole' : 'tvbranch') + '"' + (l.trunk ? '' : ' data-b="' + esc(l.id) + '"') + ' style="--c:' + l.color + '">' + esc(l.text) + '</button>';
  }).join('');
  cards = {}; $$('.card[data-id]', stage).forEach(function (c) { cards[c.dataset.id] = c; });
  labs = $$('.tv-lab', stage).map(function (e, k) { return { el: e, l: L.labels[k], w: labW(L.labels[k].text) }; });
  lines = {}; $$('.tv-br', stage).forEach(function (e) { lines[e.dataset.b] = e; });
  var chips = $('#tv-chips'); if (chips) chips.innerHTML = branchChips();
  focusId = keepFocus && g.branchById[keepFocus] ? keepFocus : null;
  if (had && keepTf && mode !== 'fit') { tf = TL.clamp(L, keepTf, size().w, size().h); }
  else { mode = 'fit'; tf = fitTf(); }
  built = true; apply(); B.paint();
};
function fitTf() { var z = size(), s = L.fit.s; return TL.clamp(L, { s: s, tx: (z.w - L.W * s) / 2, ty: (z.h - L.H * s) / 2 }, z.w, z.h); }

/* ---------- transform ---------- */
function apply() {
  if (!world || !tf) return;
  var z = size();
  world.style.transform = 'translate(' + tf.tx.toFixed(2) + 'px,' + tf.ty.toFixed(2) + 'px) scale(' + tf.s.toFixed(4) + ')';
  stage.style.setProperty('--k', tf.s.toFixed(4));
  stage.classList.toggle('far', tf.s < TL.C.READ_S - 0.001);
  labs.forEach(function (o) {
    var r = TL.labelRect(L, o.l, tf, z.w, o.w), out = r.x + r.w < 0 || r.x > z.w || r.y + r.h < 0 || r.y > z.h;
    o.el.style.transform = 'translate(' + r.x.toFixed(1) + 'px,' + r.y.toFixed(1) + 'px)'; o.el.style.width = o.w + 'px'; o.el.style.visibility = out ? 'hidden' : 'visible'; o.el.tabIndex = out ? -1 : 0;
  });
}
function go(next, instant) {
  var z = size(); next = TL.clamp(L, next, z.w, z.h); dest = next;
  cancelAnimationFrame(anim);
  if (instant || RM.matches || !tf) { tf = next; apply(); return; }
  var from = { s: tf.s, tx: tf.tx, ty: tf.ty }, t0 = performance.now(), dur = 340;
  (function step(t) {
    var p = Math.min(1, (t - t0) / dur), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    /* zoom about the middle so the move reads as one smooth camera */
    var s = from.s * Math.pow(next.s / from.s, e);
    tf = { s: s, tx: from.tx + (next.tx - from.tx) * e, ty: from.ty + (next.ty - from.ty) * e }; apply();
    if (p < 1) anim = requestAnimationFrame(step); else { tf = next; apply(); }
  })(performance.now());
}
function zoomAt(f, px, py, instant) {
  var z = size(); if (px == null) { px = z.w / 2; py = z.h / 2; }
  var s = Math.max(L.fit.s, Math.min(TL.C.MAX_S, tf.s * f)), k = s / tf.s;
  mode = 'free'; go({ s: s, tx: px - (px - tf.tx) * k, ty: py - (py - tf.ty) * k }, instant);
}

/* ---------- paint ---------- */
B.paint = function () {
  if (!stage || !built) return;
  Nv.paintCards(stage);
  var g = S.g, f = focusId && g.branchById[focusId], keep = {};
  if (f) { keep[f.leaves] = 1; keep[f.rejoins] = 1; }
  stage.classList.toggle('has-focus', !!f);
  Object.keys(cards).forEach(function (id) { var b = g.byId[id], mine = f && (g.branchOf[id] === f.id || keep[id]); cards[id].classList.toggle('off', !!(f && !mine)); });
  Object.keys(lines).forEach(function (id) { lines[id].classList.toggle('off', !!(f && id !== f.id)); lines[id].classList.toggle('on', !!(f && id === f.id)); });
  labs.forEach(function (o) { o.el.classList.toggle('off', !!(f && o.l.id !== f.id)); o.el.classList.toggle('on', !!(f && o.l.id === f.id)); });
  $$('#tv-chips .tv-chip').forEach(function (c) { c.setAttribute('aria-pressed', String(!!f && c.dataset.b === f.id)); });
  var dt = $('#v-tva .tv-doom'); if (dt) dt.hidden = !S.doomTrail;
};

/* ---------- public ---------- */
B.cardEl = function (id) { return cards[id] || null; };
B.top = function () { B.whole(true); };
B.whole = function (instant) {
  if (!built) return;
  if (!isDesk() && S.reader) RTD.sheet.hideReader();
  focusId = null; mode = 'fit'; go(fitTf(), instant); B.paint(); RTD.announce('Whole timeline');
};
B.zoomBranch = function (id) {
  var o = S.g && S.g.branchById[id]; if (!built || !o) return;
  focusId = id; mode = 'focus'; var z = size(); go(TL.focusBranch(L, id, z.w, z.h)); B.paint();
  RTD.announce(o.title + ', ' + o.beats.length + (o.beats.length === 1 ? ' event' : ' events') + '. Other branches are dimmed.');
};
B.zoom = function (dir) { if (built) zoomAt(dir > 0 ? 1.4 : 1 / 1.4); };
/* open the monitor at the event being read: zoomed so its text is readable, its branch lit */
B.arrive = function (id) {
  if (!built) B.build(); if (!built) return;
  if (id && L.byCard[id]) { focusId = S.g.branchOf[id] || null; mode = 'focus'; var z = size(); go(TL.focusCard(L, id, z.w, z.h, 1), true); B.paint(); }
  else B.whole(true);
};
B.reveal = function (id, o) {
  o = o || {}; if (!built || !L.byCard[id]) return;
  /* judge against where the camera is heading, not where an unfinished move happens to be right now */
  var z = size(), c = L.byCard[id], t = dest || tf, r = { x: c.x * t.s + t.tx, y: c.y * t.s + t.ty, w: c.w * t.s, h: c.h * t.s }, m = 16;
  focusId = S.g.branchOf[id] || null;
  var inside = r.x >= m && r.y >= m && r.x + r.w <= z.w - m && r.y + r.h <= z.h - m;
  if (!inside || t.s < TL.C.READ_S - 0.001) { mode = 'focus'; go(TL.focusCard(L, id, z.w, z.h, Math.max(1, tf.s)), !!o.quiet); }
  B.paint();
};

/* ---------- gestures ---------- */
function pt(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function onDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  cancelAnimationFrame(anim);
  var p = pt(e); ptr[e.pointerId] = { x: p.x, y: p.y, sx: p.x, sy: p.y };
  var ids = Object.keys(ptr);
  if (ids.length === 2) { var a = ptr[ids[0]], b = ptr[ids[1]]; lastPinch = Math.hypot(a.x - b.x, a.y - b.y); drag = { pinch: true }; try { stage.setPointerCapture(e.pointerId); } catch (x) {} }
}
function onMove(e) {
  var q = ptr[e.pointerId]; if (!q) return;
  var p = pt(e), ids = Object.keys(ptr);
  if (ids.length >= 2 && drag && drag.pinch) {
    q.x = p.x; q.y = p.y; var a = ptr[ids[0]], b = ptr[ids[1]];
    var d = Math.hypot(a.x - b.x, a.y - b.y); if (lastPinch > 0 && d > 0) zoomAt(d / lastPinch, (a.x + b.x) / 2, (a.y + b.y) / 2, true); lastPinch = d; suppress = true; return;
  }
  var dx = p.x - q.x, dy = p.y - q.y;
  if (!drag) { if (Math.hypot(p.x - q.sx, p.y - q.sy) < 7) return; drag = { pan: true }; try { stage.setPointerCapture(e.pointerId); } catch (x) {} stage.classList.add('dragging'); }
  if (drag.pan) { mode = 'free'; dest = null; q.x = p.x; q.y = p.y; var z = size(); tf = TL.clamp(L, { s: tf.s, tx: tf.tx + dx, ty: tf.ty + dy }, z.w, z.h); apply(); suppress = true; }
}
function onUp(e) {
  delete ptr[e.pointerId];
  if (Object.keys(ptr).length < 2 && drag && drag.pinch) { drag = null; Object.keys(ptr).forEach(function (k) { ptr[k].sx = ptr[k].x; ptr[k].sy = ptr[k].y; }); }
  if (!Object.keys(ptr).length) { drag = null; stage.classList.remove('dragging'); setTimeout(function () { suppress = false; }, 0); }
}
function onWheel(e) {
  if (!built) return; e.preventDefault(); var p = pt(e);
  if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), p.x, p.y, true);
  else { var z = size(); mode = 'free'; tf = TL.clamp(L, { s: tf.s, tx: tf.tx - e.deltaX, ty: tf.ty - e.deltaY }, z.w, z.h); apply(); }
}
function onKey(e) {
  if (e.target !== stage || e.altKey || e.ctrlKey || e.metaKey) return;
  var k = e.key, z = size(), d = 90, m = true;
  if (k === '+' || k === '=') zoomAt(1.4); else if (k === '-' || k === '_') zoomAt(1 / 1.4); else if (k === '0' || k === 'Home') B.whole();
  else if (k === 'ArrowLeft') tf = TL.clamp(L, { s: tf.s, tx: tf.tx + d, ty: tf.ty }, z.w, z.h);
  else if (k === 'ArrowRight') tf = TL.clamp(L, { s: tf.s, tx: tf.tx - d, ty: tf.ty }, z.w, z.h);
  else if (k === 'ArrowUp') tf = TL.clamp(L, { s: tf.s, tx: tf.tx, ty: tf.ty + d }, z.w, z.h);
  else if (k === 'ArrowDown') tf = TL.clamp(L, { s: tf.s, tx: tf.tx, ty: tf.ty - d }, z.w, z.h);
  else m = false;
  if (m) { e.preventDefault(); mode = 'free'; apply(); }
}
/* a card or label that takes keyboard focus must be on screen */
function onFocusIn(e) {
  var c = e.target.closest && e.target.closest('.card[data-id]'); if (!c || !built) return;
  var r = c.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  if (r.left < sr.left || r.right > sr.right || r.top < sr.top || r.bottom > sr.bottom) { var z = size(), cc = L.byCard[c.dataset.id]; mode = 'focus'; go(TL.focusCard(L, cc.id, z.w, z.h, Math.max(1, tf.s)), RM.matches); }
}
B.init = function () {
  stage = $('#tv'); if (!stage) return;
  stage.addEventListener('pointerdown', onDown); stage.addEventListener('pointermove', onMove); stage.addEventListener('pointerup', onUp); stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('wheel', onWheel, { passive: false }); stage.addEventListener('keydown', onKey); stage.addEventListener('focusin', onFocusIn);
  stage.addEventListener('click', function (e) { if (suppress) { e.stopPropagation(); e.preventDefault(); suppress = false; } }, true);
  window.addEventListener('resize', function () { clearTimeout(B._rs); B._rs = setTimeout(function () { if (S.view === 'tva') { B.build(); } else sig = ''; }, 150); });
  if (window.ResizeObserver) { ro = new ResizeObserver(function () { if (!built || S.view !== 'tva') return; var z = size(); if (z.w < 10) return; if (mode === 'fit') tf = fitTf(); else tf = TL.clamp(L, tf, z.w, z.h); apply(); }); ro.observe(stage); }
};
B.rebuildFonts = function () { sig = ''; built = built && false; if (S.view === 'tva') B.build(); };
B.layout = function () { return L; };
B.transform = function () { return tf; };
B.focused = function () { return focusId; };
Nv.views.tva = B;
})();
