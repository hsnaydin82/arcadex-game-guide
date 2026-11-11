# Arcadex Oyun Rehberi

[English](README.md) · **Türkçe**

**Arcadex** oyun platformu için HTML5 oyun hazırlamanın tek başvuru dosyası: oyunu ister kendin yaz, ister bir
yapay zeka asistanıyla (Claude, ChatGPT, Gemini, Grok…) hazırla. Rehberi asistana verdiğinde şunları doğru kurar:

- oyunu platform taramasından geçecek şekilde paketlemek (tek zip, `index.html` kökte, dış bağlantı yok),
- **liderlik tablosuna skor kaydetmek** ve en iyileri göstermek,
- oyuncunun **kaldığı yerden devam etmesi** (bulut kayıt; giriş yapmamış oyuncu için tarayıcıya düşer),
- **oyuncunun seçimlerini ve ayarlarını kaydetmek** (ses, zorluk, karakter, hikaye seçimleri),
- başarımlar, oyun parası ve veri koleksiyonları,
- hile riskli kuralları Arcadex'te çalışan **sunucu betiğine** taşımak,
- **çevrimiçi odalar** kurmak ve oyuncunun **arkadaşlarını birlikte oynamaya davet etmesi**,
- doğal molalarda **reklam arası** istemek (Premium oyunculara hiç gösterilmez).

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| [`ARCADEX_REHBER.md`](ARCADEX_REHBER.md) | Rehberin Türkçesi |
| [`ARCADEX_GUIDE.md`](ARCADEX_GUIDE.md) | Rehberin İngilizcesi |
| [`examples/star-collector/`](examples/star-collector/) | Rehberdeki tariflerin hepsini kullanan küçük, oynanabilir bir oyun |

## Yapay zeka asistanıyla kullanım

1. Yeni bir sohbet aç ve `ARCADEX_REHBER.md` dosyasını ekle (ya da içeriğini yapıştır).
2. **1. Asistana verilecek komut** bölümündeki metni kopyala ve oyununu anlat.
3. Dosya listesinin tamamını iste ve dosyaları tek bir klasöre kaydet.
4. Kendi bilgisayarında dene (6. bölüm), klasörün **içeriğini** zip'le ve Arcadex geliştirici panelinden yükle.
5. Panelde oyunun kullandığı servisleri tanımla (liderlik tablosu, başarım, koleksiyon kod adları) ve **Test et**'e bas.

Rehber platformun kendisinde de var: **Geliştirici rehberi → Yapay zekayla hazırla** (`/gelistirici/arcadex-rehberi.md`).

## Örneği dene

```bash
cd examples/star-collector
npx serve .            # ya da: python -m http.server
```

Yazdığı adresi aç. Arcadex dışında SDK **yerel mod**da çalışır (kayıt ve skorlar tarayıcıda tutulur).
`sdk/arcadex.js` sadece yerel test içindir; platformda resmi SDK kendiliğinden sunulur.

Yüklemek için: panelde oyun oluştur, `skor` adlı liderlik tablosu (yüksek iyi) ve `ilk-bolum` adlı başarım ekle,
`examples/star-collector` klasörünün içeriğini zip'le ve yükle.

## Lisans

[MIT](LICENSE) · hsnaydin82, Mesay Dijital
