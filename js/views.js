/* Ready for Doom v3: list, plan, cast, theories. Plain HTML strings; every data value goes through esc(). */
(function () {
'use strict';
var RTD = window.RTD, S = RTD.S, U = RTD.util, esc = U.esc, D = RTD.dates;
var V = RTD.views = {};
var listFilter = new Set();

function chip(t, cls) { return '<span class="chip ' + (cls || '') + '">' + esc(t) + '</span>'; }
function watchedMini(n) { var w = S.watched.has(n.id); return '<button type="button" class="mini' + (w ? ' on' : '') + '" data-act="watch" data-id="' + esc(n.id) + '" aria-pressed="' + w + '" aria-label="Watched: ' + esc(n.title) + '">' + (w ? 'Watched' : 'Mark watched') + '</button>'; }
function failed(list, what) { return list.length ? '' : '<div class="note-box" role="alert"><p>' + what + ' did not load. Check your connection and try again.</p><button type="button" class="btn primary" data-act="reload">Try again</button></div>'; }
function pageHead(title, sub) { return '<header class="pg-head"><h1 class="pg-title">' + esc(title) + '</h1>' + (sub ? '<p class="lede">' + sub + '</p>' : '') + '</header>'; }
function seg(name, opts, cur) { return '<div class="seg" role="group" aria-label="' + esc(name) + '">' + opts.map(function (o) { return '<button type="button" class="seg-b" data-act="' + o.act + '" data-v="' + esc(o.v) + '" aria-pressed="' + (String(cur) === String(o.v)) + '">' + esc(o.t) + '</button>'; }).join('') + '</div>'; }

/* ---------- list ---------- */
V.list = function () {
  var el = document.getElementById('v-list');
  var chips = Object.keys(RTD.THREADS).map(function (k) { var t = RTD.THREADS[k]; return '<button type="button" class="chip-b" style="--c:' + t.c + '" data-act="lthread" data-key="' + k + '" aria-pressed="' + listFilter.has(k) + '"><i></i>' + esc(t.short) + '</button>'; }).join('');
  var nodes = RTD.sortNodes(S.nodes.filter(U.isMapNode)).filter(function (n) { return !listFilter.size || (n.threads || []).some(function (t) { return listFilter.has(t); }); });
  var groups = [], gm = {};
  nodes.forEach(function (n) {
    var key, title, sub;
    if (S.order === 'chrono') { var yr = n.chrono || 0; var dec = Math.floor(yr / 10) * 10; key = dec; title = dec < 1900 ? 'Long ago' : 'Set in the ' + dec + 's'; sub = ''; }
    else { key = n.phase; title = RTD.PHASES[n.phase].t; sub = RTD.PHASES[n.phase].p; }
    if (!gm[key]) { gm[key] = { title: title, sub: sub, items: [] }; groups.push(gm[key]); }
    gm[key].items.push(n);
  });
  var html = pageHead('Every story, in order', 'The same ' + nodes.length + ' stories as the map, as a plain list. Order: ' + (S.order === 'chrono' ? 'story order (when it happens)' : 'release order') + '.') +
    '<div class="tools">' + seg('Order', [{ act: 'order', v: 'release', t: 'Release order' }, { act: 'order', v: 'chrono', t: 'Story order' }], S.order) + '</div>' +
    '<div class="chip-row" role="group" aria-label="Filter by thread">' + chips + '</div>';
  html += groups.map(function (g) {
    return '<section class="grp"><h2 class="grp-t">' + esc(g.title) + '</h2>' + (g.sub ? '<p class="small muted">' + esc(g.sub) + '</p>' : '') + '<ul class="rows">' + g.items.map(function (n) {
      return '<li class="row-i" style="--c:' + U.color(n) + '"><div class="row-body"><button type="button" class="row-main" data-act="open" data-id="' + esc(n.id) + '"><span class="r-t">' + esc(n.title) + '</span><span class="r-m">' + chip(String(n.year)) + chip(RTD.TYPE[n.type]) + (n.essential ? chip(RTD.ESS[n.essential], 'ess' + n.essential) : '') + (n.type !== 'context' ? chip(U.nodeDur(n)) : '') + '</span></button><div class="r-o">' + esc(n.oneLiner || '') + '</div></div>' + (n.type !== 'context' ? watchedMini(n) : '') + '</li>';
    }).join('') + '</ul></section>';
  }).join('') || '<p class="empty">Nothing matches. Clear a thread filter.</p>';
  el.querySelector('.pg-in').innerHTML = failed(S.nodes, 'The film list') + html + '<div class="donate-row">' + RTD.extras.bigHTML() + '</div><p class="small foot-note">Unofficial fan guide. Not affiliated with, endorsed or sponsored by Marvel or Disney. Names and titles are used only to identify the stories.</p>';
};
V.toggleListThread = function (k) { if (listFilter.has(k)) listFilter.delete(k); else listFilter.add(k); V.list(); };

/* ---------- plan ---------- */
V.plan = function () {
  var el = document.getElementById('v-plan'), now = new Date();
  var items = RTD.sortNodes(RTD.realNodes().filter(function (n) { return n.essential >= S.depth && !S.watched.has(n.id); }));
  var res = RTD.plan.build({ nodes: items, today: now, dailyMin: S.daily, mins: U.mins });
  var d = D.daysToRelease(now), win = res.windowDays;
  var depthSeg = seg('How much to include', [{ act: 'depth', v: 3, t: 'Essentials' }, { act: 'depth', v: 2, t: 'Plus helpful' }, { act: 'depth', v: 1, t: 'Everything' }], S.depth);
  var dailySeg = seg('Time per day', [{ act: 'daily', v: 0, t: 'Auto' }, { act: 'daily', v: 60, t: '1 h' }, { act: 'daily', v: 120, t: '2 h' }, { act: 'daily', v: 180, t: '3 h' }, { act: 'daily', v: 240, t: '4 h' }], S.daily);
  var html = pageHead('Catch-up plan', win > 0 ? 'Doomsday opens on ' + esc(D.fmt(D.RELEASE, { weekday: 'long', month: 'long', day: 'numeric' })) + '. This plan runs from today to ' + esc(D.fmt(D.LAST_PLAN_DAY, { weekday: 'long', month: 'long', day: 'numeric' })) + ', the day before.' : 'Doomsday opens on December 18, 2026, so the planning window has closed.');
  html += '<div class="tools"><div class="tool"><span class="tool-l">Include</span>' + depthSeg + '</div><div class="tool"><span class="tool-l">Time per day</span>' + dailySeg + '</div></div>';
  var totalH = res.total / 60;
  html += '<div class="stats"><div><b>' + win + '</b><span>days in your window</span></div><div><b>' + items.length + '</b><span>stories to watch</span></div><div><b>' + (Math.round(totalH * 10) / 10) + '</b><span>hours in all' + (items.some(function (n) { return n.runtimeEstimated === true; }) ? ', estimated' : '') + '</span></div><div><b>' + (win ? U.dur(Math.max(res.budget, 0)) : 'none') + '</b><span>' + (res.auto ? 'a day, chosen for you' : 'a day, your setting') + '</span></div></div>';
  if (!items.length) { html += '<p class="note-box ok">Nothing left in this set. You are ready for December 18.</p>'; el.querySelector('.pg-in').innerHTML = failed(S.nodes, 'The film list') + html + '<div class="donate-row">' + RTD.extras.bigHTML() + '</div><p class="small foot-note">Unofficial fan guide. Not affiliated with, endorsed or sponsored by Marvel or Disney. Names and titles are used only to identify the stories.</p>'; return; }
  if (win === 0) { html += '<p class="note-box warn"><b>No days left to plan.</b> Doomsday opens December 18, so nothing can be scheduled before it. ' + items.length + ' stories are still unwatched. Open the map and pick the ones you care about.</p>'; }
  else if (res.overflow.length) {
    var omin = res.overflow.reduce(function (a, o) { return a + o.minutes; }, 0), notout = res.overflow.filter(function (o) { return o.reason === 'notout'; }).length;
    html += '<p class="note-box warn"><b>This does not all fit before December 18.</b> ' + res.overflow.length + ' ' + (res.overflow.length === 1 ? 'story' : 'stories') + ' (' + esc(U.dur(omin, true)) + ') would run past December 17, so ' + (res.overflow.length === 1 ? 'it is' : 'they are') + ' not scheduled below' + (notout ? ', and ' + notout + ' ' + (notout === 1 ? 'is' : 'are') + ' not out before then' : '') + '. To fit everything you would need ' + esc(U.dur(res.needPerDay, true)) + ' a day. Try a longer day or a shorter list.</p>';
  } else html += '<p class="note-box ok"><b>It fits.</b> Every story below lands on or before ' + esc(D.fmt(D.LAST_PLAN_DAY, { month: 'long', day: 'numeric' })) + '.</p>';
  html += '<ol class="days">' + res.days.map(function (day) {
    var idx = D.diffDays(now, day.date), segs = day.items.map(function (it) { return '<i style="flex:' + it.minutes + ';background:' + U.color(it.node) + '"></i>'; }).join('');
    return '<li class="day"><div class="day-h"><h2 class="day-t">' + esc(D.label(day.date, idx)) + '</h2><span class="small muted">' + esc(D.fmt(day.date, { month: 'short', day: 'numeric' })) + '</span><span class="day-sum">' + esc(U.dur(day.total, day.items.some(function (i) { return i.node.runtimeEstimated === true; }))) + '</span></div><div class="bar" aria-hidden="true">' + segs + '</div><ul class="day-i">' + day.items.map(function (it) {
      var n = it.node, est = n.runtimeEstimated === true;
      return '<li style="--c:' + U.color(n) + '"><button type="button" class="pi" data-act="open" data-id="' + esc(n.id) + '"><span class="pi-t">' + esc(n.title) + '</span><span class="pi-m">' + (it.part ? 'Part ' + it.part.i + ' of ' + it.part.n + ', ' : '') + esc(U.dur(it.minutes, est)) + '</span></button>' + (it.part && it.part.i < it.part.n ? '' : watchedMini(n)) + '</li>';
    }).join('') + '</ul></li>';
  }).join('') + '</ol>';
  if (res.overflow.length && win > 0) {
    html += '<section class="over"><h2 class="grp-t">Not scheduled</h2><p class="small muted">These would land after December 17.</p><ul class="day-i">' + res.overflow.map(function (o) {
      var n = o.node; return '<li style="--c:' + U.color(n) + '"><button type="button" class="pi" data-act="open" data-id="' + esc(n.id) + '"><span class="pi-t">' + esc(n.title) + '</span><span class="pi-m">' + (o.reason === 'notout' ? 'Not out before Doomsday' : (o.partial ? 'Rest of the series, ' : '') + esc(U.dur(o.minutes, n.runtimeEstimated === true))) + '</span></button></li>';
    }).join('') + '</ul></section>';
  }
  el.querySelector('.pg-in').innerHTML = html;
};

/* ---------- cast ---------- */
var castOnly = false;
V.cast = function () {
  var el = document.getElementById('v-cast');
  var list = S.roster.filter(function (p) { return !castOnly || p.status === 'confirmed'; });
  var html = pageHead('Who is in Doomsday', 'Only people marked ' + '<b>Confirmed by Marvel</b>' + ' have been officially announced. Everyone else is reported, rumored or just a fan hope, with dashed outlines.') +
    '<div class="tools">' + seg('Show', [{ act: 'castonly', v: 0, t: 'Everyone' }, { act: 'castonly', v: 1, t: 'Confirmed by Marvel' }], castOnly ? 1 : 0) + '</div>';
  html += RTD.TEAM_ORDER.map(function (k) {
    var ps = list.filter(function (p) { return p.team === k; }).sort(function (a, b) { return RTD.STATUS[a.status].rank - RTD.STATUS[b.status].rank; }); if (!ps.length) return '';
    return '<section class="grp"><h2 class="grp-t">' + esc(RTD.TEAMS[k].t) + '</h2><p class="small muted">' + esc(RTD.TEAMS[k].p) + '</p><div class="faces">' + ps.map(function (p) {
      return '<button type="button" class="person s-' + esc(p.status) + '" data-act="person" data-slug="' + esc(p.slug) + '">' + RTD.face(p.slug, p.character, 'big') + '<span class="pn">' + esc(p.character) + '</span><span class="pa">' + esc(p.actor || 'Unannounced') + '</span>' + RTD.statusChip(p.status) + '</button>';
    }).join('') + '</div></section>';
  }).join('') || '<p class="empty">Roster data did not load.</p>';
  el.querySelector('.pg-in').innerHTML = failed(S.roster, 'The cast list') + html + '<div class="donate-row">' + RTD.extras.bigHTML() + '</div><p class="small foot-note">Unofficial fan guide. Not affiliated with, endorsed or sponsored by Marvel or Disney. Names and titles are used only to identify the stories.</p>';
};

/* ---------- theories ---------- */
var openTheory = null;
V.openTheory = function (id) { openTheory = id; };
V.theories = function () {
  var el = document.getElementById('v-theories');
  var ts = S.theories.slice().sort(function (a, b) { return (b.heat || 0) - (a.heat || 0); });
  var html = pageHead('Theories', 'Fan theories, with the case for, the case against and what the comics did. Details stay hidden until you reveal them.') + '<p class="th-send"><button type="button" class="btn primary" data-act="contact" data-kind="theory">Send us your theory</button></p>';
  html += '<div class="theories">' + ts.map(function (t) {
    var open = openTheory === t.id, k = 'th:' + t.id;
    var heat = [1, 2, 3].map(function (i) { return '<i class="' + (i <= t.heat ? 'on' : '') + '"></i>'; }).join('');
    var rel = (t.relatedNodes || []).map(function (id) { var n = S.byId[id]; return n ? '<button type="button" class="btn secondary sm" data-act="open" data-id="' + esc(n.id) + '">' + esc(n.title) + '</button>' : ''; }).join('');
    var src = (t.sourceUrls || []).filter(function (u) { return /^https?:\/\//.test(u); }).map(function (u) { return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + '</a></li>'; }).join('');
    return '<article class="theory' + (open ? ' open' : '') + '"><h2 class="th-h"><button type="button" class="th-b" data-act="theorytoggle" data-id="' + esc(t.id) + '" aria-expanded="' + open + '" aria-controls="th-' + esc(t.id) + '"><span class="heat" role="img" aria-label="Heat ' + t.heat + ' of 3">' + heat + '</span><span class="th-t">' + esc(t.title) + '</span><span class="small muted th-s">' + (t.heat === 3 ? 'Everywhere' : t.heat === 2 ? 'Widely discussed' : 'Niche') + '</span></button></h2>' +
      '<div class="th-body" id="th-' + esc(t.id) + '"' + (open ? '' : ' hidden') + '>' + RTD.gate(k, null, '<div class="th-g"><section class="for"><h3>The case for</h3><p>' + esc(t.evidenceFor) + '</p></section><section class="against"><h3>The case against</h3><p>' + esc(t.evidenceAgainst) + '</p></section><section class="comics"><h3>What the comics did</h3><p>' + esc(t.comicsBasis) + '</p></section></div>', 'This theory is hidden.', 'Show this theory') +
      (rel ? '<h3 class="mini-h">Read the setup</h3><div class="row wrap">' + rel + '</div>' : '') + (src ? '<h3 class="mini-h">Sources</h3><ul class="srcs">' + src + '</ul>' : '') + '</div></article>';
  }).join('') + '</div>';
  el.querySelector('.pg-in').innerHTML = failed(S.theories, 'The theories') + html + '<div class="donate-row">' + RTD.extras.bigHTML() + '</div><p class="small foot-note">Unofficial fan guide. Not affiliated with, endorsed or sponsored by Marvel or Disney. Names and titles are used only to identify the stories.</p>';
};
V.toggleCast = function (v) { castOnly = !!+v; V.cast(); };
V.toggleTheory = function (id) { openTheory = openTheory === id ? null : id; V.theories(); var b = document.querySelector('[data-act="theorytoggle"][data-id="' + id + '"]'); if (b) b.focus(); };
V.render = function (name) { if (V[name]) V[name](); };
})();
