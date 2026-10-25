(function (w) {
  var P = 'tomz.';
  var S = {
    get: function (k, d) { try { var v = localStorage.getItem(P + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove: function (k) { try { localStorage.removeItem(P + k); } catch (e) {} }
  };
  w.Tomz = w.Tomz || {};
  w.Tomz.store = S;
})(window);
