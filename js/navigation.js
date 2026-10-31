(function (T) {
  var routes = {}, order = [], ORDER = ['dashboard', 'tasks', 'tools', 'games', 'settings'];
  var $ = function (s) { return document.querySelector(s); };

  function register(id, def) { routes[id] = def; if (def.nav && order.indexOf(id) < 0) order.push(id); order.sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); }); }
  function link(id, cls) {
    var r = routes[id], a = document.createElement('a');
    a.className = 'nav-item'; a.href = '#/' + id; a.dataset.route = id;
    var i = document.createElement('span'); i.className = 'ico'; i.setAttribute('aria-hidden', 'true'); i.textContent = r.icon;
    var t = document.createElement('span'); t.textContent = r.title;
    a.append(i, t); return a;
  }
  function buildNav() {
    var side = $('#sideNav'), bot = $('#bottomNav'); side.textContent = ''; bot.textContent = '';
    order.forEach(function (id) { side.appendChild(link(id)); });
    order.filter(function (id) { return routes[id].mobile; }).forEach(function (id) { bot.appendChild(link(id)); });
  }
  function current() {
    var h = location.hash.replace(/^#\//, '').split('/');
    return { id: h[0] || 'dashboard', arg: h[1] || '', arg2: h[2] || '' };
  }
  function render() {
    var c = current(), r = routes[c.id] || routes.dashboard, view = $('#view');
    if (!routes[c.id]) c = { id: 'dashboard', arg: '', arg2: '' };
    view.textContent = '';
    try { r.render(view, c.arg, c.arg2); } catch (err) { view.textContent = ''; var p = document.createElement('p'); p.className = 'panel empty'; p.textContent = 'Something went wrong loading this page. Try another section.'; view.append(p); if (window.console) console.error(err); }
    document.querySelectorAll('.nav-item').forEach(function (a) {
      if (a.dataset.route === (r.parent || c.id)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = (r.title ? r.title + ' · ' : '') + 'TOMZ OS';
    window.scrollTo(0, 0);
  }
  function go(path) { if (location.hash === '#/' + path) render(); else location.hash = '#/' + path; }

  T.nav = { register: register, build: buildNav, render: render, go: go };
  window.addEventListener('hashchange', function () { if (!$('#shell').hidden) render(); });
})(window.Tomz);
