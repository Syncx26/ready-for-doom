/* Ready for Doom v5: the timeline model and the TVA monitor geometry. Pure functions, no DOM.
   Runs in the browser (window.RTD.tva) and in node (module.exports) for test/tva-layout.test.js.

   model():    story.json + branches.json -> one trunk, branches that leave and rejoin, one reading order.
   validate(): says in plain words what is wrong when the two files disagree.
   layout():   world coordinates for the TVA monitor. Trunk straight across the middle, branches in their own rows
               above and below, nested so lines never cross each other, every card in its own box.
               Branch names live in a label band above each row, drawn at a fixed screen size by the view. */
(function (root) {
'use strict';
var T = {};
var C = T.C = {
  CARD_W: 296, CARD_MIN_H: 100, CARD_PX: 10, CARD_PY: 8, BORDER: 3, STRIPE: 6, TITLE_PX: 15, TITLE_LH: 19, META_PX: 14, META_LH: 17,
  GAP: 24, ROWGAP: 10, STAG: 12, RUN: 200, EDGE: 8, PAD: 20,
  LABEL_H: 20, LABEL_GAP: 2, BAND_PAD: 2, LABEL_PADX: 14, EDGE_MARGIN: 8,
  READ_S: 1, MAX_S: 2.4
};
var SAFE = /^#[0-9a-f]{3,8}$/i;

/* ---------- text ---------- */
T.estimate = function (t, px, bold) { return String(t).length * px * (bold ? 0.6 : 0.54); };
T.wrap = function (txt, maxW, px, bold, measure) {
  measure = measure || T.estimate;
  var words = String(txt == null ? '' : txt).split(/\s+/).filter(Boolean), lines = [], cur = '';
  words.forEach(function (w) {
    var t = cur ? cur + ' ' + w : w;
    if (measure(t, px, bold) <= maxW) { cur = t; return; }
    if (cur) lines.push(cur);
    cur = '';
    if (measure(w, px, bold) > maxW) {
      var piece = '';
      for (var i = 0; i < w.length; i++) { if (measure(piece + w[i], px, bold) > maxW && piece) { lines.push(piece); piece = w[i]; } else piece += w[i]; }
      cur = piece;
    } else cur = w;
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
};

/* ---------- validate: story.json against branches.json ---------- */
T.validate = function (story, br) {
  var err = [];
  if (!story || typeof story !== 'object' || !Array.isArray(story.beats) || !story.beats.length) return ['story.json has no events.'];
  if (!Array.isArray(story.chapters) || !story.chapters.length) err.push('story.json has no chapters.');
  if (!Array.isArray(story.lanes)) err.push('story.json has no lanes.');
  if (!Array.isArray(story.links)) err.push('story.json has no links.');
  if (!br || typeof br !== 'object') return err.concat(['branches.json is empty or not an object.']);
  if (!Array.isArray(br.trunk) || !br.trunk.length) err.push('branches.json has no "trunk" list.');
  if (!Array.isArray(br.branches)) err.push('branches.json has no "branches" list.');
  if (err.length) return err;
  var ids = {}, seen = {}, end = story.end || 'doomsday', tIdx = {}, chap = {};
  story.chapters.forEach(function (c) { chap[c.id] = true; });
  story.beats.forEach(function (b) {
    if (ids[b.id]) err.push('story.json lists "' + b.id + '" twice.'); ids[b.id] = b;
    if (typeof b.title !== 'string' || !b.title) err.push('story.json event "' + b.id + '" has no title.');
    if (!chap[b.chapter]) err.push('story.json event "' + b.id + '" is in an unknown chapter "' + b.chapter + '".');
    if (typeof b.order !== 'number') err.push('story.json event "' + b.id + '" has no order number.');
  });
  if (!ids[story.start]) err.push('story.json start event "' + story.start + '" is not an event.');
  story.links.forEach(function (l) {
    if (!ids[l.from]) err.push('story.json has a link from "' + l.from + '", which is not an event.');
    else if (!ids[l.to]) err.push('story.json has a link to "' + l.to + '", which is not an event.');
    else {
      if (!l.because) err.push('story.json link ' + l.from + ' to ' + l.to + ' has no "because" sentence.');
      if (ids[l.to].order <= ids[l.from].order) err.push('story.json link ' + l.from + ' to ' + l.to + ' does not point forward in time.');
    }
  });
  function claim(id, where) {
    if (typeof id !== 'string' || !ids[id]) err.push(where + ' names "' + id + '", which is not an event in story.json.');
    else if (seen[id]) err.push('"' + id + '" is placed twice in branches.json (' + seen[id] + ' and ' + where + ').');
    else seen[id] = where;
  }
  br.trunk.forEach(function (id, i) { claim(id, 'trunk'); tIdx[id] = i; });
  if (br.trunk[br.trunk.length - 1] !== end) err.push('The trunk must finish at "' + end + '" but ends at "' + br.trunk[br.trunk.length - 1] + '".');
  for (var i = 1; i < br.trunk.length; i++) { var a = ids[br.trunk[i - 1]], b = ids[br.trunk[i]]; if (a && b && b.order <= a.order) err.push('Trunk event "' + b.id + '" comes before "' + a.id + '" in story.json order.'); }
  var bid = {};
  br.branches.forEach(function (x, k) {
    var nm = 'branch ' + (x && x.id ? x.id : '#' + (k + 1));
    if (!x || typeof x !== 'object') { err.push(nm + ' is not an object.'); return; }
    if (typeof x.id !== 'string' || !x.id) err.push(nm + ' has no id.'); else if (bid[x.id]) err.push('Branch id "' + x.id + '" is used twice.'); bid[x.id] = true;
    ['title', 'because', 'ending'].forEach(function (f) { if (typeof x[f] !== 'string' || !x[f]) err.push(nm + ' has no "' + f + '" sentence.'); });
    if (!SAFE.test(x.color || '')) err.push(nm + ' has a colour that is not a hex code.');
    if (typeof x.separate !== 'boolean') err.push(nm + ' needs "separate" to be true or false.');
    if (!(x.leaves in tIdx)) err.push(nm + ' leaves from "' + x.leaves + '", which is not a trunk event.');
    if (!(x.rejoins in tIdx)) err.push(nm + ' rejoins at "' + x.rejoins + '", which is not a trunk event.');
    else if (x.leaves in tIdx && tIdx[x.rejoins] <= tIdx[x.leaves]) err.push(nm + ' rejoins at "' + x.rejoins + '", which is not after "' + x.leaves + '".');
    if (!Array.isArray(x.beats) || !x.beats.length) { err.push(nm + ' has no events.'); return; }
    var prev = null;
    x.beats.forEach(function (id) {
      claim(id, nm); var e = ids[id];
      if (e && prev && e.order <= prev.order) err.push(nm + ' lists "' + id + '" before an event that happens earlier.');
      prev = e || prev;
    });
  });
  story.beats.forEach(function (b) { if (!seen[b.id]) err.push('story.json event "' + b.id + '" is not in branches.json, so it would never be drawn.'); });
  return err;
};

/* ---------- model ---------- */
T.model = function (story, br) {
  var m = { story: story, br: br, end: story.end || 'doomsday', byId: {}, beats: [], kids: {}, pars: {}, chapters: [], chById: {}, chIdx: {}, lanes: story.lanes, trunk: br.trunk.slice(), trunkIdx: {}, branches: [], branchOf: {}, order: [], ordIdx: {}, shortOrder: [], shortIdx: {} };
  m.beats = story.beats.slice().sort(function (a, b) { return (a.order - b.order) || (a.id < b.id ? -1 : 1); });
  m.beats.forEach(function (b) { m.byId[b.id] = b; m.kids[b.id] = []; m.pars[b.id] = []; });
  story.links.forEach(function (l) { if (m.byId[l.from] && m.byId[l.to]) { m.kids[l.from].push(l); m.pars[l.to].push(l); } });
  m.chapters = story.chapters.slice().sort(function (a, b) { return a.n - b.n; });
  m.chapters.forEach(function (c, i) { m.chById[c.id] = c; m.chIdx[c.id] = i; });
  m.trunk.forEach(function (id, i) { m.trunkIdx[id] = i; });
  br.branches.forEach(function (x, i) {
    var o = { id: x.id, title: x.title, color: SAFE.test(x.color) ? x.color : '#a7b4c6', because: x.because, ending: x.ending, separate: !!x.separate, leaves: x.leaves, rejoins: x.rejoins, beats: x.beats.slice(), i: i, li: m.trunkIdx[x.leaves], ri: m.trunkIdx[x.rejoins] };
    m.branches.push(o); o.beats.forEach(function (id) { m.branchOf[id] = o.id; });
  });
  m.branchById = {}; m.branches.forEach(function (o) { m.branchById[o.id] = o; });
  /* one reading order: trunk in order; each branch straight after the trunk event it leaves from, in file order */
  m.trunk.forEach(function (id) {
    m.order.push(id);
    m.branches.forEach(function (o) { if (o.leaves === id) o.beats.forEach(function (x) { m.order.push(x); }); });
  });
  m.order.forEach(function (id, i) { m.ordIdx[id] = i; });
  m.order.forEach(function (id) { if (m.byId[id].key || id === m.order[0] || id === m.end) { m.shortIdx[id] = m.shortOrder.length; m.shortOrder.push(id); } });
  m.startId = m.order[0];
  return m;
};

/* ---------- geometry ---------- */
/* which side of the trunk, and how far out. Nested branches sit closer, so no two lines cross. */
T.sides = function (m) {
  var list = m.branches.slice().sort(function (a, b) { return (a.li - b.li) || (b.ri - a.ri) || (a.i - b.i); });
  var side = { '-1': [], '1': [] }, out = {};
  list.forEach(function (b) {
    var cand = [-1, 1].map(function (s) {
      var act = side[s].filter(function (x) { return x.ri > b.li; });
      return { s: s, active: act.length, total: side[s].length, bad: act.filter(function (x) { return x.ri < b.ri; }).length };
    });
    cand.sort(function (p, q) { return (p.bad - q.bad) || (p.active - q.active) || (p.total - q.total) || (q.s - p.s); });
    side[cand[0].s].push(b); out[b.id] = cand[0].s;
  });
  var res = {};
  [-1, 1].forEach(function (s) {
    var arr = side[s].slice().sort(function (a, b) { return (b.ri - a.ri) || (a.li - b.li) || (a.i - b.i); });
    arr.forEach(function (b, k) { res[b.id] = { side: s, dist: arr.length - k, rank: k }; });
    res['n' + s] = arr.length;
  });
  return res;
};

T.cardHeight = function (m, o) {
  var measure = o.measure || T.estimate, inner = C.CARD_W - 2 * C.CARD_PX - 2 * C.BORDER - C.STRIPE, H = C.CARD_MIN_H;
  m.order.forEach(function (id) {
    var b = m.byId[id], tl = T.wrap(b.title, inner, C.TITLE_PX, true, measure).length, ml = T.wrap(o.meta ? o.meta(b) : (b.when || ''), inner - 4, C.META_PX, false, measure).length;
    H = Math.max(H, 2 * C.BORDER + 2 * C.CARD_PY + tl * C.TITLE_LH + 4 + ml * C.META_LH);
  });
  return Math.ceil(H);
};

/* o: { vw, vh, measure, meta }. vw and vh are the drawing area with nothing covering it. */
T.layout = function (m, o) {
  o = o || {};
  var W = C.CARD_W, H = T.cardHeight(m, o), vw = o.vw || 1280, vh = o.vh || 560, n = m.trunk.length;
  var sd = T.sides(m);
  var outC = [], inC = [], i;
  for (i = 0; i < n; i++) { outC[i] = { '-1': 0, '1': 0 }; inC[i] = { '-1': 0, '1': 0 }; }
  m.branches.forEach(function (b) { outC[b.li][sd[b.id].side]++; inC[b.ri][sd[b.id].side]++; });
  function mx(c) { return Math.max(c['-1'], c['1']); }
  function lead(k) { var c = mx(outC[k]); return c ? 14 + C.STAG * (c - 1) + C.RUN + 16 : 0; }
  function appr(k) { var c = mx(inC[k]); return c ? C.EDGE + C.STAG * (c - 1) + C.RUN + 16 : 0; }
  function minGap(k) { var c1 = mx(outC[k]), c2 = mx(inC[k + 1]); return W + 24 + (c1 ? 14 + C.STAG * (c1 - 1) + 0.4 * C.RUN : 0) + (c2 ? C.EDGE + C.STAG * (c2 - 1) + 0.4 * C.RUN : 0); }
  var X = [C.PAD + W / 2];
  for (i = 1; i < n; i++) {
    var x = X[i - 1] + minGap(i - 1);
    m.branches.forEach(function (b) { if (b.ri === i) { var k = b.beats.length; x = Math.max(x, X[b.li] + W + lead(b.li) + appr(i) + k * W + (k - 1) * C.GAP); } });
    X[i] = x;
  }
  var WD = X[n - 1] + W / 2 + C.PAD;
  var Kup = sd['n-1'], Kdn = sd['n1'], N = Kup + Kdn + 1, Lb = C.LABEL_H + C.BAND_PAD;
  var sw = (vw - 2 * C.PAD) / WD, sh = (((vh - 2 * C.PAD) / N) - Lb) / (H + C.ROWGAP);
  var s = Math.max(0.01, Math.min(1, sw, sh));
  var band = Lb / s, pitch = H + C.ROWGAP + band, HD = N * pitch - C.ROWGAP;
  function rowCenter(row) { return row * pitch + band + H / 2; }
  var trunkY = rowCenter(Kup);
  var cards = [], lines = [], labels = [], byCard = {};
  function addCard(id, x, cy, kind, br) { var c = { id: id, x: x, y: cy - H / 2, w: W, h: H, cx: x + W / 2, cy: cy, kind: kind, branch: br }; cards.push(c); byCard[id] = c; return c; }
  m.trunk.forEach(function (id, k) { addCard(id, X[k] - W / 2, trunkY, id === m.end ? 'end' : 'trunk', null); });
  labels.push({ id: '_trunk', branch: null, text: 'Main timeline', color: '#ffb347', ax: X[0] - W / 2, ay: trunkY - H / 2, x1: X[n - 1] + W / 2, trunk: true });
  var leaveRank = {}, joinRank = {};
  [-1, 1].forEach(function (s0) {
    var arr = m.branches.filter(function (b) { return sd[b.id].side === s0; }).sort(function (a, b) { return sd[a.id].rank - sd[b.id].rank; });
    arr.forEach(function (b) { var key = b.li + ':' + s0; leaveRank[key] = (leaveRank[key] == null ? 0 : leaveRank[key] + 1); b._lr = leaveRank[key]; });
    arr.forEach(function (b) { var key = b.ri + ':' + s0; joinRank[key] = (joinRank[key] == null ? 0 : joinRank[key] + 1); b._jr = joinRank[key]; });
  });
  m.branches.forEach(function (b) {
    var d = sd[b.id], row = d.side < 0 ? Kup - d.dist : Kup + d.dist, cy = rowCenter(row), k = b.beats.length;
    var first = X[b.li] + W / 2 + lead(b.li), x0 = X[b.li] + W / 2;
    b.beats.forEach(function (id, j) { addCard(id, first + j * (W + C.GAP), cy, 'branch', b.id); });
    var lastRight = first + k * W + (k - 1) * C.GAP;
    var xl = x0 + 14 + C.STAG * b._lr;
    var xm = X[b.ri] - W / 2 - C.EDGE - C.STAG * b._jr, xd = xm - C.RUN, x1 = X[b.ri] - W / 2;
    var seg = [['M', x0, trunkY], ['L', xl, trunkY], ['C', xl + C.RUN / 2, trunkY, xl + C.RUN / 2, cy, xl + C.RUN, cy], ['L', xd, cy], ['C', xd + C.RUN / 2, cy, xd + C.RUN / 2, trunkY, xm, trunkY], ['L', x1, trunkY]];
    lines.push({ id: b.id, branch: b.id, from: b.leaves, to: b.rejoins, color: b.color, separate: b.separate, segs: seg, d: T.pathD(seg), row: row, cy: cy, x0: x0, x1: x1, y: trunkY, xFirst: first, xLast: lastRight, xl: xl, xd: xd, xm: xm });
    labels.push({ id: b.id, branch: b.id, text: b.title, color: b.color, ax: first, ay: cy - H / 2, x1: lastRight });
  });
  var trunkSeg = [['M', C.PAD / 2, trunkY], ['L', WD - C.PAD / 2, trunkY]];
  var L = { W: WD, H: HD, s: s, cardW: W, cardH: H, band: band, pitch: pitch, trunkY: trunkY, rows: N, cards: cards, byCard: byCard, lines: lines, trunkLine: { d: T.pathD(trunkSeg), segs: trunkSeg }, labels: labels, sides: sd, X: X, vw: vw, vh: vh };
  L.fit = T.clamp(L, { s: s, tx: (vw - WD * s) / 2, ty: (vh - HD * s) / 2 }, vw, vh);
  return L;
};
T.pathD = function (segs) { return segs.map(function (g) { return g[0] + g.slice(1).map(function (v) { return (Math.round(v * 10) / 10); }).join(' '); }).join(''); };

/* keep the drawing on screen: smaller than the screen means centred, bigger means no empty space past the edge */
T.clamp = function (L, tf, vw, vh) {
  var s = Math.max(L.fit ? L.fit.s : L.s, Math.min(C.MAX_S, tf.s)), tx = tf.tx, ty = tf.ty, w = L.W * s, h = L.H * s, m = C.EDGE_MARGIN;
  /* zoomed in, the edges may slide a little way into the screen so a card on the edge can still be centred */
  var sx = Math.max(m, 0.4 * vw), sy = Math.max(m, 0.4 * vh);
  tx = w <= vw - 2 * m ? (vw - w) / 2 : Math.min(sx, Math.max(vw - w - sx, tx));
  ty = h <= vh - 2 * m ? (vh - h) / 2 : Math.min(sy, Math.max(vh - h - sy, ty));
  return { s: s, tx: tx, ty: ty };
};
T.centerOn = function (L, wx, wy, s, vw, vh) { return T.clamp(L, { s: s, tx: vw / 2 - wx * s, ty: vh / 2 - wy * s }, vw, vh); };
/* zoom to one branch: text at least 14px, first card at the left, row in the middle of the screen */
T.focusBranch = function (L, id, vw, vh) {
  var cs = L.cards.filter(function (c) { return c.branch === id; });
  if (!cs.length) return L.fit;
  var x0 = Math.min.apply(null, cs.map(function (c) { return c.x; })), x1 = Math.max.apply(null, cs.map(function (c) { return c.x + c.w; })), cy = cs[0].cy;
  var s = Math.max(C.READ_S, Math.min(1.4, (vw - 2 * C.PAD) / (x1 - x0)));
  var tx = x1 - x0 <= (vw - 2 * C.PAD) / s ? vw / 2 - ((x0 + x1) / 2) * s : C.PAD - x0 * s;
  return T.clamp(L, { s: s, tx: tx, ty: vh / 2 - (cy - 14) * s }, vw, vh);
};
T.focusCard = function (L, id, vw, vh, s) { var c = L.byCard[id]; if (!c) return L.fit; return T.centerOn(L, c.cx, c.cy, Math.max(C.READ_S, s || C.READ_S), vw, vh); };

/* label rectangle on screen for a transform; width is the real text width plus padding */
T.labelRect = function (L, lab, tf, vw, w) {
  var sx = lab.ax * tf.s + tf.tx, sy = lab.ay * tf.s + tf.ty, ex = lab.x1 * tf.s + tf.tx, x = sx;
  if (x < C.EDGE_MARGIN) x = C.EDGE_MARGIN;
  if (x + w > ex) x = ex - w;
  if (x + w > vw - C.EDGE_MARGIN) x = vw - C.EDGE_MARGIN - w;
  if (x < C.EDGE_MARGIN) x = C.EDGE_MARGIN;
  return { x: x, y: sy - C.LABEL_GAP - C.LABEL_H, w: w, h: C.LABEL_H };
};
T.labelWidth = function (text, measure) { return Math.ceil((measure || T.estimate)(text, 14, true)) + C.LABEL_PADX * 2; };

/* ---------- checks, used by the test and by the view in debug ---------- */
function ov(a, b, e) { e = e || 0; return a.x < b.x + b.w - e && b.x < a.x + a.w - e && a.y < b.y + b.h - e && b.y < a.y + a.h - e; }
T.flatten = function (segs) {
  var pts = [], cur = null;
  segs.forEach(function (g) {
    if (g[0] === 'M') { cur = [g[1], g[2]]; pts.push(cur); }
    else if (g[0] === 'L') { cur = [g[1], g[2]]; pts.push(cur); }
    else { var p0 = cur; for (var t = 1; t <= 24; t++) { var u = t / 24, v = 1 - u; cur = [v * v * v * p0[0] + 3 * v * v * u * g[1] + 3 * v * u * u * g[3] + u * u * u * g[5], v * v * v * p0[1] + 3 * v * v * u * g[2] + 3 * v * u * u * g[4] + u * u * u * g[6]]; pts.push(cur); } }
  });
  return pts;
};
T.check = function (m, L, vp, lw) {
  var bad = [], i, j, tf = L.fit, vw = vp.vw, vh = vp.vh;
  lw = lw || function (t) { return T.labelWidth(t); };
  var seen = {}; L.cards.forEach(function (c) { if (seen[c.id]) bad.push('card drawn twice ' + c.id); seen[c.id] = 1; });
  m.beats.forEach(function (b) { if (!seen[b.id]) bad.push('event missing from the drawing: ' + b.id); });
  if (L.cards.length !== m.beats.length) bad.push('card count ' + L.cards.length + ' is not ' + m.beats.length);
  for (i = 0; i < L.cards.length; i++) {
    var a = L.cards[i];
    if (a.x < 0 || a.y < 0 || a.x + a.w > L.W + 0.5 || a.y + a.h > L.H + 0.5) bad.push('card outside the drawing ' + a.id);
    for (j = i + 1; j < L.cards.length; j++) if (ov(a, L.cards[j])) bad.push('cards overlap ' + a.id + ' and ' + L.cards[j].id);
  }
  /* fitted: everything on screen, labels clear of each other and of every card */
  var sc = L.cards.map(function (c) { return { id: c.id, x: c.x * tf.s + tf.tx, y: c.y * tf.s + tf.ty, w: c.w * tf.s, h: c.h * tf.s }; });
  sc.forEach(function (c) { if (c.x < -0.5 || c.y < -0.5 || c.x + c.w > vw + 0.5 || c.y + c.h > vh + 0.5) bad.push('fitted card off screen ' + c.id); });
  var lr = L.labels.map(function (l) { var r = T.labelRect(L, l, tf, vw, lw(l.text)); r.id = l.id; return r; });
  lr.forEach(function (r) { if (r.x < 0 || r.y < 0 || r.x + r.w > vw || r.y + r.h > vh) bad.push('fitted label off screen ' + r.id); });
  for (i = 0; i < lr.length; i++) {
    for (j = i + 1; j < lr.length; j++) if (ov(lr[i], lr[j])) bad.push('labels overlap ' + lr[i].id + ' and ' + lr[j].id);
    for (j = 0; j < sc.length; j++) if (ov(lr[i], sc[j])) bad.push('label ' + lr[i].id + ' covers card ' + sc[j].id);
  }
  /* readable zoom on every branch: the label sits above its own row, clear of every card */
  L.labels.forEach(function (l) {
    if (l.trunk) return;
    var f = T.focusBranch(L, l.id, vp.vw, vp.vh), cs = L.cards.map(function (c) { return { id: c.id, x: c.x * f.s + f.tx, y: c.y * f.s + f.ty, w: c.w * f.s, h: c.h * f.s }; });
    var r = T.labelRect(L, l, f, vp.vw, lw(l.text));
    cs.forEach(function (c) { if (ov(r, c)) bad.push('zoomed label ' + l.id + ' covers card ' + c.id); });
    if (f.s < C.READ_S - 1e-9) bad.push('branch zoom below readable size ' + l.id);
  });
  /* the data's own words: where each branch leaves and rejoins */
  m.branches.forEach(function (b) {
    var ln = L.lines.filter(function (x) { return x.id === b.id; })[0], lv = L.byCard[b.leaves], rj = L.byCard[b.rejoins];
    if (!ln) { bad.push('no line for ' + b.id); return; }
    if (ln.from !== b.leaves || ln.to !== b.rejoins) bad.push('line ' + b.id + ' joins the wrong events');
    if ((Math.abs(ln.x0 - (lv.x + lv.w)) > 0.01 || Math.abs(ln.y - lv.cy) > 0.01)) bad.push('line ' + b.id + ' does not leave from the right edge of ' + b.leaves);
    if (Math.abs(ln.x1 - rj.x) > 0.01 || Math.abs(ln.y - rj.cy) > 0.01) bad.push('line ' + b.id + ' does not arrive at the left edge of ' + b.rejoins);
    var cs = b.beats.map(function (id) { return L.byCard[id]; });
    if (cs[0].x < lv.x + lv.w || cs[cs.length - 1].x + cs[cs.length - 1].w > rj.x) bad.push('branch ' + b.id + ' cards are not between where it leaves and rejoins');
    for (var k = 1; k < cs.length; k++) if (cs[k].x < cs[k - 1].x + cs[k - 1].w) bad.push('branch ' + b.id + ' cards out of order');
  });
  /* no line runs through a card that is not its own, and no two branch lines cross */
  var polys = L.lines.map(function (ln) { return { id: ln.id, pts: T.flatten(ln.segs), from: ln.from, to: ln.to }; });
  polys.forEach(function (p) {
    L.cards.forEach(function (c) {
      var mine = c.branch === p.id || c.id === p.from || c.id === p.to;
      if (mine) return;
      for (var q = 0; q < p.pts.length; q++) if (p.pts[q][0] > c.x + 0.5 && p.pts[q][0] < c.x + c.w - 0.5 && p.pts[q][1] > c.y + 0.5 && p.pts[q][1] < c.y + c.h - 0.5) { bad.push('line ' + p.id + ' runs through card ' + c.id); break; }
    });
  });
  function cross(a, b, c, d) { function o(p, q, r) { return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); } var d1 = o(a, b, c), d2 = o(a, b, d), d3 = o(c, d, a), d4 = o(c, d, b); return ((d1 > 1e-6 && d2 < -1e-6) || (d1 < -1e-6 && d2 > 1e-6)) && ((d3 > 1e-6 && d4 < -1e-6) || (d3 < -1e-6 && d4 > 1e-6)); }
  for (i = 0; i < polys.length; i++) for (j = i + 1; j < polys.length; j++) {
    var A = polys[i].pts, B = polys[j].pts, hit = false;
    for (var p = 0; p < A.length - 1 && !hit; p++) for (var q2 = 0; q2 < B.length - 1; q2++) if (cross(A[p], A[p + 1], B[q2], B[q2 + 1])) { hit = true; break; }
    if (hit) bad.push('lines cross: ' + polys[i].id + ' and ' + polys[j].id);
  }
  return bad;
};

if (typeof module === 'object' && module.exports) module.exports = T; else { var R0 = root.RTD = root.RTD || {}; R0.tva = T; }
})(typeof window !== 'undefined' ? window : this);
