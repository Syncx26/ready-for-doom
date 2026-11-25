/* Anonymous counts of what gets tapped, sent to Umami. Never includes anything a visitor types. */
(function () {
'use strict';
var RTD = window.RTD, S = RTD.S, q = [], tries = 0;
function flush() { if (!window.umami || !window.umami.track) { if (tries++ < 20) setTimeout(flush, 500); else q = []; return; } while (q.length) { try { window.umami.track.apply(window.umami, q.shift()); } catch (e) {} } }
function t(name, data) { if (location.hostname !== 'readyfordoom.com') return; q.push(data ? [name, data] : [name]); flush(); }
RTD.track = t;
function wrap(o, k, fn) { var f = o && o[k]; if (!f) return; o[k] = function () { var r = f.apply(this, arguments); try { fn.apply(null, arguments); } catch (e) {} return r; }; }
wrap(RTD.sheet, 'openBeat', function (id) {
  if (!S.g || !S.g.byId[id]) return;
  var n = S.g.order.indexOf(id) + 1;
  t('story event', { event: id, number: n, view: S.view, mode: S.mode });
  if (id === S.g.end) t('reached Doomsday', { mode: S.mode });
});
wrap(RTD.sheet, 'openDoom', function () { t('doom board'); });
wrap(RTD.sheet, 'openFilm', function (id) { t('film notes', { film: id }); });
wrap(RTD.sheet, 'openPerson', function (s) { t('cast profile', { person: s }); });
wrap(RTD.nav, 'goTVA', function () { t('lost button'); });
wrap(RTD.nav, 'setMode', function (m) { t('story length', { mode: m }); });
var last = 'map';
wrap(RTD, 'go', function (v) { if (v !== last) { last = v; t('page', { page: v }); } });
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href]'), b = e.target.closest && e.target.closest('[data-act]');
  if (a) { if (a.classList.contains('vid')) t('trailer', { video: a.querySelector('b').textContent }); else if (a.classList.contains('pay')) t('donate link', { to: /buymeatea/.test(a.href) ? 'chai' : 'coffee' }); return; }
  if (!b) return; var k = b.dataset.act;
  if (k === 'welcome') t('start'); else if (k === 'coffee') t('donate box'); else if (k === 'contact') t('tell us opened');
  else if (k === 'bnext') t('next'); else if (k === 'bprev') t('previous'); else if (k === 'openall') t('open all branches'); else if (k === 'search') t('search opened');
  else if (k === 'branch' || k === 'tvbranch') t('branch', { branch: b.dataset.b }); else if (k === 'theorytoggle' || k === 'theory') t('theory', { theory: b.dataset.id }); else if (k === 'doomtrail') t('doom trail');
}, true);
})();
