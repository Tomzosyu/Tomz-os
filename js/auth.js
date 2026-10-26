(function (T) {
  // Optional fallback. Normally you paste the Client ID inside the app (Google sign-in setup).
  var CLIENT_ID = '';
  var ID_RE = /^[0-9]+-[a-z0-9_]+\.apps\.googleusercontent\.com$/i;
  var $ = function (s) { return document.querySelector(s); };

  function cid() { var v = T.store.get('gClientId', ''); return typeof v === 'string' && ID_RE.test(v) ? v : CLIENT_ID; }
  function setClientId(v) {
    v = String(v || '').trim();
    if (!v) { T.store.remove('gClientId'); return { ok: true, cleared: true }; }
    if (!ID_RE.test(v)) return { ok: false };
    T.store.set('gClientId', v); return { ok: true };
  }
  function originInfo() {
    var o = location.origin, h = location.hostname, local = h === 'localhost' || h === '127.0.0.1';
    if (location.protocol === 'file:') return { origin: '', problem: 'Google sign-in cannot run from a file. Open Tomz OS through a web address (http://localhost:PORT or https://…).' };
    if (location.protocol === 'http:' && !local) return { origin: o, problem: 'Google only accepts plain http on localhost. This address (' + o + ') will be rejected. Use http://localhost:PORT on the same device, or host the site on https.' };
    return { origin: o, problem: '' };
  }
  function msg(t) { var m = $('#authMsg'); m.textContent = t || ''; m.hidden = !t; }
  function fire() { document.dispatchEvent(new CustomEvent('tomz:auth')); }
  function getUser() { return T.store.get('user', null); }
  function setUser(u) { T.store.set('user', u); fire(); }

  function decodeJwt(t) {
    var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(p).split('').map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
  }
  function onCredential(r) {
    try {
      var p = decodeJwt(r.credential); // display only; not verified by a server
      setUser({ mode: 'google', name: p.name || p.email || 'Google user', picture: /^https:\/\//.test(p.picture || '') ? p.picture : '' });
    } catch (e) { msg('Google returned an unreadable response. Try again or use Guest Mode.'); }
  }
  function loadGsi() {
    return new Promise(function (res, rej) {
      if (window.google && google.accounts && google.accounts.id) return res();
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('load')); }; document.head.appendChild(s);
    });
  }
  function startGoogle() {
    var id = cid(), oi = originInfo();
    if (!id) { $('#gSetup').open = true; msg('Add your Google Client ID below first (2 minutes, free). Guest Mode works without it.'); return; }
    if (oi.problem) { $('#gSetup').open = true; msg(oi.problem); return; }
    msg('Loading Google sign-in…');
    loadGsi().then(function () {
      google.accounts.id.initialize({ client_id: id, callback: onCredential });
      var h = $('#gsiHolder'); h.textContent = '';
      google.accounts.id.renderButton(h, { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with' });
      $('#googleBtn').hidden = true;
      msg('If the Google button shows an error, add this exact address to Authorized JavaScript origins: ' + oi.origin + (location.hostname === 'localhost' ? ' (and also http://localhost)' : ''));
      setTimeout(function () { if (!h.querySelector('iframe') && !h.querySelector('div[role=button]')) { $('#gSetup').open = true; msg('The Google button did not appear. Check the Client ID and that ' + oi.origin + ' is an Authorized JavaScript origin.'); } }, 6000);
    }).catch(function () { msg('Could not reach Google. Check your internet connection, or continue as Guest.'); });
  }
  function logout() {
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    T.store.remove('user'); $('#gsiHolder').textContent = ''; $('#googleBtn').hidden = false; msg(''); fire();
  }
  T.auth = { getUser: getUser, logout: logout, configured: function () { return !!cid(); }, setClientId: setClientId, originInfo: originInfo };

  document.addEventListener('DOMContentLoaded', function () {
    var oi = originInfo();
    $('#originBox').textContent = oi.origin || 'No web address (opened as a file)';
    $('#originExtra').hidden = location.hostname !== 'localhost';
    if (oi.problem) { $('#originWarn').textContent = oi.problem; $('#originWarn').hidden = false; }
    $('#cidInput').value = T.store.get('gClientId', '') || '';
    $('#googleBtn').addEventListener('click', startGoogle);
    $('#guestBtn').addEventListener('click', function () { setUser({ mode: 'guest', name: 'Guest', picture: '' }); });
    $('#logoutBtn').addEventListener('click', logout);
    $('#saveCid').addEventListener('click', function () {
      var r = setClientId($('#cidInput').value);
      if (!r.ok) { msg('That does not look like a Google Client ID. It looks like 123456789012-abc123.apps.googleusercontent.com (do not paste the client secret).'); return; }
      msg(r.cleared ? 'Client ID removed.' : 'Client ID saved. Now press Continue with Google.');
    });
    $('#copyOrigin').addEventListener('click', function () { if (oi.origin) T.util.copy(oi.origin, $('#copyOrigin')); });
  });
})(window.Tomz);
