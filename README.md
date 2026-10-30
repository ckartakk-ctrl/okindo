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
| Zamanlayıcı: otomatik onay, gelmedi, 10 dk kuralı, düzenli işin sıradaki seansı | Hazır, test edildi |
| **Ödeme** | **Test modunda.** Gerçek para çekilmez. iyzico bağlanacak yer hazır |

## Henüz olmayanlar (sonra eklenecek)

- **Gerçek ödeme (iyzico).** `supabase/functions/odeme-isleyici` içinde yeri hazır. iyzico'nun yazılı onayı ve sandbox hesabı gerekiyor.
- **Gerçek SMS (Netgsm).** Şimdilik Supabase'in test telefon numaralarıyla giriş yapılır (aşağıda 4. adım).
- **Telefona anlık bildirim (push).** Bildirimler şimdilik uygulama içinde, "Hesabım > Bildirimler" ekranında görünür.
- **Numara gizlemeli arama, e-arşiv fatura, kimlik doğrulama servisi.** Pilot öncesi teklif alınacak.
- **Yönetici girişinde iki adımlı doğrulama (K52).** Gerçek müşteri işi açılmadan önce eklenmeli.
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

Supabase'de **SQL Editor**'ü aç. Aşağıdaki dosyaların içeriğini **bu sırayla** tek tek yapıştırıp **Run** de:

1. `supabase/migrations/0001_sema.sql`
2. `supabase/migrations/0002_is_kurallari.sql`
3. `supabase/migrations/0003_ornek_veri.sql`
4. `supabase/migrations/0005_fotograf_deposu.sql`
5. **Integrations > Cron** bölümünden Cron'u aç, sonra `supabase/migrations/0004_zamanlayici.sql`

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
npm install
npx expo install expo@latest
npx expo install --fix
npx expo start
```

Ekranda çıkan QR kodu telefonundaki **Expo Go** ile okut. Uygulama telefonunda açılır.

> İkinci ve üçüncü satır, uygulamayı telefonundaki Expo Go sürümüyle uyumlu hale getirir. Bir şey sorarsa **Y** de.

### 6. Kendini yönetici yap

1. Uygulamada kendi test numaranla giriş yap ve adını yaz.
2. Supabase **SQL Editor**'de çalıştır (numarayı kendininkiyle değiştir):

```sql
update public.profiller set yonetici = true where telefon = '905300000001';
```

3. Uygulamada **Hesabım > Yönetici paneli** görünür.

### APK'yı telefondan derle (GitHub)

Bilgisayar gerekmez. Bu depoya her değişiklik yüklendiğinde GitHub, APK'yı kendisi derler.

1. GitHub'da bu depoda **Settings > Secrets and variables > Actions > New repository secret** ile iki değer ekle:
   - `SUPABASE_URL` → Supabase Project URL
   - `SUPABASE_KEY` → Supabase anon public anahtarı
2. **Actions** sekmesinde "Android APK" işinin bitmesini bekle (yaklaşık 20–30 dakika). Yeşil tik = hazır.
3. Deponun ana sayfasında **Releases** bölümüne gir, en üstteki sürümde **okindo.apk**'ya dokun, indir ve kur.
4. Yeniden derlemek için: **Actions > Android APK > Run workflow**.

### 7. Sunucu fonksiyonlarını yükle

Hesap silme için gerekli. Terminalde:

```bash
npx supabase login
npx supabase link --project-ref PROJE-KODUN
npx supabase functions deploy hesap-sil
npx supabase functions deploy odeme-isleyici
```

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
supabase/functions/       Sunucu fonksiyonları (ödeme, hesap silme)
tests/                    Veritabanı senaryo testleri (75 test)
```

## Testler (yazılımcı için)

İş kuralları yerel bir Postgres'te test edilir:

```bash
PGHOST=/tmp PGPORT=5432 PGUSER=postgres ./tests/testleri_calistir.sh
```

Testler fiyatı, indirimleri, kapı kodunu, ek işi, para dağılımını, gelmeme ve evde yok durumlarını, iptal ücretlerini,
anlaşmazlık kararlarını, düzenli işi ve güvenlik kurallarını (başkasının işini, adresini, ödemesini görememe) kontrol eder.
