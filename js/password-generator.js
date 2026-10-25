(function (T) {
  var el = T.el;
  var SETS = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', num: '0123456789', sym: '!@#$%^&*()-_=+[]{};:,.?/' };
  function make(len, on) {
    var pools = Object.keys(SETS).filter(function (k) { return on[k]; }).map(function (k) { return SETS[k]; });
    if (!pools.length) throw new Error('Select at least one character type.');
    var all = pools.join(''), out = pools.map(function (p) { return p[T.util.randInt(0, p.length - 1)]; }); // one from each chosen type
    while (out.length < len) out.push(all[T.util.randInt(0, all.length - 1)]);
    for (var i = out.length - 1; i > 0; i--) { var j = T.util.randInt(0, i), t = out[i]; out[i] = out[j]; out[j] = t; }
    return { pw: out.join(''), bits: len * Math.log2(all.length) };
  }
  function render(box) {
    if (!(window.crypto && crypto.getRandomValues)) { box.append(el('p', { class: 'err', text: 'This browser has no secure random generator, so passwords cannot be made here.' })); return; }
    var len = el('input', { type: 'range', min: '8', max: '64', value: '16', 'aria-label': 'Password length' }), lv = el('strong', { text: '16' });
    var on = {}, checks = el('div', { class: 'form' });
    [['upper', 'Uppercase (A–Z)'], ['lower', 'Lowercase (a–z)'], ['num', 'Numbers (0–9)'], ['sym', 'Symbols (!@#…)']].forEach(function (c) {
      var cb = el('input', { type: 'checkbox' }); cb.checked = true; on[c[0]] = true;
      cb.addEventListener('change', function () { on[c[0]] = cb.checked; gen(); });
      checks.append(el('label', { class: 'row' }, cb, el('span', { text: c[1] })));
    });
    var pw = el('div', { class: 'pw', 'data-v': '' }), err = el('p', { class: 'err', role: 'alert' }), m = el('b'), mt = el('div', { class: 'meter', role: 'img', 'aria-label': 'Password strength' }, m), sl = el('p', { class: 'muted', role: 'status' });
    var hidden = false, cur = '';
    function showPw() { pw.textContent = cur ? (hidden ? '•'.repeat(cur.length) : cur) : 'Choose options and press Generate'; }
    function gen() {
      try {
        var r = make(+len.value, on); cur = r.pw; err.textContent = '';
        var lv2 = r.bits < 40 ? ['Weak', 25, '#ff5a3c'] : r.bits < 60 ? ['Fair', 50, '#FF7A18'] : r.bits < 80 ? ['Strong', 75, '#168BFF'] : ['Very strong', 100, '#27d17f'];
        m.style.width = lv2[1] + '%'; m.style.background = lv2[2]; sl.textContent = 'Strength: ' + lv2[0] + ' (about ' + Math.round(r.bits) + ' bits)';
      } catch (e) { cur = ''; err.textContent = e.message; m.style.width = '0'; sl.textContent = ''; }
      showPw();
    }
    len.addEventListener('input', function () { lv.textContent = len.value; gen(); });
    var cp = T.util.btn('Copy', function () { if (cur) T.util.copy(cur, cp); else err.textContent = 'Generate a password first.'; });
    var tg = T.util.btn('Hide', function () { hidden = !hidden; tg.textContent = hidden ? 'Show' : 'Hide'; showPw(); });
    box.append(pw, el('div', { class: 'row' }, T.util.btn('Generate', gen, 'primary'), cp, tg), mt, sl, err, el('label', { class: 'field' }, el('span', {}, document.createTextNode('Length: '), lv), len), checks,
      el('p', { class: 'muted', text: 'Made with the Web Crypto API. Passwords stay on this device and are never saved or sent anywhere.' }));
    gen();
  }
  if (T.tools) T.tools.add('password', 'Password generator', 'Secure random passwords', render);
})(window.Tomz);
