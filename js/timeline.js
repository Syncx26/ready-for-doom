/* Ready for Doom v5: the shared walk (RTD.nav) and view A, the Sacred Timeline (#map).
   One glowing line, one paper card per event, branches folded into pills that unfold in place.
   Reading order, Next and Previous, the tick on read events and the bottom bar live here so view B uses the same ones. */
(function () {
'use strict';
var RTD = window.RTD, S = RTD.S, U = RTD.util, esc = U.esc;
var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
var nav = RTD.nav = { views: {} };
var A = RTD.tl = {};
var openId = null, el = null, cards = {};
function smooth() { return RM.matches ? 'auto' : 'smooth'; }
function active() { return nav.views[S.view] || null; }

/* ---------- reading order, Short and Full ---------- */
nav.list = function () { return S.g ? (S.mode === 'short' ? S.g.shortOrder : S.g.order) : []; };
nav.next = function () {
  var g = S.g; if (!g) return null; var list = nav.list();
  if (!S.sel) return list[0] || null;
  var at = g.ordIdx[S.sel];
  for (var i = 0; i < list.length; i++) if (g.ordIdx[list[i]] > at) return list[i];
  return null;
};
nav.prev = function () {
  var g = S.g; if (!g || !S.sel) return null; var list = nav.list(), at = g.ordIdx[S.sel], r = null;
  for (var i = 0; i < list.length; i++) if (g.ordIdx[list[i]] < at) r = list[i];
  return r;
};
nav.nextOf = function (id) { var keep = S.sel; S.sel = id; var r = nav.next(); S.sel = keep; return r; };
nav.prevOf = function (id) { var keep = S.sel; S.sel = id; var r = nav.prev(); S.sel = keep; return r; };
nav.counterFor = function (id) {
  var g = S.g; if (!g) return '';
  if (!id) return 'Not started';
  var list = nav.list(), i = list.indexOf(id);
  if (i >= 0) return 'Event ' + (i + 1) + ' of ' + list.length;
  var k = 0, at = g.ordIdx[id]; list.forEach(function (x, j) { if (g.ordIdx[x] < at) k = j + 1; });
  return 'Extra detail after event ' + k + ' of ' + list.length;
};
nav.counter = function () { return nav.counterFor(S.sel); };
nav.branchTitle = function (id) { var o = S.g.branchById[S.g.branchOf[id]]; return o ? o.title : 'Main timeline'; };
nav.markRead = function (id) { if (S.read.has(id)) return; S.read.add(id); RTD.store.set('rtd.read', Array.from(S.read)); };
nav.clearRead = function () { S.read = new Set(); RTD.store.del('rtd.read'); };
nav.setMode = function (m) { S.mode = m === 'short' ? 'short' : 'full'; RTD.store.set('rtd.mode', S.mode); nav.sync(); RTD.announce(S.mode === 'short' ? 'Short story. ' + S.g.shortOrder.length + ' key events.' : 'Full story. ' + S.g.order.length + ' events.'); };

/* ---------- card ---------- */
nav.metaText = function (b) {
  var p = []; if (b.when) p.push(b.when);
  var f = RTD.filmShort(b.source); if (f) p.push(f);
  if (b.certainty === 'read' || b.certainty === 'theory') p.push(RTD.CERT[b.certainty]);
  var et = RTD.earthText(RTD.beatEarths(b.id)); if (et) p.push(et);
  return p.join(' · ');
};
nav.label = function (b) {
  var rd = S.read.has(b.id);
  return (b.id === S.g.end ? 'Avengers: Doomsday. ' : '') + b.title + '. ' + nav.metaText(b) + '. ' + nav.branchTitle(b.id) + (b.doom ? '. Doom is in this' : '') + (rd ? '. Read' : '') + (b.key ? '' : '. Extra detail') + '.';
};
function offRoute(b) { return !RTD.inLens(S.byId[b.source] || { essential: 3, year: 2025 }); }
var TICK = '<span class="c-tick" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none"/></svg></span>';
nav.cardHTML = function (b, o) {
  o = o || {}; var cert = b.certainty === 'read' || b.certainty === 'theory' ? b.certainty : 'shown', rd = S.read.has(b.id), cur = S.sel === b.id;
  return '<button type="button" class="card ' + (o.cls || '') + ' c-' + cert + (b.doom ? ' is-doom' : '') + (rd ? ' is-read' : '') + (b.key ? '' : ' is-extra') + (cur ? ' cur' : '') + (offRoute(b) ? ' off-route' : '') + '" data-act="beat" data-id="' + esc(b.id) + '" aria-label="' + esc(nav.label(b)) + '"' + (cur ? ' aria-current="true"' : '') + ' style="--c:' + (o.color || '#ffb347') + ';' + (o.style || '') + '">' +
    '<span class="c-t">' + esc(b.title) + '</span><span class="c-m">' + (b.doom ? RTD.doomMask('c-mask') : '') + '<span class="c-d">' + esc(nav.metaText(b)) + '</span></span>' + TICK + '</button>';
};
nav.cardColor = function (b) { var o = S.g.branchById[S.g.branchOf[b.id]]; return o ? o.color : '#ffb347'; };
nav.paintCards = function (root) {
  var g = S.g;
  $$('.card[data-id]', root).forEach(function (c) {
    var id = c.dataset.id, b = g.byId[id], cur = S.sel === id, rd = S.read.has(id);
    c.classList.toggle('cur', cur); c.classList.toggle('is-read', rd); c.classList.toggle('off-route', offRoute(b)); c.classList.toggle('dim', !!(S.doomTrail && !b.doom));
    if (cur) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
    c.setAttribute('aria-label', nav.label(b));
  });
};

/* ---------- bar ---------- */
nav.renderBar = function () {
  var bar = $('#bbar'); if (!bar || !S.g) return;
  var nx = nav.next(), pv = nav.prev(), cur = S.sel ? S.g.byId[S.sel].title : 'Start with: ' + S.g.byId[S.g.startId].title;
  $('#bar-prev').disabled = !pv; $('#bar-next').disabled = !nx;
  $('#bar-count').textContent = nav.counter(); $('#bar-title').textContent = cur;
  $$('[data-act="mode"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === S.mode)); });
  bar.hidden = false;
};
nav.sync = function () { var v = active(); if (v) v.paint(); nav.renderBar(); };
nav.reveal = function (id, o) { var v = active(); if (v && id) v.reveal(id, o); };
nav.cardEl = function (id) { var v = active(); return v ? v.cardEl(id) : null; };
nav.activate = function (view) { var v = nav.views[view]; if (v) { v.build(); } nav.renderBar(); };
nav.rebuild = function () { var v = active(); if (v) { v.build(); } nav.renderBar(); };
/* Lost? opens the TVA monitor at the event being read; Back returns to that same event */
nav.goTVA = function () { RTD.go('tva', { focus: false }); var v = nav.views.tva; if (v) v.arrive(S.sel); var t = $('#tv'); if (t) t.focus({ preventScroll: true }); };
nav.goMap = function () { RTD.go('map', { focus: false }); if (S.sel) A.reveal(S.sel, { quiet: false }); var c = S.sel && cards[S.sel]; if (c) c.focus({ preventScroll: true }); else { var l = $('#tl'); if (l) l.focus({ preventScroll: true }); } };
nav.start = function () {
  var v = active(); if (!v || !S.g) return;
  if (v.top) v.top();
  var c = v.cardEl(S.g.startId); if (c) { c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); }
};

/* ---------- view A ---------- */
function branchOpenSet() {
  var g = S.g, r = {};
  if (S.openAll) g.branches.forEach(function (o) { r[o.id] = true; });
  else if (S.doomTrail) g.branches.forEach(function (o) { if (o.beats.some(function (id) { return g.byId[id].doom; })) r[o.id] = true; });
  if (openId && !S.openAll) r[openId] = true;
  return r;
}
function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
function branchHTML(o, isOpen) {
  var g = S.g, mw = o.separate && !/^meanwhile/i.test(o.because), rj = g.byId[o.rejoins];
  var cardsH = o.beats.map(function (id) { return '<li>' + nav.cardHTML(g.byId[id], { cls: 'tl-card', color: o.color }) + '</li>'; }).join('');
  return '<div class="br' + (o.separate ? ' sep' : '') + (isOpen ? ' open' : '') + '" data-b="' + esc(o.id) + '" style="--c:' + o.color + '">' +
    '<button type="button" class="br-h" data-act="branch" data-b="' + esc(o.id) + '" aria-expanded="' + isOpen + '" aria-controls="br-' + esc(o.id) + '"><span class="br-top"><span class="br-name">' + esc(o.title) + '</span><span class="br-count">' + plural(o.beats.length, 'event') + '</span><span class="br-chev" aria-hidden="true"></span></span>' +
    '<span class="br-why">' + (mw ? '<b class="br-mw">Meanwhile</b> ' : '') + esc(o.because) + '</span></button>' +
    '<div class="br-in" id="br-' + esc(o.id) + '"' + (isOpen ? '' : ' hidden') + '><ol class="br-cards">' + cardsH + '</ol>' +
    '<p class="br-end">' + esc(o.ending) + '</p><button type="button" class="btn secondary br-join" data-act="beat" data-id="' + esc(o.rejoins) + '" style="--c:' + o.color + '"><span class="small">Where it rejoins</span><b>' + esc(rj.title) + '</b></button></div></div>';
}
A.build = function () {
  el = el || $('#tl'); if (!el) return;
  if (!S.g) { showError(); return; }
  var g = S.g, sc = el.scrollTop, had = document.activeElement && document.activeElement.dataset && el.contains(document.activeElement) ? document.activeElement : null;
  var hadKey = had ? (had.dataset.id ? 'id:' + had.dataset.id : had.dataset.b ? 'b:' + had.dataset.b : had.dataset.act ? 'a:' + had.dataset.act : '') : '';
  var open = branchOpenSet(), h = '', lastCh = null;
  h += '<div class="tl-tools"><div class="seg bb-seg" role="group" aria-label="How much of the story"><button type="button" class="seg-b" data-act="mode" data-v="short" aria-pressed="' + (S.mode === 'short') + '">Short story</button><button type="button" class="seg-b" data-act="mode" data-v="full" aria-pressed="' + (S.mode !== 'short') + '">Full story</button></div><button type="button" class="btn secondary sm" data-act="openall" aria-pressed="' + !!S.openAll + '">' + (S.openAll ? 'Close all branches' : 'Open all branches') + '</button>' +
    (S.doomTrail ? '<button type="button" class="btn secondary sm" data-act="doomtrail" aria-pressed="true">Showing Doom only. Show everything</button>' : '') + '</div>';
  h += '<ol class="tl-list">';
  g.trunk.forEach(function (id, i) {
    var b = g.byId[id], ch = g.chById[b.chapter];
    if (ch.id !== lastCh) { lastCh = ch.id; h += '<li class="tl-chap"><h2 class="tl-ch"><span class="tl-chn">Chapter ' + (g.chIdx[ch.id] + 1) + '</span> ' + esc(ch.title) + '</h2></li>'; }
    if (id === g.end) {
      var rd = S.read.has(id), cur = S.sel === id;
      h += '<li class="tk tk-end"><button type="button" class="card fin' + (rd ? ' is-read' : '') + (cur ? ' cur' : '') + '" data-act="beat" data-id="' + esc(id) + '"' + (cur ? ' aria-current="true"' : '') + ' aria-label="' + esc(nav.label(b)) + '"><span class="fin-k">The finish</span><span class="fin-t">Avengers: Doomsday</span><span class="c-t fin-s">' + esc(b.title) + '</span><span class="c-m"><span class="c-d">' + esc(nav.metaText(b)) + '</span></span>' + TICK + '</button></li>';
      return;
    }
    h += '<li class="tk" data-i="' + i + '">' + nav.cardHTML(b, { cls: 'tl-card' }) + g.branches.filter(function (o) { return o.leaves === id; }).map(function (o) { return branchHTML(o, !!open[o.id]); }).join('') + '</li>';
  });
  h += '</ol><div class="donate-row">' + (RTD.extras ? RTD.extras.bigHTML() : '') + '</div>';
  el.innerHTML = h; el.scrollTop = sc;
  cards = {}; $$('.card[data-id]', el).forEach(function (c) { cards[c.dataset.id] = c; });
  nav.paintCards(el);
  if (hadKey) { var t = hadKey.slice(0, 3) === 'id:' ? cards[hadKey.slice(3)] : hadKey.slice(0, 2) === 'b:' ? $('.br-h[data-b="' + hadKey.slice(2) + '"]', el) : $('[data-act="' + hadKey.slice(2) + '"]', el); if (t) t.focus({ preventScroll: true }); }
  $('#v-map').classList.remove('failed');
};
A.paint = function () { if (!el || !S.g) return; var o = branchOpenSet(), need = false; $$('.br', el).forEach(function (b) { if (!!o[b.dataset.b] !== b.classList.contains('open')) need = true; }); if (need || !!S.doomTrail !== !!$('.tl-tools [data-act="doomtrail"]', el)) A.build(); else nav.paintCards(el); };
A.toggle = function (bid, o) {
  if (S.openAll) { S.openAll = false; openId = bid; } else openId = openId === bid ? null : bid;
  A.build(); var h = $('.br-h[data-b="' + bid + '"]', el); if (h) h.focus({ preventScroll: true });
  if (openId === bid) { var r = h && h.getBoundingClientRect(), sr = el.getBoundingClientRect(); if (r && (r.top < sr.top || r.bottom > sr.bottom - 80)) el.scrollTo({ top: Math.max(0, el.scrollTop + r.top - sr.top - 12), behavior: smooth() }); }
  RTD.announce(openId === bid ? S.g.branchById[bid].title + ' opened' : 'Branch closed');
};
A.toggleAll = function () { S.openAll = !S.openAll; if (!S.openAll) openId = null; A.build(); var t = $('[data-act="openall"]', el); if (t) t.focus({ preventScroll: true }); RTD.announce(S.openAll ? 'All branches open' : 'All branches closed'); };
A.cardEl = function (id) { return cards[id] || null; };
A.top = function () { if (el) el.scrollTo({ top: 0, behavior: 'auto' }); };
A.reveal = function (id, o) {
  o = o || {}; if (!el || !S.g || !S.g.byId[id]) return;
  var bid = S.g.branchOf[id];
  if (bid && !S.openAll && openId !== bid) { openId = bid; A.build(); }
  var c = cards[id]; if (!c) return;
  var r = c.getBoundingClientRect(), sr = el.getBoundingClientRect(), m = 12;
  if (r.top < sr.top + m || r.bottom > sr.bottom - m) {
    var d = (r.top + r.height / 2) - (sr.top + sr.height / 2);
    /* a short hop glides; a long jump lands at once so the card is never still on its way */
    el.scrollTo({ top: Math.max(0, el.scrollTop + d), behavior: (o.quiet || Math.abs(d) > sr.height * 1.5) ? 'auto' : smooth() });
  }
};
function showError() {
  var box = $('#tl'); $('#v-map').classList.add('failed');
  box.innerHTML = RTD.errorHTML();
  nav.renderErrorBar();
}
nav.renderErrorBar = function () { var b = $('#bbar'); if (b) b.hidden = true; };
RTD.errorHTML = function () {
  return '<div class="fatal" role="alert"><h1>The timeline could not load</h1><p>Check your connection and try again.</p><button type="button" class="btn primary" data-act="retry">Try again</button></div>';
};
A.init = function (node) { el = node; };
nav.views.map = A;
})();
