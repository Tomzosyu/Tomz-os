(function (T) {
  var el = T.el, store = T.store, U = T.util;
  var SB = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation';
  function shell(view, a) { var body = el('div', { class: 'pad' }); view.append(el('section', { class: 'panel' }, T.appBar(a), body)); return body; }
  function frame(src, h, title) { return el('iframe', { src: src, title: title, sandbox: SB, allow: 'autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture', allowfullscreen: '', loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin', style: 'width:100%;height:' + h + 'px;border:0;border-radius:12px;background:#0b0e15' }); }
  function ext(href, text) { return el('a', { class: 'btn small', href: href, target: '_blank', rel: 'noopener noreferrer', text: text }); }
  function form(input, label, fn) { return el('form', { class: 'row', onsubmit: function (e) { e.preventDefault(); fn(); } }, el('div', { style: 'flex:1;min-width:200px' }, input), el('button', { class: 'btn primary', type: 'submit', text: label })); }
  T.panels = T.panels || {};

  /* ---- GitHub: public REST API, no key ---- */
  T.panels.github = function (view, a) {
    var b = shell(view, a), out = el('div', { class: 'grid' }), err = el('p', { class: 'err', role: 'alert' });
    var u = el('input', { type: 'text', placeholder: 'GitHub username', 'aria-label': 'GitHub username', maxlength: '39', autocapitalize: 'off', spellcheck: 'false' }); u.value = store.get('gh_user', '') || '';
    function load() {
      var n = u.value.trim().replace(/^@/, ''); err.textContent = ''; out.textContent = '';
      if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(n)) { err.textContent = 'Enter a valid GitHub username (letters, numbers and single hyphens).'; return; }
      out.append(el('p', { class: 'empty', text: 'Loading…' }));
      function j(p) { return fetch('https://api.github.com/' + p, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) { if (r.status === 404) throw new Error('nf'); if (r.status === 403 || r.status === 429) throw new Error('rate'); if (!r.ok) throw new Error('http'); return r.json(); }); }
      Promise.all([j('users/' + encodeURIComponent(n)), j('users/' + encodeURIComponent(n) + '/repos?sort=updated&per_page=30')]).then(function (r) {
        store.set('gh_user', n); var p = r[0], repos = r[1]; out.textContent = '';
        var av = /^https:\/\/avatars\.githubusercontent\.com\//.test(p.avatar_url || '') ? p.avatar_url : '';
        out.append(el('div', { class: 'panel card prof' }, av ? el('img', { src: av, alt: '', referrerpolicy: 'no-referrer' }) : el('span'), el('div', {}, el('h2', { text: p.name || p.login }), el('p', { class: 'muted', style: 'margin:2px 0', text: p.bio || '' }), el('p', { style: 'margin:2px 0', text: (p.public_repos || 0) + ' repos · ' + (p.followers || 0) + ' followers · ' + (p.following || 0) + ' following' }), ext('https://github.com/' + encodeURIComponent(p.login), 'Open profile on GitHub'))));
        if (!repos.length) out.append(el('p', { class: 'panel empty', text: 'No public repositories.' }));
        repos.forEach(function (r) { var ok = /^https:\/\/github\.com\//.test(r.html_url || ''); out.append(el('div', { class: 'panel repo' }, ok ? el('a', { href: r.html_url, target: '_blank', rel: 'noopener noreferrer', text: r.name }) : el('strong', { text: r.name }), r.description ? el('span', { class: 'muted', text: r.description }) : null, el('span', { class: 'muted', text: [r.language, '★ ' + (r.stargazers_count || 0), 'updated ' + String(r.pushed_at || '').slice(0, 10)].filter(Boolean).join(' · ') }))); });
      }).catch(function (e) { out.textContent = ''; err.textContent = e.message === 'nf' ? 'No GitHub user called “' + n + '”.' : e.message === 'rate' ? 'GitHub’s free request limit was reached. Try again in a while.' : 'Could not load GitHub. Check your connection.'; });
    }
    b.append(el('p', { class: 'muted', style: 'margin:0', text: 'Shows public profiles and repositories through GitHub’s public API. GitHub does not allow its website to be embedded, and signing in is not possible here.' }), form(u, 'Load', load), err, out);
    if (u.value) load();
  };

  /* ---- Spotify: official embed for a pasted link ---- */
  function parseSpotify(v) {
    var m = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{22})/.exec(v) || /^spotify:(track|album|playlist|episode|show|artist):([A-Za-z0-9]{22})$/.exec(v);
    return m ? { type: m[1], id: m[2] } : null;
  }
  T.panels.spotify = function (view, a) {
    var b = shell(view, a), holder = el('div'), err = el('p', { class: 'err', role: 'alert' }), chips = el('div', { class: 'chips' });
    var inp = el('input', { type: 'text', placeholder: 'Paste a Spotify track, album, playlist or podcast link', 'aria-label': 'Spotify link', maxlength: '200', autocapitalize: 'off' });
    function recent() { var r = store.get('sp_recent', []); return Array.isArray(r) ? r.filter(function (x) { return typeof x === 'string' && /^(track|album|playlist|episode|show|artist)\/[A-Za-z0-9]{22}$/.test(x); }) : []; }
    function show(t, id) {
      holder.textContent = ''; holder.append(frame('https://open.spotify.com/embed/' + t + '/' + id + '?utm_source=generator', (t === 'track' || t === 'episode') ? 152 : 380, 'Spotify player'));
      var r = recent().filter(function (x) { return x !== t + '/' + id; }); r.unshift(t + '/' + id); store.set('sp_recent', r.slice(0, 8)); paintR();
    }
    function paintR() { chips.textContent = ''; recent().forEach(function (x) { var p = x.split('/'); chips.append(el('button', { class: 'chip', type: 'button', text: p[0] + ' …' + p[1].slice(-4), onclick: function () { show(p[0], p[1]); } })); }); }
    b.append(el('p', { class: 'muted', style: 'margin:0', text: 'Spotify only allows its official player to be embedded for a specific song, album, playlist or podcast. In Spotify, tap Share → Copy link, then paste it here. The full Spotify app cannot run inside another site.' }),
      form(inp, 'Play', function () { err.textContent = ''; var p = parseSpotify(inp.value.trim()); if (!p) { err.textContent = 'That is not a Spotify link to a track, album, playlist, episode or show.'; return; } show(p.type, p.id); inp.value = ''; }), err, holder, chips, el('div', { class: 'row' }, ext('https://open.spotify.com/', 'Open Spotify')));
    paintR();
  };

  /* ---- Google Calendar: official embed ---- */
  T.panels.calendar = function (view, a) {
    var b = shell(view, a), holder = el('div'), err = el('p', { class: 'err', role: 'alert' });
    var inp = el('input', { type: 'text', placeholder: 'Calendar ID (usually your Gmail address)', 'aria-label': 'Google Calendar ID', maxlength: '200', autocapitalize: 'off', spellcheck: 'false' }); inp.value = store.get('cal_src', '') || '';
    function show() {
      var v = inp.value.trim(); err.textContent = '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { err.textContent = 'Enter a calendar ID that looks like name@gmail.com (or the ID from Calendar settings).'; return; }
      store.set('cal_src', v); var tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
      holder.textContent = ''; holder.append(frame('https://calendar.google.com/calendar/embed?src=' + encodeURIComponent(v) + '&ctz=' + encodeURIComponent(tz) + '&mode=AGENDA&showTitle=0&showPrint=0', 560, 'Google Calendar'));
    }
    b.append(el('p', { class: 'muted', style: 'margin:0', text: 'Uses Google’s official calendar embed. Your own calendar appears only if you are signed in to Google in this browser and your browser allows that cookie inside embedded frames; otherwise only a calendar you have made public will show. Make a calendar public only if you are comfortable with everyone seeing its events.' }),
      form(inp, 'Show calendar', show), err, holder, el('div', { class: 'row' }, ext('https://calendar.google.com/', 'Open Google Calendar')));
    if (inp.value) show();
  };

  /* ---- Wikipedia: allows framing ---- */
  T.panels.wikipedia = function (view, a) {
    var b = shell(view, a), holder = el('div');
    var inp = el('input', { type: 'search', placeholder: 'Search Wikipedia', 'aria-label': 'Search Wikipedia', maxlength: '120' });
    function show(q) { holder.textContent = ''; holder.append(frame(q ? 'https://en.m.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(q) : 'https://en.m.wikipedia.org/wiki/Main_Page', 640, 'Wikipedia')); }
    b.append(form(inp, 'Search', function () { show(inp.value.trim()); }), el('p', { class: 'muted', style: 'margin:0', text: 'If the page stays blank, your browser blocked the frame. Use Open in New Tab.' }), holder); show('');
  };
})(window.Tomz);
