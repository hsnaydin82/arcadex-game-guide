# Arcadex Oyun Rehberi (SDK v1.1)

Bu dosya, **Arcadex** platformuna yüklenecek bir HTML5 oyununu hazırlamak için gereken her şeyi anlatır.
Oyunu kendin yazıyorsan referans olarak kullan. Claude, ChatGPT, Gemini, Grok gibi bir yapay zeka asistanıyla
hazırlıyorsan **bu dosyanın tamamını asistana ver** ve aşağıdaki "Asistana verilecek komut" bölümündeki metinle başla.

> Platformun kendi sayfası: `/gelistirici/rehber` · Bu dosyanın güncel hali: `/gelistirici/arcadex-rehberi.md`

---

## 1. Asistana verilecek komut (kopyala, yapıştır)

```text
Sana "Arcadex Oyun Rehberi"ni veriyorum. Bu rehberdeki kurallara harfiyen uyarak bir HTML5 oyunu yaz.
Oyun: <oyununu burada anlat: tür, amaç, kontroller, bölümler, zorluk, ödüller>
Kullanılacak Arcadex servisleri: <ör. liderlik tablosu "skor", kaldığı yerden devam, ayarlar kaydı, başarımlar, çevrimiçi 2 kişilik oda>
Kurallar:
- Tek klasör: index.html kökte, diğer dosyalar göreli yollarla. Dış sunucuya, CDN'e, yazı tipi servisine bağlanma.
- SDK'yı <script src="/sdk/arcadex.js"></script> ile ekle ve oyun başlarken bir kez Arcadex.init() çağır.
- Kayıt, skor, başarım ve para için sadece SDK'yı kullan; giriş yapmamış oyuncu için localStorage'a düş.
- "pause" ve "resume" olaylarını dinle; reklam arası için doğal molalarda Arcadex.ads.break() çağır.
- Dokunmatik ve klavye/fareyle oynanabilsin; dikey ve yatay ekranda tuval düzgün ölçeklensin.
- Sonunda dosya listesini, panelde tanımlamam gereken servisleri (tablo/başarım kod adları) ve yükleme adımlarını yaz.
```

---

## 2. Değişmez kurallar

| Kural | Ayrıntı |
|---|---|
| Paket | Tek bir `.zip`, en fazla **150 MB**. `index.html` zip'in kökünde (ya da zip'teki tek klasörün içinde). |
| Yollar | Göreli: `assets/hero.png`, `js/game.js`. Kök yol (`/assets/...`) **kullanma**. Tek istisna: `/sdk/arcadex.js`. |
| İnternet | Oyun **hiçbir dış adrese bağlanamaz** (analitik, reklam ağı, CDN, Google Fonts...). Platform engeller. Kütüphaneleri ve yazı tiplerini pakete koy. |
| Yasak dosyalar | `.exe .dll .apk .ipa .so .jar .php` ve benzeri çalıştırılabilir dosyalar otomatik reddedilir. |
| Kaçınılacaklar | `eval`, `new Function`, `document.cookie`, `window.top`/`window.parent` erişimi, gizlenmiş (obfuscated) kod. İncelemede sorulur. |
| Veri | Kayıt, skor, başarım, oyun parası ve ortak veriler **sadece SDK** ile. Kendi sunucuna gönderme. |
| Kişisel veri | Oyuncunun e-postası, gerçek adı vb. sana hiç verilmez; `player.id` oyuna özel takma kimliktir. |
| Reklam | Oyunun içine reklam koyma. Reklamı platform gösterir (`Arcadex.ads.break()`). |
| İnceleme | Her sürüm otomatik taranır ve bir kişi tarafından kodu okunup oynanır. Onaylanan sürüm mühürlenir. |

---

## 3. En küçük çalışan oyun

```html
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Oyunum</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0b0c0f; overflow: hidden; touch-action: none; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script src="/sdk/arcadex.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

```js
// game.js
(async () => {
  const info = await Arcadex.init();     // ilk iş: bir kez
  // info.player  -> { id, name, premium } ya da giriş yapılmamışsa null
  // info.mode    -> "live" (oyuncular) | "test" (geliştirici testi) | "local" (platform dışı)
  // info.invite  -> { room: "K7QM2X" } davet bağlantısıyla gelindiyse, yoksa null
  // info.ads     -> { enabled } bu oyuncuya reklam gösterilebilir mi
  // info.leaderboards / info.achievements / info.currency -> panelde tanımladıkların

  Arcadex.on("pause", () => game.pause());    // sekme gizlendi, reklam arası, davet penceresi
  Arcadex.on("resume", () => game.resume());
  game.start();
})();
```

Her SDK çağrısı **Promise** döner. Hata olursa `error.code` (makine için, değişmez) ve `error.message`
(oyuncu için, dile göre değişir) gelir. **Her zaman `error.code` ile dallan.**

---

## 4. Tarifler

### 4.1 Liderlik tablosuna skor kaydetme

1. Panelde **Oyun servisleri → Liderlik tabloları**'ndan bir tablo ekle: kod adı (ör. `skor`), sıralama (yüksek / düşük iyi),
   kabul edilen en yüksek skor.
2. Oyun bitince skoru gönder. Platform her oyuncunun **en iyi** skorunu tutar (tüm zamanlar ve bu hafta).

```js
async function oyunBitti(score) {
  if (!Arcadex.player) {                       // misafir: skoru kaydetmek için giriş öner
    ui.show("Skorunu tabloya yazmak için giriş yap");
    return;
  }
  try {
    const r = await Arcadex.leaderboard.submit("skor", score);   // { best, rank, improved }
    ui.show(r.improved ? `Yeni rekor! ${r.rank}. sıradasın` : `En iyin: ${r.best}`);
  } catch (e) {
    if (e.code === "score_out_of_range") ui.show("Bu skor kabul edilmedi.");
    else ui.show("Skor şu an gönderilemedi.");
  }
}

async function tabloyuGoster() {
  const t = await Arcadex.leaderboard.top("skor", { limit: 10, period: "week" });  // "all" | "week"
  // t.entries: [{ rank, name, playerId, score, isMe }], t.me: { score, rank } ya da null
  ui.renderBoard(t.entries, t.me);
}
```

**Hileye karşı:** Skor oyunun içinde hesaplanıp gönderildiği için değiştirilebilir. Önemli tablolarda panelde
**"Sadece sunucu gönderebilir"** seçeneğini aç ve skoru sunucu betiğinden gönder (bkz. 4.7).

### 4.2 Oyuncu kaldığı yerden devam etsin (ilerleme kaydı)

Bulut kayıt giriş yapmış oyuncu içindir ve cihazlar arasında taşınır. Misafir için tarayıcıya (`localStorage`) düş;
giriş yapınca ilerlemeyi buluta taşı.

```js
const SAVE_KEY = "ilerleme";
const YEREL = "oyunum:ilerleme";
const VARSAYILAN = { v: 1, bolum: 1, yildizlar: {}, son: null };

async function ilerlemeyiYukle() {
  let data = null;
  if (Arcadex.player) {
    try { data = await Arcadex.save.get(SAVE_KEY); } catch (e) { /* çevrimdışı vb. */ }
    // Misafirken oynanmış yerel ilerleme varsa ve buluttaki yoksa buluta taşı
    const yerel = yerelOku();
    if (!data && yerel) { data = yerel; await Arcadex.save.set(SAVE_KEY, data).catch(() => {}); }
  } else {
    data = yerelOku();
  }
  return tasi(data ?? structuredClone(VARSAYILAN));
}

async function ilerlemeyiKaydet(p) {
  p.son = Date.now();
  if (Arcadex.player) {
    try { await Arcadex.save.set(SAVE_KEY, p); return; }
    catch (e) { if (e.code === "too_large") console.warn("Kayıt çok büyük"); }
  }
  try { localStorage.setItem(YEREL, JSON.stringify(p)); } catch { /* gizli sekme */ }
}

function yerelOku() { try { return JSON.parse(localStorage.getItem(YEREL)); } catch { return null; } }

// Kayıt biçimini ileride değiştirirsen eski kayıtları yükselt
function tasi(p) {
  if (!p.v) p.v = 1;
  // if (p.v === 1) { p.yeniAlan = ...; p.v = 2; }
  return p;
}
```

İpuçları:
- **Ne zaman kaydet:** bölüm sonunda, önemli bir seçimden sonra ve `pause` olayında. Her karede kaydetme.
- **Boyut:** anahtar başına en fazla **64 KB**, oyuncu başına **50 anahtar** (Premium oyuncuda 256 KB / 200).
  Büyük durumları özet hale getir (ör. tahtanın tamamı yerine hamle listesi).
- **Anahtar adları:** harf, rakam, `_ . -` ve en fazla 64 karakter.
- Kayıt şifreli saklanır; oyuncu silmek isterse `Arcadex.save.remove(key)`.

### 4.3 Oyuncunun seçimlerini ve ayarlarını kaydetme

Ses, zorluk, seçilen karakter, kontrol şeması gibi seçimleri **ilerlemeden ayrı** bir anahtarda tut:
ayarlar küçük kalır ve ilerleme sıfırlansa bile korunur.

```js
const AYAR_KEY = "ayarlar";
let ayarlar = { ses: 0.8, muzik: true, zorluk: "orta", karakter: "kedi", dil: null };

async function ayarlariYukle() {
  const kayitli = Arcadex.player
    ? await Arcadex.save.get(AYAR_KEY).catch(() => null)
    : JSON.parse(localStorage.getItem("oyunum:ayarlar") || "null");
  ayarlar = { ...ayarlar, ...(kayitli || {}) };
}

let ayarZamanlayici = 0;
function ayarDegisti(alan, deger) {
  ayarlar[alan] = deger;
  clearTimeout(ayarZamanlayici);                       // kaydırıcı sürüklenirken her an kaydetme
  ayarZamanlayici = setTimeout(async () => {
    if (Arcadex.player) await Arcadex.save.set(AYAR_KEY, ayarlar).catch(() => {});
    else localStorage.setItem("oyunum:ayarlar", JSON.stringify(ayarlar));
  }, 600);
}
```

Hikaye seçimleri gibi oyunun gidişini değiştiren kararları **ilerleme kaydının içine** yaz
(`p.secimler = { kopru: "yikildi", dost: "Mira" }`) ki kaldığı yerden aynı hikayeyle devam etsin.

### 4.4 Başarımlar ve oyun parası

Panelde başarımları (kod adı, başlık, isteğe bağlı ödül) ve oyun parasını (adı, günlük kazanç sınırı) tanımla.

```js
const r = await Arcadex.achievements.unlock("ilk-zafer");   // bir kez açılır; ödül tanımlıysa para otomatik eklenir
if (r.isNew) ui.toast("Başarım açıldı!");                    // platform da kendi bildirimini gösterir

await Arcadex.wallet.earn(20, "bolum-sonu");                 // günlük sınıra takılabilir: error.code "daily_limit"
try { await Arcadex.wallet.spend(50, "ipucu"); }
catch (e) { if (e.code === "insufficient") ui.show("Yeterli jeton yok"); }
const { balance } = await Arcadex.wallet.get();
```

Para gerçek parayla satın alınamaz; oyun içinde kazanılır ve harcanır. Bakiye sunucuda tutulur, eksiye düşmez.

### 4.5 Veri koleksiyonları (kendi tablon)

Envanter, kayıtlı tahtalar, günün bulmacası gibi yapılar için panelde koleksiyon tanımla:
**oyuncu başına** ya da **oyun geneli**; oyundan erişim **yok / okuma / okuma-yazma**.

```js
await Arcadex.data.set("envanter", "kilic", { seviye: 3 });
const kilic = await Arcadex.data.get("envanter", "kilic");
const hepsi = await Arcadex.data.list("envanter", { limit: 50 });   // [{ key, data }]
await Arcadex.data.remove("envanter", "kilic");
```

Kayıt başına 32 KB; oyuncu başına 500, oyun geneli 5000 kayıt. İzin yoksa `error.code === "forbidden"`.

### 4.6 Duraklatma, ekran ve kontroller

```js
Arcadex.on("pause", () => { game.paused = true; audio.suspend?.(); ilerlemeyiKaydet(game.progress); });
Arcadex.on("resume", () => { game.paused = false; audio.resume?.(); });

// Tuvali her ekrana sığdır (dikey ve yatay)
function sigdir() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", sigdir); sigdir();

// Dokunma + fare + klavye birlikte
canvas.addEventListener("pointerdown", (e) => input.press(e.clientX, e.clientY));
addEventListener("keydown", (e) => input.key(e.key));
```

Panelde oyunun desteklediği ekran yönünü (dikey / yatay) seç. Sesi ilk dokunuştan sonra başlat (tarayıcı kuralı).

### 4.7 Sunucu betiği (hile koruması, gizli kurallar)

Paketine `server/main.js` eklersen bu dosya **Arcadex sunucusunda** çalışır, oyunculara gönderilmez.
Ödül vermek, skoru doğrulamak, gizli cevapları saklamak için kullan.

```js
// server/main.js
exports.bolumBitti = function (ctx, args) {
  if (typeof args.sure !== "number" || args.sure < 3000) throw new Error("Geçersiz süre.");
  arcadex.wallet.add(20, "bolum-" + args.bolum);
  arcadex.leaderboard.submit("en-hizli", args.sure);      // "sadece sunucu" tablo
  console.log(ctx.player.name, "bölüm bitirdi");           // panelde günlükte görünür
  return { odul: 20 };
};
```

```js
// oyunda
const r = await Arcadex.server.call("bolumBitti", { bolum: 3, sure: 41250 });
```

Betikte `ctx.player`, `arcadex.data`, `arcadex.wallet`, `arcadex.leaderboard`, `arcadex.achievements`, `console.log`
kullanılabilir. Sınırlar: çağrı başına **1 saniye**, **32 MB**, **100 platform işlemi**. İnternet, dosya ve zamanlayıcı yok.

### 4.8 Çevrimiçi oda ve arkadaş daveti

```js
// Oda kur ve arkadaşını davet et
const { room } = await Arcadex.rooms.create({ maxPlayers: 2 });   // room.code: "K7QM2X"
ui.show(`Oda kodu: ${room.code}`);
await Arcadex.rooms.invite();      // platformun davet penceresi: oyuncu takip listesinden arkadaşlarını seçer
                                   // davet oda koduyla gider; dönen: { invited }

// Davet bağlantısıyla gelen oyuncu: doğrudan odaya katıl
const info = await Arcadex.init();
if (info.invite?.room) await Arcadex.rooms.join(info.invite.room);

// Mesajlaşma ve ortak durum
Arcadex.on("room.state", (state) => ciz(state));
Arcadex.on("room.message", ({ from, type, data }) => { /* ... */ });
Arcadex.on("room.player_joined", (p) => ui.toast(`${p.name} katıldı`));
await Arcadex.rooms.send("hamle", { hucre: 4 });
```

Panelde oyun modu olarak **"2 kişi, online"** ya da **"Çok oyunculu"** seç; davet sadece bu oyunlarda açılır.
Hakem sunucu olsun istiyorsan `server/main.js`'e `exports.rooms = { onCreate, onJoin, onMessage, onLeave }` ekle:
her hamle önce betiğe gider, geçersizse `error.code === "rejected"` döner.

### 4.9 Reklam arası

Premium olmayan geliştiricilerin oyunlarında platform reklam arası gösterir; **Premium oyunculara hiç gösterilmez.**
Oyun açılırken bir kez otomatik gelir. Ek molalar için doğal bir anda (bölüm sonu, yeniden başla ekranı) iste:

```js
async function bolumSonu() {
  await ilerlemeyiKaydet(game.progress);
  await Arcadex.ads.break();       // gösterilmeyebilir (premium oyuncu, sıklık sınırı); her durumda devam et
  sonrakiBolum();
}
```

- Oyunun ortasında, oyuncu hamle yaparken çağırma.
- Reklam sırasında `pause`, bitince `resume` olayı gelir.
- Platform en sık 2 dakikada bir reklam gösterir; fazla çağrılar `{ shown: false }` döner.

---

## 5. Hata kodları

| `error.code` | Anlamı | Ne yap |
|---|---|---|
| `login_required` | Oyuncu giriş yapmamış | `Arcadex.requireLogin()` ya da yerel kayda düş |
| `not_ready` | `init()` çağrılmadan SDK kullanıldı | Önce `await Arcadex.init()` |
| `unknown_board`, `unknown_achievement`, `unknown_collection` | Kod adı panelde yok | Panelde tanımla, adı kontrol et |
| `no_currency` | Oyun parası açılmamış | Panelde aç |
| `insufficient` | Bakiye yetersiz | Oyuncuya söyle |
| `daily_limit` | Günlük kazanç sınırı doldu | Ertesi güne bırak |
| `score_out_of_range` | Skor üst sınırı aştı | Paneldeki sınırı ya da hesabı kontrol et |
| `server_only` | Tabloya sadece sunucu yazabilir | `server.call` ile gönder |
| `forbidden` | Koleksiyona oyundan izin yok | Paneldeki erişimi değiştir ya da sunucu betiği kullan |
| `too_large`, `too_many_keys`, `too_many_records` | Boyut / sayı sınırı | Veriyi küçült ya da birleştir |
| `version_conflict` | Kayıt başka cihazda değişti | Yeniden oku, sonra yaz |
| `script_error`, `script_failed`, `unknown_function`, `no_server_script` | Sunucu betiği sorunu | Paneldeki günlüğe bak |
| `room_not_found`, `room_full`, `not_in_room`, `rejected`, `not_host`, `server_authoritative` | Oda sorunları | Oyuncuya açıklayıcı mesaj göster |
| `session_expired` | Oturum süresi doldu | Platform sayfayı yenilemeyi önerir |
| `local_mode` | Özellik platform dışında çalışmaz | Panelden "Test et" ile dene |
| `timeout`, `network` | Bağlantı sorunu | Kısa süre sonra tekrar dene |

---

## 6. Test etme

- **Kendi bilgisayarında:** Klasörde yerel sunucu başlat (`npx serve .` ya da `python -m http.server`) ve SDK dosyasını
  `/gelistirici/sdk/arcadex.js` adresinden indirip klasöre `sdk/arcadex.js` olarak koy. SDK **yerel mod**a geçer:
  kayıt, skor ve para tarayıcıda tutulur; oda ve sunucu betiği çalışmaz. (`index.html`'e çift tıklayıp açma: `/sdk/...` yolu bulunamaz.)
- **Platformda:** Zip'i yükle → panelde **Test et**. Oyun yayındakiyle aynı ortamda açılır; test verisi gerçek oyunculardan ayrı tutulur.
  Çok oyunculu denemeler için sürümün altındaki **test davet bağlantısını** bir arkadaşına gönder (24 saat geçerli).

## 7. Yüklemeden önce kontrol listesi

- [ ] `index.html` kökte; tüm yollar göreli; SDK `/sdk/arcadex.js`.
- [ ] Hiçbir dış adres yok (font, CDN, analitik, reklam). Kütüphaneler pakette.
- [ ] `Arcadex.init()` bir kez, en başta. `pause`/`resume` dinleniyor.
- [ ] Misafir oyuncu da oynayabiliyor (kayıt localStorage'a düşüyor, skor için giriş öneriliyor).
- [ ] Panelde kullanılan tablo, başarım, koleksiyon ve para tanımlı; kod adları kodla aynı.
- [ ] Dokunmatik + klavye çalışıyor; dikey/yatay ekranda taşma yok.
- [ ] Hatalar `error.code` ile ele alınıyor; oyun hata yüzünden donmuyor.
- [ ] Zip 150 MB'tan küçük; yasak dosya yok.

## 8. Panelde doldurulacaklar

Oyun adı, kısa tanıtım ve açıklama (Türkçe ve/veya İngilizce), tür, yaş derecelendirmesi, ekran yönü, oyun modu
(tek kişilik / 2 kişi / çevrimiçi / çok oyunculu), ödüller, beyanlar, kazanç modeli, 3:4 kapak görseli ve
"Nasıl oynanır" sayfası (bölüm bölüm: kontroller, zorluk ve ödüller, ipuçları).

---

Lisans: MIT · Hazırlayan: hsnaydin82, Mesay Dijital
