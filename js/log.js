(function (T) {
  // Activity log kept in this browser's localStorage (key "tomz.log"). Newest entries last, capped at MAX.
  var KEY = 'log', MAX = 500;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function all() { var l = T.store.get(KEY, []); return Array.isArray(l) ? l : []; }
  function add(type, detail, user) {
    var who = user;
    if (!who) { var u = T.auth && T.auth.getUser && T.auth.getUser(); who = u ? u.name : '-'; }
    var l = all();
    l.push({ t: Date.now(), user: String(who).slice(0, 40), type: String(type).slice(0, 30), detail: String(detail || '').slice(0, 300) });
    if (l.length > MAX) l = l.slice(-MAX);
    T.store.set(KEY, l);
  }
  function line(e) { return stamp(e.t) + ' | ' + e.user + ' | ' + e.type + (e.detail ? ' | ' + e.detail : ''); }
  function text() {
    var l = all();
    return '# TOMZ OS activity log\n# Stored in this browser only. Passwords are never written here.\n' + (l.length ? l.map(line).join('\n') : '(no entries yet)') + '\n';
  }
  function download() {
    var url = URL.createObjectURL(new Blob([text()], { type: 'text/plain' }));
    var a = document.createElement('a'); a.href = url; a.download = 'tomz-os-log-' + stamp(Date.now()).slice(0, 10) + '.txt';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function clear() { T.store.remove(KEY); }
  T.log = { add: add, all: all, line: line, text: text, download: download, clear: clear, KEY: KEY };
})(window.Tomz);
