/* Ready for Doom v3: catch-up planner. Pure and local-date based. Never schedules past Dec 17, 2026. */
(function (root) {
'use strict';
var P = {};
var DAY = 86400000;
function sod(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function diff(a, b) { return Math.round((sod(b) - sod(a)) / DAY); }
function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
var LAST = new Date(2026, 11, 17);
P.LAST_DAY = LAST;

/* opts: nodes (already filtered and ordered), today (Date), dailyMin (0 = auto), mins(n) */
P.build = function (opts) {
  if (opts.dailyMin) return P.run(opts, opts.dailyMin);
  var items = opts.nodes || [], total = items.reduce(function (a, n) { return a + opts.mins(n); }, 0);
  var D = Math.max(0, diff(sod(opts.today || new Date()), LAST) + 1), best = null;
  var start = D ? Math.min(240, Math.max(60, Math.ceil(total / D / 30) * 30)) : 60;
  for (var B = start; B <= 240; B += 15) { best = P.run(opts, B); if (best.fits) break; }
  best = best || P.run(opts, start); best.auto = true; return best;
};
P.run = function (opts, dailyMin) {
  var today = sod(opts.today || new Date()), items = opts.nodes || [], mins = opts.mins;
  var D = Math.max(0, diff(today, LAST) + 1);
  var total = items.reduce(function (a, n) { return a + mins(n); }, 0);
  var out = { days: [], overflow: [], windowDays: D, total: total, budget: 0, auto: false, fits: true, needPerDay: 0, lastDay: LAST };
  if (!items.length) return out;
  if (D === 0) { out.overflow = items.map(function (n) { return { node: n, minutes: mins(n), reason: 'window' }; }); out.fits = false; return out; }
  var B = dailyMin;
  out.budget = B;
  out.needPerDay = Math.ceil(total / D / 15) * 15;
  var days = []; for (var i = 0; i < D; i++) days.push({ date: addDays(today, i), items: [], total: 0 });
  var di = 0, used = 0, full = false;
  function pushPart(n, m, part) { days[di].items.push({ node: n, minutes: m, part: part }); days[di].total += m; used += m; }
  items.forEach(function (n) {
    if (full) { out.overflow.push({ node: n, minutes: mins(n), reason: 'time' }); return; }
    var rel = diff(today, parse(n.release)); // cannot watch before it is out
    if (rel > D - 1) { out.overflow.push({ node: n, minutes: mins(n), reason: 'notout' }); return; }
    if (rel > di) { di = rel; used = 0; }
    var left = mins(n), split = n.type === 'series';
    if (!split) {
      if (used > 0 && used + left > B * 1.1) { di++; used = 0; }
      if (di >= D) { full = true; out.overflow.push({ node: n, minutes: left, reason: 'time' }); return; }
      pushPart(n, left, null); return;
    }
    var parts = [];
    while (left > 0) {
      var space = B - used;
      if (space < 40 && left > space) { di++; used = 0; space = B; }
      if (di >= D) { full = true; break; }
      var take = Math.min(left, space);
      if (left - take > 0 && left - take < 30) take = left;           // no tiny tail
      pushPart(n, take, 0); parts.push(days[di].items[days[di].items.length - 1]);
      left -= take;
      if (left > 0) { di++; used = 0; }
    }
    var np = parts.length + (left > 0 ? 1 : 0);
    parts.forEach(function (it, k) { it.part = np > 1 ? { i: k + 1, n: np } : null; });
    if (left > 0) out.overflow.push({ node: n, minutes: left, reason: 'time', partial: true, part: { i: np, n: np } });
  });
  out.days = days.filter(function (d) { return d.items.length; });
  out.fits = out.overflow.length === 0;
  return out;
};

if (typeof module === 'object' && module.exports) module.exports = P; else { (root.RTD = root.RTD || {}).plan = P; }
})(typeof window !== 'undefined' ? window : this);
