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

  // embed: 'try' = may allow framing (cannot be verified from the browser); 'blocked' = known to refuse framing.
  var APPS = [
    { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/', c: '#E62117', l: 'Y', embed: 'blocked' },
    { id: 'google', name: 'Google Search', url: 'https://www.google.com/', c: '#4285F4', l: 'G', embed: 'blocked' },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', c: '#10A37F', l: 'C', embed: 'blocked' },
    { id: 'claude', name: 'Claude', url: 'https://claude.ai/', c: '#C96442', l: 'Cl', embed: 'blocked' },
    { id: 'gemini', name: 'Google Gemini', url: 'https://gemini.google.com/', c: '#6B5CE7', l: 'Ge', embed: 'blocked' },
    { id: 'grok', name: 'Grok', url: 'https://grok.com/', c: '#2B2F3A', l: 'Gr', embed: 'blocked' },
    { id: 'drive', name: 'Google Drive', url: 'https://drive.google.com/', c: '#1FA463', l: 'D', embed: 'blocked' },
    { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com/', c: '#D93025', l: 'M', embed: 'blocked' },
    { id: 'github', name: 'GitHub', url: 'https://github.com/', c: '#30363D', l: 'Gh', embed: 'blocked' },
    { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/', c: '#1DB954', l: 'S', embed: 'blocked' },
    { id: 'wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org/', c: '#5B6270', l: 'W', embed: 'try' },
    { id: 'calendar', name: 'Google Calendar', url: 'https://calendar.google.com/', c: '#168BFF', l: 'Ca', embed: 'blocked' }
  ];
  T.apps = APPS;
  var byId = {}; APPS.forEach(function (a) { byId[a.id] = a; });
  var store = T.store;

  function icon(a) { var i = el('span', { class: 'app-ico', 'aria-hidden': 'true', text: a.l }); i.style.background = a.c; return i; }
  function favs() { return store.get('favs', ['youtube', 'claude', 'github']); }
  function toggleFav(id) { var f = favs(), i = f.indexOf(id); if (i < 0) f.push(id); else f.splice(i, 1); store.set('favs', f); }
  function pushRecent(id) { var r = store.get('recent', []).filter(function (x) { return x !== id; }); r.unshift(id); store.set('recent', r.slice(0, 6)); }
  function openNew(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

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
        el('button', { class: 'chip', type: 'button', text: 'Write an email', onclick: function () { openNew('https://mail.google.com/mail/?view=cm'); } }),
        el('button', { class: 'chip', type: 'button', text: 'New calendar event', onclick: function () { openNew('https://calendar.google.com/calendar/u/0/r/eventedit'); } })),
      el('p', { class: 'muted' }, el('kbd', { text: 'Ctrl/Cmd + K' }), document.createTextNode(' search · '), el('kbd', { text: 'Esc' }), document.createTextNode(' close')));

    var map = { tasks: taskCard, recent: recent, favorites: fav, shortcuts: sc }, W = T.widgets.get(), g2 = el('div', { class: 'grid cols-2' });
    W.order.forEach(function (id) { if (W.hidden.indexOf(id) < 0 && map[id]) g2.append(map[id]); });
    if (!g2.children.length) g2.append(el('p', { class: 'panel empty', text: 'All widgets are hidden. Turn them on in Settings.' }));
    view.append(g2);
  }
  renderDashboard.refresh = function (view) { var s = view.scrollTop; T.nav.render(); window.scrollTo(0, s); };

  function appBar(a) {
    return el('div', { class: 'win-bar' }, icon(a), el('span', { class: 'grow', text: a.name }),
      el('button', { class: 'btn small', type: 'button', text: 'Open in New Tab', onclick: function () { openNew(a.url); } }),
      el('button', { class: 'btn small accent', type: 'button', text: 'Back to Dashboard', onclick: function () { T.nav.go('dashboard'); } }));
  }
  T.appBar = appBar;
  function renderApp(view, id) {
    var a = byId[id];
    if (!a) { T.nav.go('dashboard'); return; }
    pushRecent(id);
    if (T.panels && T.panels[id]) { T.panels[id](view, a); return; }
    var win = el('section', { class: 'panel win', 'aria-label': a.name + ' window' });
    var bar = el('div', { class: 'win-bar' }, icon(a), el('span', { class: 'grow', text: a.name }),
      el('button', { class: 'btn small', type: 'button', text: 'Open in New Tab', onclick: function () { openNew(a.url); } }),
      el('button', { class: 'btn small accent', type: 'button', text: 'Back to Dashboard', onclick: function () { T.nav.go('dashboard'); } }));
    win.append(bar);
    if (a.embed === 'try') {
      var f = el('iframe', { src: a.url, title: a.name, referrerpolicy: 'no-referrer', sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups', loading: 'lazy' });
      var wrap = el('div', { style: 'position:relative;min-height:0' }, f,
        el('p', { class: 'notice', style: 'position:absolute;left:10px;right:10px;bottom:10px;margin:0;background:#10141Df2' }, document.createTextNode('If this stays blank, ' + a.name + ' is refusing to be embedded. Browsers do not tell Tomz OS when that happens, so use Open in New Tab.')));
      win.append(wrap);
    } else {
      win.append(el('div', { class: 'fallback-panel' }, icon(a), el('h2', { text: a.name + ' cannot open inside Tomz OS' }),
        el('p', { class: 'muted', style: 'max-width:420px;margin:0', text: a.name + ' tells browsers not to show it inside other sites, so it will open in a new tab instead. Tomz OS stays open here.' }),
        el('div', { class: 'chips', style: 'justify-content:center' },
          el('button', { class: 'btn primary', type: 'button', text: 'Open in New Tab', onclick: function () { openNew(a.url); } }),
          el('button', { class: 'btn', type: 'button', text: 'Return to Tomz OS', onclick: function () { T.nav.go('dashboard'); } }))));
    }
    view.append(win);
  }

  T.nav.register('dashboard', { title: 'Dashboard', icon: '⌂', nav: 1, mobile: 1, render: renderDashboard });
  T.nav.register('app', { title: 'App', parent: 'dashboard', render: renderApp });

  function showAuth() {
    var u = T.auth.getUser();
    $('#welcome').hidden = !!u; $('#shell').hidden = !u;
    if (!u) return;
    $('#pName').textContent = u.name; $('#pMode').textContent = u.mode === 'google' ? 'Google account' : 'Guest Mode';
    $('#avatarFallback').textContent = (u.name || '?').charAt(0).toUpperCase();
    var img = $('#avatar'); img.hidden = !u.picture; $('#avatarFallback').hidden = !!u.picture;
    if (u.picture) { img.src = u.picture; img.referrerPolicy = 'no-referrer'; }
    T.nav.build(); T.nav.render();
  }

  function renderNotifs() {
    var p = $('#notifPanel'), list = store.get('notifs', []);
    p.textContent = ''; p.append(el('h2', { text: 'Notifications' }));
    if (!list.length) p.append(el('p', { class: 'empty', text: 'Nothing new.' }));
    list.forEach(function (n) { p.append(el('p', { text: String(n.text || '') })); });
    $('#bellDot').hidden = !list.length;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.toggle('no-anim', store.get('anim', true) === false);
    $('#globalSearch').addEventListener('click', function () { T.search.open(); });
    $('#globalSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); T.search.open(); } });
    document.addEventListener('click', function (e) { var p = $('#notifPanel'); if (!p.hidden && !p.contains(e.target) && !$('#bellBtn').contains(e.target)) { p.hidden = true; $('#bellBtn').setAttribute('aria-expanded', 'false'); } });
    $('#bellBtn').addEventListener('click', function () { var p = $('#notifPanel'); p.hidden = !p.hidden; $('#bellBtn').setAttribute('aria-expanded', String(!p.hidden)); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); T.search.open(); }
      if (e.key === 'Escape') { $('#notifPanel').hidden = true; $('#bellBtn').setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('tomz:auth', showAuth);
    renderNotifs(); showAuth();
  });
})(window.Tomz);
