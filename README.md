# okindo — pilot uygulama

Bu klasör okindo'nun pilot sürümüdür: müşteri ve hizmet veren (HV) için tek bir telefon uygulaması (iOS + Android) ve
arkasındaki veritabanı. Kurallar "okindo: Çalışma Mantığı" sürüm 3'e dayanır; koddaki **K** numaraları o belgedeki onay
kaydını gösterir.

## Neler hazır

| Bölüm | Durum |
|---|---|
| Telefonla giriş (SMS kodu), profil, mahalle | Hazır |
| Hizmet listesi, arama, soru kartı, KDV dahil fiyat dökümü | Hazır |
| Pay kuralı (100 TL ya da %15), yeni müşteri indirimi (100 + 150 TL), kuponlar | Hazır, test edildi |
| Talep açma: adres, gün/saat (08:00–22:00), kişi seçimi (önce mahalle), acil, düzenli temizlik | Hazır |
| HV: başvuru, yönetici onayı (yüz yüze not + sicil doğrulama), 10 dk eğitim ve test, müsaitlik | Hazır |
| İş akışı: kabul, yola çıktım, Adresteyim, kapı kodu, "içeride mi?", ek iş, 30 dk uzatma, malzeme fişi, fotoğraflar, bitti, onay, sorun | Hazır, test edildi |
| Gelmedi, evde yok, yapılamadı (müşteri / beceri / riskli), iptal kuralları | Hazır, test edildi |
| HV kazanç ekranı (brüt, kesinti, net, bahşiş, uygulanan indirim), puan özeti | Hazır |
| Puan, çaylak anketi, etiket askısı, "müşteri numaranı istedi mi?" sorusu | Hazır, test edildi |
| Mesajlaşma (telefon, IBAN, e-posta otomatik gizlenir), acil düğmesi | Hazır, test edildi |
| Yönetici ekranı: HV onayı, anlaşmazlık kararı (kısmi/tam iade) | Hazır |
| Yönetici için iki adımlı doğrulama (K52) | Hazır, test edildi |
| İş ekranında canlı güncelleme (karşı tarafın adımları, mesajlar) | Hazır |
| Telefona anlık bildirim (push) | Kod hazır; EAS ve Firebase kurulumu gerekiyor (aşağıda) |
| Gerçek SMS (Netgsm) | Kod hazır; Netgsm hesabı gerekiyor (aşağıda) |
| Hata takibi (Sentry) | Kod hazır; Sentry DSN girilince açılır |
| Zamanlayıcı: otomatik onay, gelmedi, 10 dk kuralı, düzenli işin sıradaki seansı | Hazır, test edildi |
| **Ödeme** | **Test modunda.** Gerçek para çekilmez. iyzico bağlanacak yer hazır |

## Henüz olmayanlar (sonra eklenecek)

- **Gerçek ödeme (iyzico).** `supabase/functions/odeme-isleyici` içinde yeri hazır. İşleyici kilitli çalışır ve aynı ödemeyi iki kez
  çekmez (bkz. dosyanın başı). iyzico'nun yazılı onayı ve sandbox hesabı gerekiyor.
- **Numara gizlemeli arama, e-arşiv fatura, kimlik doğrulama servisi.** Pilot öncesi teklif alınacak.
- **Kategori kısa eğitimi (K39).** Askıya alınan etiketi şimdilik yönetici yeniden açar.

---

## Kurulum (adım adım)

### 1. Gerekenler

- Bilgisayarına **Node.js** (LTS sürümü): <https://nodejs.org>
- Telefonuna **Expo Go** uygulaması (App Store / Google Play)
- Ücretsiz bir **Supabase** hesabı: <https://supabase.com>

### 2. Supabase projesini aç

1. Supabase'de **New project** de.
2. **Region** olarak **Frankfurt (eu-central-1)** seç. Genel "Europe" değil, Frankfurt'u seç; Türkiye'ye en yakını bu.
3. Proje açılınca **Project Settings > API** sayfasından iki değeri kopyala: **Project URL** ve **anon public** anahtarı.
4. Bu klasördeki `.env.example` dosyasının adını `.env` yap ve iki değeri içine yapıştır.

> `service_role` anahtarını hiçbir zaman `.env` dosyasına ya da uygulamaya koyma.

### 3. Veritabanını kur

**Önerilen yol: Supabase CLI.** Dosyaları elle yapıştırmak yerine hangi dosyanın kurulduğunu CLI takip eder:

```bash
npx supabase login
npx supabase link --project-ref PROJE-KODUN
npx supabase db push          # henüz kurulmamış migration dosyalarını sırayla kurar
```

> **Daha önce SQL Editor ile kurduysan** (pilot projesi böyle kuruldu), CLI'a hangilerinin zaten kurulu olduğunu bir kez söyle,
> yoksa hepsini baştan kurmaya çalışır. Kurduğun dosyaların numaralarını yaz, örneğin 0001–0009 kuruluysa:
>
> ```bash
> npx supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 0007 0008 0009
> npx supabase db push        # yalnız 0010 ve 0011 kurulur
> ```
>
> `0011_sunucu_zamanlamalari.sql`'dan önce aşağıdaki "Sunucu zamanlamaları" adımındaki iki kasa değerini gir.

Veritabanı değişince uygulamanın tiplerini yenile: `npm run tipler`.

**Elle kurmak istersen:** Supabase'de **SQL Editor**'ü aç. Aşağıdaki dosyaların içeriğini **bu sırayla** tek tek yapıştırıp **Run** de:

1. `supabase/migrations/0001_sema.sql`
2. `supabase/migrations/0002_is_kurallari.sql`
3. `supabase/migrations/0003_ornek_veri.sql`
4. `supabase/migrations/0005_fotograf_deposu.sql`
5. **Integrations > Cron** bölümünden Cron'u aç, sonra `supabase/migrations/0004_zamanlayici.sql`
6. Kalan dosyalar numara sırasıyla: `0006` … `0011`

### Sunucu zamanlamaları (0011 için)

Ödeme işleyici her dakika, push bildirimi her yeni bildirimde veritabanından çağrılır. Bunun için SQL Editor'de bir kez
(uzun rastgele metni kendin üret, ör. bir parola yöneticisiyle 40 karakter):

```sql
select vault.create_secret('https://PROJE-KODUN.supabase.co', 'proje_adresi');
select vault.create_secret('UZUN-RASTGELE-METIN', 'zamanlayici_sirri');
```

Aynı metni sunucu fonksiyonlarına da ver: `npx supabase secrets set ZAMANLAYICI_SIRRI=UZUN-RASTGELE-METIN`.
Bu sır olmadan `odeme-isleyici` ve `push-gonder` çağrılamaz (uygulamadaki herkese açık anahtarla çağrılamazlar).

> 0003 dosyasındaki mahalleler ve fiyatlar **örnektir**. Gerçekleri belli olunca **Table Editor**'de `mahalleler` ve
> `hizmetler` tablolarından değiştirebilirsin.

### 4. Telefonla girişi aç

1. **Authentication > Sign In / Providers > Phone**'u aç.
2. Gerçek SMS servisi bağlanana kadar **Test Phone Numbers** kısmına deneme numaraları ekle. Örnek:
   - `905300000001` → kod `123456` (müşteri denemesi)
   - `905300000002` → kod `123456` (HV denemesi)
3. Supabase bir SMS sağlayıcısı alanını doldurmanı isterse geçici olarak herhangi biri seçilebilir; test numaraları SMS göndermeden çalışır.

### 5. Uygulamayı telefonunda çalıştır

Bilgisayarında bu klasörde bir terminal aç ve sırayla:

```bash
npm ci
npx expo start
```

Ekranda çıkan QR kodu telefonundaki **Expo Go** ile okut. Uygulama telefonunda açılır.

> `npm ci`, `package-lock.json`'daki sürümleri birebir kurar. Uygulama Expo SDK 53 kullanır; telefonundaki Expo Go
> daha yeni bir SDK istiyorsa SDK yükseltmesi ayrı bir iş olarak yapılmalı (`npx expo install expo@^54` ve `--fix`, sonra test).
> Push bildirim, Sentry gibi yerel modüller Expo Go'da tam çalışmaz; onları APK ile dene.

### 6. Kendini yönetici yap

1. Uygulamada kendi test numaranla giriş yap ve adını yaz.
2. Supabase **SQL Editor**'de çalıştır (numarayı kendininkiyle değiştir):

```sql
update public.profiller set yonetici = true where telefon = '905300000001';
```

3. Uygulamada **Hesabım > Yönetici paneli** görünür.
4. Panele ilk girişte **iki adımlı doğrulama** kurulur: telefondaki Google Authenticator ya da Microsoft Authenticator'a
   okindo eklenir. Sonraki girişlerde 6 haneli kod sorulur. Supabase'de **Authentication > Multi-Factor** bölümünde
   **TOTP** açık olmalı (varsayılan olarak açıktır).

> Doğrulama telefonunu kaybedersen: SQL Editor'de geçici olarak kapat
> (`update ayarlar set deger = '0' where anahtar = 'yonetici_iki_adim';`), **Authentication > Users** içinde
> kendi kullanıcının MFA faktörünü sil, sonra ayarı yeniden `'1'` yap.

### APK'yı telefondan derle (GitHub)

Bilgisayar gerekmez. Her değişiklikte yalnız hızlı kontroller çalışır (**Actions > Kontrol**, birkaç dakika).
APK, uzun sürdüğü için (20–30 dakika) yalnız istendiğinde derlenir:

1. **Actions > Android APK > Run workflow**, ya da bir sürüm etiketi koy (ör. GitHub'da **Releases > Draft a new release**,
   etiket `v0.6.0`).
2. Yeşil tik = hazır. Deponun **Releases** bölümünde en üstteki sürümde **okindo.apk**'ya dokun, indir ve kur.

Supabase adresi ve anahtarı iş akışında pilot projesine ayarlı. Başka projeye geçmek için
**Settings > Secrets and variables > Actions > Variables** bölümüne `SUPABASE_URL` ve `SUPABASE_ANON_KEY` ekle.
Hata takibi için aynı yere `SENTRY_DSN` ekle.

### Play Store ve anında güncelleme (EAS)

Play Store'a yüklemek için `.aab` dosyası gerekir; bunu Expo'nun bulut derlemesi (EAS) üretir. EAS ayrıca yalnız
JavaScript değişikliklerini APK derlemeden telefonlara gönderebilir. Kurulum ve kullanım `.github/workflows/eas.yml`
dosyasının başında yazıyor (expo.dev hesabı ve `EXPO_TOKEN` gerekir). Push bildirim de EAS proje numarası ister.

### 7. Sunucu fonksiyonlarını yükle

Hesap silme için gerekli. Terminalde:

```bash
npx supabase login
npx supabase link --project-ref PROJE-KODUN
npx supabase functions deploy hesap-sil
npx supabase functions deploy odeme-isleyici
npx supabase functions deploy push-gonder
npx supabase functions deploy sms-gonder
```

JWT ayarları `supabase/config.toml` içindedir; `odeme-isleyici`, `push-gonder` ve `sms-gonder` kendi sırlarıyla korunur.

### 8. Telefona anlık bildirim (push)

1. EAS kurulumunu yap (yukarıda "Play Store ve anında güncelleme"); `npx eas-cli init` app.json'a proje numarasını yazar.
2. Android için Firebase'de proje aç, FCM V1 hizmet hesabı anahtarını `npx eas-cli credentials` ile EAS'e yükle
   (Expo belgesi: "Push notifications setup").
3. "Sunucu zamanlamaları" adımını yaptıysan başka bir şey gerekmez: uygulama girişte bildirim izni ister, her yeni
   bildirim telefona da gider, dokununca ilgili iş açılır.

### 9. Gerçek SMS (Netgsm)

1. Netgsm'de hesap ve onaylı SMS başlığı (ör. `OKINDO`) al.
2. Supabase > **Authentication > Hooks > Send SMS hook**: tür HTTPS, adres
   `https://PROJE-KODUN.supabase.co/functions/v1/sms-gonder`, **Generate secret**.
3. `npx supabase secrets set SEND_SMS_HOOK_SECRET="v1,whsec_..." NETGSM_KULLANICI=... NETGSM_SIFRE=... NETGSM_BASLIK=OKINDO`
4. Test numaralarını sil; artık giriş kodu gerçek SMS ile gider.

### 10. Hata takibi (Sentry)

Sentry'de React Native projesi aç, verilen DSN adresini `.env` dosyasına `EXPO_PUBLIC_SENTRY_DSN=` olarak (GitHub'da
`SENTRY_DSN` değişkeni olarak) yaz. Boşsa hiçbir şey gönderilmez. Telefon numarası ve ad gönderilmez, yalnız kullanıcı
kimlik numarası.

`PROJE-KODUN`, Supabase adresindeki `https://PROJE-KODUN.supabase.co` kısmıdır.

---

## İlk deneme (iki telefonla ya da iki test numarasıyla)

1. **HV ol:** İkinci numarayla giriş yap. **Hesabım > okindo'da iş al**, mahalleni ve işleri seç, gönder.
2. **Onayla:** Yönetici hesabınla **Yönetici paneli**'nde başvuruyu aç. İşleri işaretle, görüşme notunu yaz, "sicil doğrulandı"yı aç, **Onayla**.
3. **Eğitim:** HV hesabında **Eğitime başla**, testi geç, **Müsaitsin** anahtarını aç.
4. **Talep aç:** Müşteri hesabında bir hizmet seç (örnek: Musluk değişimi), soruları cevapla, **İşi yaptır**, adres ekle, saat seç, **Talebi aç**.
5. **İşi yap:** HV hesabında talebi **Kabul et**, **Yola çıktım**, **Adresteyim**. Müşterinin ekranındaki 4 haneli kodu gir. Bitiş fotoğrafını çek, **Bitti**.
6. **Onayla:** Müşteri hesabında **Onaylıyorum**, puan ver. HV hesabında **Kazancım** ekranına bak.

---

## Ayarlar

Fiyat, oran, süre ve ücretlerin hepsi Supabase'de **Table Editor > ayarlar** tablosundadır. Örnekler:

| Anahtar | Ne işe yarar |
|---|---|
| `okindo_taban` | okindo payının alt sınırı (100 TL) |
| `okindo_oran` | okindo payı oranı (%15) |
| `yeni_musteri_ilk` / `yeni_musteri_ikinci` | Yeni müşteri indirimi (100 / 150 TL) |
| `stopaj_orani` | HV ödemesinden kesilen vergi (%20, mali müşavir onayıyla kesinleşir) |
| `cikis_ucreti`, `gec_iptal_ucreti` | Çıkış ve geç iptal ücretleri |
| `odeme_saglayici` | `test` iken gerçek para çekilmez |
| `destek_telefonu` | Doluysa uygulamada "okindo'ya sor" düğmesi çıkar |

## Klasörler

```
app/                      Ekranlar (her dosya bir ekran)
src/components/           Ortak parçalar (düğme, kart, fiyat kartı…)
src/lib/                  Supabase bağlantısı, oturum, biçimlendirme
supabase/migrations/      Veritabanı ve iş kuralları (fiyat, para, güvenlik burada)
src/components/ui/       Arayüz parçaları, konu konu (tema, düğme, kart…); '@/components/ui' ile alınır
src/components/is/       İş ekranının sekmeleri (müşteri, HV, mesajlar, fotoğraflar, ayrıntılar)
src/lib/veritabani.ts    Veritabanı tipleri (otomatik üretilir: npm run tipler)
supabase/functions/      Sunucu fonksiyonları (ödeme, hesap silme, push, SMS)
tests/                    Veritabanı senaryo testleri (104 test) ve birim testleri (tests/birim)
```

## Testler (yazılımcı için)

Hepsi her değişiklikte GitHub'da da çalışır (**Actions > Kontrol**).

```bash
npm run kontrol                                              # tip kontrolü + lint + birim testleri
PGHOST=/tmp PGPORT=5432 PGUSER=postgres npm run db-test      # iş kuralları, yerel bir Postgres'te
```

Testler fiyatı, indirimleri, kapı kodunu, ek işi, para dağılımını, gelmeme ve evde yok durumlarını, iptal ücretlerini,
anlaşmazlık kararlarını, düzenli işi ve güvenlik kurallarını (başkasının işini, adresini, ödemesini görememe) kontrol eder.
