/* Ready for Doom v4: the sheet (bottom sheet on phones, right panel on desktop). Beat reader, Doom board, Doomsday page, film notes, person. */
(function () {
'use strict';
var RTD = window.RTD, S = RTD.S, U = RTD.util, esc = U.esc;
var SH = RTD.sheet = {};
var el, lastFocus = null, Nv = RTD.nav;
function onTimeline() { return S.view === 'map' || S.view === 'tva'; }
var P = { open: null, back: null };   // person sheet state

/* ---------- shared bits ---------- */
/* One gate per story: a single "Show this story" button, then everything is readable. Remembered per story. */
RTD.gateOpen = function (key, nodeId) { return S.spoilers || S.revealed.has(key) || (nodeId && S.watched.has(nodeId)); };
RTD.gate = function (key, nodeId, openHtml, what, btn) {
  if (RTD.gateOpen(key, nodeId)) return openHtml;
  return '<div class="gate"><p><b>' + esc(what) + '</b> Plot details are hidden until you choose to read them.</p><button type="button" class="btn primary" data-act="reveal" data-key="' + esc(key) + '">' + esc(btn) + '</button></div>';
};
/* Original generative emblem: deterministic from the slug, team colours, bold geometric comic shapes. */
var TEAMC = { villain: '#25c26e', avengers: '#4a94ff', 'new-avengers': '#ff7a3d', 'fantastic-four': '#22d0d6', 'x-men': '#ffe14a', wakanda: '#c66bff', wildcard: '#ff5f8f' };
function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mix(hex, f) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; function m(v) { return Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)); } return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')'; }
RTD.emblem = function (slug, team) {
  var h = hash(String(slug)), s0 = h, base = TEAMC[team] || '#a878ff';
  function r() { s0 = (Math.imul(s0, 1664525) + 1013904223) >>> 0; return s0 / 4294967296; }
  var alt = TEAMC[Object.keys(TEAMC)[h % 7]], dark = mix(h % 3 ? base : alt, -0.55), lite = mix(h % 2 ? base : alt, 0.55), ink = '#080414', type = h % 6, id = 'e' + h.toString(36), g = '', i;
  var ox = 22 + r() * 20, oy = 22 + r() * 20;
  if (type === 0) { var n = 7 + Math.floor(r() * 6); for (i = 0; i < n; i++) { var a1 = i / n * 6.283, a2 = (i + 0.5) / n * 6.283; g += '<path d="M' + ox + ' ' + oy + 'L' + (ox + Math.cos(a1) * 60).toFixed(1) + ' ' + (oy + Math.sin(a1) * 60).toFixed(1) + 'L' + (ox + Math.cos(a2) * 60).toFixed(1) + ' ' + (oy + Math.sin(a2) * 60).toFixed(1) + 'Z" fill="' + (i % 2 ? dark : lite) + '"/>'; } g += '<circle cx="' + ox + '" cy="' + oy + '" r="9" fill="' + ink + '"/><circle cx="' + ox + '" cy="' + oy + '" r="5" fill="' + base + '"/>'; }
  else if (type === 1) { g += '<path d="M0 ' + (20 + r() * 24).toFixed(0) + 'L64 ' + (r() * 30).toFixed(0) + 'V64H0Z" fill="' + dark + '"/><circle cx="' + ox + '" cy="' + oy + '" r="' + (13 + r() * 6).toFixed(0) + '" fill="' + lite + '" stroke="' + ink + '" stroke-width="3"/><circle cx="' + (64 - ox) + '" cy="' + (64 - oy) + '" r="6" fill="' + ink + '"/>'; }
  else if (type === 2) { for (i = 0; i < 4; i++) g += '<path d="M-4 ' + (10 + i * 14) + 'L32 ' + (30 + i * 14) + 'L68 ' + (10 + i * 14) + '" fill="none" stroke="' + (i % 2 ? dark : lite) + '" stroke-width="8"/>'; g += '<circle cx="32" cy="' + (14 + r() * 10).toFixed(0) + '" r="6" fill="' + ink + '"/>'; }
  else if (type === 3) { for (i = 5; i > 0; i--) g += '<circle cx="' + (ox + (5 - i) * 1.5).toFixed(1) + '" cy="' + (oy + (5 - i) * 1.5).toFixed(1) + '" r="' + i * 7 + '" fill="' + (i % 2 ? lite : dark) + '" stroke="' + ink + '" stroke-width="2"/>'; }
  else if (type === 4) { var pts = 5 + Math.floor(r() * 4), d = ''; for (i = 0; i < pts * 2; i++) { var an = i / (pts * 2) * 6.283 - 1.57, rr = i % 2 ? 11 : 28; d += (i ? 'L' : 'M') + (32 + Math.cos(an) * rr).toFixed(1) + ' ' + (32 + Math.sin(an) * rr).toFixed(1); } g += '<path d="' + d + 'Z" fill="' + lite + '" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="32" r="6" fill="' + dark + '"/>'; }
  else { for (var yy = 4; yy < 64; yy += 8) for (var xx = 4 + ((yy / 8) % 2 ? 4 : 0); xx < 64; xx += 8) { var dd = Math.hypot(xx - ox, yy - oy) / 40; g += '<circle cx="' + xx + '" cy="' + yy + '" r="' + Math.max(0.6, 3.6 - dd * 3.4).toFixed(1) + '" fill="' + lite + '"/>'; } g += '<path d="M-2 ' + (40 + r() * 10).toFixed(0) + 'L66 ' + (14 + r() * 10).toFixed(0) + 'V30L-2 56Z" fill="' + dark + '" opacity="0.9"/><circle cx="' + ox + '" cy="' + oy + '" r="8" fill="' + ink + '"/>'; }
  return '<svg class="emb" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><clipPath id="' + id + '"><circle cx="32" cy="32" r="31"/></clipPath></defs><g clip-path="url(#' + id + ')"><rect width="64" height="64" fill="' + base + '"/>' + g + '</g><circle cx="32" cy="32" r="30.5" fill="none" stroke="' + ink + '" stroke-width="3"/></svg>';
};
RTD.face = function (slug, name, cls) {
  var p = S.person[slug], team = p ? p.team : 'wildcard';
  var img = RTD.manifest && RTD.manifest.has(slug) ? '<img alt="" loading="lazy" src="assets/characters/' + encodeURIComponent(slug || '') + '.png">' : '';
  return '<span class="face ' + (cls || '') + '" aria-hidden="true">' + RTD.emblem(slug, team) + img + '</span>';
};
RTD.statusChip = function (st) { var s = RTD.STATUS[st] || { label: st }; return '<span class="stat s-' + esc(st) + '">' + esc(s.label) + '</span>'; };
function chip(t, cls) { return '<span class="chip ' + (cls || '') + '">' + esc(t) + '</span>'; }
function threadChip(k) { var t = RTD.THREADS[k]; return t ? '<span class="chip thread" style="--c:' + t.c + '"><i></i>' + esc(t.label) + '</span>' : ''; }
function metaChips(n) {
  var out = [chip(String(n.year || n.release.slice(0, 4))), chip(RTD.TYPE[n.type] || n.type)];
  if (n.essential) out.push(chip(RTD.ESS[n.essential], 'ess' + n.essential));
  if (n.type !== 'context') out.push(chip(U.nodeDur(n)));
  if (!RTD.dates.isOut(n)) out.push(chip('Not out yet, due ' + RTD.dates.fmt(RTD.dates.parse(n.release), { month: 'short', day: 'numeric', year: 'numeric' }), 'future'));
  return out.join('');
}
function watchBtn(n, cls) {
  var w = S.watched.has(n.id);
  return '<button type="button" class="btn ' + (cls || 'primary') + (w ? ' on' : '') + '" data-act="watch" data-id="' + esc(n.id) + '" aria-pressed="' + w + '">' + (w ? 'Watched. Tap to undo' : 'Mark watched') + '</button>';
}
/* ---------- renderers ---------- */
/* Original Doom mask emblem: angular hood, two eye slits, a brow notch. Not taken from any artwork. */
RTD.doomMask = function (cls) {
  return '<svg class="mask ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.6 19.6 5l.9 7.5L17 20l-5 2.6L7 20l-3.5-7.5L4.4 5z" fill="#25c26e" stroke="#080414" stroke-width="1.8" stroke-linejoin="round"/><path d="M6.6 9.8l4 1.5-.5 2.3-3.7-1.2zM17.4 9.8l-4 1.5.5 2.3 3.7-1.2z" fill="#080414"/><path d="M12 12.6l1.1 4.2L12 18.4l-1.1-1.6zM9.2 19.2h5.6" fill="#080414" stroke="#080414" stroke-width="1.2" stroke-linejoin="round"/></svg>';
};
function laneInfo(id) { var l = S.story && S.story.lanes.filter(function (x) { return x.id === id; })[0]; return { title: l ? l.title : id, c: l && /^#[0-9a-f]{3,8}$/i.test(l.color || '') ? l.color : '#a7b4c6' }; }
function certChip(c) { c = c === 'read' || c === 'theory' ? c : 'shown'; return '<span class="chip cert-' + c + '">' + esc(RTD.CERT[c]) + '</span>'; }
function filmPanels(n) {
  var cards = (n.cards || []).map(function (cd, idx) { return '<section class="panel p-wide t' + (idx % 3) + '"><h4 class="cap">' + esc(cd.title) + '</h4><p>' + esc(cd.body) + '</p></section>'; }).join('');
  return RTD.gate('n:' + n.id, n.id, '<div class="comic">' + cards + '</div>', 'The full film notes are hidden.', 'Show the film notes');
}
function rel(l, id, dir) {
  var g = S.g, b = g.byId[id], word = l.certainty === 'read' || l.certainty === 'theory' ? '<em>' + esc(RTD.CERT[l.certainty]) + '</em>' : '';
  var dashed = word ? ' dashed' : '';
  if (dir === 'in') return '<li><button type="button" class="rel' + dashed + '" data-act="beat" data-id="' + esc(id) + '"><b>' + esc(b.title) + '</b><span class="rel-s">…' + esc(l.because) + ' ' + word + '</span></button></li>';
  return '<li><button type="button" class="rel' + dashed + '" data-act="beat" data-id="' + esc(id) + '"><span class="rel-s">…' + esc(l.because) + ' ' + word + '</span><b>' + esc(b.title) + '</b></button></li>';
}
function beatHTML(b) {
  var g = S.g, film = S.byId[b.source], ch = g.chById[b.chapter], c = Nv.cardColor(b), isEnd = b.id === g.end;
  var causes = g.pars[b.id].map(function (l) { return rel(l, l.from, 'in'); }).join('');
  var leads = g.kids[b.id].map(function (l) { return rel(l, l.to, 'out'); }).join('');
  var pv = Nv.prevOf(b.id), nx = Nv.nextOf(b.id);
  var nxT = nx ? g.byId[nx].title : '', pvT = pv ? g.byId[pv].title : '';
  var panels = RTD.gate('b:' + b.id, b.source, '<div class="comic"><section class="panel p-lead t0"><h3 class="cap">What happens</h3><p>' + esc(b.happens) + '</p></section><section class="panel p-wide t1"><h3 class="cap">Why it matters</h3><p>' + esc(b.why) + '</p></section></div>', 'This beat is hidden.', 'Show this beat');
  var who = (b.people || []).map(function (sl) { var r = S.person[sl]; return r ? '<button type="button" class="who" data-act="person" data-slug="' + esc(sl) + '">' + RTD.face(sl, r.character) + '<span class="who-n">' + esc(r.character) + '</span></button>' : ''; }).join('');
  var seen = film ? '<section class="whos seen-in"><h3 class="cap">Seen in</h3><p class="seen-t"><b>' + esc(film.title) + '</b></p><div class="chips">' + metaChips(film) + '</div><div class="row">' + (film.type !== 'context' ? watchBtn(film, 'secondary') : '') + '</div>' +
    '<details class="notes" data-key="n:' + esc(film.id) + '"><summary>Full film notes</summary>' + filmPanels(film) + '</details></section>' : '';
  return '<div class="sheet-in paper reader beat" style="--c:' + c + '">' +
    '<div class="r-head"><div class="r-bar"><button type="button" class="btn ghost sm" data-act="close">Close</button><button type="button" class="btn ghost sm only-m" data-act="expand" aria-pressed="' + el.classList.contains('full') + '">' + (el.classList.contains('full') ? 'Shrink' : 'Expand') + '</button></div>' +
    '<div class="chips">' + certChip(b.certainty) + '<span class="chip">Chapter ' + (g.chIdx[b.chapter] + 1) + ': ' + esc(ch.title) + '</span>' + (b.when ? '<span class="chip">' + esc(b.when) + '</span>' : '') + (b.doom ? '<span class="chip doom-chip">' + RTD.doomMask('c-mask') + 'Doom is in this' + '</span>' : '') + (b.key ? '' : '<span class="chip">Extra detail</span>') + '</div>' +
    '<h2 id="sheet-title" tabindex="-1" class="r-title">' + esc(b.title) + '</h2><p class="note">' + esc(Nv.branchTitle(b.id)) + '. ' + esc(Nv.counterFor(b.id)) + (b.id === g.startId ? '. Start here.' : '') + '</p></div>' +
    panels + RTD.videos.beat(b.id) +
    '<section class="whos rels"><h3 class="cap">Happens because of</h3>' + (causes ? '<ul class="rel-list">' + causes + '</ul>' : '<p class="small">Nothing earlier. This is where the story starts.</p>') + '</section>' +
    '<section class="whos rels"><h3 class="cap">Leads to</h3>' + (leads ? '<ul class="rel-list">' + leads + '</ul>' : '<p class="small">Nothing after. This is where the guide ends.</p>') + '</section>' +
    (isEnd ? '<section class="whos"><h3 class="cap">The film</h3><p class="small">Countdown, cast ring and hot theories.</p><div class="row"><button type="button" class="btn secondary" data-act="core">Open the Doomsday page</button></div></section>' : '') +
    (who ? '<section class="whos"><h3 class="cap">Who is in it</h3><div class="whos-row">' + who + '</div></section>' : '') + seen +
    '<div class="r-walk">' + (pv ? '<button type="button" class="btn secondary" data-act="bprev"><span class="small">Previous event</span><b>' + esc(pvT) + '</b></button>' : '<span></span>') +
    (nx ? '<button type="button" class="btn secondary" data-act="bnext"><span class="small">Next event</span><b>' + esc(nxT) + '</b></button>' : '<span></span>') + '</div></div>';
}
function filmHTML(n) {
  var c = U.color(n), beats = S.g ? S.g.beats.filter(function (b) { return b.source === n.id; }) : [];
  var cast = (n.characters || []).map(function (ch) {
    var r = S.person[ch.slug];
    return r ? '<button type="button" class="who" data-act="person" data-slug="' + esc(ch.slug) + '">' + RTD.face(ch.slug, ch.name) + '<span class="who-n">' + esc(ch.name) + '</span></button>' : '<span class="who static">' + RTD.face(ch.slug, ch.name) + '<span class="who-n">' + esc(ch.name) + '</span></span>';
  }).join('');
  return '<div class="sheet-in paper reader" style="--c:' + c + '">' +
    '<div class="r-head"><div class="r-bar"><button type="button" class="btn ghost sm" data-act="close">Close</button><button type="button" class="btn ghost sm only-m" data-act="expand">' + (el.classList.contains('full') ? 'Shrink' : 'Expand') + '</button></div>' +
    '<div class="chips">' + metaChips(n) + '</div><h2 id="sheet-title" tabindex="-1" class="r-title">' + esc(n.title) + '</h2>' + (n.watchNote ? '<p class="note">' + esc(n.watchNote) + '</p>' : '') +
    '<p class="one">' + esc(n.oneLiner || '') + '</p><div class="chips threads">' + (n.threads || []).map(threadChip).join('') + '</div><div class="row">' + (n.type !== 'context' ? watchBtn(n) : '') + '</div></div>' +
    filmPanels(n) + (beats.length ? '<section class="whos rels"><h3 class="cap">On the timeline</h3><ul class="rel-list">' + beats.map(function (b) { return '<li><button type="button" class="rel" data-act="beat" data-id="' + esc(b.id) + '"><b>' + esc(b.title) + '</b></button></li>'; }).join('') + '</ul></section>' : '') +
    (cast ? '<section class="whos"><h3 class="cap">Who is in it</h3><div class="whos-row">' + cast + '</div></section>' : '') + '</div>';
}
var STAT = { taken: 'Taken', approached: 'Approached', wants: 'Wants', unknown: 'Unknown' };
function doomHTML() {
  /* Banner, Wanda, Franklin, Sentinels, stolen lives; then the uncertain and theory items in file order */
  var g = S.g, FIRST = ['d-banner', 'd-wanda', 'd-franklin', 'd-sentinels', 'd-stolen-lives'], all = (S.story.doom || []);
  var ds = all.slice().sort(function (a, b) { var x = FIRST.indexOf(a.id), y = FIRST.indexOf(b.id); x = x < 0 ? 99 : x; y = y < 0 ? 99 : y; return (x - y) || (all.indexOf(a) - all.indexOf(b)); });
  var counts = { taken: 0, approached: 0, wants: 0, unknown: 0 }; ds.forEach(function (d) { counts[STAT[d.status] ? d.status : 'unknown']++; });
  var items = ds.map(function (d, i) {
    var st = STAT[d.status] ? d.status : 'unknown', cert = d.certainty === 'read' || d.certainty === 'theory' ? d.certainty : 'shown', b = g.byId[d.beat];
    var src = (d.sourceUrls || []).filter(function (u) { return /^https?:\/\//.test(u); }).map(function (u) { return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + '</a></li>'; }).join('');
    return '<li class="d-item d-' + st + (cert !== 'shown' ? ' dashed' : '') + '"><div class="d-top"><span class="d-n">' + (i + 1) + '</span><div><h3 class="d-target">' + esc(d.target) + '</h3><div class="chips"><span class="chip st-' + st + '">' + esc(STAT[st]) + '</span>' + certChip(cert) + '</div></div></div>' +
      '<p class="d-title"><b>' + esc(d.title) + '</b></p><p>' + esc(d.what) + '</p>' + (b ? '<button type="button" class="btn secondary sm" data-act="beat" data-id="' + esc(b.id) + '">See it on the timeline</button>' : '') + (src ? '<ul class="srcs">' + src + '</ul>' : '') + '</li>';
  }).join('');
  return '<div class="sheet-in paper reader doomb" style="--c:#25c26e"><div class="r-head"><div class="r-bar"><button type="button" class="btn ghost sm" data-act="close">Close</button><button type="button" class="btn ghost sm only-m" data-act="expand">' + (el.classList.contains('full') ? 'Shrink' : 'Expand') + '</button></div>' +
    '<h2 id="sheet-title" tabindex="-1" class="r-title">' + RTD.doomMask('t-mask') + 'What Doom is doing</h2><p class="note">Who or what he has approached, taken or wants, in story order. Each line says how sure we are.</p>' +
    '<div class="chips"><span class="chip st-taken">Taken ' + counts.taken + '</span><span class="chip st-approached">Approached ' + counts.approached + '</span><span class="chip st-wants">Wants ' + counts.wants + '</span>' + (counts.unknown ? '<span class="chip st-unknown">Unknown ' + counts.unknown + '</span>' : '') + '</div>' +
    '<div class="row"><button type="button" class="btn primary" data-act="doomtrail" aria-pressed="' + S.doomTrail + '">' + (S.doomTrail ? 'Showing Doom only. Tap to show everything' : 'Show on timeline') + '</button></div></div>' +
    (ds.length ? '<ol class="d-list">' + items + '</ol>' : '<p class="empty pad">Nothing about Doom has been recorded yet.</p>') + '</div>';
}
function castRing() {
  var cf = S.roster.filter(function (p) { return p.status === 'confirmed'; }), ot = S.roster.filter(function (p) { return p.status !== 'confirmed'; });
  var Sz = 300, c = Sz / 2, dots = '';
  function ring(list, r, solid) { list.forEach(function (p, i) { var a = i / list.length * Math.PI * 2 - Math.PI / 2, x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" class="' + (solid ? 'cd solid' : 'cd dash') + '" data-slug="' + esc(p.slug) + '"><title>' + esc(p.character) + '</title></circle>'; }); }
  ring(cf, 82, true); ring(ot, 126, false);
  return '<svg class="ring" viewBox="0 0 ' + Sz + ' ' + Sz + '" role="img" aria-label="Cast ring: ' + cf.length + ' confirmed by Marvel in a solid ring, ' + ot.length + ' reported, rumored or hoped for in a dashed outer ring"><circle cx="' + c + '" cy="' + c + '" r="44" class="ring-core"/><text x="' + c + '" y="' + (c + 6) + '" text-anchor="middle" class="ring-t">Doom</text>' + dots + '</svg>';
}
function leadHere() {
  if (!S.g) return '';
  var ls = S.g.pars[S.g.end] || [];
  return ls.length ? '<section class="whos rels"><h3 class="cap">What leads here</h3><ul class="rel-list">' + ls.map(function (l) { return rel(l, l.from, 'in'); }).join('') + '</ul></section>' : '';
}
function coreHTML() {
  var n = S.byId['avengers-doomsday'], d = RTD.dates.daysToRelease(new Date());
  var panels = RTD.gate('core', null, '<div class="comic">' + (n ? (n.cards || []).map(function (cd, j) { return '<section class="panel ' + (j === 0 ? 'p-lead' : j % 3 === 1 ? 'p-wide' : 'p-narrow') + ' t' + (j % 3) + '"><h3 class="cap">' + esc(cd.title) + '</h3><p>' + esc(cd.body) + '</p></section>'; }).join('') : '') + '</div>', 'The Doomsday briefing is hidden.', 'Show this page');
  var th = S.theories.slice().sort(function (a, b) { return (b.heat || 0) - (a.heat || 0); }).slice(0, 4).map(function (x) { return '<button type="button" class="btn secondary sm" data-act="theory" data-id="' + esc(x.id) + '">' + esc(x.title) + '</button>'; }).join('');
  var cf = S.roster.filter(function (p) { return p.status === 'confirmed'; }).length;
  var last = S.g ? S.g.byId[S.g.end] : null;
  return '<div class="sheet-in paper reader core" style="--c:#25c26e"><div class="r-head"><div class="r-bar"><button type="button" class="btn ghost sm" data-act="close">Close</button><button type="button" class="btn ghost sm only-m" data-act="expand">' + (el.classList.contains('full') ? 'Shrink' : 'Expand') + '</button></div>' +
    '<div class="chips"><span class="chip">Opens December 18, 2026</span>' + chip(d > 1 ? d + ' days to go' : d === 1 ? '1 day to go' : d === 0 ? 'Opens today' : 'In theaters now') + '</div>' +
    '<h2 id="sheet-title" tabindex="-1" class="r-title">Avengers: Doomsday</h2>' +
    '<p class="note">Showtimes vary by theater. Check yours.</p>' +
    '<p class="one">' + esc(n ? n.oneLiner : '') + '</p>' + (last ? '<div class="row"><button type="button" class="btn secondary" data-act="beat" data-id="' + esc(last.id) + '">Back to the last beat</button></div>' : '') + '</div>' + leadHere() +
    panels + RTD.videos.film('avengers-doomsday') +
    '<section class="whos ringbox"><h3 class="cap">The cast ring</h3>' + castRing() + '<p class="small">Solid ring: ' + cf + ' confirmed by Marvel. Dashed ring: reported, rumored or hoped for. Tap a dot.</p><div class="row"><button type="button" class="btn secondary" data-act="view" data-view="cast">Open the full cast</button></div></section>' +
    (th ? '<section class="whos"><h3 class="cap">Hot theories</h3><div class="row wrap">' + th + '</div></section>' : '') +
    '<p class="small fine">Unofficial fan guide. Not made by or affiliated with Marvel or Disney.</p></div>';
}
function personHTML(slug) {
  var p = S.person[slug]; if (!p) return '';
  var last = S.byId[p.lastSeen], team = RTD.TEAMS[p.team] || { t: p.team };
  var key = 'cast:' + slug;
  var back = P.back ? (P.back === 'core' ? 'Back to Doomsday' : P.back === 'doom' ? 'Back to Doom' : 'Back to the story') : 'Close';
  return '<div class="sheet-in paper reader p-sheet" style="--c:' + (p.status === 'confirmed' ? '#25c26e' : '#a878ff') + '"><div class="r-head"><div class="r-bar"><button type="button" class="btn ghost sm" data-act="closeperson">' + back + '</button></div>' +
    '<div class="p-top">' + RTD.face(p.slug, p.character, 'big') + '<div><div class="chips">' + RTD.statusChip(p.status) + chip(team.t) + '</div><h2 id="sheet-title" tabindex="-1" class="r-title">' + esc(p.character) + '</h2><p class="note">' + esc(p.actor || '') + '</p></div></div></div>' +
    RTD.gate(key, null, '<div class="comic"><section class="panel p-lead t0"><h3 class="cap">Going into Doomsday</h3><p>' + esc(p.whereTheyAre || '') + '</p></section>' +
    '<section class="panel p-wide t1"><h3 class="cap">Likely role</h3><p>' + esc(p.whyItMatters || '') + '</p></section></div>', 'This profile is hidden.', 'Show this profile') + '<div class="comic">' +
    '<section class="panel p-narrow t2"><h3 class="cap">Last seen</h3>' + (last ? '<button type="button" class="btn secondary sm" data-act="open" data-id="' + esc(last.id) + '">' + esc(last.title) + '</button>' : '<p>' + esc(p.lastSeen ? String(p.lastSeen).replace(/-/g, ' ') : 'Not in the guide yet') + '</p>') + '</section></div>' +
    '<p class="small src"><span>Source: ' + esc(p.source || 'none listed') + '</span>' + (/^https?:\/\//.test(p.sourceUrl || '') ? ' <a href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open the source</a>' : '') + '</p></div>';
}

/* ---------- controller ---------- */
SH.kind = function () {
  if (P.open) return 'person';
  if (S.doomOpen) return 'doom';
  if (S.core) return 'core';
  if (S.film) return 'film';
  if (S.sel && S.reader && onTimeline() && S.g && S.g.byId[S.sel]) return 'beat';
  return null;
};
SH.render = function () {
  var kind = SH.kind(), was = el.dataset.kind;
  /* Back closes the reader instead of leaving the site */
  if (RTD._booted && !RTD._pop) try { if (kind && !was) { if (RTD._spare) history.replaceState({ r: 1 }, '', location.hash); else history.pushState({ r: 1 }, '', location.hash); RTD._spare = false; } else if (!kind && was && history.state && history.state.r) { history.replaceState(null, "", location.hash); RTD._spare = true; } } catch (e) {}
  if (!kind) { el.hidden = true; el.innerHTML = ''; el.dataset.kind = ''; el.className = 'sheet'; document.body.classList.remove('sheet-open'); delete document.body.dataset.sheet; return; }
  var scroll = (was === kind && el.querySelector('.sheet-in')) ? el.scrollTop : 0;
  if (kind === 'person') el.innerHTML = personHTML(P.open);
  else if (kind === 'doom') el.innerHTML = doomHTML();
  else if (kind === 'core') el.innerHTML = coreHTML();
  else if (kind === 'film') el.innerHTML = filmHTML(S.byId[S.film]);
  else el.innerHTML = beatHTML(S.g.byId[S.sel]);
  el.hidden = false; el.dataset.kind = kind; el.className = 'sheet k-' + kind + (el.dataset.full === '1' ? ' full' : '');
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', kind === 'doom' ? 'What Doom is doing' : kind === 'core' ? 'Avengers: Doomsday' : 'Details');
  document.body.classList.add('sheet-open'); document.body.dataset.sheet = kind;
  el.classList.toggle('full', el.dataset.full === '1');
  el.scrollTop = scroll;
};
SH.focusTitle = function () { var t = el.querySelector('#sheet-title'); if (t) t.focus({ preventScroll: true }); };
function remember(o) { var a = o || document.activeElement; if (a && a !== document.body && !el.contains(a)) lastFocus = a; }
function sync() { Nv.sync(); }
function toTimeline() { if (!onTimeline()) RTD.go(S.tlView || 'map', { focus: false }); }
function clearOverlays() { P.open = null; P.back = null; S.core = false; S.film = null; S.doomOpen = false; }
SH.openBeat = function (id, o) {
  o = o || {}; var b = S.g && S.g.byId[id]; if (!b) return;
  toTimeline();
  if (!S.reader && !S.core && !S.doomOpen) remember(o.opener);
  clearOverlays(); S.sel = id; S.reader = true; RTD.store.set('rtd.last', id); Nv.markRead(id);
  SH.render(); sync(); Nv.reveal(id);
  if (!o.keepFocus) SH.focusTitle();
  RTD.announce(b.title + '. ' + Nv.counter());
};
/* select without the reader: used when a selection should only light up the board */
SH.openFilm = function (id) {
  var beats = S.g ? S.g.beats.filter(function (b) { return b.source === id; }) : [];
  if (beats.length) { SH.openBeat((beats.filter(function (b) { return b.key; })[0] || beats[0]).id); return; }
  remember(); clearOverlays(); S.film = id; S.reader = false; SH.render(); SH.focusTitle(); sync();
};
SH.openCore = function (o) {
  o = o || {}; if (!S.core) remember(o.opener); P.open = null; S.film = null; S.doomOpen = false; S.core = true; S.reader = false;
  toTimeline();
  SH.render(); sync(); if (!o.keepFocus) SH.focusTitle(); RTD.announce('Avengers: Doomsday page');
};
SH.openDoom = function (o) { remember(o && o.opener); P.open = null; S.core = false; S.film = null; S.doomOpen = true; S.reader = false; toTimeline(); SH.render(); SH.focusTitle(); sync(); RTD.announce('What Doom is doing'); };
SH.toggleDoomTrail = function () {
  S.doomTrail = !S.doomTrail; if (S.doomTrail) { S.reader = false; clearOverlays(); SH.render(); }
  else if (SH.kind() === 'doom') { var sc = el.scrollTop; SH.render(); el.scrollTop = sc; var b = el.querySelector('[data-act="doomtrail"]'); if (b) b.focus({ preventScroll: true }); }
  sync(); if (S.doomTrail) { var first = S.g.order.filter(function (id) { return S.g.byId[id].doom; })[0]; if (first) Nv.reveal(first); }
  RTD.announce(S.doomTrail ? 'Doom trail shown. Everything else is faded.' : 'Showing everything');
};
SH.openPerson = function (slug) {
  if (!S.person[slug]) return; remember();
  P.back = S.core ? 'core' : S.doomOpen ? 'doom' : (S.reader && S.sel && onTimeline()) ? 'beat' : S.film ? 'film' : null; P.open = slug; SH.render(); SH.focusTitle();
};
SH.closePerson = function () { P.open = null; P.back = null; SH.render(); if (el.hidden === false) SH.focusTitle(); else restore(); };
function restore() {
  var t = lastFocus; lastFocus = null;
  if (t && document.contains(t) && t.focus) t.focus({ preventScroll: true });
  else if (S.sel && Nv.cardEl(S.sel)) Nv.cardEl(S.sel).focus({ preventScroll: true });
  else if (onTimeline()) { var host = document.getElementById(S.view === 'tva' ? 'tv' : 'tl'); if (host) host.focus({ preventScroll: true }); }
}
/* Esc / Close steps out one level: person, then the open sheet, then the selection, then the Doom trail */
SH.stepOut = function () {
  if (P.open) { SH.closePerson(); return true; }
  if (S.doomOpen || S.core || S.film) { clearOverlays(); SH.render(); sync(); restore(); return true; }
  if (S.reader && S.sel) { S.reader = false; SH.render(); sync(); restore(); return true; }
  if (S.sel) { var id = S.sel; S.sel = null; sync(); restore(); return true; }
  if (S.doomTrail) { S.doomTrail = false; sync(); return true; }
  return false;
};
SH.dismiss = function () { clearOverlays(); S.reader = false; };
/* close the reader but keep the place: S.sel stays, so Next carries on from here */
SH.hideReader = function () { S.reader = false; clearOverlays(); SH.render(); sync(); };
SH.clear = function () { clearOverlays(); S.sel = null; S.reader = false; };
SH.toggleFull = function () { el.dataset.full = el.dataset.full === '1' ? '0' : '1'; SH.render(); SH.focusTitle(); };
SH.init = function () { el = document.getElementById('sheet'); el.dataset.full = '0'; };
SH.el = function () { return el; };
SH.closeAll = function () { SH.clear(); SH.render(); };
SH.go = function (id) { SH.openBeat(id, { keepFocus: true }); };
/* Next and Previous walk the one reading order; focus stays on the button so Enter can be pressed again.
   The reader always opens on a beat, so the sheet always has its #sheet-title. */
SH.step = function (dir) {
  var id = dir > 0 ? Nv.next() : Nv.prev(); if (!id) return;
  var a = document.activeElement; SH.openBeat(id, { keepFocus: true, opener: a });
  if (a && document.contains(a) && a.focus) a.focus({ preventScroll: true });
};
})();
