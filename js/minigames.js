(function (T) {
  var el = T.el, store = T.store, U = T.util;
  function sc() { var s = store.get('game_scores', {}); return s && typeof s === 'object' ? s : {}; }
  function setSc(k, v) { var s = sc(); s[k] = v; store.set('game_scores', s); }
  function ctr(n) { n.style.textAlign = 'center'; return n; }
  function add(id, name, desc, fn) { T.games.list.push({ id: id, name: name, desc: desc, render: fn }); }

  add('reaction', 'Reaction test', 'Click the moment it turns green', function (box) {
    var best = sc().reactBest || 0, st = 'idle', t0 = 0, to = 0;
    var pad = el('button', { class: 'react', type: 'button' }), info = ctr(el('p', { class: 'muted' }));
    function paint(s, t) { st = s; pad.dataset.s = s; pad.textContent = t; info.textContent = best ? 'Best: ' + best + ' ms' : 'No score yet'; }
    pad.addEventListener('click', function () {
      if (st === 'idle' || st === 'done') {
        paint('wait', 'Wait for green…');
        to = setTimeout(function () { if (!box.isConnected) return; t0 = performance.now(); paint('go', 'CLICK!'); }, U.randInt(1500, 4000));
      } else if (st === 'wait') { clearTimeout(to); paint('done', 'Too soon! Click to retry'); }
      else if (st === 'go') {
        var ms = Math.round(performance.now() - t0);
        if (!best || ms < best) { best = ms; setSc('reactBest', best); }
        paint('done', ms + ' ms · click to go again');
      }
    });
    box.append(pad, info); paint('idle', 'Click to start');
  });

  add('whack', 'Whack-a-mole', 'Hit as many as you can in 30 seconds', function (box) {
    var best = sc().whackBest || 0, score = 0, up = -1, end = 0, iv = 0, tick = 0;
    var grid = el('div', { class: 'holes' }), holes = [], out = el('div', { class: 'out', role: 'status', text: 'Press Start' }), info = ctr(el('p', { class: 'muted' }));
    function show(i) { up = i; holes.forEach(function (h, k) { h.classList.toggle('up', k === i); h.textContent = k === i ? '●' : ''; }); }
    function paint() { info.textContent = 'Score: ' + score + ' · Best: ' + best; }
    function stop() { clearInterval(iv); iv = 0; show(-1); if (score > best) { best = score; setSc('whackBest', best); } out.textContent = 'Time! Score ' + score; paint(); }
    for (var i = 0; i < 9; i++) (function (k) { var h = el('button', { class: 'hole', type: 'button', 'aria-label': 'Hole ' + (k + 1), onclick: function () { if (iv && up === k) { score++; show(-1); paint(); } } }); holes.push(h); grid.append(h); })(i);
    function start() {
      if (iv) return; score = 0; tick = 0; end = Date.now() + 30000; paint();
      iv = setInterval(function () {
        if (!box.isConnected) { clearInterval(iv); return; }
        var left = end - Date.now(); if (left <= 0) { stop(); return; }
        out.textContent = Math.ceil(left / 1000) + 's';
        if (tick++ % 7 === 0) show(U.randInt(0, 8));
      }, 100);
    }
    box.append(out, grid, info, ctr(U.btn('Start', start, 'primary'))); paint();
  });

  add('mathsprint', 'Math sprint', 'Solve as many sums as you can in 30 seconds', function (box) {
    var best = sc().mathBest || 0, score = 0, ans = 0, end = 0, iv = 0;
    var q = el('div', { class: 'out', role: 'status', text: 'Ready?' }), tm = ctr(el('p', { class: 'muted' })), info = ctr(el('p', { class: 'muted' }));
    var inp = el('input', { type: 'number', inputmode: 'numeric', 'aria-label': 'Your answer', disabled: 'disabled' });
    function paint() { info.textContent = 'Score: ' + score + ' · Best: ' + best; }
    function next() {
      var a = U.randInt(2, 12), b = U.randInt(2, 12), op = ['+', '−', '×'][U.randInt(0, 2)];
      if (op === '−' && b > a) { var t = a; a = b; b = t; }
      ans = op === '+' ? a + b : op === '−' ? a - b : a * b; q.textContent = a + ' ' + op + ' ' + b + ' = ?'; inp.value = '';
    }
    function stop() { clearInterval(iv); iv = 0; inp.disabled = true; if (score > best) { best = score; setSc('mathBest', best); } q.textContent = 'Time! Score ' + score; tm.textContent = ''; paint(); }
    var form = el('form', { class: 'row', onsubmit: function (e) { e.preventDefault(); if (!iv) return; if (inp.value !== '' && Number(inp.value) === ans) { score++; paint(); } next(); inp.focus(); } }, el('div', { style: 'flex:1;min-width:120px' }, inp), el('button', { class: 'btn primary', type: 'submit', text: 'Answer' }));
    function start() {
      if (iv) return; score = 0; end = Date.now() + 30000; inp.disabled = false; next(); paint(); inp.focus();
      iv = setInterval(function () { if (!box.isConnected) { clearInterval(iv); return; } var l = end - Date.now(); if (l <= 0) stop(); else tm.textContent = Math.ceil(l / 1000) + 's left'; }, 200);
    }
    box.append(q, tm, form, info, ctr(U.btn('Start', start, 'primary'))); paint();
  });
})(window.Tomz);
