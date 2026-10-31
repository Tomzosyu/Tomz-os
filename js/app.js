(function (T) {
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, attrs) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c) n.append(c); }
    return n;
  }
  T.el = el;

  // url     = official website (opened as the desktop site where the site supports a desktop switch, see "desk")
  // desk    = optional URL that asks the site for its desktop version
  // android = Android package name, ios = iOS URL scheme, pc = desktop-app URL scheme (only where one exists)
  // The app links cannot be tested without the app installed; if one does not open, the website is offered instead.
  var APPS = [
    { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/', desk: 'https://www.youtube.com/?app=desktop', c: '#E62117', l: 'Y', android: 'com.google.android.youtube', ios: 'youtube://' },
    { id: 'google', name: 'Google Search', url: 'https://www.google.com/', c: '#4285F4', l: 'G', android: 'com.google.android.googlequicksearchbox', ios: 'googleapp://' },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', c: '#10A37F', l: 'C', android: 'com.openai.chatgpt', ios: 'chatgpt://' },
    { id: 'claude', name: 'Claude', url: 'https://claude.ai/', c: '#C96442', l: 'Cl', android: 'com.anthropic.claude' },
    { id: 'gemini', name: 'Google Gemini', url: 'https://gemini.google.com/', c: '#6B5CE7', l: 'Ge', android: 'com.google.android.apps.bard' },
    { id: 'grok', name: 'Grok', url: 'https://grok.com/', c: '#2B2F3A', l: 'Gr' },
    { id: 'drive', name: 'Google Drive', url: 'https://drive.google.com/', c: '#1FA463', l: 'D', android: 'com.google.android.apps.docs', ios: 'googledrive://' },
    { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com/', c: '#D93025', l: 'M', android: 'com.google.android.gm', ios: 'googlegmail://',
      variants: { compose: { label: 'Write an email', url: 'https://mail.google.com/mail/?view=cm' } } },
    { id: 'github', name: 'GitHub', url: 'https://github.com/', c: '#30363D', l: 'Gh', android: 'com.github.android', ios: 'github://' },
    { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/', c: '#1DB954', l: 'S', android: 'com.spotify.music', ios: 'spotify://', pc: 'spotify:' },
    { id: 'wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org/', desk: 'https://www.wikipedia.org/?useformat=desktop', c: '#5B6270', l: 'W', android: 'org.wikipedia', ios: 'wikipedia://' },
    { id: 'calendar', name: 'Google Calendar', url: 'https://calendar.google.com/', c: '#168BFF', l: 'Ca', android: 'com.google.android.calendar', ios: 'googlecalendar://',
      variants: { new: { label: 'New calendar event', url: 'https://calendar.google.com/calendar/u/0/r/eventedit' } } }
  ];
  T.apps = APPS;
  var byId = {}; APPS.forEach(function (a) { byId[a.id] = a; });
  var store = T.store;

  function icon(a) { var i = el('span', { class: 'app-ico', 'aria-hidden': 'true', text: a.l }); i.style.background = a.c; return i; }
  function favs() { return store.get('favs', ['youtube', 'claude', 'github']); }
  function toggleFav(id) { var f = favs(), i = f.indexOf(id); if (i < 0) f.push(id); else f.splice(i, 1); store.set('favs', f); }
  function pushRecent(id) { var r = store.get('recent', []).filter(function (x) { return x !== id; }); r.unshift(id); store.set('recent', r.slice(0, 6)); }

  function appCard(a, rerender) {
    var wrap = el('div', { class: 'panel app-card', style: 'padding:0' });
    var open = el('button', { class: 'app-card', type: 'button', style: 'border:0;background:none;width:100%;min-height:112px', 'aria-label': 'Open ' + a.name, onclick: function () { T.nav.go('app/' + a.id); } }, icon(a), el('strong', { text: a.name }));
    var on = favs().indexOf(a.id) >= 0;
    var star = el('button', { class: 'star', type: 'button', 'aria-pressed': String(on), 'aria-label': (on ? 'Remove ' : 'Add ') + a.name + ' favorite', text: on ? '★' : '☆', onclick: function () { toggleFav(a.id); rerender(); } });
    wrap.append(open, star); wrap.style.position = 'relative'; return wrap;
  }

  var WID = ['tasks', 'recent', 'favorites', 'shortcuts'];
  T.widgets = {
    ids: WID,
    get: function () {
      var w = store.get('widgets', {}) || {}, o = (Array.isArray(w.order) ? w.order : []).filter(function (i) { return WID.indexOf(i) >= 0; });
      WID.forEach(function (i) { if (o.indexOf(i) < 0) o.push(i); });
      return { order: o, hidden: (Array.isArray(w.hidden) ? w.hidden : []).filter(function (i) { return WID.indexOf(i) >= 0; }) };
    },
    set: function (w) { store.set('widgets', w); }
  };
  function greeting(h) { return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night'; }
  var clockTimer;
  function tick(c, d) {
    var n = new Date(), h24 = store.get('clock24', false);
    c.textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !h24 });
    d.textContent = n.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function renderDashboard(view) {
    clearInterval(clockTimer);
    var u = T.auth.getUser() || { name: 'Guest' };
    var clock = el('div', { class: 'clock', 'aria-label': 'Current time' }), date = el('div', { class: 'muted' });
    view.append(el('section', { class: 'panel hero' },
      el('div', {}, el('h1', { text: greeting(new Date().getHours()) + ', ' + u.name.split(' ')[0] }), date),
      clock));
    tick(clock, date); clockTimer = setInterval(function () { if (!clock.isConnected) { clearInterval(clockTimer); return; } tick(clock, date); }, 1000);

    var grid = el('div', { class: 'grid apps' });
    function paint() {
      var q = ($('#globalSearch').value || '').trim().toLowerCase();
      grid.textContent = '';
      var list = APPS.filter(function (a) { return !q || a.name.toLowerCase().indexOf(q) >= 0; });
      if (!list.length) grid.append(el('p', { class: 'empty', text: 'No apps match "' + q + '".' }));
      list.forEach(function (a) { grid.append(appCard(a, function () { renderDashboard.refresh(view); })); });
    }
    view.append(el('section', {}, el('div', { class: 'section-head' }, el('h2', { text: 'Apps' })), grid));
    paint(); view._paint = paint;

    var tasks = store.get('tasks', []), done = tasks.filter(function (t) { return t.done; }).length;
    var pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    var taskCard = el('section', { class: 'panel card' }, el('h2', { text: 'Tasks' }));
    if (!tasks.length) taskCard.append(el('p', { class: 'muted', text: 'No tasks yet. Add one in Tasks.' }));
    else { var b = el('b'); b.style.width = pct + '%'; taskCard.append(el('p', { text: (tasks.length - done) + ' pending · ' + done + ' of ' + tasks.length + ' done' }), el('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, b)); }

    var recentIds = store.get('recent', []).filter(function (id) { return byId[id]; });
    var recent = el('section', { class: 'panel card' }, el('h2', { text: 'Recently opened' }));
    if (!recentIds.length) recent.append(el('p', { class: 'muted', text: 'Apps you open will show up here.' }));
    else { var rc = el('div', { class: 'chips' }); recentIds.forEach(function (id) { rc.append(el('button', { class: 'chip', type: 'button', text: byId[id].name, onclick: function () { T.nav.go('app/' + id); } })); }); recent.append(rc); }

    var fav = el('section', { class: 'panel card' }, el('h2', { text: 'Favorites' }));
    var fl = favs().filter(function (id) { return byId[id]; });
    if (!fl.length) fav.append(el('p', { class: 'muted', text: 'Tap ☆ on an app to pin it here.' }));
    else { var fc = el('div', { class: 'chips' }); fl.forEach(function (id) { fc.append(el('button', { class: 'chip', type: 'button', text: byId[id].name, onclick: function () { T.nav.go('app/' + id); } })); }); fav.append(fc); }

    var sc = el('section', { class: 'panel card' }, el('h2', { text: 'Shortcuts' }),
      el('div', { class: 'chips' },
        el('button', { class: 'chip', type: 'button', text: 'Write an email', onclick: function () { T.nav.go('app/gmail/compose'); } }),
        el('button', { class: 'chip', type: 'button', text: 'New calendar event', onclick: function () { T.nav.go('app/calendar/new'); } })),
      el('p', { class: 'muted' }, el('kbd', { text: 'Ctrl/Cmd + K' }), document.createTextNode(' search · '), el('kbd', { text: 'Esc' }), document.createTextNode(' close')));

    var map = { tasks: taskCard, recent: recent, favorites: fav, shortcuts: sc }, W = T.widgets.get(), g2 = el('div', { class: 'grid cols-2' });
    W.order.forEach(function (id) { if (W.hidden.indexOf(id) < 0 && map[id]) g2.append(map[id]); });
    if (!g2.children.length) g2.append(el('p', { class: 'panel empty', text: 'All widgets are hidden. Turn them on in Settings.' }));
    view.append(g2);
  }
  renderDashboard.refresh = function (view) { var s = window.scrollY; T.nav.render(); window.scrollTo(0, s); };

  function platform() {
    var ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    return 'desktop';
  }
  function hostOf(u) { try { return new URL(u).host; } catch (e) { return u; } }
  function linkOut(url) { // a real <a> click made from a tap is not treated as a blocked pop-up
    var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function androidIntent(a, url) {
    var u = new URL(url);
    return 'intent://' + u.host + u.pathname + u.search + '#Intent;scheme=https;package=' + a.android + ';S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
  }

  function renderApp(view, id, variant) {
    var a = byId[id];
    if (!a) { T.nav.go('dashboard'); return; }
    var v = variant && a.variants && a.variants[variant] ? a.variants[variant] : null;
    var webUrl = v ? v.url : a.url, deskUrl = v ? v.url : (a.desk || a.url), title = v ? v.label : a.name;
    var status = el('div', { class: 'open-status', role: 'status', 'aria-live': 'polite' });
    function say(text, actions) { status.textContent = ''; status.append(el('p', { text: text })); if (actions) status.append(actions); }

    function openBrowser() {
      pushRecent(id); linkOut(deskUrl);
      T.log.add('OPEN_BROWSER', a.name + (v ? ' (' + v.label + ')' : '') + ' opened in the browser: ' + deskUrl);
      say('Opened the official ' + a.name + ' website in a new tab. Saved to the activity log.');
    }
    function offerWeb(reason) {
      say(reason, el('div', { class: 'chips' }, el('button', { class: 'btn small primary', type: 'button', text: 'Open in browser instead', onclick: openBrowser })));
    }
    function openDevice() {
      var pf = platform(), scheme = pf === 'ios' ? a.ios : pf === 'desktop' ? a.pc : null;
      if (pf === 'android' && a.android) {
        pushRecent(id); T.log.add('OPEN_DEVICE', a.name + ' app requested on Android (falls back to the website if not installed)');
        say('Opening the ' + a.name + ' app. If it is not installed, your browser opens the website instead.');
        location.href = androidIntent(a, webUrl); return;
      }
      if (!scheme) {
        T.log.add('OPEN_DEVICE_UNAVAILABLE', a.name + ' has no app link for this device (' + pf + ')');
        offerWeb(a.name + ' has no app link for this ' + (pf === 'desktop' ? 'computer' : 'device') + '. You can open the official website instead.'); return;
      }
      var seen = false;
      function gone() { seen = true; }
      function clean() { window.removeEventListener('blur', gone); window.removeEventListener('pagehide', gone); document.removeEventListener('visibilitychange', gone); }
      window.addEventListener('blur', gone); window.addEventListener('pagehide', gone); document.addEventListener('visibilitychange', gone);
      pushRecent(id); T.log.add('OPEN_DEVICE', a.name + ' app requested on ' + pf);
      say('Opening the ' + a.name + ' app…');
      location.href = scheme;
      setTimeout(function () {
        clean(); if (seen || !status.isConnected) return;
        T.log.add('OPEN_DEVICE_FAILED', a.name + ' app did not open on ' + pf);
        offerWeb('The ' + a.name + ' app did not open. It may not be installed on this device.');
      }, 1800);
    }
    function choice(icoText, head, sub, fn) {
      return el('button', { class: 'panel choice', type: 'button', onclick: fn }, el('span', { class: 'choice-ico', 'aria-hidden': 'true', text: icoText }), el('strong', { text: head }), el('small', { text: sub }));
    }
    var win = el('section', { class: 'panel open-card', 'aria-label': 'Open ' + title },
      icon(a), el('h1', { text: 'Open ' + title }), el('p', { class: 'muted', text: 'Choose how you want to open ' + a.name + '.' }),
      el('div', { class: 'choices' },
        choice('🌐', 'Open in browser', 'Official ' + hostOf(webUrl) + ' site, desktop version, in a new tab', openBrowser),
        choice('📱', 'Open in your device', 'Opens the ' + a.name + ' app installed on this device', openDevice)),
      status,
      el('p', { class: 'muted small-note', text: 'Opening ' + a.name + ' is saved in the Tomz OS activity log (Settings). If a phone still shows the mobile site, turn on “Desktop site” in your browser menu.' }),
      el('button', { class: 'btn accent', type: 'button', text: 'Back to Dashboard', onclick: function () { T.nav.go('dashboard'); } }));
    view.append(win);
  }

  T.notify = function (text) { var l = store.get('notifs', []); if (!Array.isArray(l)) l = []; l.unshift({ text: String(text), t: Date.now() }); store.set('notifs', l.slice(0, 50)); if ($('#notifPanel')) renderNotifs(); };
  T.nav.register('dashboard', { title: 'Dashboard', icon: '⌂', nav: 1, mobile: 1, render: renderDashboard });
  T.nav.register('app', { title: 'Open app', parent: 'dashboard', render: renderApp });

  function showAuth() {
    var u = T.auth.getUser();
    $('#welcome').hidden = !!u; $('#shell').hidden = !u;
    if (!u) { $('#view').textContent = ''; $('#notifPanel').hidden = true; clearInterval(clockTimer); return; }
    $('#pName').textContent = u.name; $('#pMode').textContent = 'Guest account';
    $('#avatarFallback').textContent = (u.name || '?').charAt(0).toUpperCase(); $('#avatar').hidden = true; $('#avatarFallback').hidden = false;
    renderNotifs(); T.nav.build(); T.nav.render();
  }

  function renderNotifs() {
    var p = $('#notifPanel'), list = store.get('notifs', []);
    p.textContent = ''; p.append(el('h2', { text: 'Notifications' }));
    if (!list.length) p.append(el('p', { class: 'empty', text: 'Nothing new.' }));
    list.forEach(function (n) { p.append(el('p', { text: String(n.text || '') })); });
    if (list.length) p.append(el('button', { class: 'btn small', type: 'button', text: 'Clear all', onclick: function () { store.set('notifs', []); renderNotifs(); } }));
    $('#bellDot').hidden = !list.length;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.toggle('no-anim', store.get('anim', true) === false);
    $('#globalSearch').addEventListener('click', function () { T.search.open(); });
    $('#globalSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); T.search.open(e.key.length === 1 ? e.key : ''); } });
    document.addEventListener('click', function (e) { var p = $('#notifPanel'); if (!p.hidden && !p.contains(e.target) && !$('#bellBtn').contains(e.target)) { p.hidden = true; $('#bellBtn').setAttribute('aria-expanded', 'false'); } });
    $('#bellBtn').addEventListener('click', function () { var p = $('#notifPanel'); renderNotifs(); p.hidden = !p.hidden; $('#bellBtn').setAttribute('aria-expanded', String(!p.hidden)); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); T.search.open(); }
      if (e.key === 'Escape') { $('#notifPanel').hidden = true; $('#bellBtn').setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('tomz:auth', showAuth);
    renderNotifs(); showAuth();
  });
})(window.Tomz);
