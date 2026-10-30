(function (T) {
  var el = T.el, store = T.store, ov, inp, box, items = [], sel = 0, last;
  function index() {
    var a = [];
    [['dashboard', 'Dashboard'], ['tasks', 'Tasks'], ['tools', 'Tools'], ['games', 'Games'], ['settings', 'Settings']].forEach(function (r) { a.push({ t: r[1], k: 'Section', go: r[0] }); });
    (T.apps || []).forEach(function (x) { a.push({ t: x.name, k: 'App', go: 'app/' + x.id }); });
    ((T.tools && T.tools.list()) || []).forEach(function (x) { a.push({ t: x.name, k: 'Tool', go: 'tools/' + x.id, h: x.desc }); });
    ((T.games && T.games.list) || []).forEach(function (x) { a.push({ t: x.name, k: 'Game', go: 'games/' + x.id, h: x.desc }); });
    var tk = store.get('tasks', []); if (Array.isArray(tk)) tk.forEach(function (t) { if (t && t.title) a.push({ t: String(t.title), k: 'Task', go: 'tasks', h: String(t.desc || '') + ' ' + String(t.cat || '') }); });
    var nt = store.get('notes', []); if (Array.isArray(nt)) nt.forEach(function (n) { if (n) a.push({ t: String(n.title || 'Untitled'), k: 'Note', go: 'tools/notes', h: String(n.body || '') }); });
    return a;
  }
  function paint() {
    var q = inp.value.trim().toLowerCase(), all = index();
    items = (q ? all.filter(function (x) { return (x.t + ' ' + (x.h || '')).toLowerCase().indexOf(q) >= 0; }) : all.filter(function (x) { return x.k === 'Section' || x.k === 'Tool' || x.k === 'Game'; })).slice(0, 30);
    sel = 0; box.textContent = '';
    if (!items.length) box.append(el('p', { class: 'empty', text: 'Nothing found for "' + inp.value.trim() + '".' }));
    items.forEach(function (x, i) { box.append(el('button', { class: 'res-item', type: 'button', role: 'option', 'aria-selected': String(i === 0), onclick: function () { pick(i); } }, el('span', { text: x.t }), el('small', { text: x.k }))); });
  }
  function mark() { Array.prototype.forEach.call(box.children, function (c, i) { c.setAttribute('aria-selected', String(i === sel)); if (i === sel && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' }); }); }
  function pick(i) { var x = items[i]; if (!x) return; close(true); T.nav.go(x.go); }
  function close(skipFocus) { if (!ov || ov.hidden) return; ov.hidden = true; if (!skipFocus && last && last.focus) last.focus(); }
  function build() {
    inp = el('input', { type: 'search', placeholder: 'Search apps, tools, games, tasks, notes', 'aria-label': 'Search everything', autocomplete: 'off', oninput: paint });
    box = el('div', { class: 'results', role: 'listbox', id: 'resList' });
    ov = el('div', { class: 'overlay', hidden: 'hidden', onclick: function (e) { if (e.target === ov) close(); } }, el('div', { class: 'panel palette', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search' }, inp, box));
    ov.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
      else if (e.key === 'Tab') { e.preventDefault(); inp.focus(); }
    });
    document.body.append(ov);
  }
  function open(seed) { if (document.querySelector('#shell').hidden) return; if (!ov) build(); last = document.activeElement; inp.value = typeof seed === 'string' ? seed : ''; ov.hidden = false; paint(); inp.focus(); }
  T.search = { open: open, close: close };
  document.addEventListener('DOMContentLoaded', function () { document.querySelector('#searchBtn').addEventListener('click', open); });
})(window.Tomz);
