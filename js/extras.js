/* Buy me a coffee, and "Tell us": theories, corrections and ideas. */
(function () {
'use strict';
var RTD = window.RTD, C = window.RTD_CONFIG || {}, esc = RTD.util.esc, draft = { kind: 'theory', message: '', name: '', email: '' };
function https(u) { return /^https:\/\//.test(u || '') ? u : ''; }
var X = RTD.extras = { coffee: https(C.coffeeUrl), endpoint: https(C.contactEndpoint) };
var CUP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c-.8 1 .8 2 0 3M12.5 3.5c-.8 1 .8 2 0 3" fill="none"/></svg>';
var KINDS = [['theory', 'A theory'], ['fix', 'Something is wrong'], ['idea', 'An idea'], ['other', 'Something else']];
X.coffeeHTML = function (cls, text) {
  return X.coffee ? '<a class="' + cls + '" href="' + esc(X.coffee) + '" target="_blank" rel="noopener noreferrer" aria-label="Donate, buy me a coffee">' + CUP + (text === 'short' ? '<span>Donate</span>' : text ? '<span>Donate / Buy me a coffee</span>' : '') + '</a>'
    : '<button type="button" class="' + cls + '" data-act="coffee" aria-label="Donate, buy me a coffee, link coming soon">' + CUP + (text === 'short' ? '<span>Donate</span>' : text ? '<span>Donate / Buy me a coffee</span>' : '') + '</button>';
};
X.bigHTML = function () { return X.coffeeHTML('donate', true); };
X.menuHTML = function () { return '<h3 class="m-h">Help this guide</h3><div class="row wrap"><button type="button" class="btn secondary" data-act="contact">Send a theory or idea</button>' + X.coffeeHTML('btn secondary coffee-b', true) + '</div>'; };
X.contactHTML = function (kind) {
  if (kind) draft.kind = kind;
  return '<div class="m-top"><h2 id="modal-title" class="m-title" tabindex="-1" data-first>Tell us</h2><button type="button" class="btn ghost sm" data-act="modalclose">Close</button></div>' +
    '<p>Share a theory, point out a mistake or suggest an improvement.</p><form id="tell" class="tell" novalidate>' +
    '<fieldset><legend>What is it?</legend><div class="kinds">' + KINDS.map(function (k) { return '<label class="kind"><input type="radio" name="kind" id="tk-' + k[0] + '" value="' + k[0] + '"' + (draft.kind === k[0] ? ' checked' : '') + '><span>' + k[1] + '</span></label>'; }).join('') + '</div></fieldset>' +
    '<label for="tell-m">Your message</label><textarea id="tell-m" name="message" rows="5" maxlength="4000" aria-describedby="tell-s">' + esc(draft.message) + '</textarea>' +
    '<label for="tell-n">Name (optional)</label><input id="tell-n" name="name" maxlength="80" autocomplete="name" value="' + esc(draft.name) + '">' +
    '<label for="tell-e">Email, only if you want a reply (optional)</label><input id="tell-e" name="email" type="email" maxlength="200" autocomplete="email" value="' + esc(draft.email) + '">' +
    '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
    (X.endpoint ? '' : '<p class="small off-note">Sending is not switched on yet. You can copy your message for now.</p>') +
    '<p class="small">Your message, and your name and email if you add them, go through Formspree to the person who runs this site. They are used only to read and answer it. Do not include private details.</p>' +
    '<p id="tell-s" class="tell-s" role="status"></p><button type="submit" class="btn primary big">' + (X.endpoint ? 'Send' : 'Copy message') + '</button></form>';
};
function say(t, bad) { var s = document.getElementById('tell-s'); if (s) { s.textContent = t; s.classList.toggle('bad', !!bad); } }
document.addEventListener('input', function (e) { var f = e.target.form; if (f && f.id === 'tell' && e.target.name in draft) draft[e.target.name] = e.target.value; });
document.addEventListener('submit', function (e) {
  if (e.target.id !== 'tell') return; e.preventDefault();
  var f = e.target, m = f.message.value.trim(), em = f.email.value.trim(), b = f.querySelector('[type=submit]');
  if (f.website.value) return;
  if (m.length < 5) { say('Write a few words first.', true); f.message.focus(); return; }
  if (em && !f.email.checkValidity()) { say('That email does not look right. Fix it or leave it empty.', true); f.email.focus(); return; }
  if (!X.endpoint) {
    var fail = function () { f.message.focus(); f.message.select(); say('Copying is blocked here. Your message is selected, so copy it from there.', true); };
    try { navigator.clipboard.writeText(m).then(function () { say('Copied. It has not been sent to anyone.'); }, fail); } catch (x) { fail(); }
    return;
  }
  b.disabled = true; say('Sending.');
  fetch(X.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ kind: draft.kind, message: m, name: draft.name.trim(), email: em, page: location.hash }) })
    .then(function (r) { if (!r.ok) throw 0; draft.message = ''; f.message.value = ''; say('Sent. Thank you.'); })
    .catch(function () { say('It did not send. Your message is still here, so try again.', true); }).then(function () { b.disabled = false; });
});
var host = document.querySelector('.tools-top'); if (host) host.insertAdjacentHTML('afterbegin', X.coffeeHTML('icon-btn coffee', 'short'));
})();
