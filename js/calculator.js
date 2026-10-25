(function (T) {
  var el = T.el, store = T.store;
  // Safe recursive-descent parser: + - * / % ( ) and decimals. No eval().
  function evaluate(src) {
    var s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, ''), i = 0;
    if (!s) throw new Error('Enter a calculation');
    function peek() { return s.charAt(i); }
    function num() {
      var m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i)); if (!m) throw new Error('Invalid expression');
      i += m[0].length; return parseFloat(m[0]);
    }
    function primary() {
      if (peek() === '(') { i++; var v = expr(); if (peek() !== ')') throw new Error('Missing closing bracket'); i++; return v; }
      return num();
    }
    function post() { var v = primary(); while (peek() === '%') { i++; v = v / 100; } return v; }
    function factor() { if (peek() === '-') { i++; return -factor(); } if (peek() === '+') { i++; return factor(); } return post(); }
    function term() {
      var v = factor();
      while (peek() === '*' || peek() === '/') { var op = s.charAt(i++), r = factor(); if (op === '/') { if (r === 0) throw new Error('Cannot divide by zero'); v /= r; } else v *= r; }
      return v;
    }
    function expr() { var v = term(); while (peek() === '+' || peek() === '-') { var op = s.charAt(i++), r = term(); v = op === '+' ? v + r : v - r; } return v; }
    var out = expr(); if (i < s.length) throw new Error('Invalid expression');
    if (!isFinite(out)) throw new Error('Result is too large');
    return parseFloat(out.toPrecision(12));
  }
  T.calc = { evaluate: evaluate };

  function render(box) {
    var expr = '', hist = store.get('calc_hist', []);
    if (!Array.isArray(hist)) hist = [];
    var ex = el('div', { class: 'expr', 'aria-live': 'polite' }), rs = el('div', { class: 'res', role: 'status' }), hl = el('div', { class: 'hist' });
    function show() { ex.textContent = expr || '0'; try { rs.textContent = expr && /[\d)%]$/.test(expr) ? '= ' + evaluate(expr) : ''; } catch (e) { rs.textContent = ''; } }
    function put(c) { expr += c; show(); }
    function eq() {
      try { var r = evaluate(expr); hist.unshift(expr + ' = ' + r); hist = hist.slice(0, 30); store.set('calc_hist', hist); expr = String(r); rs.textContent = ''; show(); paintH(); }
      catch (e) { rs.textContent = e.message; }
    }
    function paintH() { hl.textContent = ''; if (!hist.length) hl.append(el('p', { class: 'empty', text: 'No calculations yet.' })); hist.forEach(function (h) { hl.append(el('button', { type: 'button', text: h, onclick: function () { expr = h.split(' = ')[1]; show(); } })); }); }
    var keys = ['C', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '%', '+'];
    var pad = el('div', { class: 'keypad' });
    keys.forEach(function (k) {
      pad.append(el('button', { class: 'btn' + (/[÷×\-+]/.test(k) ? ' accent' : ''), type: 'button', text: k, 'aria-label': k === '⌫' ? 'Backspace' : k === 'C' ? 'Clear' : k, onclick: function () { if (k === 'C') { expr = ''; show(); } else if (k === '⌫') { expr = expr.slice(0, -1); show(); } else put(k); } }));
    });
    var eqb = el('button', { class: 'btn primary', type: 'button', text: '=', style: 'grid-column:1/-1', onclick: eq }); pad.append(eqb);
    var clr = el('button', { class: 'btn small', type: 'button', text: 'Clear history', onclick: function () { hist = []; store.set('calc_hist', hist); paintH(); } });
    function onKey(e) {
      if (!box.isConnected) { document.removeEventListener('keydown', onKey); return; }
      var t = e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.ctrlKey || e.metaKey) return;
      if (/^[0-9.()%+\-]$/.test(e.key)) put(e.key); else if (e.key === '*') put('×'); else if (e.key === '/') { e.preventDefault(); put('÷'); }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); eq(); } else if (e.key === 'Backspace') { expr = expr.slice(0, -1); show(); } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') { expr = ''; show(); }
    }
    document.addEventListener('keydown', onKey);
    box.append(el('div', { class: 'form', style: 'align-items:start' }, el('div', { style: 'display:grid;gap:10px' }, el('div', { class: 'panel calc-screen' }, ex, rs), pad), el('div', {}, el('div', { class: 'row', style: 'justify-content:space-between' }, el('h2', { text: 'History' }), clr), hl)));
    show(); paintH();
  }
  if (T.tools) T.tools.add('calculator', 'Calculator', 'Arithmetic with brackets and history', render);
})(window.Tomz);
