/*!
 * Arcadex SDK v1.1
 * Oyununda kullan:  <script src="/sdk/arcadex.js"></script>
 *
 * Tüm çağrılar Promise döner. Hatalar Error nesnesidir; error.code makine için, error.message insan içindir.
 * Oyun Arcadex dışında açılırsa (kendi bilgisayarında test ederken) SDK "yerel mod"a geçer:
 * kayıtlar, skorlar ve bakiye tarayıcı belleğinde tutulur, konsola bilgi yazılır. Kod değiştirmeden ikisi de çalışır.
 */
(function (global) {
  "use strict";

  var SITE = "__ARCADEX_SITE_ORIGIN__";
  var embedded = global.parent !== global && SITE.indexOf("__") !== 0;
  var pending = {};
  var seq = 0;
  var listeners = {};
  var state = { ready: false, info: null };

  function emit(name, data) {
    (listeners[name] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } });
  }

  function fail(code, message) {
    var e = new Error(message || code);
    e.code = code;
    return e;
  }

  // ---------- Platform köprüsü (postMessage) ----------
  if (embedded) {
    global.addEventListener("message", function (e) {
      if (e.origin !== SITE || e.source !== global.parent) return;
      var m = e.data;
      if (!m || m.arcadex !== 1) return;
      if (m.event) { emit(m.event, m.data); return; }
      var p = pending[m.id];
      if (!p) return;
      delete pending[m.id];
      if (m.ok) p.resolve(m.data); else p.reject(fail(m.error, m.message));
    });
  }

  function call(action, payload) {
    if (!embedded) return local(action, payload || {});
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      global.parent.postMessage({ arcadex: 1, id: id, action: action, payload: payload || {} }, SITE);
      setTimeout(function () {
        if (pending[id]) { delete pending[id]; reject(fail("timeout", "Platform yanıt vermedi.")); }
      }, 15000);
    });
  }

  // ---------- Yerel mod (Arcadex dışında test) ----------
  var LS = "arcadex-local:";
  function lsGet(k, d) { try { var v = localStorage.getItem(LS + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* yok say */ } }

  function local(action, p) {
    var r;
    switch (action) {
      case "init":
        console.info("[Arcadex] Yerel mod: platform dışında çalışıyorsun. Veriler bu tarayıcıda tutulur.");
        r = { game: { title: document.title || "Yerel test", slug: "local" }, mode: "local",
              player: { id: "local-player", name: "Yerel Oyuncu", premium: false }, currency: { name: "Jeton" }, leaderboards: [], achievements: [],
              invite: null, ads: { enabled: false } };
        break;
      case "save.get": var s = lsGet("save:" + p.key, null); r = { key: p.key, data: s ? s.data : null, version: s ? s.version : 0 }; break;
      case "save.set": var old = lsGet("save:" + p.key, { version: 0 }); lsSet("save:" + p.key, { data: p.data, version: old.version + 1 }); r = { key: p.key, version: old.version + 1 }; break;
      case "save.list": r = { keys: Object.keys(localStorage).filter(function (k) { return k.indexOf(LS + "save:") === 0; }).map(function (k) { return { key: k.slice(LS.length + 5) }; }) }; break;
      case "save.delete": localStorage.removeItem(LS + "save:" + p.key); r = { deleted: true }; break;
      case "leaderboard.submit":
        var b = lsGet("lb:" + p.board, null); var best = b === null ? p.score : Math.max(b, p.score); lsSet("lb:" + p.board, best);
        r = { board: p.board, score: p.score, best: best, rank: 1, improved: b === null || p.score > b }; break;
      case "leaderboard.top":
        var v = lsGet("lb:" + p.board, null);
        r = { board: p.board, title: p.board, period: p.period || "all", entries: v === null ? [] : [{ rank: 1, name: "Yerel Oyuncu", playerId: "local-player", score: v, isMe: true }], me: v === null ? null : { score: v, rank: 1 } }; break;
      case "achievements.unlock": var a = lsGet("ach", {}); var isNew = !a[p.key]; a[p.key] = true; lsSet("ach", a); r = { key: p.key, unlocked: true, isNew: isNew }; break;
      case "achievements.list": var all = lsGet("ach", {}); r = { achievements: Object.keys(all).map(function (k) { return { key: k, title: k, unlocked: true }; }) }; break;
      case "wallet.get": r = { currency: "Jeton", balance: lsGet("wallet", 0) }; break;
      case "wallet.earn": var w1 = lsGet("wallet", 0) + p.amount; lsSet("wallet", w1); r = { balance: w1, earned: p.amount }; break;
      case "wallet.spend":
        var w2 = lsGet("wallet", 0);
        if (w2 < p.amount) return Promise.reject(fail("insufficient", "Yeterli bakiye yok."));
        lsSet("wallet", w2 - p.amount); r = { balance: w2 - p.amount, spent: p.amount }; break;
      case "login": console.info("[Arcadex] Yerel modda giriş yok."); r = {}; break;
      case "data.get": var d = lsGet("data:" + p.collection + ":" + p.key, null); r = { key: p.key, data: d, version: d === null ? 0 : 1 }; break;
      case "data.set": lsSet("data:" + p.collection + ":" + p.key, p.data); r = { key: p.key, version: 1 }; break;
      case "data.delete": localStorage.removeItem(LS + "data:" + p.collection + ":" + p.key); r = { deleted: true }; break;
      case "data.list":
        var pre = LS + "data:" + p.collection + ":";
        r = { items: Object.keys(localStorage).filter(function (k) { return k.indexOf(pre) === 0; })
              .map(function (k) { return { key: k.slice(pre.length), data: JSON.parse(localStorage.getItem(k)) }; }) }; break;
      case "ads.break": console.info("[Arcadex] Yerel mod: reklam arası atlandı."); r = { shown: false }; break;
      case "server.call":
      case "room.invite":
      case "room.create": case "room.join": case "room.leave": case "room.send": case "room.setState":
        return Promise.reject(fail("local_mode", "Sunucu fonksiyonları ve çevrimiçi odalar sadece Arcadex'te çalışır. Panelden 'Test et' ile dene."));
      default: return Promise.reject(fail("unknown_action", action));
    }
    return Promise.resolve(r);
  }

  function needInit() {
    if (!state.ready) throw fail("not_ready", "Önce Arcadex.init() çağır.");
  }

  // ---------- Herkese açık API ----------
  var Arcadex = {
    version: 1,
    /** Arcadex içinde mi çalışıyor? (false ise yerel mod) */
    get embedded() { return embedded; },
    /** init() sonrası: { id, name } ya da giriş yapılmamışsa null */
    get player() { return state.info ? state.info.player : null; },
    /** "live", "test" (geliştirici testi) ya da "local" */
    get mode() { return state.info ? state.info.mode : null; },
    /** Oyuna bir davet bağlantısıyla gelindiyse { room: "K7QM2X" }; değilse null. init() sonrası. */
    get invite() { return state.info ? state.info.invite || null : null; },

    /** Oyun açılır açılmaz bir kez çağır. Oyun, oyuncu ve tanımlı servis bilgisini döner. */
    init: function () {
      return call("init").then(function (info) {
        state.ready = true; state.info = info;
        if (embedded) global.parent.postMessage({ arcadex: 1, event: "ready" }, SITE);
        return info;
      });
    },

    /** Oyuncu giriş yapmamışsa platformun giriş ekranını açar. */
    requireLogin: function () { return call("login"); },

    save: {
      /** Kaydı okur. Yoksa data null döner. */
      get: function (key) { needInit(); return call("save.get", { key: key }).then(function (r) { return r.data; }); },
      /** Kaydı yazar (JSON'a çevrilebilen her değer, en fazla 64 KB). */
      set: function (key, data, opts) { needInit(); return call("save.set", { key: key, data: data, expectedVersion: opts && opts.version }); },
      list: function () { needInit(); return call("save.list").then(function (r) { return r.keys; }); },
      remove: function (key) { needInit(); return call("save.delete", { key: key }); }
    },

    leaderboard: {
      /** Skoru gönderir; en iyi skor korunur. Dönen: { best, rank, improved } */
      submit: function (board, score) { needInit(); return call("leaderboard.submit", { board: board, score: Math.round(score) }); },
      /** İlk N: { entries: [{rank, name, score, isMe}], me } — period: "all" | "week" */
      top: function (board, opts) { needInit(); opts = opts || {}; return call("leaderboard.top", { board: board, period: opts.period || "all", limit: opts.limit || 10 }); }
    },

    achievements: {
      /** Başarımı açar. Panelde ödül tanımlıysa oyun parası otomatik eklenir. Dönen: { isNew, reward, balance } */
      unlock: function (key) { needInit(); return call("achievements.unlock", { key: key }); },
      list: function () { needInit(); return call("achievements.list").then(function (r) { return r.achievements; }); }
    },

    wallet: {
      get: function () { needInit(); return call("wallet.get"); },
      /** Oyun içinde kazanılan para. Günlük üst sınır panelden ayarlanır. */
      earn: function (amount, reason) { needInit(); return call("wallet.earn", { amount: amount, reason: reason }); },
      /** Bakiye yetmezse error.code === "insufficient" */
      spend: function (amount, reason) { needInit(); return call("wallet.spend", { amount: amount, reason: reason }); }
    },

    /** Veri koleksiyonları (panelde tanımlanır; oyundan erişim izni panelde seçilir). */
    data: {
      get: function (collection, key) { needInit(); return call("data.get", { collection: collection, key: key }).then(function (r) { return r.data; }); },
      set: function (collection, key, data) { needInit(); return call("data.set", { collection: collection, key: key, data: data }); },
      remove: function (collection, key) { needInit(); return call("data.delete", { collection: collection, key: key }); },
      list: function (collection, opts) { needInit(); return call("data.list", { collection: collection, limit: opts && opts.limit }).then(function (r) { return r.items; }); }
    },

    /** Paketteki server/main.js içindeki exports.ad fonksiyonunu sunucuda çalıştırır ve sonucunu döner. */
    server: {
      call: function (fn, args) { needInit(); return call("server.call", { fn: fn, args: args === undefined ? null : args }); }
    },

    /**
     * Çevrimiçi odalar. Olaylar Arcadex.on ile dinlenir:
     *   "room.state" (yeni oyun durumu), "room.message" ({from, type, data}),
     *   "room.player_joined", "room.player_left", "room.host", "room.ended", "room.closed"
     */
    rooms: {
      /** Oda açar. Dönen: { room: { code, players, state, scripted }, you } — code'u arkadaşına söyle. */
      create: function (opts) { needInit(); opts = opts || {}; return call("room.create", { maxPlayers: opts.maxPlayers || 2, options: opts.options || null }); },
      join: function (code) { needInit(); return call("room.join", { code: code }); },
      leave: function () { return call("room.leave"); },
      /** Mesaj gönderir. Betikli odada sunucu (exports.rooms.onMessage) işler; betiksiz odada diğer oyunculara gider. */
      send: function (type, data) { return call("room.send", { type: type, data: data === undefined ? null : data }); },
      /** Betiksiz odada oda kurucusu ortak durumu belirler. */
      setState: function (state) { return call("room.setState", { state: state }); },
      /**
       * Platformun davet penceresini açar: oyuncu takip listesinden arkadaşlarını seçip davet eder.
       * Oyuncu bir odadaysa davet oda koduyla gider; arkadaşı oyunu açınca Arcadex.invite.room ile odaya katılabilirsin.
       * Dönen: { invited } (gönderilen davet sayısı, pencere kapanınca).
       */
      invite: function () { needInit(); return call("room.invite"); }
    },

    /**
     * Reklam arası. Bölüm sonu gibi doğal molalarda çağır; oyunu arada durdurmana gerek yok ("pause"/"resume" olayları gelir).
     * Reklam gösterilip gösterilmeyeceğine platform karar verir (premium oyuncu, sıklık sınırı). Dönen: { shown }.
     */
    ads: {
      "break": function () { return call("ads.break"); },
      /** Bu oyuncuya bu oyunda reklam gösterilebilir mi? (init() sonrası) */
      get enabled() { return !!(state.info && state.info.ads && state.info.ads.enabled); }
    },

    /** Platform olayları: "pause" (uygulama arka plana geçti), "resume", oda olayları */
    on: function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
  };

  global.Arcadex = Arcadex;
})(window);
