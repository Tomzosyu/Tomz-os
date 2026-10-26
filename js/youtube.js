(function (T) {
  var el = T.el, store = T.store, U = T.util;
  var KEY_RE = /^AIza[0-9A-Za-z_-]{35}$/, LINK_RE = /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i, ID_IN_LINK = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/;
  var CATS = [['All', ''], ['Music', '10'], ['Gaming', '20'], ['Tech', '28'], ['News', '25'], ['Sports', '17'], ['Entertainment', '24'], ['Education', '27']];
  var region = ((navigator.language || 'en-US').split('-')[1] || 'US').toUpperCase().slice(0, 2);
  var cache = {}, S = { tab: 'browse', cat: '', q: '', list: [], cur: null, msg: '', busy: false, setup: false };
  var nf = new Intl.NumberFormat('en', { notation: 'compact' });

  function key() { var k = store.get('yt_key', ''); return typeof k === 'string' && KEY_RE.test(k) ? k : ''; }
  function lib(n) { var a = store.get(n, []); return Array.isArray(a) ? a.filter(function (v) { return v && typeof v.id === 'string' && /^[\w-]{11}$/.test(v.id) && typeof v.title === 'string'; }) : []; }
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function dur(iso) { var m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || ''); if (!m) return ''; var h = +m[1] || 0, mi = +m[2] || 0, s = +m[3] || 0; return (h ? h + ':' + p2(mi) : mi) + ':' + p2(s); }
  function ago(d) { var s = (Date.now() - new Date(d)) / 1000, u = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']]; for (var i = 0; i < u.length; i++) if (s >= u[i][0]) { var n = Math.floor(s / u[i][0]); return n + ' ' + u[i][1] + (n > 1 ? 's' : '') + ' ago'; } return 'just now'; }
  function mapItem(v) {
    var sn = v.snippet || {}, th = sn.thumbnails || {}, t = (th.medium || th.high || th.default || {}).url || '';
    return { id: v.id, title: sn.title || 'Untitled', channel: sn.channelTitle || '', thumb: /^https:\/\//.test(t) ? t : '', dur: dur(v.contentDetails && v.contentDetails.duration),
      views: v.statistics && v.statistics.viewCount ? nf.format(+v.statistics.viewCount) + ' views' : '', pub: sn.publishedAt ? ago(sn.publishedAt) : '', emb: !(v.status && v.status.embeddable === false) };
  }
  function api(path, params) {
    var u = new URL('https://www.googleapis.com/youtube/v3/' + path);
    Object.keys(params).forEach(function (k) { u.searchParams.set(k, params[k]); }); u.searchParams.set('key', key());
    return fetch(u.toString()).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status); return j; }); });
  }
  function explain(e) {
    var m = String(e && e.message || e);
    if (/failed to fetch|networkerror|load failed/i.test(m)) return 'Could not reach YouTube. Check your connection.';
    if (/api key not valid|API_KEY_INVALID|key.*invalid/i.test(m)) return 'YouTube rejected this API key. Check it, and that YouTube Data API v3 is enabled for it.';
    if (/quota/i.test(m)) return 'The free YouTube quota for today is used up. It resets daily.';
    if (/referer|blocked|not authorized|forbidden/i.test(m)) return 'This key is restricted. Add ' + location.origin + ' to its allowed website addresses in Google Cloud.';
    return 'YouTube said: ' + m;
  }
  function chart(cat, rg) { var p = { part: 'snippet,contentDetails,statistics,status', chart: 'mostPopular', maxResults: '24', regionCode: rg }; if (cat) p.videoCategoryId = cat; return api('videos', p).then(function (j) { return j.items || []; }); }
  function fetchList() {
    if (S.q) return api('search', { part: 'snippet', type: 'video', q: S.q, maxResults: '24', videoEmbeddable: 'true', safeSearch: 'moderate' }).then(function (j) {
      var ids = (j.items || []).map(function (i) { return i.id && i.id.videoId; }).filter(Boolean); if (!ids.length) return [];
      return api('videos', { part: 'snippet,contentDetails,statistics,status', id: ids.join(',') }).then(function (r) { return r.items || []; });
    });
    return chart(S.cat, region).catch(function (e) { if (region !== 'US') return chart(S.cat, 'US'); throw e; });
  }

  function render(view, a) {
    var grid = el('div', { class: 'vgrid' }), chips = el('div', { class: 'chips' }), side = el('nav', { class: 'yt-side', 'aria-label': 'YouTube sections' }), player = el('aside', { class: 'yt-player', hidden: 'hidden', 'aria-label': 'Video player' });
    var main = el('div', { style: 'display:grid;gap:14px;align-content:start;min-width:0' }), body = el('div', { class: 'yt-body' }, side, main, player);
    var q = el('input', { type: 'search', placeholder: 'Search YouTube or paste a video link', 'aria-label': 'Search YouTube or paste a video link', maxlength: '200' });
    var status = el('p', { class: 'notice', role: 'status', hidden: 'hidden' }), setup = el('div', { class: 'panel pad', hidden: 'hidden' });

    function say(t) { status.textContent = t || ''; status.hidden = !t; }
    function saveLib(n, arr) { store.set(n, arr.slice(0, 100)); }
    function inLib(n, id) { return lib(n).some(function (v) { return v.id === id; }); }
    function toggleLib(n, v) { var l = lib(n), i = l.map(function (x) { return x.id; }).indexOf(v.id); if (i >= 0) l.splice(i, 1); else l.unshift({ id: v.id, title: v.title, channel: v.channel, thumb: v.thumb, dur: v.dur, views: v.views, pub: v.pub }); saveLib(n, l); }

    function card(v) {
      var th = el('div', { class: 'thumb' }); if (v.thumb) th.append(el('img', { src: v.thumb, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' })); if (v.dur) th.append(el('span', { class: 'dur', text: v.dur }));
      return el('button', { class: 'vcard', type: 'button', 'aria-label': 'Play ' + v.title, 'aria-current': String(!!S.cur && S.cur.id === v.id), onclick: function () { play(v); } }, th, el('div', { class: 'vt', text: v.title }), el('div', { class: 'vm', text: [v.channel, v.views, v.pub].filter(Boolean).join(' · ') }));
    }
    function current() { if (S.tab === 'history') return lib('yt_history'); if (S.tab === 'later') return lib('yt_later'); if (S.tab === 'liked') return lib('yt_liked'); return S.list; }
    function go(tab, cat) { S.tab = tab; if (cat !== undefined) { S.cat = cat; S.q = ''; q.value = ''; } if (tab === 'browse') load(); else paint(); }
    function sideBtn(label, tab, cat, on) { return el('button', { class: 'side-item', type: 'button', text: label, 'aria-current': String(on), onclick: function () { go(tab, cat); } }); }
    function paint() {
      chips.textContent = ''; side.textContent = '';
      CATS.forEach(function (c) { var on = S.tab === 'browse' && !S.q && S.cat === c[1]; chips.append(el('button', { class: 'chip', type: 'button', text: c[0], 'aria-pressed': String(on), style: on ? 'border-color:var(--orange)' : '', onclick: function () { go('browse', c[1]); } })); });
      side.append(sideBtn('Home', 'browse', '', S.tab === 'browse' && !S.q && S.cat === ''), el('h3', { text: 'Library' }), sideBtn('History', 'history', undefined, S.tab === 'history'), sideBtn('Watch later', 'later', undefined, S.tab === 'later'), sideBtn('Liked videos', 'liked', undefined, S.tab === 'liked'), el('h3', { text: 'Explore' }));
      CATS.slice(1).forEach(function (c) { side.append(sideBtn(c[0], 'browse', c[1], S.tab === 'browse' && !S.q && S.cat === c[1])); });
      ['history', 'later', 'liked'].forEach(function (t) { var n = { history: 'History', later: 'Watch later', liked: 'Liked' }[t]; chips.append(el('button', { class: 'chip lib-chip', type: 'button', text: n, 'aria-pressed': String(S.tab === t), style: S.tab === t ? 'border-color:var(--orange)' : '', onclick: function () { go(t); } })); });
      grid.textContent = '';
      var l = current();
      if (S.tab === 'browse' && !key()) { setup.hidden = false; } else if (!S.setup) setup.hidden = true;
      if (S.busy) grid.append(el('p', { class: 'empty', text: 'Loading…' }));
      else if (!l.length && (S.tab !== 'browse' || key())) grid.append(el('p', { class: 'panel empty', text: S.msg || ({ browse: 'Nothing here yet.', history: 'Videos you watch will show up here.', later: 'Tap “Watch later” under a video to save it here.', liked: 'Videos you like will show up here.' })[S.tab] }));
      l.forEach(function (v) { grid.append(card(v)); });
      body.classList.toggle('has-player', !!S.cur);
    }
    function load() {
      if (!key()) { S.list = []; S.busy = false; paint(); return; }
      var ck = S.q ? 'q:' + S.q : 'c:' + S.cat;
      if (cache[ck]) { S.list = cache[ck]; S.msg = ''; paint(); return; }
      S.busy = true; S.msg = ''; say(''); paint();
      fetchList().then(function (items) { S.list = items.map(mapItem).filter(function (v) { return v.emb; }); cache[ck] = S.list; S.busy = false; S.msg = S.list.length ? '' : 'No playable videos found.'; paint(); })
        .catch(function (e) { S.busy = false; S.list = []; S.msg = ''; say(explain(e)); paint(); });
    }
    function btnToggle(n, v, on, off) { var b = el('button', { class: 'btn small', type: 'button', onclick: function () { toggleLib(n, v); b.textContent = inLib(n, v.id) ? on : off; paint(); } }); b.textContent = inLib(n, v.id) ? on : off; return b; }
    function play(v) {
      S.cur = v; var h = lib('yt_history').filter(function (x) { return x.id !== v.id; }); h.unshift({ id: v.id, title: v.title, channel: v.channel, thumb: v.thumb, dur: v.dur, views: v.views, pub: v.pub }); saveLib('yt_history', h.slice(0, 50));
      player.hidden = false; player.textContent = '';
      player.append(el('iframe', { class: 'player-frame', src: 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0&playsinline=1', title: v.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin', sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox' }),
        el('h2', { text: v.title, style: 'color:var(--text);font-size:1.05rem' }), el('p', { class: 'vm', style: 'margin:0', text: [v.channel, v.views, v.pub].filter(Boolean).join(' · ') }),
        el('div', { class: 'row' }, btnToggle('yt_liked', v, '♥ Liked', '♡ Like'), btnToggle('yt_later', v, '✓ Saved', 'Watch later'), el('a', { class: 'btn small', href: 'https://www.youtube.com/watch?v=' + encodeURIComponent(v.id), target: '_blank', rel: 'noopener noreferrer', text: 'Open on YouTube' })),
        el('p', { class: 'vm', style: 'margin:0', text: 'If the player shows an error, the owner has blocked embedding. Use Open on YouTube for that one.' }));
      var nx = S.list.filter(function (x) { return x.id !== v.id; }).slice(0, 8);
      if (nx.length) { var un = el('div', { class: 'upnext' }, el('h2', { text: 'Up next' })); nx.forEach(function (x) { var th = el('div', { class: 'thumb' }); if (x.thumb) th.append(el('img', { src: x.thumb, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' })); un.append(el('button', { class: 'un', type: 'button', 'aria-label': 'Play ' + x.title, onclick: function () { play(x); } }, th, el('div', {}, el('div', { class: 'vt', text: x.title }), el('div', { class: 'vm', text: x.channel })))); }); player.append(un); }
      paint(); if (window.matchMedia('(max-width:1099px)').matches) player.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function fromLink(txt) {
      var m = ID_IN_LINK.exec(txt); if (!m) { say('That looks like a YouTube link, but I could not find a video in it. Use a link to a single video.'); return; }
      var id = m[1], base = { id: id, title: 'YouTube video', channel: '', thumb: '', dur: '', views: '', pub: '', emb: true };
      if (!key()) { say(''); play(base); return; }
      api('videos', { part: 'snippet,contentDetails,statistics,status', id: id }).then(function (j) { say(''); play(j.items && j.items[0] ? mapItem(j.items[0]) : base); }).catch(function () { say(''); play(base); });
    }
    function submit(e) {
      e.preventDefault(); var t = q.value.trim(); say('');
      if (!t) { go('browse', ''); return; }
      if (LINK_RE.test(t)) { fromLink(t); return; }
      if (!key()) { S.setup = true; setup.hidden = false; say('Searching needs your free YouTube API key. You can still paste a video link above to play it right now.'); return; }
      S.q = t; S.tab = 'browse'; load();
    }
    // setup panel
    var keyIn = el('input', { type: 'password', placeholder: 'AIza…', 'aria-label': 'YouTube API key', autocomplete: 'off', spellcheck: 'false' });
    function buildSetup() {
      setup.textContent = '';
      setup.append(el('h2', { text: key() ? 'YouTube API key' : 'Connect YouTube browsing' }),
        el('p', { class: 'muted', style: 'margin:0', text: 'Tomz OS shows YouTube inside the app using YouTube’s official player and data API. Browsing and search need your own free API key. Pasting a video link into the search bar works without one.' }),
        el('ol', { class: 'steps' }, el('li', { text: 'Open console.cloud.google.com, create or pick a project.' }), el('li', { text: 'Enable “YouTube Data API v3”.' }), el('li', { text: 'Credentials → Create credentials → API key.' }), el('li', { text: 'Restrict the key: websites = ' + location.origin + '/* and API = YouTube Data API v3.' })),
        el('label', { class: 'field' }, el('span', { text: 'Paste your API key' }), keyIn),
        el('div', { class: 'row' }, U.btn('Save key', function () {
          var k = keyIn.value.trim(); if (!KEY_RE.test(k)) { say('That does not look like a YouTube API key. It starts with AIza and is 39 characters long.'); return; }
          store.set('yt_key', k); keyIn.value = ''; S.setup = false; setup.hidden = true; cache = {}; say(''); load(); }, 'primary'),
          key() ? U.btn('Remove key', function () { store.remove('yt_key'); cache = {}; S.list = []; buildSetup(); paint(); }, 'small') : null),
        el('p', { class: 'muted', style: 'margin:0;font-size:.85rem', text: 'The key is saved only in this browser (and is never included in exports). Anyone who can use this browser could see it, so keep it restricted. Free quota is limited per day; each search uses much more of it than browsing.' }));
    }
    buildSetup();
    var top = el('div', { class: 'panel yt-top' }, el('button', { class: 'btn small', type: 'button', text: '← Dashboard', onclick: function () { T.nav.go('dashboard'); } }), el('span', { class: 'yt-badge' }, el('i'), el('span', { text: 'YouTube' })),
      el('form', { class: 'yt-form', onsubmit: submit, role: 'search' }, q, el('button', { class: 'btn primary', type: 'submit', text: 'Search' })),
      U.btn('API key', function () { S.setup = !S.setup; setup.hidden = !S.setup && !!key(); buildSetup(); if (S.setup) setup.hidden = false; }, 'small'), el('a', { class: 'btn small', href: 'https://www.youtube.com/', target: '_blank', rel: 'noopener noreferrer', text: 'Open YouTube.com' }));
    main.append(chips, status, setup, grid);
    view.append(el('div', { class: 'yt' }, top, body));
    if (S.cur) { var c = S.cur; S.cur = null; play(c); }
    go(S.tab, undefined);
  }
  T.panels = T.panels || {}; T.panels.youtube = render;
})(window.Tomz);
