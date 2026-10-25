(function (T) {
  var el = T.el, store = T.store;
  var PR = { low: 1, medium: 2, high: 3 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nowHM() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function load() { var t = store.get('tasks', []); return Array.isArray(t) ? t : []; }
  function save(t) { if (!store.set('tasks', t)) alert('Could not save tasks: browser storage is full or blocked.'); }
  function overdue(t) { var d = today(); return !t.done && t.due && (t.due < d || (t.due === d && t.time && t.time < nowHM())); }
  function key(t) { return t.due ? t.due + ' ' + (t.time || '99:99') : '9999'; }
  function field(label, c) { return el('label', { class: 'field' }, el('span', { text: label }), c); }
  function opt(v, t) { return el('option', { value: v, text: t }); }

  function render(view) {
    var S = { filter: 'all', sort: 'due', q: '', edit: null };
    var title = el('input', { type: 'text', maxlength: '120', placeholder: 'What needs doing?', required: 'required' });
    var desc = el('textarea', { maxlength: '500', placeholder: 'Details (optional)', style: 'min-height:70px' });
    var pri = el('select', {}, opt('low', 'Low'), opt('medium', 'Medium'), opt('high', 'High')); pri.value = 'medium';
    var due = el('input', { type: 'date' }), tm = el('input', { type: 'time' });
    var cat = el('input', { type: 'text', maxlength: '30', list: 'catList', placeholder: 'e.g. Study' });
    var dl = el('datalist', { id: 'catList' });
    var tags = el('input', { type: 'text', maxlength: '100', placeholder: 'comma, separated' });
    var err = el('p', { class: 'err', role: 'alert' });
    var saveBtn = el('button', { class: 'btn primary', type: 'submit', text: 'Add task' });
    var cancel = el('button', { class: 'btn ghost', type: 'button', text: 'Cancel edit', hidden: 'hidden', onclick: reset });
    var form = el('form', { class: 'panel card form', novalidate: 'novalidate', onsubmit: submit },
      el('div', { class: 'span' }, field('Title', title)), el('div', { class: 'span' }, field('Description', desc)),
      field('Priority', pri), field('Due date', due), field('Time (optional)', tm), field('Category', cat), field('Tags', tags),
      el('div', { class: 'span row' }, saveBtn, cancel), el('div', { class: 'span' }, err), dl);

    function reset() { S.edit = null; form.reset(); pri.value = 'medium'; saveBtn.textContent = 'Add task'; cancel.hidden = true; err.textContent = ''; }
    function submit(e) {
      e.preventDefault();
      var t = title.value.trim();
      if (!t) { err.textContent = 'Enter a title before saving.'; title.focus(); return; }
      if (tm.value && !due.value) { err.textContent = 'Pick a due date to use a time.'; due.focus(); return; }
      var tg = []; tags.value.split(',').forEach(function (x) { x = x.trim().slice(0, 24); if (x && tg.indexOf(x) < 0 && tg.length < 8) tg.push(x); });
      var all = load(), rec = { title: t, desc: desc.value.trim(), pri: pri.value, due: due.value, time: tm.value, cat: cat.value.trim(), tags: tg };
      if (S.edit) { var f = all.filter(function (x) { return x.id === S.edit; })[0]; if (f) Object.assign(f, rec); }
      else { rec.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); rec.done = false; rec.created = Date.now(); all.unshift(rec); }
      save(all); reset(); paint();
    }
    function startEdit(t) {
      S.edit = t.id; title.value = t.title; desc.value = t.desc || ''; pri.value = t.pri; due.value = t.due || ''; tm.value = t.time || '';
      cat.value = t.cat || ''; tags.value = (t.tags || []).join(', '); saveBtn.textContent = 'Save changes'; cancel.hidden = false; err.textContent = '';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' }); title.focus();
    }

    var stats = el('section', { class: 'panel card' }), list = el('div', { class: 'grid' });
    var search = el('input', { type: 'search', placeholder: 'Search tasks', 'aria-label': 'Search tasks', oninput: function () { S.q = search.value.trim().toLowerCase(); paintList(); } });
    var sort = el('select', { 'aria-label': 'Sort tasks', onchange: function () { S.sort = sort.value; paintList(); } }, opt('due', 'Sort: due date'), opt('priority', 'Sort: priority'));
    var chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filter tasks' });
    ['all', 'today', 'upcoming', 'completed', 'overdue'].forEach(function (f) {
      var b = el('button', { class: 'chip', type: 'button', text: f.charAt(0).toUpperCase() + f.slice(1), 'data-f': f, onclick: function () { S.filter = f; paintList(); } }); chips.append(b);
    });
    var clearBtn = el('button', { class: 'btn small', type: 'button', text: 'Clear completed', onclick: function () {
      var all = load(), n = all.filter(function (t) { return t.done; }).length;
      if (!n) { alert('There are no completed tasks to clear.'); return; }
      if (confirm('Delete ' + n + ' completed task' + (n > 1 ? 's' : '') + '? This cannot be undone.')) { save(all.filter(function (t) { return !t.done; })); paint(); }
    } });

    function match(t) {
      var d = today();
      if (S.filter === 'today' && t.due !== d) return false;
      if (S.filter === 'upcoming' && !(t.due > d && !t.done)) return false;
      if (S.filter === 'completed' && !t.done) return false;
      if (S.filter === 'overdue' && !overdue(t)) return false;
      if (S.q) { var hay = [t.title, t.desc, t.cat].concat(t.tags || []).join(' ').toLowerCase(); if (hay.indexOf(S.q) < 0) return false; }
      return true;
    }
    function paintStats() {
      var all = load(), done = all.filter(function (t) { return t.done; }).length, d = today();
      var pct = all.length ? Math.round(done / all.length * 100) : 0, b = el('b'); b.style.width = pct + '%';
      var dueToday = all.filter(function (t) { return t.due === d && !t.done; }).length;
      var doneToday = all.filter(function (t) { return t.doneAt === d; }).length;
      stats.textContent = '';
      stats.append(el('h2', { text: (all.length - done) + ' pending' }),
        el('p', { class: 'muted', text: done + ' of ' + all.length + ' completed (' + pct + '%)' }),
        el('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, b),
        el('p', { class: 'muted', text: 'Today: ' + dueToday + ' due · ' + doneToday + ' finished · ' + all.filter(overdue).length + ' overdue' }));
    }
    function paintList() {
      chips.querySelectorAll('.chip').forEach(function (b) { b.style.borderColor = b.dataset.f === S.filter ? 'var(--orange)' : ''; b.setAttribute('aria-pressed', String(b.dataset.f === S.filter)); });
      var all = load(), items = all.filter(match);
      items.sort(S.sort === 'priority' ? function (a, b) { return PR[b.pri] - PR[a.pri] || (key(a) < key(b) ? -1 : 1); } : function (a, b) { return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : PR[b.pri] - PR[a.pri]; });
      list.textContent = '';
      if (!items.length) list.append(el('p', { class: 'panel empty', text: all.length ? 'No tasks match this filter.' : 'No tasks yet. Add your first one above.' }));
      items.forEach(function (t) {
        var cb = el('input', { type: 'checkbox', 'aria-label': 'Mark "' + t.title + '" ' + (t.done ? 'incomplete' : 'complete'), onchange: function () {
          var a = load(), f = a.filter(function (x) { return x.id === t.id; })[0]; if (f) { f.done = cb.checked; f.doneAt = cb.checked ? today() : ''; save(a); paint(); } } });
        cb.checked = !!t.done;
        var meta = el('div', { class: 't-meta' }, el('span', { class: 'badge ' + t.pri, text: t.pri }));
        if (t.due) meta.append(el('span', { class: 'badge' + (overdue(t) ? ' over' : ''), text: (overdue(t) ? 'Overdue · ' : '') + t.due + (t.time ? ' ' + t.time : '') }));
        if (t.cat) meta.append(el('span', { class: 'badge', text: t.cat }));
        (t.tags || []).forEach(function (g) { meta.append(el('span', { class: 'badge', text: '#' + g })); });
        var body = el('div', {}, el('strong', { class: 't-title', text: t.title }), t.desc ? el('p', { class: 'muted', style: 'margin:4px 0 0', text: t.desc }) : null, meta);
        var acts = el('div', { class: 't-actions' },
          el('button', { class: 'btn small', type: 'button', text: 'Edit', 'aria-label': 'Edit ' + t.title, onclick: function () { startEdit(t); } }),
          el('button', { class: 'btn small', type: 'button', text: 'Delete', 'aria-label': 'Delete ' + t.title, onclick: function () { save(load().filter(function (x) { return x.id !== t.id; })); if (S.edit === t.id) reset(); paint(); } }));
        list.append(el('article', { class: 'panel task' + (t.done ? ' done' : '') }, cb, body, acts));
      });
    }
    function paint() {
      var cats = []; load().forEach(function (t) { if (t.cat && cats.indexOf(t.cat) < 0) cats.push(t.cat); });
      dl.textContent = ''; cats.forEach(function (c) { dl.append(el('option', { value: c })); });
      paintStats(); paintList();
    }
    view.append(el('section', { class: 'panel hero' }, el('div', {}, el('h1', { text: 'Tasks' }), el('p', { class: 'muted', text: 'Saved in this browser, so they are still here after a refresh.' }))),
      stats, form, el('div', { class: 'row' }, el('div', { style: 'flex:1;min-width:180px' }, search), el('div', { style: 'min-width:170px' }, sort), clearBtn), chips, list);
    paint();
  }
  T.nav.register('tasks', { title: 'Tasks', icon: '✓', nav: 1, mobile: 1, render: render });
})(window.Tomz);
