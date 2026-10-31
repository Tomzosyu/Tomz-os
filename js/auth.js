(function (T) {
  /* Guest accounts: the person picks a username and password and is asked every time the site is opened.
     The session lives only in memory, so reloading or reopening the page asks again.
     Accounts are saved in this browser (localStorage "tomz.accounts") with a salted hash of the password,
     never the plain password. This is a front-end gate for convenience, not server-grade security. */
  var $ = function (s) { return document.querySelector(s); };
  var KEY = 'accounts', MAX_ACCOUNTS = 20, session = null, mode = 'signin', fails = 0, lockUntil = 0, busy = false;
  var NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _.-]{2,23}$/;

  function accounts() { var a = T.store.get(KEY, []); return Array.isArray(a) ? a.filter(function (x) { return x && typeof x.name === 'string' && typeof x.hash === 'string'; }) : []; }
  function findAcc(name) { var n = String(name).trim().toLowerCase(); return accounts().filter(function (a) { return a.name.toLowerCase() === n; })[0] || null; }
  function fire() { document.dispatchEvent(new CustomEvent('tomz:auth')); }
  function getUser() { return session; }

  /* ---- hashing ---- */
  function toHex(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return s; }
  function fromHex(h) { var u = new Uint8Array(h.length / 2); for (var i = 0; i < u.length; i++) u[i] = parseInt(h.substr(i * 2, 2), 16); return u; }
  function utf8(s) { return new TextEncoder().encode(s); }
  function randomHex(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return toHex(a); }

  // Small SHA-256 used only where the browser blocks Web Crypto (plain http:// on a phone, for example).
  var K = [], H0 = [];
  (function () {
    var primes = [], n = 2; while (primes.length < 64) { var ok = true; for (var i = 0; i < primes.length; i++) if (n % primes[i] === 0) { ok = false; break; } if (ok) primes.push(n); n++; }
    primes.forEach(function (p, i) { K[i] = Math.floor((Math.cbrt(p) % 1) * 4294967296); if (i < 8) H0[i] = Math.floor((Math.sqrt(p) % 1) * 4294967296); });
  })();
  function sha256(bytes) {
    var l = bytes.length, bl = l * 8, total = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(total), w = new Uint32Array(64), h = H0.slice(), i, j;
    m.set(bytes); m[l] = 0x80;
    var dv = new DataView(m.buffer); dv.setUint32(total - 8, Math.floor(bl / 4294967296)); dv.setUint32(total - 4, bl >>> 0);
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (i = 0; i < total; i += 64) {
      for (j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4);
      for (j = 16; j < 64; j++) { var s0 = rr(w[j - 15], 7) ^ rr(w[j - 15], 18) ^ (w[j - 15] >>> 3), s1 = rr(w[j - 2], 17) ^ rr(w[j - 2], 19) ^ (w[j - 2] >>> 10); w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0; }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (j = 0; j < 64; j++) {
        var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K[j] + w[j]) >>> 0;
        var S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0; h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    var out = new Uint8Array(32), odv = new DataView(out.buffer); for (i = 0; i < 8; i++) odv.setUint32(i * 4, h[i]); return out;
  }
  function jsHash(pw, saltHex) {
    var salt = fromHex(saltHex), cur = sha256(Uint8Array.from(Array.from(salt).concat(Array.from(utf8(pw)))));
    for (var i = 0; i < 20000; i++) { var buf = new Uint8Array(cur.length + salt.length); buf.set(cur); buf.set(salt, cur.length); cur = sha256(buf); }
    return toHex(cur);
  }
  function hasSubtle() { return !!(window.crypto && crypto.subtle && crypto.subtle.importKey); }
  function derive(pw, saltHex, algo) {
    if (algo === 'pbkdf2') {
      if (!hasSubtle()) return Promise.reject(new Error('This account needs a secure (https or localhost) address to sign in.'));
      return crypto.subtle.importKey('raw', utf8(pw), 'PBKDF2', false, ['deriveBits']).then(function (k) {
        return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(saltHex), iterations: 150000, hash: 'SHA-256' }, k, 256);
      }).then(function (b) { return toHex(new Uint8Array(b)); });
    }
    return new Promise(function (res) { setTimeout(function () { res(jsHash(pw, saltHex)); }, 0); });
  }
  function same(a, b) { if (a.length !== b.length) return false; var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

  /* ---- account actions ---- */
  function validate(name, pw, pw2, creating) {
    name = String(name || '').trim();
    if (!name) return 'Enter a username.';
    if (!creating) return pw ? '' : 'Enter your password.';
    if (!NAME_RE.test(name)) return 'Username: 3–24 characters, letters, numbers, spaces, dot, dash or underscore.';
    if (!pw || pw.length < 4) return 'Choose a password of at least 4 characters.';
    if (pw.length > 100) return 'That password is too long (100 characters max).';
    if (pw !== pw2) return 'The two passwords do not match.';
    if (findAcc(name)) return 'That username is already taken on this device. Pick another or sign in.';
    if (accounts().length >= MAX_ACCOUNTS) return 'This device already has ' + MAX_ACCOUNTS + ' accounts. Delete one first.';
    return '';
  }
  function start(acc) {
    session = { mode: 'guest', name: acc.name, picture: '', created: acc.created };
    fails = 0; lockUntil = 0;
    T.log.add('LOGIN', 'signed in', acc.name);
    fire();
  }
  function create(name, pw, pw2) {
    var bad = validate(name, pw, pw2, true); if (bad) return Promise.reject(new Error(bad));
    var algo = hasSubtle() ? 'pbkdf2' : 'sha256js', salt = randomHex(16);
    return derive(pw, salt, algo).then(function (hash) {
      if (findAcc(name)) throw new Error('That username is already taken on this device.');
      var acc = { name: name.trim(), salt: salt, algo: algo, hash: hash, created: Date.now() }, list = accounts(); list.push(acc);
      if (!T.store.set(KEY, list)) throw new Error('Could not save the account: browser storage is full or blocked.');
      T.log.add('ACCOUNT_CREATED', 'guest account "' + acc.name + '" created (password saved as a salted hash)', acc.name);
      start(acc);
    });
  }
  function signIn(name, pw) {
    var bad = validate(name, pw, '', false); if (bad) return Promise.reject(new Error(bad));
    var wait = Math.ceil((lockUntil - Date.now()) / 1000);
    if (wait > 0) return Promise.reject(new Error('Too many wrong attempts. Try again in ' + wait + ' seconds.'));
    var acc = findAcc(name);
    function wrong() {
      fails++; T.log.add('LOGIN_FAILED', 'wrong username or password', String(name).trim().slice(0, 24) || '-');
      if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; }
      throw new Error('Wrong username or password.');
    }
    if (!acc) return derive(pw, randomHex(16), 'sha256js').then(wrong); // similar timing for unknown names
    return derive(pw, acc.salt, acc.algo).then(function (h) { if (!same(h, acc.hash)) wrong(); start(acc); });
  }
  function logout() {
    if (!session) return;
    T.log.add('LOGOUT', 'signed out'); session = null; fire();
  }
  function deleteAccount(pw) {
    if (!session) return Promise.reject(new Error('Not signed in.'));
    var acc = findAcc(session.name); if (!acc) return Promise.reject(new Error('Account not found.'));
    return derive(pw || '', acc.salt, acc.algo).then(function (h) {
      if (!same(h, acc.hash)) throw new Error('Wrong password. Account not deleted.');
      T.store.set(KEY, accounts().filter(function (a) { return a.name !== acc.name; }));
      T.log.add('ACCOUNT_DELETED', 'guest account "' + acc.name + '" deleted', acc.name); session = null; fire();
    });
  }
  function resetAll() { var n = accounts().length; T.store.remove(KEY); T.log.add('ACCOUNTS_RESET', n + ' account(s) removed from the sign-in screen', '-'); }

  /* ---- sign-in screen ---- */
  function msg(t, good) { var m = $('#authMsg'); m.textContent = t || ''; m.hidden = !t; m.classList.toggle('good', !!good); }
  function setMode(m) {
    var has = accounts().length > 0; if (m === 'signin' && !has) m = 'create';
    mode = m; var c = m === 'create';
    $('#tabSignin').setAttribute('aria-selected', String(!c)); $('#tabCreate').setAttribute('aria-selected', String(c));
    $('#tabSignin').disabled = !has;
    $('#authPass2Wrap').hidden = !c; $('#authSubmit').textContent = c ? 'Create guest account' : 'Sign in';
    $('#authPass').autocomplete = c ? 'new-password' : 'current-password';
    $('#authSub').textContent = c ? 'Pick a username and a password. They are saved in this browser so you can sign in next time.' : 'Sign in with your guest account. You are asked every time you open Tomz OS.';
    $('#authReset').hidden = !has; msg('');
  }
  function resetForm() { ['#authName', '#authPass', '#authPass2'].forEach(function (s) { $(s).value = ''; }); $('#authShow').checked = false; showPw(false); }
  function showPw(on) { ['#authPass', '#authPass2'].forEach(function (s) { $(s).type = on ? 'text' : 'password'; }); }
  function onSubmit(e) {
    e.preventDefault(); if (busy) return;
    busy = true; $('#authSubmit').disabled = true; msg('');
    var act = mode === 'create' ? create($('#authName').value, $('#authPass').value, $('#authPass2').value) : signIn($('#authName').value, $('#authPass').value);
    act.then(function () { resetForm(); }, function (err) { msg(err && err.message ? err.message : 'Something went wrong. Try again.'); })
      .then(function () { busy = false; $('#authSubmit').disabled = false; });
  }
  function onAuth() { if (!session) { resetForm(); setMode('signin'); var n = $('#authName'); if (n && !$('#welcome').hidden) n.focus(); } }

  T.auth = { getUser: getUser, logout: logout, deleteAccount: deleteAccount, count: function () { return accounts().length; } };
  document.addEventListener('DOMContentLoaded', function () {
    T.store.remove('user'); T.store.remove('gclient'); // leftovers from the old Google / one-click Guest login
    $('#authForm').addEventListener('submit', onSubmit);
    $('#logoutBtn').addEventListener('click', logout);
    $('#tabSignin').addEventListener('click', function () { setMode('signin'); });
    $('#tabCreate').addEventListener('click', function () { setMode('create'); });
    $('#authShow').addEventListener('change', function () { showPw($('#authShow').checked); });
    $('#authReset').addEventListener('click', function () {
      if (!confirm('Remove all guest accounts from this device? Your tasks, notes and settings are NOT deleted. You can then create a new account.')) return;
      resetAll(); resetForm(); setMode('create'); msg('Accounts removed. Create a new guest account to continue.', true);
    });
    document.addEventListener('tomz:auth', onAuth);
    setMode('signin');
  });
})(window.Tomz);
