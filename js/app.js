/* Ready for Doom v4: boot, routing, events, search, menu, first-visit welcome, keyboard. */
(function () {
'use strict';
var RTD = window.RTD, S = RTD.S, U = RTD.util, esc = U.esc, SH = RTD.sheet, Nv = RTD.nav, V = RTD.views, D = RTD.dates;
var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var VIEWS = ['map', 'tva', 'plan', 'cast', 'theories', 'list'];
var ALIAS = { timeline: 'map', roster: 'cast', board: 'map' };
function isTL(v) { return v === 'map' || v === 'tva'; }
var modalEl = null, modalReturn = null, toastT = 0, resetArmed = 0;

RTD.announce = function (t) { var l = $('#live'); if (!l) return; l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30); };

/* ---------- views / routing ---------- */
RTD.go = function (view, opts) {
  opts = opts || {}; if (VIEWS.indexOf(view) < 0) view = 'map';
  var was = S.view; S.view = view;
  if (was !== view && !(isTL(was) && isTL(view))) { SH.dismiss(); RTD.hideToast(); }
  $$('.view').forEach(function (s) { var on = s.id === 'v-' + view; s.hidden = !on; s.classList.toggle('on', on); });
  $$('.tab').forEach(function (t) { var on = t.dataset.view === view || (view === 'tva' && t.dataset.view === 'map'); if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  document.body.dataset.view = view;
  if (!isTL(view)) { V.render(view); var pg = $('#v-' + view); if (pg && !opts.keepScroll) pg.scrollTop = 0; }
  else { S.tlView = view; RTD.store.set('rtd.tlview', view); }
  RTD._going = true; SH.render(); RTD._going = false;
  if (isTL(view) && was !== view) { Nv.activate(view); if (S.sel && view === 'map') Nv.reveal(S.sel, { quiet: true }); }
  var hs = location.hash.replace('#', '').split('/')[0];
  if (hs !== view && !(view === 'map' && (hs === 'timeline' || hs === 'board'))) { if (!RTD._pop) try { if (was && was !== view && RTD._booted) { if (RTD._spare) history.replaceState(null, '', '#' + view); else history.pushState(null, '', '#' + view); RTD._spare = false; } else history.replaceState(null, '', '#' + view); } catch (e) { try { location.hash = view; } catch (e2) {} } }
  if (opts.focus !== false && was !== view) { var h = view === 'map' ? $('#tl') : view === 'tva' ? $('#tv') : $('#v-' + view + ' .pg-title'); if (h) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
};
function fromHash() { var v = location.hash.replace('#', '').split('/')[0]; v = ALIAS[v] || v; return VIEWS.indexOf(v) >= 0 ? v : 'map'; }

function rerenderPage() { if (!isTL(S.view)) V.render(S.view); }
function keepFocusAfter(fn, sel) { var sc = $('#v-' + S.view); var st = sc ? sc.scrollTop : 0, ss = $('#sheet').scrollTop; fn(); if (sc) sc.scrollTop = st; $('#sheet').scrollTop = ss; if (sel) { var t = $(sel); if (t) t.focus({ preventScroll: true }); } }

RTD.on('progress', function (id) {
  keepFocusAfter(function () { SH.render(); rerenderPage(); if (isTL(S.view)) Nv.sync(); }, document.activeElement && document.activeElement.dataset && document.activeElement.dataset.act === 'watch' ? '[data-act="watch"][data-id="' + id + '"]' : null);
});
RTD.on('spoilers', function () { keepFocusAfter(function () { SH.render(); rerenderPage(); }); });

/* ---------- toast ---------- */
RTD.hideToast = function () { clearTimeout(toastT); var t = $('#toast'); if (!t.hidden) { t.hidden = true; RTD.undo = null; } };
RTD.toast = function (msg, undo) {
  var t = $('#toast'); t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button type="button" class="btn ghost sm" data-act="undo">Undo</button>' : ''); t.hidden = false; RTD.undo = undo || null;
  clearTimeout(toastT); toastT = setTimeout(RTD.hideToast, 5000);
};

/* ---------- modal helper ---------- */
function openModal(html, cls) {
  if (!modalEl) modalReturn = document.activeElement; closeModal(true);
  var m = document.createElement('div'); m.className = 'modal ' + (cls || ''); m.innerHTML = '<div class="modal-card paper" role="dialog" aria-modal="true" aria-labelledby="modal-title">' + html + '</div>';
  document.body.appendChild(m); modalEl = m; document.body.classList.add('modal-open'); $('#top').setAttribute('inert', ''); $('#main').setAttribute('inert', ''); $('#sheet').setAttribute('inert', ''); $('#bbar').setAttribute('inert', '');
  var f = m.querySelector('[data-first]') || m.querySelector('button'); if (f) f.focus();
}
function closeModal(silent) {
  if (!modalEl) return; modalEl.remove(); modalEl = null; document.body.classList.remove('modal-open');
  $('#top').removeAttribute('inert'); $('#main').removeAttribute('inert'); $('#sheet').removeAttribute('inert'); $('#bbar').removeAttribute('inert');
  if (!silent && modalReturn && document.contains(modalReturn)) modalReturn.focus({ preventScroll: true }); else if (!silent && isTL(S.view)) $(S.view === 'tva' ? '#tv' : '#tl').focus({ preventScroll: true });
}
function trapTab(e) {
  if (e.key !== 'Tab' || !modalEl) return;
  var f = $$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', modalEl).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
  if (!f.length) return; var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---------- first visit: one sentence, one button ---------- */
function welcomeHTML() {
  return '<h2 id="modal-title" class="m-title" tabindex="-1">Ready for Doom</h2><p class="welcome-p">Tap a card to read it. Press Next to follow the story.</p><div class="row"><button type="button" class="btn primary big" data-act="welcome" data-first>Start</button></div>';
}
function startStory() {
  RTD.setSpoilers(true); RTD.store.set('rtd.setup', 'skip'); closeModal(true);
  if (S.g) Nv.start();
  var n = $('#bar-next'); if (n && !n.disabled) n.focus({ preventScroll: true }); else { var h = $(S.view === 'tva' ? '#tv' : '#tl'); if (h) h.focus({ preventScroll: true }); }
}
/* the watched choice lives in View */
function setupHTML() {
  return '<h2 id="modal-title" class="m-title" data-first tabindex="-1">What have you watched?</h2>' +
    '<div class="choices"><button type="button" class="choice" data-act="setup" data-v="new"><b>I am new here</b><span>Nothing marked as watched.</span></button>' +
    '<button type="button" class="choice" data-act="setup" data-v="endgame"><b>I stopped at Endgame</b><span>Marks everything up to April 2019 as watched.</span></button>' +
    '<button type="button" class="choice" data-act="setup" data-v="all"><b>I have seen it all</b><span>Marks every released story watched.</span></button></div>' +
    '<div class="row"><button type="button" class="btn ghost" data-act="modalclose">Cancel</button></div>';
}
function applySetup(v) {
  var before = Array.from(S.watched), n = 0, real = RTD.realNodes(), now = new Date();
  if (v === 'all') { real.forEach(function (x) { if (D.isOut(x, now)) { S.watched.add(x.id); n++; } }); }
  else if (v === 'endgame') { real.forEach(function (x) { if (x.release <= '2019-04-26') { S.watched.add(x.id); n++; } }); }
  else S.watched = new Set();
  RTD.store.set('rtd.setup', v); RTD.saveWatched(); closeModal(true);
  RTD.toast(v === 'new' ? 'Watched list cleared.' : 'Marked ' + n + ' stories watched.', function () { S.watched = new Set(before); RTD.saveWatched(); RTD.emit('progress'); });
  RTD.emit('progress');
}

/* ---------- menu ---------- */
function menuHTML() {
  var paths = Object.keys(RTD.PATHS).map(function (k) { return '<button type="button" class="opt" data-act="path" data-v="' + k + '" aria-pressed="' + (S.path === k) + '"><b>' + esc(RTD.PATHS[k].label) + '</b><span>' + esc(RTD.PATHS[k].hint) + '</span></button>'; }).join('');
  return '<div class="m-top"><h2 id="modal-title" class="m-title" tabindex="-1" data-first>View</h2><button type="button" class="btn ghost sm" data-act="modalclose">Done</button></div>' +
    '<h3 class="m-h">Order of the list</h3><div class="seg" role="group" aria-label="Order of the list"><button type="button" class="seg-b" data-act="order" data-v="release" aria-pressed="' + (S.order === 'release') + '">Release order</button><button type="button" class="seg-b" data-act="order" data-v="chrono" aria-pressed="' + (S.order === 'chrono') + '">Story order</button></div>' +
    '<h3 class="m-h">Your route</h3><p class="small">Stories outside your route fade on the timeline.</p><div class="opts">' + paths + '</div>' +
    '<h3 class="m-h">Spoiler shield</h3><p class="small">Plot details, theories and cast details stay behind one Show button per beat or story. Stories you have watched always show. Card titles always show.</p><button type="button" class="btn secondary" data-act="spoilers" aria-pressed="' + S.spoilers + '">' + (S.spoilers ? 'Spoilers are shown. Tap to hide.' : 'Spoilers are hidden. Tap to show all.') + '</button>' +
    '<h3 class="m-h">Your progress</h3><div class="row wrap"><button type="button" class="btn secondary" data-act="redo">What have I watched?</button><button type="button" class="btn secondary" data-act="reset">Clear all progress</button></div>' +
    RTD.extras.menuHTML() +
    '<p class="small fine">Unofficial, free fan guide. Not made by or affiliated with Marvel or Disney. Your progress is saved only in this browser. Visits are counted with Cloudflare, and anonymous taps with Umami, to improve the site. What you type is never included.</p>';
}
function openMenu() { openModal(menuHTML(), 'menu'); }
function refreshMenu() { if (modalEl && modalEl.classList.contains('menu')) { var f = document.activeElement && document.activeElement.dataset ? { a: document.activeElement.dataset.act, v: document.activeElement.dataset.v } : null; modalEl.querySelector('.modal-card').innerHTML = menuHTML(); if (f) { var t = modalEl.querySelector('[data-act="' + f.a + '"]' + (f.v != null ? '[data-v="' + f.v + '"]' : '')); if (t) t.focus(); } } }

/* ---------- search ---------- */
var searchOpen = false;
function setSearch(on) {
  searchOpen = on; var box = $('#search'), btn = $('#btn-search'); box.hidden = !on; btn.setAttribute('aria-expanded', on); document.body.classList.toggle('searching', on);
  if (on) { $('#q').focus(); runSearch(); } else { $('#q').value = ''; $('#results').innerHTML = ''; btn.focus({ preventScroll: true }); }
}
function runSearch() {
  var q = $('#q').value.trim().toLowerCase(), out = [];
  if (q.length >= 2) {
    if (S.g) S.g.beats.forEach(function (b) {
      var t = b.title.toLowerCase(), h = (b.happens || '').toLowerCase(), pe = (b.people || []).map(function (s) { return (S.person[s] || {}).character || ''; }).join(' ').toLowerCase();
      var sc = t.indexOf(q) === 0 ? 0 : t.indexOf(q) > 0 ? 1 : pe.indexOf(q) >= 0 ? 2 : h.indexOf(q) >= 0 ? 4 : 9;
      if (sc < 9) out.push({ sc: sc, t: 'beat', id: b.id, label: b.title, sub: 'Beat, chapter ' + (S.g.chIdx[b.chapter] + 1) });
    });
    S.nodes.filter(U.isMapNode).forEach(function (n) { var t = n.title.toLowerCase(); var sc = t.indexOf(q) === 0 ? 1 : t.indexOf(q) > 0 ? 2 : 9; if (sc < 9) out.push({ sc: sc, t: 'film', id: n.id, label: n.title, sub: (RTD.TYPE[n.type] || '') + ', ' + n.year }); });
    S.roster.forEach(function (p) { var s = (p.character + ' ' + (p.actor || '')).toLowerCase(); if (s.indexOf(q) >= 0) out.push({ sc: 3, t: 'person', id: p.slug, label: p.character, sub: 'Cast, ' + (RTD.STATUS[p.status] || {}).label }); });
  }
  out.sort(function (a, b) { return a.sc - b.sc; }); out = out.slice(0, 8);
  $('#results').innerHTML = out.length ? out.map(function (o) { return '<li><button type="button" class="res" data-act="searchpick" data-t="' + o.t + '" data-id="' + esc(o.id) + '"><span class="res-t">' + esc(o.label) + '</span><span class="small muted">' + esc(o.sub) + '</span></button></li>'; }).join('') : (q.length >= 2 ? '<li class="small muted res-none">No matches for that. Try a title or a character.</li>' : '<li class="small muted res-none">Type a title or a character.</li>');
  $('#results').dataset.n = out.length;
}
function pickResult(t, id) {
  setSearchQuiet();
  if (t === 'beat') SH.openBeat(id); else if (t === 'film') SH.openFilm(id); else { if (S.view !== 'map') RTD.go('map', { focus: false }); SH.openPerson(id); }
}
function setSearchQuiet() { searchOpen = false; $('#search').hidden = true; $('#btn-search').setAttribute('aria-expanded', 'false'); document.body.classList.remove('searching'); $('#q').value = ''; $('#results').innerHTML = ''; }

/* ---------- actions ---------- */
function act(a, t, e) {
  var id = t.dataset.id;
  switch (a) {
    case 'view': RTD.go(t.dataset.view); break;
    case 'home': RTD.go('map'); SH.clear(); SH.render(); Nv.sync(); RTD.tl.top(); break;
    case 'beat': SH.openBeat(id, { opener: t }); break;
    case 'gate': SH.openCore({ opener: t }); break;
    case 'open': SH.openFilm(id); break;
    case 'branch': RTD.tl.toggle(t.dataset.b); break;
    case 'openall': RTD.tl.toggleAll(); break;
    case 'lost': Nv.goTVA(); break;
    case 'simple': Nv.goMap(); break;
    case 'mode': Nv.setMode(t.dataset.v); break;
    case 'tvbranch': RTD.tv.zoomBranch(t.dataset.b); break;
    case 'whole': RTD.tv.whole(); break;
    case 'zoomin': RTD.tv.zoom(1); break;
    case 'zoomout': RTD.tv.zoom(-1); break;
    case 'bnext': SH.step(1); break;
    case 'bprev': SH.step(-1); break;
    case 'doom': SH.openDoom({ opener: t }); break;
    case 'doomtrail': SH.toggleDoomTrail(); break;
    case 'retry': RTD.reloadStory().then(function () { if (isTL(S.view)) Nv.activate(S.view); }); break;
    case 'welcome': startStory(); break;
    case 'watch': RTD.setWatched(id, !S.watched.has(id)); break;
    case 'person': SH.openPerson(t.dataset.slug); break;
    case 'closeperson': SH.closePerson(); break;
    case 'close': SH.stepOut(); break;
    case 'expand': SH.toggleFull(); break;
    case 'shield': RTD.setSpoilers(!S.spoilers); break;
    case 'spoilers': RTD.setSpoilers(!S.spoilers); refreshMenu(); break;
    case 'reveal': RTD.reveal(t.dataset.key); focusAfterReveal(); break;
    case 'core': SH.openCore(); break;
    case 'plan': RTD.go('plan'); break;
    case 'theory': V.openTheory(id); RTD.go('theories'); break;
    case 'theorytoggle': V.toggleTheory(id); break;
    case 'order': S.order = t.dataset.v; RTD.store.set('rtd.order', S.order); refreshMenu(); rerenderPage(); break;
    case 'depth': S.depth = +t.dataset.v; RTD.store.set('rtd.depth', S.depth); V.plan(); focusSame(t); break;
    case 'daily': S.daily = +t.dataset.v; RTD.store.set('rtd.daily', S.daily); V.plan(); focusSame(t); break;
    case 'castonly': V.toggleCast(t.dataset.v); focusSame(t); break;
    case 'lthread': V.toggleListThread(t.dataset.key); focusSame(t); break;
    case 'path': S.path = t.dataset.v; RTD.store.set('rtd.path', S.path); if (isTL(S.view)) Nv.sync(); refreshMenu(); break;
    case 'search': setSearch(!searchOpen); break;
    case 'searchpick': pickResult(t.dataset.t, id); break;
    case 'menu': openMenu(); break;
    case 'reload': location.reload(); break;
    case 'contact': openModal(RTD.extras.contactHTML(t.dataset.kind), 'menu'); break;
    case 'coffee': openModal(RTD.extras.donateHTML(), 'menu'); break;
    case 'modalclose': closeModal(); break;
    case 'setup': applySetup(t.dataset.v); break;
    case 'redo': closeModal(true); openModal(setupHTML(), 'setup'); break;
    case 'reset':
      if (!resetArmed) { resetArmed = setTimeout(function () { resetArmed = 0; refreshMenu(); }, 5000); t.textContent = 'Tap again to clear all progress'; t.classList.add('danger'); }
      else { clearTimeout(resetArmed); resetArmed = 0; var before = Array.from(S.watched), beforeRead = Array.from(S.read); S.watched = new Set(); RTD.saveWatched(); Nv.clearRead(); RTD.emit('progress'); closeModal(); RTD.toast('Progress cleared.', function () { S.watched = new Set(before); RTD.saveWatched(); S.read = new Set(beforeRead); RTD.store.set('rtd.read', beforeRead); RTD.emit('progress'); }); }
      break;
    case 'undo': if (RTD.undo) { RTD.undo(); $('#toast').hidden = true; RTD.undo = null; } break;
  }
}
function focusSame(t) { var q = '[data-act="' + t.dataset.act + '"]' + (t.dataset.v != null ? '[data-v="' + t.dataset.v + '"]' : t.dataset.key ? '[data-key="' + t.dataset.key + '"]' : ''); var n = $(q); if (n) n.focus({ preventScroll: true }); }
function focusAfterReveal() { var t = $('#sheet-title') && !$('#sheet').hidden ? $('#sheet-title') : ($('#v-' + S.view + ' .pg-title')); if (t) t.focus({ preventScroll: true }); }

/* ---------- events ---------- */
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-act]'); if (t && !t.disabled) { act(t.dataset.act, t, e); return; }
  var tab = e.target.closest('.tab'); if (tab) { act('view', tab, e); return; }
  if (modalEl && e.target === modalEl && !modalEl.classList.contains('welcome')) closeModal();
  var ring = e.target.closest('svg.ring');
  if (ring) { var best = null, bd = 26; Array.prototype.forEach.call(ring.querySelectorAll('circle.cd'), function (c) { var r = c.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY); if (d < bd) { bd = d; best = c; } }); if (best) SH.openPerson(best.dataset.slug); }
});
document.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.closest('.face')) t.remove(); }, true);
document.addEventListener('load', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.closest('.face')) t.parentNode.classList.add('has-img'); }, true);
document.addEventListener('keydown', function (e) {
  trapTab(e);
  if (e.key === 'Escape') {
    if (modalEl) { if (modalEl.classList.contains('welcome')) startStory(); else closeModal(); e.preventDefault(); return; }
    if (searchOpen) { setSearch(false); e.preventDefault(); return; }
    if (SH.stepOut()) { e.preventDefault(); return; }
    return;
  }
  if (document.activeElement === $('#q')) {
    if (e.key === 'Enter') { var f = $('#results .res'); if (f) { e.preventDefault(); pickResult(f.dataset.t, f.dataset.id); } }
    if (e.key === 'ArrowDown') { var r = $('#results .res'); if (r) { e.preventDefault(); r.focus(); } }
    return;
  }
  var ae = document.activeElement;
  if (ae && ae.classList && ae.classList.contains('res')) {
    if (e.key === 'ArrowDown') { e.preventDefault(); var li = ae.parentNode.nextElementSibling; if (li && li.querySelector('.res')) li.querySelector('.res').focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); var pl = ae.parentNode.previousElementSibling; (pl && pl.querySelector('.res') ? pl.querySelector('.res') : $('#q')).focus(); }
  }
});
$('#q').addEventListener('input', runSearch);
window.addEventListener('popstate', function () {
  var spare = RTD._spare; RTD._spare = false;
  if (spare && !modalEl && !SH.kind() && fromHash() === S.view) { history.back(); return; }
  RTD._pop = true;
  try { if (modalEl) closeModal(); var v = fromHash(); if (SH.kind()) SH.hideReader(); if (v !== S.view) RTD.go(v); } finally { RTD._pop = false; }
});
window.addEventListener('hashchange', function () { var v = fromHash(); if (v !== S.view) RTD.go(v); });

/* ---------- boot ---------- */
function boot() {
  RTD.loadState(); SH.init();
  RTD.loadData().then(function (ok) {
    RTD.tl.init($('#tl')); RTD.tv.init();
    if (!ok && !S.storyError) S.storyError = 'The story data did not load.';
    S.view = 'map'; var first = fromHash();
    RTD.go(first, { focus: false });
    if (isTL(first)) Nv.activate(first);
    if (S.g && !RTD.store.get('rtd.setup', null)) openModal(welcomeHTML(), 'welcome');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (S.view === 'tva') RTD.tv.rebuildFonts(); else if (S.view === 'map' && S.g) RTD.tl.build(); });
    RTD._booted = true; window.RTD_READY = true;
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
