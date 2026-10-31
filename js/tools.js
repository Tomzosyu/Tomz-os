(function (T) {
  var el = T.el, store = T.store, list = [];
  function field(label, c) { return el('label', { class: 'field' }, el('span', { text: label }), c); }
  function opt(v, t) { return el('option', { value: v, text: t }); }
  function btn(text, fn, cls) { return el('button', { class: 'btn ' + (cls || ''), type: 'button', text: text, onclick: fn }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function randInt(min, max) { // unbiased, uses Web Crypto
    var span = max - min + 1, lim = Math.floor(4294967296 / span) * span, a = new Uint32Array(1);
    do { crypto.getRandomValues(a); } while (a[0] >= lim);
    return min + (a[0] % span);
  }
  function copy(text, b) {
    var old = b.textContent;
    function say(m) { b.textContent = m; setTimeout(function () { b.textContent = old; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say('Copied'); }, function () { say('Copy blocked'); });
    else say('Copy not supported');
  }
  function beep() {
    if (store.get('sound', true) === false) return;
    try { var C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(); o.frequency.value = 880; o.connect(c.destination); o.start(); setTimeout(function () { o.stop(); c.close(); }, 400); } catch (e) {}
  }
  T.util = { randInt: randInt, copy: copy, field: field, opt: opt, btn: btn };

  function add(id, name, desc, render) { list.push({ id: id, name: name, desc: desc, render: render }); }
  T.tools = { add: add, list: function () { return list; } };

  /* shared countdown engine; state survives leaving the page via localStorage */
  function engine(box, key, getDur, label, onDone) {
    var disp = el('div', { class: 'out', role: 'timer', 'aria-live': 'off' }), msg = el('p', { class: 'err', role: 'status' });
    function st() { return store.get(key, { left: getDur(), end: 0 }); }
    function left(s) { return s.end ? Math.max(0, s.end - Date.now()) : s.left; }
    function show() { var s = Math.ceil(left(st()) / 1000); disp.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
    var go = btn('Start', function () {
      var s = st(); if (s.end) { s.left = left(s); s.end = 0; } else { if (s.left <= 0) { msg.textContent = 'Set a time above zero first.'; return; } msg.textContent = ''; s.end = Date.now() + s.left; }
      store.set(key, s); sync();
    }, 'primary');
    var rs = btn('Reset', function () { store.set(key, { left: getDur(), end: 0 }); msg.textContent = ''; sync(); });
    function sync() { var s = st(); go.textContent = s.end ? 'Pause' : (s.left < getDur() ? 'Resume' : 'Start'); show(); }
    var iv = setInterval(function () {
      if (!box.isConnected) { clearInterval(iv); return; }
      var s = st(); if (s.end && s.end <= Date.now()) { store.set(key, { left: getDur(), end: 0 }); var nm = typeof label === 'function' ? label() : label; msg.textContent = nm + ' finished!'; beep(); if (T.notify) T.notify(nm + ' finished!'); if (onDone) onDone(); sync(); } else show();
    }, 250);
    box.append(disp, el('div', { class: 'row', style: 'justify-content:center' }, go, rs), msg); sync();
    return { reset: function () { store.set(key, { left: getDur(), end: 0 }); msg.textContent = ''; sync(); }, extend: function (ms) { var s = st(); if (s.end) s.end = Math.min(s.end + ms, Date.now() + 10800000); else s.left = Math.min(s.left + ms, 10800000); store.set(key, s); sync(); } };
  }

  add('stopwatch', 'Stopwatch', 'Time anything, with laps', function (box) {
    var acc = 0, start = 0, laps = [], disp = el('div', { class: 'out', role: 'timer' }), ol = el('ol', { class: 'muted' });
    function now() { return acc + (start ? performance.now() - start : 0); }
    function fmt(ms) { var c = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000); return pad(m) + ':' + pad(s) + '.' + pad(c); }
    var go = btn('Start', function () { if (start) { acc = now(); start = 0; go.textContent = 'Resume'; } else { start = performance.now(); go.textContent = 'Pause'; } }, 'primary');
    var lap = btn('Lap', function () { if (!start) return; laps.unshift(fmt(now())); ol.textContent = ''; laps.forEach(function (l) { ol.append(el('li', { text: l })); }); });
    var rs = btn('Reset', function () { acc = 0; start = 0; laps = []; ol.textContent = ''; go.textContent = 'Start'; disp.textContent = fmt(0); });
    disp.textContent = fmt(0);
    var iv = setInterval(function () { if (!box.isConnected) clearInterval(iv); else disp.textContent = fmt(now()); }, 50);
    box.append(disp, el('div', { class: 'row', style: 'justify-content:center' }, go, lap, rs), ol);
  });

  add('countdown', 'Countdown timer', 'Count down from any time', function (box) {
    var m = el('input', { type: 'number', min: '0', max: '999', value: '5', inputmode: 'numeric' }), s = el('input', { type: 'number', min: '0', max: '59', value: '0', inputmode: 'numeric' });
    var err = el('p', { class: 'err', role: 'alert' });
    function dur() { var a = Math.floor(+m.value), b = Math.floor(+s.value); if (!(a >= 0 && a <= 999 && b >= 0 && b <= 59)) return 0; return (a * 60 + b) * 1000; }
    var saved = store.get('cd_set', null); if (saved) { m.value = saved.m; s.value = saved.s; }
    var e;
    var set = btn('Set time', function () { var d = dur(); if (!d) { err.textContent = 'Use minutes 0–999 and seconds 0–59, above zero in total.'; return; } err.textContent = ''; store.set('cd_set', { m: m.value, s: s.value }); e.reset(); });
    box.append(el('div', { class: 'form' }, field('Minutes', m), field('Seconds', s), set), err);
    e = engine(box, 'cd_state', function () { return dur() || 300000; }, 'Countdown');
    [m, s].forEach(function (n) { n.addEventListener('change', function () { var run = store.get('cd_state', {}); if (!(run && run.end) && dur()) { err.textContent = ''; store.set('cd_set', { m: m.value, s: s.value }); e.reset(); } }); });
  });

  add('pomodoro', 'Pomodoro', 'Focus and break cycles with adjustable time', function (box) {
    var def = { Focus: 25, 'Short break': 5, 'Long break': 15 }, cfg = Object.assign({}, def, store.get('pomo_cfg', {})), cur = store.get('pomo_mode', 'Focus'), e;
    Object.keys(def).forEach(function (k) { var v = Math.floor(+cfg[k]); cfg[k] = v >= 1 && v <= 180 ? v : def[k]; });
    if (!def[cur]) cur = 'Focus';
    var row = el('div', { class: 'chips', style: 'justify-content:center' }), len = el('strong');
    Object.keys(def).forEach(function (k) { row.append(el('button', { class: 'chip', type: 'button', text: k, onclick: function () { cur = k; store.set('pomo_mode', k); e.reset(); mark(); } })); });
    function mark() { row.querySelectorAll('.chip').forEach(function (c) { c.style.borderColor = c.textContent === cur ? 'var(--orange)' : ''; }); len.textContent = cur + ' length: ' + cfg[cur] + ' min'; }
    function setLen(d) { var v = cfg[cur] + d; if (v < 1 || v > 180) return; cfg[cur] = v; store.set('pomo_cfg', cfg); e.reset(); mark(); }
    var done = el('p', { class: 'muted', style: 'text-align:center' });
    function count() { var d = store.get('pomo_done', { d: '', n: 0 }), t = new Date().toDateString(); done.textContent = 'Focus sessions finished today: ' + (d.d === t ? d.n : 0); }
    var adj = el('div', { class: 'row', style: 'justify-content:center' }, btn('−1', function () { setLen(-1); }, 'small'), len, btn('+1', function () { setLen(1); }, 'small'), btn('+5', function () { setLen(5); }, 'small'));
    box.append(row, adj, done);
    e = engine(box, 'pomo_state', function () { return cfg[cur] * 60000; }, function () { return cur; }, function () { if (cur === 'Focus') { var t = new Date().toDateString(), d = store.get('pomo_done', { d: '', n: 0 }); store.set('pomo_done', { d: t, n: (d.d === t ? d.n : 0) + 1 }); count(); } });
    box.append(el('div', { class: 'row', style: 'justify-content:center' }, btn('+1 min', function () { e.extend(60000); }), btn('+5 min', function () { e.extend(300000); }), btn('+10 min', function () { e.extend(600000); })));
    mark(); count();
  });

  add('notes', 'Notes', 'Write and keep notes', function (box) {
    var notes = store.get('notes', []), cur = null;
    if (!Array.isArray(notes)) notes = [];
    var sel = el('select', { 'aria-label': 'Choose note', onchange: function () { open(sel.value); } });
    var title = el('input', { type: 'text', maxlength: '100', placeholder: 'Title', 'aria-label': 'Note title' }), body = el('textarea', { maxlength: '20000', placeholder: 'Start typing…', style: 'min-height:220px', 'aria-label': 'Note text' });
    var status = el('p', { class: 'muted', role: 'status', style: 'margin:0' }), tm;
    function persist() { if (!store.set('notes', notes)) status.textContent = 'Could not save: browser storage is full or blocked.'; else status.textContent = 'Saved'; }
    function refresh() { sel.textContent = ''; notes.forEach(function (n) { sel.append(opt(n.id, n.title || 'Untitled')); }); if (cur) sel.value = cur.id; }
    function open(id) { cur = notes.filter(function (n) { return n.id === id; })[0] || null; title.value = cur ? cur.title : ''; body.value = cur ? cur.body : ''; title.disabled = body.disabled = !cur; }
    function edit() { if (!cur) return; cur.title = title.value; cur.body = body.value; cur.updated = Date.now(); status.textContent = 'Saving…'; clearTimeout(tm); tm = setTimeout(function () { persist(); refresh(); }, 400); }
    title.addEventListener('input', edit); body.addEventListener('input', edit);
    var nw = btn('New note', function () { var n = { id: Date.now().toString(36), title: '', body: '', updated: Date.now() }; notes.unshift(n); persist(); refresh(); sel.value = n.id; open(n.id); title.focus(); }, 'primary');
    var del = btn('Delete note', function () { if (cur && confirm('Delete "' + (cur.title || 'Untitled') + '"? This cannot be undone.')) { notes = notes.filter(function (n) { return n !== cur; }); persist(); refresh(); open(notes[0] ? notes[0].id : ''); if (notes[0]) sel.value = notes[0].id; } });
    box.append(el('div', { class: 'row' }, el('div', { style: 'flex:1;min-width:160px' }, sel), nw, del), title, body, status);
    refresh(); open(notes[0] ? notes[0].id : '');
    if (!notes.length) status.textContent = 'No notes yet. Tap New note to start.';
  });

  add('counter', 'Word counter', 'Words, characters, lines', function (box) {
    var t = el('textarea', { placeholder: 'Paste or type text', 'aria-label': 'Text to count' }), o = el('p', { class: 'muted', role: 'status' });
    function up() { var v = t.value, w = v.trim() ? v.trim().split(/\s+/).length : 0; o.textContent = w + ' words · ' + v.length + ' characters · ' + v.replace(/\s/g, '').length + ' without spaces · ' + (v ? v.split('\n').length : 0) + ' lines · ~' + Math.max(w ? 1 : 0, Math.round(w / 200)) + ' min read'; }
    t.addEventListener('input', up); up(); box.append(t, o);
  });

  add('qr', 'QR code', 'Turn text or a link into a QR code', function (box) {
    var t = el('input', { type: 'text', maxlength: '500', placeholder: 'https://example.com', 'aria-label': 'QR text' }), out = el('div', { style: 'text-align:center' }), err = el('p', { class: 'err', role: 'alert' });
    function lib() { return new Promise(function (res, rej) { if (window.qrcode) return res(); var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = res; s.onerror = function () { rej(); }; document.head.appendChild(s); }); }
    var go = btn('Generate', function () {
      var v = t.value.trim(); out.textContent = ''; err.textContent = '';
      if (!v) { err.textContent = 'Enter some text or a link first.'; return; }
      lib().then(function () {
        var q = qrcode(0, 'M'); q.addData(v); q.make();
        var img = el('img', { src: q.createDataURL(6, 4), alt: 'QR code for the text you entered', width: '240', height: '240', style: 'background:#fff;border-radius:12px;image-rendering:pixelated' });
        out.append(img, el('p', {}, el('a', { class: 'btn small', href: img.src, download: 'tomz-qr.gif', text: 'Download' })));
      }).catch(function () { err.textContent = 'The QR library needs internet to load the first time. Check your connection and try again.'; });
    }, 'primary');
    box.append(field('Text or link', t), go, err, out, el('p', { class: 'muted', text: 'Uses the qrcode-generator library from cdnjs. Your text stays in this browser.' }));
  });

  add('units', 'Unit converter', 'Length, weight, temperature, volume, speed', function (box) {
    var U = { Length: { m: 1, km: 1000, cm: .01, mm: .001, mi: 1609.344, yd: .9144, ft: .3048, in: .0254 }, Weight: { kg: 1, g: .001, mg: 1e-6, lb: .45359237, oz: .028349523 }, Volume: { L: 1, mL: .001, gal: 3.785411784, cup: .2365882365, 'fl oz': .0295735296 }, Speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: .44704, kn: .514444 }, Temperature: { '°C': 1, '°F': 1, K: 1 } };
    var cat = el('select', { 'aria-label': 'Category' }), a = el('select', { 'aria-label': 'From unit' }), b = el('select', { 'aria-label': 'To unit' }), v = el('input', { type: 'number', step: 'any', value: '1', 'aria-label': 'Value' }), o = el('div', { class: 'out', role: 'status' });
    Object.keys(U).forEach(function (k) { cat.append(opt(k, k)); });
    function units() { a.textContent = b.textContent = ''; Object.keys(U[cat.value]).forEach(function (k) { a.append(opt(k, k)); b.append(opt(k, k)); }); b.selectedIndex = 1; calc(); }
    function toC(x, u) { return u === '°F' ? (x - 32) * 5 / 9 : u === 'K' ? x - 273.15 : x; }
    function fromC(x, u) { return u === '°F' ? x * 9 / 5 + 32 : u === 'K' ? x + 273.15 : x; }
    function calc() {
      if (v.value === '' || !isFinite(+v.value)) { o.textContent = 'Enter a number'; return; }
      var x = +v.value, r = cat.value === 'Temperature' ? fromC(toC(x, a.value), b.value) : x * U[cat.value][a.value] / U[cat.value][b.value];
      o.textContent = +r.toPrecision(8) + ' ' + b.value;
    }
    cat.onchange = units; [a, b, v].forEach(function (n) { n.addEventListener('input', calc); });
    box.append(el('div', { class: 'form' }, field('Category', cat), field('Value', v), field('From', a), field('To', b)), o); units();
  });

  add('random', 'Random number', 'Pick numbers in a range', function (box) {
    var lo = el('input', { type: 'number', value: '1' }), hi = el('input', { type: 'number', value: '100' }), n = el('input', { type: 'number', value: '1', min: '1', max: '20' }), o = el('div', { class: 'out', role: 'status' }), err = el('p', { class: 'err', role: 'alert' });
    box.append(el('div', { class: 'form' }, field('Min', lo), field('Max', hi), field('How many (1–20)', n)), btn('Generate', function () {
      var a = Math.floor(+lo.value), b = Math.floor(+hi.value), c = Math.floor(+n.value); err.textContent = '';
      if (lo.value === '' || hi.value === '' || !isFinite(a) || !isFinite(b)) { err.textContent = 'Enter a whole number for min and max.'; return; }
      if (a > b) { err.textContent = 'Min must not be larger than max.'; return; }
      if (b - a > 1e9) { err.textContent = 'Keep the range under 1,000,000,000.'; return; }
      if (!(c >= 1 && c <= 20)) { err.textContent = 'Choose between 1 and 20 numbers.'; return; }
      var r = []; for (var i = 0; i < c; i++) r.push(randInt(a, b)); o.textContent = r.join(', ');
    }, 'primary'), err, o);
  });

  add('coin', 'Coin flip', 'Heads or tails', function (box) {
    var o = el('div', { class: 'out', role: 'status', text: 'Flip it' }), s = el('p', { class: 'muted', style: 'text-align:center' }), h = 0, t = 0;
    box.append(o, el('div', { class: 'row', style: 'justify-content:center' }, btn('Flip coin', function () { if (randInt(0, 1)) { h++; o.textContent = 'Heads'; } else { t++; o.textContent = 'Tails'; } s.textContent = 'Heads ' + h + ' · Tails ' + t; }, 'primary')), s);
  });

  add('dice', 'Dice roller', 'Roll up to 6 dice', function (box) {
    var n = el('select', { 'aria-label': 'Number of dice' }), sd = el('select', { 'aria-label': 'Sides' }), o = el('div', { class: 'out', role: 'status', text: 'Roll' }), d = el('p', { class: 'muted', style: 'text-align:center' });
    for (var i = 1; i <= 6; i++) n.append(opt(i, i + (i > 1 ? ' dice' : ' die'))); [4, 6, 8, 10, 12, 20].forEach(function (x) { sd.append(opt(x, 'd' + x)); }); sd.value = '6';
    box.append(el('div', { class: 'form' }, field('Dice', n), field('Sides', sd)), btn('Roll', function () { var r = [], tot = 0; for (var i = 0; i < +n.value; i++) { var x = randInt(1, +sd.value); r.push(x); tot += x; } o.textContent = String(tot); d.textContent = r.join(' + '); }, 'primary'), o, d);
  });

  add('color', 'Color picker', 'Pick a color, get HEX and RGB', function (box) {
    var p = el('input', { type: 'color', value: '#168bff', 'aria-label': 'Pick color' }), h = el('input', { type: 'text', value: '#168BFF', maxlength: '7', 'aria-label': 'HEX value' }), sw = el('div', { class: 'swatch' }), rgb = el('p', { class: 'muted' }), err = el('p', { class: 'err', role: 'alert' });
    function show(x) { sw.style.background = x; var n = parseInt(x.slice(1), 16); rgb.textContent = 'rgb(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')'; }
    p.addEventListener('input', function () { h.value = p.value.toUpperCase(); err.textContent = ''; show(p.value); });
    h.addEventListener('input', function () { var v = h.value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) { p.value = v.toLowerCase(); err.textContent = ''; show(v); } else err.textContent = 'Use a HEX value like #FF7A18.'; });
    var cp = btn('Copy HEX', function () { if (/^#[0-9a-f]{6}$/i.test(h.value.trim())) copy(h.value.trim().toUpperCase(), cp); else err.textContent = 'Fix the HEX value before copying.'; });
    box.append(p, field('HEX', h), sw, rgb, cp, err); show('#168bff');
  });

  add('case', 'Text case', 'UPPER, lower, Title and more', function (box) {
    var t = el('textarea', { placeholder: 'Type or paste text', 'aria-label': 'Text' }), err = el('p', { class: 'err', role: 'alert' });
    function words(s) { return s.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean); }
    var C = { UPPERCASE: function (s) { return s.toUpperCase(); }, lowercase: function (s) { return s.toLowerCase(); }, 'Title Case': function (s) { return s.toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }); }, 'Sentence case': function (s) { return s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }); }, camelCase: function (s) { return words(s).map(function (w, i) { return i ? w[0].toUpperCase() + w.slice(1) : w; }).join(''); }, snake_case: function (s) { return words(s).join('_'); }, 'kebab-case': function (s) { return words(s).join('-'); } };
    var row = el('div', { class: 'chips' });
    Object.keys(C).forEach(function (k) { row.append(el('button', { class: 'chip', type: 'button', text: k, onclick: function () { if (!t.value) { err.textContent = 'Enter some text first.'; return; } err.textContent = ''; t.value = C[k](t.value); } })); });
    var cp = btn('Copy text', function () { if (!t.value) { err.textContent = 'Nothing to copy yet.'; return; } copy(t.value, cp); });
    box.append(t, row, cp, err);
  });

  add('habits', 'Habit tracker', 'Check off daily habits', function (box) {
    var H = store.get('habits', []), nm = el('input', { type: 'text', maxlength: '40', placeholder: 'New habit, e.g. Read 10 pages', 'aria-label': 'Habit name' }), lst = el('div', { class: 'grid' }), err = el('p', { class: 'err', role: 'alert' });
    if (!Array.isArray(H)) H = [];
    function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function day(off) { var d = new Date(); d.setDate(d.getDate() - off); return ds(d); }
    function streak(h) { var i = h.days[day(0)] ? 0 : 1, n = 0; while (h.days[day(i)]) { n++; i++; } return n; }
    function save() { store.set('habits', H); }
    function paint() {
      lst.textContent = ''; if (!H.length) lst.append(el('p', { class: 'panel empty', text: 'No habits yet. Add one above.' }));
      H.forEach(function (h) {
        var cb = el('input', { type: 'checkbox', 'aria-label': h.name + ' done today', onchange: function () { if (cb.checked) h.days[day(0)] = 1; else delete h.days[day(0)]; save(); paint(); } }); cb.checked = !!h.days[day(0)];
        var dots = el('div', { class: 'dots', 'aria-hidden': 'true' }); for (var i = 6; i >= 0; i--) dots.append(el('i', { class: h.days[day(i)] ? 'on' : '' }));
        lst.append(el('div', { class: 'panel task' }, cb, el('div', {}, el('strong', { text: h.name }), el('p', { class: 'muted', style: 'margin:2px 0 6px', text: 'Streak: ' + streak(h) + ' day' + (streak(h) === 1 ? '' : 's') }), dots),
          btn('Delete', function () { if (confirm('Delete "' + h.name + '" and its history?')) { H = H.filter(function (x) { return x !== h; }); save(); paint(); } }, 'small')));
      });
    }
    box.append(el('div', { class: 'row' }, el('div', { style: 'flex:1;min-width:180px' }, nm), btn('Add habit', function () { var v = nm.value.trim(); if (!v) { err.textContent = 'Enter a habit name.'; return; } err.textContent = ''; H.push({ id: Date.now().toString(36), name: v, days: {} }); nm.value = ''; save(); paint(); }, 'primary')), err, lst); paint();
  });

  function render(view, arg) {
    var t = list.filter(function (x) { return x.id === arg; })[0];
    if (!t) {
      view.append(el('section', { class: 'panel hero' }, el('div', {}, el('h1', { text: 'Tools' }), el('p', { class: 'muted', text: 'Everything here works offline except the QR library, which loads from the internet once.' }))));
      var g = el('div', { class: 'grid apps', style: 'grid-template-columns:repeat(auto-fill,minmax(210px,1fr))' });
      list.forEach(function (x) { g.append(el('button', { class: 'panel tile', type: 'button', onclick: function () { T.nav.go('tools/' + x.id); } }, el('strong', { text: x.name }), el('small', { text: x.desc }))); });
      view.append(g); return;
    }
    var box = el('div', { class: 'panel toolbox' });
    view.append(el('div', { class: 'row' }, btn('← All tools', function () { T.nav.go('tools'); }, 'small'), el('h1', { text: t.name, style: 'font-size:1.4rem' })), box);
    t.render(box);
  }
  T.nav.register('tools', { title: 'Tools', icon: '⚒', nav: 1, mobile: 1, render: render });
})(window.Tomz);
