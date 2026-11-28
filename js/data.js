/* Ready for Doom v4: data, state, helpers. Classic script; everything hangs off window.RTD. */
(function () {
'use strict';
var RTD = window.RTD = window.RTD || {};

/* ---------- constants ---------- */
RTD.THREADS = {
  infinity:    { label:'Infinity Saga',          short:'Infinity',     c:'#ffb52e', note:'The Infinity Saga: the Stones, Thanos, and the heroes whose legacies Doomsday leans on.' },
  multiverse:  { label:'Multiverse and TVA',     short:'Multiverse',   c:'#a878ff', note:'Variants, branching timelines, incursions and the TVA. The machinery behind Doomsday.' },
  doom:        { label:'Doom and Fantastic Four',short:'Doom',  c:'#25c26e', note:'Victor Von Doom, and the Fantastic Four from Earth-828.' },
  mutants:     { label:'Mutants and X-Men',      short:'X-Men',        c:'#ffe14a', note:'The X-Men, from the old Fox films to X-Men ’97 and Deadpool and Wolverine.' },
  newavengers: { label:'New Avengers',           short:'New Avengers', c:'#ff7a3d', note:'Yelena, Bucky, Red Guardian, US Agent, Ghost and Bob: the Thunderbolts crew under a new banner.' },
  cap:         { label:'Captain America and Ross',short:'Cap and Ross',c:'#4a94ff', note:'Sam Wilson’s shield, Thaddeus Ross’s presidency, and who gets to call themselves Avengers.' },
  spider:      { label:'Spider-Man',             short:'Spider-Man',   c:'#ff5f8f', note:'Peter Parker, after the world forgot him.' },
  cosmic:      { label:'Cosmic',                 short:'Cosmic',       c:'#22d0d6', note:'Guardians, Celestials, Captain Marvel and the Ten Rings. The big-universe pieces.' },
  wakanda:     { label:'Wakanda and Talokan',    short:'Wakanda',      c:'#c66bff', note:'Shuri, M’Baku and Namor.' },
  wanda:       { label:'Wanda and Vision',       short:'Wanda',        c:'#ff4747', note:'The Scarlet Witch, Vision, Agatha and the Maximoff twins.' },
  magic:       { label:'Strange and magic',      short:'Magic',        c:'#7f8dff', note:'Doctor Strange, the Darkhold, and the magic side of the multiverse.' },
  street:      { label:'Street level',           short:'Street',       c:'#a7b4c6', note:'Daredevil, Hawkeye, Echo, Moon Knight and the heroes on the ground.' }
};
RTD.PHASES = {
  0:{ t:'Before the MCU', short:'Before', p:'Context from other studios that Doomsday now leans on.', from:'2000-01-01' },
  1:{ t:'Phase One',   short:'Phase One',   p:'2008 to 2012. Assembling the first team.', from:'2008-05-02' },
  2:{ t:'Phase Two',   short:'Phase Two',   p:'2013 to 2015. Cracks, Hydra, Ultron.', from:'2013-05-03' },
  3:{ t:'Phase Three', short:'Phase Three', p:'2016 to 2019. Civil War to Endgame.', from:'2016-05-06' },
  4:{ t:'Phase Four',  short:'Phase Four',  p:'2021 to 2022. The multiverse opens.', from:'2021-01-15' },
  5:{ t:'Phase Five',  short:'Phase Five',  p:'2023 to 2025. The runway to Doom.', from:'2023-02-17' },
  6:{ t:'Phase Six',   short:'Phase Six',   p:'2025 to 2026. The Fantastic Four arrive. Then Doomsday.', from:'2025-07-25' }
};
RTD.ESS = { 3:'Essential', 2:'Helpful', 1:'Background' };
RTD.TYPE = { film:'Film', series:'Series', special:'Special', context:'Context' };
RTD.TEAMS = {
  'villain':       { t:'Doom', p:'Victor Von Doom, played by Robert Downey Jr.' },
  'avengers':      { t:'The Avengers', p:'Sam Wilson’s team, plus the legends being pulled back in.' },
  'new-avengers':  { t:'The New Avengers', p:'Valentina’s rebranded Thunderbolts, and friends.' },
  'fantastic-four':{ t:'The Fantastic Four', p:'From Earth-828. Their ship was the last shot of Thunderbolts*.' },
  'x-men':         { t:'The X-Men', p:'The original film cast, back from a universe that may be dying.' },
  'wakanda':       { t:'Wakanda and Talokan', p:'Shuri, M’Baku, Namor and company.' },
  'wildcard':      { t:'Wildcards', p:'Everyone else: confirmed solo players, big maybes and fan hopes.' }
};
RTD.TEAM_ORDER = ['villain','avengers','new-avengers','fantastic-four','x-men','wakanda','wildcard'];
RTD.STATUS = {
  confirmed:{ label:'Confirmed by Marvel', short:'Confirmed', rank:0 },
  reported: { label:'Reported', short:'Reported', rank:1 },
  rumored:  { label:'Rumored', short:'Rumored', rank:2 },
  hoped:    { label:'Fan hope', short:'Fan hope', rank:3 }
};
RTD.PATHS = {
  all:  { label:'Everything', hint:'All stories' },
  ess:  { label:'Essentials only', hint:'The must-watch core' },
  lost: { label:'I stopped after Endgame', hint:'Helpful and up since 2021' },
  fresh:{ label:'2025 to 2026 refresher', hint:'Just the recent run' }
};

/* ---------- small helpers ---------- */
var U = RTD.util = {};
U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); };
U.initials = function (n) { return String(n || '?').split(/[\s\/]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); };
U.isCore = function (n) { return n.id === 'avengers-doomsday'; };
U.isMapNode = function (n) { return n.id !== 'avengers-doomsday' && n.id !== 'avengers-secret-wars'; };
U.isReal = function (n) { return U.isMapNode(n) && n.type !== 'context'; };
U.color = function (n) { var t = RTD.THREADS[(n.threads || [])[0]]; return t ? t.c : '#a7b4c6'; };
U.mins = function (n) { return typeof n.runtime === 'number' && n.runtime > 0 ? n.runtime : (n.type === 'film' ? 130 : n.type === 'special' ? 50 : n.type === 'context' ? 0 : 300); };
/* "2 h 6 min", or "about 6 h" when the runtime is flagged as an estimate */
U.dur = function (m, est) {
  m = Math.round(m);
  if (est) {
    if (m < 90) return 'about ' + (Math.round(m / 5) * 5) + ' min';
    var h = Math.round(m / 30) / 2;
    return 'about ' + h + ' h';
  }
  if (m < 60) return m + ' min';
  var hh = Math.floor(m / 60), mm = m % 60;
  return hh + ' h' + (mm ? ' ' + mm + ' min' : '');
};
U.nodeDur = function (n) { return U.dur(U.mins(n), n.runtimeEstimated === true); };
U.labelTitle = function (t) {
  t = String(t || '').replace(/\s*\([^)]*\)\s*$/, '');
  var m = /^Doctor Strange in the (.+)$/.exec(t); if (m) return m[1];
  var i = t.indexOf(': '); if (i > 0 && t.length - i - 2 >= 6) t = t.slice(i + 2);
  return t.replace(/^The /, '');
};
U.shortTitle = function (t, max) {
  t = String(t || '');
  if (t.length <= max) return t;
  var cut = t.slice(0, max - 1), sp = cut.lastIndexOf(' ');
  if (sp > max * 0.55) cut = cut.slice(0, sp);
  return cut.replace(/[\s:,\-]+$/, '') + '…';
};

/* ---------- dates: always local ---------- */
var D = RTD.dates = {};
D.startOfDay = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
D.addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
D.diffDays = function (a, b) { return Math.round((D.startOfDay(b) - D.startOfDay(a)) / 86400000); };
D.parse = function (s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
D.RELEASE = new Date(2026, 11, 18);
D.LAST_PLAN_DAY = new Date(2026, 11, 17);
D.daysToRelease = function (now) { return D.diffDays(now || new Date(), D.RELEASE); };
D.windowDays = function (now) { var n = D.diffDays(now || new Date(), D.LAST_PLAN_DAY) + 1; return n > 0 ? n : 0; };
D.fmt = function (d, o) { try { return d.toLocaleDateString(undefined, o); } catch (e) { return d.toDateString(); } };
D.label = function (d, i) {
  if (i === 0) return 'Today';
  if (i === 1) return 'Tomorrow';
  return D.fmt(d, { weekday: 'short' });
};
D.isOut = function (n, now) { return D.parse(n.release) <= D.startOfDay(now || new Date()); };

/* ---------- storage: every touch in try/catch ---------- */
RTD.store = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ---------- state + tiny event bus ---------- */
var S = RTD.S = {
  nodes: [], roster: [], theories: [], byId: {}, person: {}, earths: null,
  story: null, g: null, storyError: '',
  watched: new Set(), read: new Set(), mode: 'full', tlView: 'map', openAll: false, spoilers: false, order: 'release', path: 'all', depth: 3, daily: 0,
  view: 'map', sel: null, reader: false, core: false, film: null, doomOpen: false, doomTrail: false, revealed: new Set(), loaded: false
};
var handlers = {};
RTD.on = function (e, f) { (handlers[e] = handlers[e] || []).push(f); };
RTD.emit = function (e, a) { (handlers[e] || []).slice().forEach(function (f) { try { f(a); } catch (err) { if (window.console) console.error(e, err); } }); };

RTD.loadState = function () {
  S.watched = new Set(RTD.store.get('rtd.watched', []));
  S.spoilers = RTD.store.get('rtd.spoilers', false) === true;
  S.path = RTD.store.get('rtd.path', 'all'); if (!RTD.PATHS[S.path]) S.path = 'all';
  S.depth = +RTD.store.get('rtd.depth', 3); if ([1, 2, 3].indexOf(S.depth) < 0) S.depth = 3;
  S.order = RTD.store.get('rtd.order', 'release') === 'chrono' ? 'chrono' : 'release';
  S.daily = +RTD.store.get('rtd.daily', 0) || 0;
  var rv = RTD.store.get('rtd.revealed', []); S.revealed = new Set(Array.isArray(rv) ? rv : []);
  var rd = RTD.store.get('rtd.read', []); S.read = new Set(Array.isArray(rd) ? rd.filter(function (x) { return typeof x === 'string'; }) : []);
  S.mode = RTD.store.get('rtd.mode', 'full') === 'short' ? 'short' : 'full';
  S.tlView = RTD.store.get('rtd.tlview', 'map') === 'tva' ? 'tva' : 'map';
};
RTD.reveal = function (key) { S.revealed.add(key); RTD.store.set('rtd.revealed', Array.from(S.revealed)); RTD.emit('spoilers'); };
RTD.manifest = new Set();
/* optional assets/characters/manifest.json: an array of slugs that have a PNG. Read once; nothing else is requested. */
RTD.loadManifest = function () { return RTD.fetchJSON('assets/characters/manifest.json').then(function (m) { RTD.manifest = new Set(Array.isArray(m) ? m.filter(function (x) { return typeof x === 'string'; }) : []); }); };
RTD.saveWatched = function () { RTD.store.set('rtd.watched', Array.from(S.watched)); };
RTD.setWatched = function (id, on) {
  if (on) S.watched.add(id); else S.watched.delete(id);
  RTD.saveWatched(); RTD.emit('progress', id);
};
RTD.setSpoilers = function (on) { S.spoilers = !!on; RTD.store.set('rtd.spoilers', S.spoilers); RTD.emit('spoilers'); };
RTD.spoilerOpen = function (key, nodeId) { return S.spoilers || S.revealed.has(key) || (nodeId && S.watched.has(nodeId)); };

RTD.inLens = function (n) {
  if (S.path === 'ess') return n.essential >= 3;
  if (S.path === 'lost') return n.essential >= 2 && n.year >= 2021;
  if (S.path === 'fresh') return n.year >= 2025;
  return true;
};
RTD.realNodes = function () { return S.nodes.filter(U.isReal); };
RTD.sortNodes = function (list, order) {
  order = order || S.order;
  return list.slice().sort(function (a, b) {
    if (order === 'chrono') return ((a.chrono || 0) - (b.chrono || 0)) || a.release.localeCompare(b.release);
    return a.release.localeCompare(b.release);
  });
};
RTD.fetchJSON = function (p) {
  return fetch(p, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); }).catch(function () { return null; });
};
/* story.json gets its own loader so a failure can say why */
RTD.fetchStory = function (name) {
  var f = 'data/' + (name || 'story') + '.json';
  return fetch(f, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('The server answered ' + r.status + ' for ' + f + '.'); return r.json(); })
    .catch(function (e) { return { __error: (e && e.message && /answered/.test(e.message)) ? e.message : f + ' could not be fetched or is not valid JSON.' }; });
};
/* story.json and branches.json must agree. If they do not, say exactly how, and draw nothing. */
RTD.buildStory = function (raw, braw) {
  S.story = null; S.g = null; S.storyError = '';
  if (!raw || raw.__error) { S.storyError = (raw && raw.__error) || 'data/story.json is empty.'; return false; }
  if (!braw || braw.__error) { S.storyError = (braw && braw.__error) || 'data/branches.json is empty.'; return false; }
  var errs = RTD.tva.validate(raw, braw);
  if (errs.length) { S.storyError = 'data/branches.json and data/story.json do not agree. ' + errs.slice(0, 3).join(' ') + (errs.length > 3 ? ' (and ' + (errs.length - 3) + ' more problems)' : ''); return false; }
  S.story = raw; S.g = RTD.tva.model(raw, braw); return true;
};
RTD.loadData = function () {
  return Promise.all([RTD.fetchJSON('data/timeline.json'), RTD.fetchJSON('data/roster.json'), RTD.fetchJSON('data/theories.json'), RTD.loadManifest(), RTD.fetchStory('story'), RTD.fetchStory('branches'), RTD.fetchJSON('data/earths.json')]).then(function (r) {
    S.nodes = Array.isArray(r[0]) ? r[0] : []; S.roster = Array.isArray(r[1]) ? r[1] : []; S.theories = Array.isArray(r[2]) ? r[2] : [];
    S.byId = {}; S.nodes.forEach(function (n) { S.byId[n.id] = n; });
    S.person = {}; S.roster.forEach(function (p) { S.person[p.slug] = p; });
    RTD.buildStory(r[4], r[5]); RTD.buildEarths(r[6]);
    S.loaded = S.nodes.length > 0;
    return S.loaded;
  });
};
/* ---------- the multiverse: data/earths.json says which Earth each person is from and which Earths each event touches ---------- */
RTD.EARTH_LABEL = { screen: 'Said on screen', reference: 'Marvel reference book', wiki: 'Press and fans only', unknown: 'Not stated' };
RTD.EARTH_C = { '616': '#ffb347', '828': '#22d0d6', '838': '#7f8dff', '10005': '#ffe14a', '199999': '#ffb347' };
RTD.buildEarths = function (raw) {
  S.earths = null;
  if (!raw || !Array.isArray(raw.earths)) return;
  var E = { list: raw.earths.filter(function (e) { return e && e.id; }), byId: {}, people: raw.people || {}, beats: raw.beats || {}, ideas: Array.isArray(raw.ideas) ? raw.ideas : [] };
  E.list.forEach(function (e) { E.byId[e.id] = e; });
  S.earths = E;
};
RTD.earthName = function (id) { var e = S.earths && S.earths.byId[id]; return e ? e.name : 'Earth-' + id; };
RTD.earthColor = function (id) { return RTD.EARTH_C[id] || '#c9a8ff'; };
RTD.beatEarths = function (id) { var a = S.earths && S.earths.beats[id]; return Array.isArray(a) ? a.filter(function (x) { return S.earths.byId[x]; }) : []; };
/* "Earth-616", or "Earths 616 and 828" when an event touches more than one; places like the TVA by name */
RTD.earthText = function (ids) {
  if (!ids || !ids.length) return '';
  var named = ids.map(function (x) { var e = S.earths.byId[x]; return e && e.kind === 'place' ? e.name : null; });
  var nums = ids.filter(function (x, i) { return !named[i]; }), places = named.filter(Boolean), out = [];
  if (nums.length === 1) out.push('Earth-' + nums[0]);
  else if (nums.length > 1) out.push('Earths ' + nums.slice(0, -1).join(', ') + ' and ' + nums[nums.length - 1]);
  return out.concat(places).join(' · ');
};
RTD.reloadStory = function () { return Promise.all([RTD.fetchStory('story'), RTD.fetchStory('branches')]).then(function (r) { return RTD.buildStory(r[0], r[1]); }); };
/* plain words for the three certainty levels */
RTD.CERT = { shown: 'Shown on screen', read: 'Read from the scene', theory: 'Theory' };
RTD.filmTitle = function (id) { var n = S.byId[id]; return n ? n.title : String(id || ''); };
RTD.filmShort = function (id) { var n = S.byId[id]; return n ? U.labelTitle(n.title) : String(id || ''); };
})();
