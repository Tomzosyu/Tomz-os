(function (T) {
  var el = T.el, store = T.store, U = T.util, PRE = 'tomz.', KEEP = ['accounts', 'log', 'user']; // never exported or cleared with the data
  var flash = '';
  var ACC = [['Blue', '#168BFF'], ['Orange', '#FF7A18'], ['Green', '#27D17F'], ['Purple', '#9B6BFF']];

  function apply() {
    var a = store.get('accent', '#168BFF'); if (!/^#[0-9a-f]{6}$/i.test(a)) a = '#168BFF';
    var r = document.documentElement.style, i = Number(store.get('intensity', 100));
    var o = a.toUpperCase() === '#FF7A18' ? '#168BFF' : '#FF7A18';
    function rgb(h) { return parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16); }
    function dk(h) { return '#' + [1, 3, 5].map(function (k) { return ('0' + Math.round(parseInt(h.substr(k, 2), 16) * .65).toString(16)).slice(-2); }).join(''); }
    r.setProperty('--blue', a); r.setProperty('--orange', o); r.setProperty('--blue-rgb', rgb(a)); r.setProperty('--orange-rgb', rgb(o)); r.setProperty('--blue-dark', dk(a));
    r.setProperty('--intensity', String((isFinite(i) ? Math.min(100, Math.max(0, i)) : 100) / 100));
    document.body.classList.toggle('compact', store.get('compact', false) === true);
    document.body.classList.toggle('no-anim', store.get('anim', true) === false);
  }
  T.applySettings = apply;
  document.addEventListener('DOMContentLoaded', apply);

  /* ---- import validation ---- */
  var isArr = Array.isArray, obj = function (v) { return !!v && typeof v === 'object' && !isArr(v); }, bool = function (v) { return typeof v === 'boolean'; };
  var strs = function (v) { return isArr(v) && v.length <= 500 && v.every(function (x) { return typeof x === 'string'; }); };
  var V = {
    tasks: function (v) { return isArr(v) && v.length <= 5000 && v.every(function (t) { return obj(t) && typeof t.id === 'string' && typeof t.title === 'string' && ['low', 'medium', 'high'].indexOf(t.pri) >= 0; }); },
    notes: function (v) { return isArr(v) && v.length <= 2000 && v.every(function (n) { return obj(n) && typeof n.id === 'string' && typeof n.title === 'string' && typeof n.body === 'string'; }); },
    habits: function (v) { return isArr(v) && v.length <= 200 && v.every(function (h) { return obj(h) && typeof h.id === 'string' && typeof h.name === 'string' && obj(h.days); }); },
    calc_hist: strs, favs: strs, recent: strs,
    notifs: function (v) { return isArr(v) && v.length <= 200 && v.every(function (n) { return obj(n) && typeof n.text === 'string'; }); },
    game_scores: obj, widgets: obj, cd_set: obj, cd_state: obj, pomo_state: obj, pomo_cfg: obj, pomo_done: obj,
    pomo_mode: function (v) { return typeof v === 'string' && v.length < 30; },
    accent: function (v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v); },
    intensity: function (v) { return typeof v === 'number' && v >= 0 && v <= 100; },
    compact: bool, anim: bool, sound: bool, clock24: bool
  };

  function exportAll() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i); if (k.indexOf(PRE) !== 0 || KEEP.indexOf(k.slice(PRE.length)) >= 0) continue;
      try { data[k.slice(PRE.length)] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
    }
    var out = { app: 'tomz-os', version: 1, exportedAt: new Date().toISOString(), data: data };
    var url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    var a = el('a', { href: url, download: 'tomz-os-backup-' + out.exportedAt.slice(0, 10) + '.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    return Object.keys(data).length;
  }
  function parseImport(text) {
    var j; try { j = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON.'); }
    if (!obj(j) || j.app !== 'tomz-os' || typeof j.version !== 'number' || !obj(j.data)) throw new Error('This is not a Tomz OS backup file.');
    if (j.version > 1) throw new Error('This backup comes from a newer version of Tomz OS.');
    delete j.data.gclient; delete j.data.user; // left over from older versions
    var keys = Object.keys(j.data); if (!keys.length) throw new Error('The backup contains no data.');
    keys.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(V, k)) throw new Error('Unknown item "' + k.slice(0, 30) + '" in the backup.');
      if (!V[k](j.data[k])) throw new Error('The "' + k + '" data in this backup is invalid or damaged.');
    });
    return j.data;
  }
  function clearAll() {
    var del = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(PRE) === 0 && KEEP.indexOf(k.slice(PRE.length)) < 0) del.push(k); }
    del.forEach(function (k) { localStorage.removeItem(k); }); return del.length;
  }

  function render(view) {
    var msg = el('p', { role: 'status', class: 'ok' }), bad = el('p', { class: 'err', role: 'alert' });
    msg.textContent = flash; flash = '';
    function ok(t) { bad.textContent = ''; msg.textContent = t; } function fail(t) { msg.textContent = ''; bad.textContent = t; }
    function toggle(label, key, def, extra) {
      var cb = el('input', { type: 'checkbox', onchange: function () { store.set(key, cb.checked); apply(); if (extra) extra(cb.checked); } }); cb.checked = !!store.get(key, def);
      return el('label', { class: 'set-row' }, el('span', { class: 'row' }, cb, el('span', { text: label })));
    }
    // appearance
    var cur = store.get('accent', '#168BFF'), sw = el('div', { class: 'sw-row', role: 'group', 'aria-label': 'Accent color' });
    ACC.forEach(function (c) { sw.append(el('button', { class: 'sw', type: 'button', style: 'background:' + c[1], 'aria-label': c[0], 'aria-pressed': String(cur.toUpperCase() === c[1]), onclick: function () { store.set('accent', c[1]); apply(); T.nav.render(); } })); });
    var inten = el('input', { type: 'range', min: '0', max: '100', value: String(store.get('intensity', 100)), 'aria-label': 'Background glow intensity', oninput: function () { store.set('intensity', Number(inten.value)); apply(); } });
    var appear = el('section', { class: 'panel card grid' }, el('h2', { text: 'Appearance' }),
      el('div', {}, el('p', { class: 'muted', text: 'Accent color' }), sw), el('label', { class: 'field' }, el('span', { text: 'Background glow intensity' }), inten),
      toggle('Compact layout', 'compact', false), toggle('Animations', 'anim', true),
      el('p', { class: 'muted', style: 'margin:0', text: 'If your device is set to reduce motion, animations stay off regardless of this switch.' }));
    // clock & sound
    var clockSel = el('select', { 'aria-label': 'Clock format', onchange: function () { store.set('clock24', clockSel.value === '24'); } }, U.opt('12', '12-hour'), U.opt('24', '24-hour')); clockSel.value = store.get('clock24', false) ? '24' : '12';
    var snd = el('section', { class: 'panel card grid' }, el('h2', { text: 'Clock and sound' }), el('label', { class: 'field' }, el('span', { text: 'Clock format' }), clockSel),
      toggle('Sound effects (timer alerts)', 'sound', true), U.btn('Test sound', function () { var p = store.get('sound', true); if (p === false) { fail('Sound effects are switched off.'); return; } try { var C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(); o.frequency.value = 880; o.connect(c.destination); o.start(); setTimeout(function () { o.stop(); c.close(); }, 300); ok(''); } catch (e) { fail('This browser cannot play sounds.'); } }, 'small'));
    // widgets
    var wl = el('div', { class: 'grid' }), names = { tasks: 'Tasks', recent: 'Recently opened', favorites: 'Favorites', shortcuts: 'Shortcuts' };
    function paintW() {
      var W = T.widgets.get(); wl.textContent = '';
      W.order.forEach(function (id, i) {
        var cb = el('input', { type: 'checkbox', 'aria-label': 'Show ' + names[id], onchange: function () { var w = T.widgets.get(); w.hidden = w.hidden.filter(function (x) { return x !== id; }); if (!cb.checked) w.hidden.push(id); T.widgets.set(w); } }); cb.checked = W.hidden.indexOf(id) < 0;
        function mv(d) { var w = T.widgets.get(), j = i + d; if (j < 0 || j >= w.order.length) return; var t = w.order[i]; w.order[i] = w.order[j]; w.order[j] = t; T.widgets.set(w); paintW(); }
        wl.append(el('div', { class: 'set-row' }, el('label', { class: 'row' }, cb, el('span', { text: names[id] })), el('span', { class: 'row' }, U.btn('↑', function () { mv(-1); }, 'small'), U.btn('↓', function () { mv(1); }, 'small'))));
        wl.lastChild.querySelectorAll('button')[0].setAttribute('aria-label', 'Move ' + names[id] + ' up'); wl.lastChild.querySelectorAll('button')[1].setAttribute('aria-label', 'Move ' + names[id] + ' down');
      });
    }
    paintW();
    var wid = el('section', { class: 'panel card grid' }, el('h2', { text: 'Dashboard widgets' }), wl,
      U.btn('Reset dashboard layout', function () { store.remove('widgets'); paintW(); ok('Dashboard layout reset. Your data was not touched.'); }, 'small'));
    // data
    var file = el('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Choose backup file', onchange: function () {
      var f = file.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) { fail('That file is larger than 5 MB, so it is probably not a Tomz OS backup.'); file.value = ''; return; }
      var rd = new FileReader();
      rd.onerror = function () { fail('Could not read that file.'); };
      rd.onload = function () {
        try {
          var d = parseImport(String(rd.result)), n = Object.keys(d).length;
          if (!confirm('Import ' + n + ' data item' + (n > 1 ? 's' : '') + '? Matching items on this device (' + Object.keys(d).join(', ') + ') will be replaced.')) { ok('Import cancelled. Nothing changed.'); }
          else { Object.keys(d).forEach(function (k) { store.set(k, d[k]); }); apply(); flash = 'Imported ' + n + ' item' + (n > 1 ? 's' : '') + '.'; T.nav.render(); }
        } catch (e) { fail(e.message + ' Nothing was changed.'); }
        file.value = '';
      };
      rd.readAsText(f);
    } });
    var data = el('section', { class: 'panel card grid' }, el('h2', { text: 'Your data' }),
      el('p', { class: 'muted', style: 'margin:0', text: 'Everything lives in this browser. Back it up before clearing site data or switching devices.' }),
      el('div', { class: 'row' }, U.btn('Export data (JSON)', function () { var n = exportAll(); ok(n ? 'Exported ' + n + ' item' + (n > 1 ? 's' : '') + '.' : 'There is no saved data to export yet.'); }, 'primary')),
      el('label', { class: 'field' }, el('span', { text: 'Import a backup' }), file),
      U.btn('Clear local data…', function () {
        if (!confirm('Delete all tasks, notes, habits, scores and settings saved in this browser? This cannot be undone. Export a backup first if unsure.')) return;
        var n = clearAll(); apply(); flash = 'Cleared ' + n + ' saved item' + (n === 1 ? '' : 's') + '.'; T.nav.render();
      }, 'small'), msg, bad);
    // account
    var u = T.auth.getUser() || { name: 'Guest' };
    var delPw = el('input', { type: 'password', maxlength: '100', autocomplete: 'current-password', placeholder: 'Your password', 'aria-label': 'Password to confirm deleting this account' }), accMsg = el('p', { class: 'err', role: 'alert' });
    var acct = el('section', { class: 'panel card grid' }, el('h2', { text: 'Account' }),
      el('p', { style: 'margin:0', text: u.name + ' · Guest account' + (u.created ? ' · created ' + new Date(u.created).toLocaleDateString() : '') }),
      el('p', { class: 'muted', style: 'margin:0', text: 'You are asked for your username and password every time you open Tomz OS. Your password is saved only as a salted hash.' }),
      U.btn('Log out', function () { T.auth.logout(); }, 'small'),
      el('label', { class: 'field' }, el('span', { text: 'Delete this account (type your password)' }), delPw),
      U.btn('Delete my account', function () {
        if (!delPw.value) { accMsg.textContent = 'Type your password to confirm.'; return; }
        if (!confirm('Delete the guest account "' + u.name + '"? Tasks, notes and settings stay on this device.')) return;
        T.auth.deleteAccount(delPw.value).catch(function (e) { accMsg.textContent = e.message; });
      }, 'small'), accMsg);
    // activity log
    var logBox = el('div', { class: 'logbox', role: 'log', tabindex: '0', 'aria-label': 'Recent activity' }), logMsg = el('p', { class: 'ok', role: 'status' });
    function paintLog() {
      var l = T.log.all(); logBox.textContent = '';
      if (!l.length) { logBox.append(el('p', { class: 'muted', style: 'margin:0', text: 'No activity yet. Signing in and opening apps will show up here.' })); return; }
      l.slice(-40).reverse().forEach(function (e) { logBox.append(el('p', { class: 'log-line', text: T.log.line(e) })); });
    }
    paintLog();
    var logCard = el('section', { class: 'panel card grid' }, el('h2', { text: 'Activity log' }),
      el('p', { class: 'muted', style: 'margin:0', text: 'Sign-ins, account changes and every app you open in the browser or on your device are saved here, in this browser. Passwords are never written to the log.' }),
      logBox,
      el('div', { class: 'row' }, U.btn('Download log file', function () { T.log.download(); logMsg.textContent = 'Log file downloaded.'; }, 'primary'),
        U.btn('Clear log', function () { if (!confirm('Clear the whole activity log? This cannot be undone.')) return; T.log.clear(); T.log.add('LOG_CLEARED', 'activity log cleared'); paintLog(); logMsg.textContent = 'Log cleared.'; }, 'small')), logMsg);
    view.append(el('section', { class: 'panel hero' }, el('div', {}, el('h1', { text: 'Settings' }), el('p', { class: 'muted', text: 'Changes apply immediately and are saved on this device.' }))),
      el('div', { class: 'grid cols-2' }, appear, snd, wid, acct), logCard, data);
  }
  T.nav.register('settings', { title: 'Settings', icon: '⚙', nav: 1, mobile: 1, render: render });
})(window.Tomz);
