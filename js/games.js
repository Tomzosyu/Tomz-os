(function (T) {
  var el = T.el, store = T.store, U = T.util, list = [];
  T.games = { list: list };
  function add(id, name, desc, fn) { list.push({ id: id, name: name, desc: desc, render: fn }); }
  function sc() { var s = store.get('game_scores', {}); return s && typeof s === 'object' ? s : {}; }
  function setSc(k, v) { var s = sc(); s[k] = v; store.set('game_scores', s); }
  function btn(t, f, c) { return U.btn(t, f, c); }
  function center(n) { n.style.textAlign = 'center'; return n; }

  /* ---------- Tic-Tac-Toe ---------- */
  add('ttt', 'Tic-Tac-Toe', 'Two players or against the computer', function (box) {
    var L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    var b, turn, over, mode = 'cpu', token = 0, S = Object.assign({ x: 0, o: 0, d: 0 }, sc().ttt || {}), wl = [];
    var status = el('div', { class: 'out', role: 'status', style: 'font-size:1.5rem' }), score = center(el('p', { class: 'muted' })), grid = el('div', { class: 'board' }), cells = [];
    var sel = el('select', { 'aria-label': 'Game mode', onchange: function () { mode = sel.value; reset(); } }, U.opt('cpu', 'You (X) vs Computer (O)'), U.opt('two', 'Two players'));
    function mk(i) { return el('button', { class: 'cell', type: 'button', onclick: function () { play(i, false); } }); }
    for (var i = 0; i < 9; i++) { cells.push(mk(i)); grid.append(cells[i]); }
    function result() {
      for (var k = 0; k < 8; k++) { var l = L[k]; if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { p: b[l[0]], line: l }; }
      return b.every(Boolean) ? { p: 'draw', line: [] } : null;
    }
    function paint() {
      cells.forEach(function (c, i) { c.textContent = b[i]; c.className = 'cell' + (b[i] === 'O' ? ' o' : '') + (wl.indexOf(i) >= 0 ? ' win' : ''); c.disabled = over || !!b[i]; c.setAttribute('aria-label', 'Row ' + (Math.floor(i / 3) + 1) + ' column ' + (i % 3 + 1) + ': ' + (b[i] || 'empty')); });
      score.textContent = (mode === 'cpu' ? 'You (X) ' : 'X ') + S.x + ' · ' + (mode === 'cpu' ? 'Computer (O) ' : 'O ') + S.o + ' · Draws ' + S.d;
    }
    function say() { status.textContent = mode === 'cpu' ? (turn === 'X' ? 'Your turn' : 'Computer is thinking…') : turn + '’s turn'; }
    function find(p) { for (var k = 0; k < 8; k++) { var l = L[k], v = l.map(function (i) { return b[i]; }); if (v.filter(function (x) { return x === p; }).length === 2 && v.indexOf('') >= 0) return l[v.indexOf('')]; } return -1; }
    function pick(a) { var f = a.filter(function (i) { return !b[i]; }); return f.length ? f[U.randInt(0, f.length - 1)] : -1; }
    function cpu() { var m = find('O'); if (m < 0) m = find('X'); if (m < 0 && !b[4]) m = 4; if (m < 0) m = pick([0, 2, 6, 8]); if (m < 0) m = pick([1, 3, 5, 7]); return m; }
    function play(i, fromCpu) {
      if (over || b[i] || (mode === 'cpu' && turn === 'O' && !fromCpu)) return;
      b[i] = turn; var r = result();
      if (r) {
        over = true; wl = r.line;
        if (r.p === 'draw') { S.d++; status.textContent = 'It’s a draw'; } else { S[r.p.toLowerCase()]++; status.textContent = mode === 'cpu' ? (r.p === 'X' ? 'You win!' : 'Computer wins') : r.p + ' wins!'; }
        setSc('ttt', S); paint(); return;
      }
      turn = turn === 'X' ? 'O' : 'X'; say(); paint();
      if (mode === 'cpu' && turn === 'O') { var t = ++token; setTimeout(function () { if (t === token && box.isConnected && !over) play(cpu(), true); }, 350); }
    }
    function reset() { token++; b = ['', '', '', '', '', '', '', '', '']; turn = 'X'; over = false; wl = []; say(); paint(); }
    box.append(field(sel), status, grid, score, center(el('div', {}, btn('Restart', reset, 'primary'), document.createTextNode(' '), btn('Reset scores', function () { S = { x: 0, o: 0, d: 0 }; setSc('ttt', S); reset(); }))));
    function field(c) { return el('label', { class: 'field' }, el('span', { text: 'Mode' }), c); }
    reset();
  });

  /* ---------- Rock Paper Scissors ---------- */
  add('rps', 'Rock Paper Scissors', 'Beat the computer', function (box) {
    var S = Object.assign({ w: 0, l: 0, d: 0 }, sc().rps || {}), beats = { Rock: 'Scissors', Paper: 'Rock', Scissors: 'Paper' }, names = Object.keys(beats);
    var out = el('div', { class: 'out', role: 'status', style: 'font-size:1.6rem', text: 'Choose your move' }), det = center(el('p', { class: 'muted' })), tot = center(el('p', { class: 'muted' }));
    function paint() { tot.textContent = 'Wins ' + S.w + ' · Losses ' + S.l + ' · Draws ' + S.d; }
    var row = el('div', { class: 'big-btns' });
    names.forEach(function (n) {
      row.append(el('button', { class: 'btn', type: 'button', text: n, onclick: function () {
        var c = names[U.randInt(0, 2)]; det.textContent = 'You: ' + n + ' · Computer: ' + c;
        if (c === n) { S.d++; out.textContent = 'Draw'; } else if (beats[n] === c) { S.w++; out.textContent = 'You win!'; } else { S.l++; out.textContent = 'You lose'; }
        setSc('rps', S); paint(); } }));
    });
    box.append(out, det, row, tot, center(btn('Restart', function () { S = { w: 0, l: 0, d: 0 }; setSc('rps', S); out.textContent = 'Choose your move'; det.textContent = ''; paint(); }, 'primary'))); paint();
  });

  /* ---------- Number Guessing ---------- */
  add('guess', 'Number guessing', 'Find the number from 1 to 100', function (box) {
    var secret, tries, done, best = sc().guessBest || 0;
    var inp = el('input', { type: 'number', min: '1', max: '100', inputmode: 'numeric', 'aria-label': 'Your guess', placeholder: '1–100' });
    var out = el('div', { class: 'out', role: 'status', style: 'font-size:1.5rem' }), err = el('p', { class: 'err', role: 'alert' }), info = center(el('p', { class: 'muted' }));
    function paint() { info.textContent = 'Guesses: ' + tries + (best ? ' · Best: ' + best : ''); }
    function reset() { secret = U.randInt(1, 100); tries = 0; done = false; out.textContent = 'I’m thinking of a number'; err.textContent = ''; inp.value = ''; inp.disabled = false; paint(); inp.focus(); }
    var form = el('form', { class: 'row', novalidate: 'novalidate', onsubmit: function (e) {
      e.preventDefault(); if (done) return; var v = inp.value.trim(), n = Number(v);
      if (v === '' || !Number.isInteger(n) || n < 1 || n > 100) { err.textContent = 'Enter a whole number from 1 to 100.'; return; }
      err.textContent = ''; tries++;
      if (n === secret) { done = true; inp.disabled = true; out.textContent = 'Correct! It was ' + secret; if (!best || tries < best) { best = tries; setSc('guessBest', best); } }
      else out.textContent = n < secret ? n + ' is too low ↑' : n + ' is too high ↓';
      inp.value = ''; paint(); } }, el('div', { style: 'flex:1;min-width:120px' }, inp), el('button', { class: 'btn primary', type: 'submit', text: 'Guess' }));
    box.append(out, form, err, info, center(btn('New game', reset))); reset();
  });

  /* ---------- Memory ---------- */
  add('memory', 'Memory match', 'Find all 8 pairs', function (box) {
    var sym = ['★', '♦', '♣', '♠', '●', '▲', '■', '☾'], deck, open, lock, moves, found, best = sc().memBest || 0;
    var grid = el('div', { class: 'mem' }), out = el('div', { class: 'out', role: 'status', style: 'font-size:1.4rem' }), info = center(el('p', { class: 'muted' }));
    function paint() { info.textContent = 'Moves: ' + moves + ' · Pairs: ' + found + '/8' + (best ? ' · Best: ' + best + ' moves' : ''); }
    function reset() {
      deck = sym.concat(sym); for (var i = deck.length - 1; i > 0; i--) { var j = U.randInt(0, i), t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      open = []; lock = false; moves = 0; found = 0; out.textContent = 'Flip two cards'; grid.textContent = '';
      deck.forEach(function (s, i) { grid.append(el('button', { class: 'card-m', type: 'button', 'aria-label': 'Card ' + (i + 1) + ', face down', onclick: function () { flip(i); } })); });
      paint();
    }
    function show(i, on) { var c = grid.children[i]; c.textContent = on ? deck[i] : ''; c.classList.toggle('up', on); c.setAttribute('aria-label', 'Card ' + (i + 1) + (on ? ': ' + deck[i] : ', face down')); }
    function flip(i) {
      var c = grid.children[i]; if (lock || open.indexOf(i) >= 0 || c.classList.contains('ok')) return;
      open.push(i); show(i, true);
      if (open.length === 2) {
        moves++; var a = open[0], b2 = open[1];
        if (deck[a] === deck[b2]) { [a, b2].forEach(function (k) { grid.children[k].classList.remove('up'); grid.children[k].classList.add('ok'); }); open = []; found++;
          if (found === 8) { out.textContent = 'You won in ' + moves + ' moves!'; if (!best || moves < best) { best = moves; setSc('memBest', best); } } }
        else { lock = true; setTimeout(function () { show(a, false); show(b2, false); open = []; lock = false; }, 800); }
        paint();
      }
    }
    box.append(out, grid, info, center(btn('Restart', reset, 'primary'))); reset();
  });

  /* ---------- Snake ---------- */
  add('snake', 'Snake', 'Arrow keys, swipe or the on-screen pad', function (box) {
    var N = 20, C = 20, best = sc().snake || 0, sn, dir, next, food, score, run, dead, iv;
    var cv = el('canvas', { width: String(N * C), height: String(N * C), role: 'img', 'aria-label': 'Snake board', style: 'width:100%;max-width:400px;display:block;margin:0 auto;border-radius:12px;border:1px solid var(--line);touch-action:none;background:#0b0e15' });
    var ctx = cv.getContext('2d'), msg = el('div', { class: 'out', role: 'status', style: 'font-size:1.3rem' }), info = center(el('p', { class: 'muted' }));
    function paintInfo() { info.textContent = 'Score: ' + score + ' · Best: ' + best; }
    function place() {
      var free = []; for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) if (!sn.some(function (s) { return s.x === x && s.y === y; })) free.push({ x: x, y: y });
      if (!free.length) { food = null; end(true); return; } food = free[U.randInt(0, free.length - 1)];
    }
    function draw() {
      ctx.fillStyle = '#0b0e15'; ctx.fillRect(0, 0, N * C, N * C);
      if (food) { ctx.fillStyle = '#FF7A18'; ctx.beginPath(); ctx.arc(food.x * C + C / 2, food.y * C + C / 2, C / 2 - 3, 0, 7); ctx.fill(); }
      sn.forEach(function (s, i) { ctx.fillStyle = i ? '#168BFF' : '#7cc0ff'; ctx.fillRect(s.x * C + 1, s.y * C + 1, C - 2, C - 2); });
    }
    function stop() { clearInterval(iv); run = false; }
    function end(won) { stop(); dead = true; if (score > best) { best = score; setSc('snake', best); } msg.textContent = (won ? 'You filled the board! ' : 'Game over. ') + 'Score ' + score; paintInfo(); draw(); }
    function reset() { stop(); sn = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]; dir = next = { x: 1, y: 0 }; score = 0; dead = false; place(); msg.textContent = 'Press Start or an arrow key'; paintInfo(); draw(); }
    function step() {
      dir = next; var h = { x: sn[0].x + dir.x, y: sn[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || sn.some(function (s) { return s.x === h.x && s.y === h.y; })) { end(false); return; }
      sn.unshift(h); if (food && h.x === food.x && h.y === food.y) { score++; paintInfo(); place(); } else sn.pop();
      draw();
    }
    function start() { if (dead) reset(); if (run) return; run = true; msg.textContent = 'Go!'; iv = setInterval(function () { if (!box.isConnected) { stop(); return; } step(); }, 120); }
    function steer(dx, dy) { if (dead) reset(); if (dx === -dir.x && dy === -dir.y) return; next = { x: dx, y: dy }; if (!run) start(); }
    function onKey(e) {
      if (!box.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      var m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
      if (m) { e.preventDefault(); steer(m[0], m[1]); } else if (e.key === ' ') { e.preventDefault(); run ? stop() : start(); }
    }
    document.addEventListener('keydown', onKey);
    var t0; cv.addEventListener('touchstart', function (e) { t0 = e.touches[0]; }, { passive: true });
    cv.addEventListener('touchend', function (e) {
      if (!t0) return; var t = e.changedTouches[0], dx = t.clientX - t0.clientX, dy = t.clientY - t0.clientY; t0 = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1, 0); else steer(0, dy > 0 ? 1 : -1);
    }, { passive: true });
    function pb(label, aria, dx, dy) { return el('button', { class: 'btn', type: 'button', text: label, 'aria-label': aria, onclick: function () { steer(dx, dy); } }); }
    var pad = el('div', { class: 'dpad' }, el('span'), pb('▲', 'Up', 0, -1), el('span'), pb('◀', 'Left', -1, 0), el('span'), pb('▶', 'Right', 1, 0), el('span'), pb('▼', 'Down', 0, 1), el('span'));
    box.append(msg, cv, info, center(el('div', {}, btn('Start / Pause', function () { if (dead) reset(); run ? stop() : start(); }, 'primary'), document.createTextNode(' '), btn('Restart', reset))), pad); reset();
  });

  function render(view, arg) {
    var g = list.filter(function (x) { return x.id === arg; })[0];
    if (!g) {
      view.append(el('section', { class: 'panel hero' }, el('div', {}, el('h1', { text: 'Games' }), el('p', { class: 'muted', text: 'Five games that work with a mouse, keyboard or touch. Scores are saved in this browser.' }))));
      var gr = el('div', { class: 'grid apps', style: 'grid-template-columns:repeat(auto-fill,minmax(210px,1fr))' });
      list.forEach(function (x) { gr.append(el('button', { class: 'panel tile', type: 'button', onclick: function () { T.nav.go('games/' + x.id); } }, el('strong', { text: x.name }), el('small', { text: x.desc }))); });
      view.append(gr); return;
    }
    var box = el('div', { class: 'panel toolbox' });
    view.append(el('div', { class: 'row' }, btn('← All games', function () { T.nav.go('games'); }, 'small'), el('h1', { text: g.name, style: 'font-size:1.4rem' })), box);
    g.render(box);
  }
  T.nav.register('games', { title: 'Games', icon: '▶', nav: 1, mobile: 1, render: render });
})(window.Tomz);
