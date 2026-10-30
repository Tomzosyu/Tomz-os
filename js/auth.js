(function (T) {
  // Paste your OAuth *Client ID* here (never a client secret). See docs/SETUP.md.
  var CLIENT_ID = '';
  var $ = function (s) { return document.querySelector(s); };

  function msg(t) { var m = $('#authMsg'); m.textContent = t || ''; m.hidden = !t; }
  function fire() { document.dispatchEvent(new CustomEvent('tomz:auth')); }
  function getUser() { return T.store.get('user', null); }
  function setUser(u) { T.store.set('user', u); fire(); }

  function decodeJwt(t) {
    var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    var json = decodeURIComponent(atob(p).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  }
  function onCredential(r) {
    try {
      var p = decodeJwt(r.credential); // display only; not verified server-side
      var pic = /^https:\/\//.test(p.picture || '') ? p.picture : '';
      setUser({ mode: 'google', name: p.name || p.email || 'Google user', picture: pic });
    } catch (e) { msg('Google returned an unreadable response. Try again or use Guest Mode.'); }
  }
  function loadGsi() {
    return new Promise(function (res, rej) {
      if (window.google && google.accounts && google.accounts.id) return res();
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  var OK_ID = /^[\w.-]+\.apps\.googleusercontent\.com$/;
  CLIENT_ID = CLIENT_ID || T.store.get('gclient', '') || '';
  function startGoogle() {
    if (!CLIENT_ID) {
      $('#gSetup').hidden = false;
      msg('Paste your Google Client ID below. In Google Cloud, add this exact address as an Authorized JavaScript origin: ' + location.origin);
      return;
    }
    $('#gSetup').hidden = true;
    msg('Loading Google sign-in…');
    loadGsi().then(function () {
      google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, auto_select: false, cancel_on_tap_outside: true });
      $('#gsiHolder').textContent = '';
      google.accounts.id.renderButton($('#gsiHolder'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(320, Math.max(200, $('#gsiHolder').clientWidth || 280)) });
      $('#googleBtn').hidden = true; $('#gReset').hidden = false;
      msg('If Google shows "origin_mismatch" or "invalid client", add ' + location.origin + ' as an Authorized JavaScript origin in Google Cloud, or use a different Client ID below.');
    }).catch(function () { msg('Could not reach Google. Check your internet connection, or continue as Guest.'); });
  }
  function logout() {
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    T.store.remove('user'); $('#gsiHolder').textContent = ''; $('#googleBtn').hidden = false; $('#gReset').hidden = true; msg(''); fire();
  }
  T.auth = { getUser: getUser, logout: logout, configured: !!(CLIENT_ID || T.store.get('gclient', '')) };
  document.addEventListener('DOMContentLoaded', function () {
    $('#googleBtn').addEventListener('click', startGoogle);
    $('#gReset').addEventListener('click', function () {
      T.store.remove('gclient'); CLIENT_ID = ''; T.auth.configured = false; $('#gsiHolder').textContent = ''; $('#gReset').hidden = true; $('#googleBtn').hidden = false; startGoogle();
    });
    $('#gSave').addEventListener('click', function () {
      var v = $('#gClientInput').value.trim();
      if (!OK_ID.test(v)) { msg('That does not look like a Client ID. It ends in .apps.googleusercontent.com'); return; }
      T.store.set('gclient', v); CLIENT_ID = v; T.auth.configured = true; startGoogle();
    });
    $('#guestBtn').addEventListener('click', function () { setUser({ mode: 'guest', name: 'Guest', picture: '' }); });
    $('#logoutBtn').addEventListener('click', logout);
  });
})(window.Tomz);
