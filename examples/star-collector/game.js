/*
 * Yıldız Toplayıcı / Star Collector: Arcadex örnek oyunu (rehberdeki tariflerin hepsi bir arada).
 *  - Kaldığı yerden devam: bölüm ve en iyi skorlar bulutta (giriş yoksa localStorage'da).
 *  - Seçimler ve ayarlar: ses ve zorluk ayrı bir kayıtta.
 *  - Liderlik tablosu: "skor" tablosuna gönder, ilk 5'i göster.
 *  - Başarım: "ilk-bolum".   - Reklam arası: bölüm sonlarında Arcadex.ads.break().
 * Panelde tanımla: liderlik tablosu "skor" (yüksek iyi), başarım "ilk-bolum".
 */
(async () => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const canvas = $("stage"), ctx = canvas.getContext("2d");

  // ---------- Kayıt yardımcıları: giriş varsa bulut, yoksa tarayıcı ----------
  const local = {
    get: (k) => { try { return JSON.parse(localStorage.getItem("star:" + k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem("star:" + k, JSON.stringify(v)); } catch { /* gizli sekme */ } },
  };
  const store = {
    async get(key) {
      if (Arcadex.player) {
        const cloud = await Arcadex.save.get(key).catch(() => null);
        const guest = local.get(key);
        if (!cloud && guest) { await Arcadex.save.set(key, guest).catch(() => {}); return guest; } // misafir ilerlemesini taşı
        return cloud;
      }
      return local.get(key);
    },
    async set(key, value) {
      if (Arcadex.player) { try { await Arcadex.save.set(key, value); return; } catch { /* aşağıya düş */ } }
      local.set(key, value);
    },
  };

  // ---------- Başlangıç ----------
  const info = await Arcadex.init();
  $("who").textContent = info.player
    ? `${info.player.name}${info.player.premium ? " ★" : ""}`
    : "Misafir: skorunu tabloya yazmak için giriş yap";

  let progress = Object.assign({ v: 1, level: 1, best: 0 }, await store.get("ilerleme"));
  let settings = Object.assign({ sound: true, difficulty: "orta" }, await store.get("ayarlar"));
  $("optSound").checked = settings.sound;
  $("optDifficulty").value = settings.difficulty;

  // ---------- Ayarlar (seçimler hemen ama kısa gecikmeyle kaydedilir) ----------
  let settingsTimer = 0;
  const saveSettings = () => { clearTimeout(settingsTimer); settingsTimer = setTimeout(() => store.set("ayarlar", settings), 500); };
  $("optSound").addEventListener("change", (e) => { settings.sound = e.target.checked; saveSettings(); });
  $("optDifficulty").addEventListener("change", (e) => { settings.difficulty = e.target.value; saveSettings(); });
  $("settingsBtn").addEventListener("click", () => { paused = true; $("settings").hidden = false; });
  $("closeSettings").addEventListener("click", () => { $("settings").hidden = true; paused = false; });

  // ---------- Oyun ----------
  let stars = [], score = 0, timeLeft = 0, running = false, paused = false, last = 0;
  const speed = () => ({ kolay: 0.7, orta: 1, zor: 1.4 })[settings.difficulty] * (1 + progress.level * 0.08);

  function fit() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", fit); fit();

  function startLevel() {
    stars = []; score = 0; timeLeft = 20; running = true; paused = false;
    $("menu").hidden = true;
    $("level").textContent = `Bölüm ${progress.level}`;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) {
      timeLeft -= dt;
      if (Math.random() < dt * 2.2 * speed()) stars.push({ x: Math.random() * innerWidth, y: -20, r: 14 + Math.random() * 10 });
      for (const s of stars) s.y += 120 * speed() * dt;
      stars = stars.filter((s) => s.y < innerHeight + 30);
      if (timeLeft <= 0) { endLevel(); return; }
    }
    draw();
    requestAnimationFrame(loop);
  }

  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = "#c6ff3a";
    for (const s of stars) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
    $("score").textContent = `${score} · ${Math.ceil(Math.max(0, timeLeft))} sn`;
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!running || paused) return;
    const hit = stars.findIndex((s) => Math.hypot(s.x - e.clientX, s.y - e.clientY) < s.r + 8);
    if (hit >= 0) { stars.splice(hit, 1); score += 10; if (settings.sound) beep(); }
  });

  async function endLevel() {
    running = false;
    progress.best = Math.max(progress.best, score);
    if (score >= 50) progress.level++;              // geçtiyse sıradaki bölüm
    await store.set("ilerleme", progress);          // kaldığı yerden devam

    if (Arcadex.player) {
      const r = await Arcadex.leaderboard.submit("skor", score).catch(() => null);
      if (progress.level === 2) await Arcadex.achievements.unlock("ilk-bolum").catch(() => {});
      $("who").textContent = r ? (r.improved ? `Yeni rekor! ${r.rank}. sıradasın` : `En iyin: ${r.best}`) : $("who").textContent;
    }
    await Arcadex.ads.break();                       // doğal mola: bölüm sonu (premium oyuncuda gösterilmez)
    $("play").textContent = `Bölüm ${progress.level}`;
    $("menu").hidden = false;
    showBoard();
  }

  async function showBoard() {
    const list = $("board");
    list.replaceChildren();
    if (!Arcadex.player) return;
    const t = await Arcadex.leaderboard.top("skor", { limit: 5 }).catch(() => null);
    for (const e of t?.entries ?? []) {
      const li = document.createElement("li");
      li.textContent = `${e.name}: ${e.score}`;
      if (e.isMe) li.className = "me";
      list.append(li);
    }
  }

  // Platform olayları: arka plana geçiş, reklam arası, davet penceresi
  Arcadex.on("pause", () => { paused = true; store.set("ilerleme", progress); });
  Arcadex.on("resume", () => { if ($("settings").hidden) paused = false; last = performance.now(); });

  let audio;
  function beep() {
    audio ??= new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 880; g.gain.value = 0.05; o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.06);
  }

  $("play").textContent = progress.level > 1 ? `Bölüm ${progress.level} (devam)` : "Başla";
  $("play").addEventListener("click", startLevel);
  showBoard();
})();
