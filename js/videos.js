/* Official Avengers: Doomsday videos, all on Marvel's own YouTube channel. [id, title, date] */
(function () {
'use strict';
var RTD = window.RTD, esc = RTD.util.esc;
var V = {
  steve: ['UiMg566PREA', 'Steve Rogers teaser', 'Dec 23, 2025'],
  thor: ['1clWprLC5Ak', 'Thor teaser', 'Dec 30, 2025'],
  xmen: ['kH1XlwHQv9o', 'X-Men teaser', 'Jan 6, 2026'],
  wakanda: ['399Ez7WHK5s', 'Wakanda and Fantastic Four teaser', 'Jan 13, 2026'],
  trailer: ['irVNGjRFZGk', 'Official trailer', 'Jul 20, 2026'],
  look: ['X1aFkAkFASk', 'Special look', 'Aug 15, 2026'],
  ret: ['Fg0jyss_YnU', 'The Return', 'Nov 18, 2026'],
  final: ['Wb8Tq_HD4E8', 'Final trailer', 'Nov 23, 2026']
};
var BEATS = { 'special-look': ['look'], 'trailer-steve-ff': ['final', 'steve'], 'trailer-tower': ['final', 'thor'], 'trailer-doom': ['final', 'look'], 'trailer-x-men': ['final', 'xmen'], 'trailer-wakanda': ['final', 'wakanda'], 'doomsday': ['final', 'trailer'] };
var FILMS = { 'avengers-doomsday': Object.keys(V) };
function html(keys) {
  if (!keys) return '';
  return '<section class="whos vids"><h3 class="cap">Watch on Marvel\'s YouTube</h3><ul class="vid-list">' + keys.map(function (k) {
    var v = V[k];
    return '<li><a class="vid" href="https://www.youtube.com/watch?v=' + v[0] + '" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg><span><b>' + esc(v[1]) + '</b><small>' + esc(v[2]) + '</small></span><span class="sr"> (opens YouTube)</span></a></li>';
  }).join('') + '</ul></section>';
}
RTD.videos = { beat: function (id) { return html(BEATS[id]); }, film: function (id) { return html(FILMS[id]); } };
})();
