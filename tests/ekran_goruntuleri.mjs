// Web önizlemesinde test hesaplarıyla girip her ekranın telefon boyutunda görüntüsünü alır.
// Kullanım: node tests/ekran_goruntuleri.mjs http://localhost:8099 ekranlar/
// Yalnız okur; veri değiştiren düğmelere basmaz.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [adres, klasor] = process.argv.slice(2);
mkdirSync(klasor, { recursive: true });
const rapor = [];
const BITEN_IS = '01f02e81-be89-45ae-a103-787fe0ce6144';
const HV = '71a640a7-db51-41d8-b713-9d6e9f38b292';
const TEMIZLIK = 'c83a6f3d-d723-4b62-bc2b-54fc382c0035';

async function sekme(sayfa, ad, metin) {
  const s = sayfa.getByRole('tab', { name: metin });
  if (await s.count()) {
    await s.first().click();
    await cek(sayfa, ad, null, 1500);
    await uzunCek(sayfa, ad);
  }
}

const tarayici = await chromium.launch();

async function oturum(telefon, mod) {
  const baglam = await tarayici.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  });
  const sayfa = await baglam.newPage();
  sayfa.on('pageerror', (e) => rapor.push(`[${telefon}] sayfa hatası: ${e.message}`));
  sayfa.on('console', (m) => m.type() === 'error' && rapor.push(`[${telefon}] konsol: ${m.text().slice(0, 300)}`));
  await sayfa.goto(adres);
  await sayfa.waitForTimeout(4000);
  if (mod) {
    await sayfa.evaluate((m) => localStorage.setItem('okindo-mod', m), mod);
  }
  if (await sayfa.getByText('Kodu gönder').count()) {
    await sayfa.getByPlaceholder('05xx xxx xx xx').fill(telefon);
    await sayfa.getByText('Kodu gönder').click();
    await sayfa.waitForTimeout(2500);
    await sayfa.locator('input').last().fill('123456');
    await sayfa.getByText('Giriş yap').click();
    await sayfa.waitForTimeout(5000);
  }
  return sayfa;
}

async function cek(sayfa, ad, yol, bekle = 3500) {
  try {
    if (yol) {
      await sayfa.goto(adres + yol);
    }
    await sayfa.waitForTimeout(bekle);
    await sayfa.screenshot({ path: `${klasor}/${ad}.png` });
    // Tam sayfa: kaydırılabilir içeriğin tamamı
    const kaydir = await sayfa.evaluate(() => {
      const el = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY !== 'visible');
      return el.length;
    });
    const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    rapor.push(`${ad}: tamam${tasma > 0 ? ` — YATAY TAŞMA ${tasma}px` : ''}${kaydir ? '' : ''}`);
  } catch (e) {
    rapor.push(`${ad}: HATA ${e.message.slice(0, 200)}`);
  }
}

async function uzunCek(sayfa, ad) {
  // Kaydırılan iç kabın tamamını birkaç parça halinde çeker
  for (let i = 1; i <= 3; i++) {
    const kaydi = await sayfa.evaluate((n) => {
      const kaplar = [...document.querySelectorAll('div')].filter(
        (d) => d.scrollHeight > d.clientHeight + 40 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowY),
      );
      const k = kaplar.sort((a, b) => b.clientHeight - a.clientHeight)[0];
      if (!k || k.scrollTop + k.clientHeight >= k.scrollHeight - 4) return false;
      k.scrollTop = k.clientHeight * 0.85 * n;
      return true;
    }, i);
    if (!kaydi) break;
    await sayfa.waitForTimeout(600);
    await sayfa.screenshot({ path: `${klasor}/${ad}-${i + 1}.png` });
  }
}

// Giriş ekranı (oturumsuz)
{
  const baglam = await tarayici.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, locale: 'tr-TR' });
  const s = await baglam.newPage();
  await s.goto(adres);
  await cek(s, '01-giris', null, 4000);
  await baglam.close();
}

// Müşteri
const m = await oturum('05300000001', 'musteri');
await cek(m, '02-musteri-anasayfa', '/');
await uzunCek(m, '02-musteri-anasayfa');
const hizmetLinki = m.getByText('Musluk değişimi').first();
if (await hizmetLinki.count()) {
  await hizmetLinki.click();
  await cek(m, '03-hizmet-detay', null);
  await uzunCek(m, '03-hizmet-detay');
}
await cek(m, '04-musteri-islerim', '/islerim');
await cek(m, '05-musteri-is-detay', `/is/${BITEN_IS}`);
await uzunCek(m, '05-musteri-is-detay');
await sekme(m, '05b-is-mesajlar', 'Mesajlar');
await sekme(m, '05c-is-fotograflar', 'Fotoğraflar');
await sekme(m, '05d-is-ayrintilar', 'Ayrıntılar');
await cek(m, '05e-hv-profili', `/hv/${HV}`);
await uzunCek(m, '05e-hv-profili');
await cek(m, '05f-talep', `/talep?hizmetId=${TEMIZLIK}&saat=2&acil=0&cevaplar=%7B%7D&aciklama=`);
await uzunCek(m, '05f-talep');
await cek(m, '05g-hv-basvuru', '/hv-basvuru');
await uzunCek(m, '05g-hv-basvuru');
await cek(m, '06-musteri-hesap', '/hesap');
await uzunCek(m, '06-musteri-hesap');
await cek(m, '07-bildirimler', '/bildirimler');
await cek(m, '08-adres-ekle', '/adres-ekle');
await cek(m, '09-yonetici', '/yonetici');
await uzunCek(m, '09-yonetici');

// HV
const h = await oturum('05300000002', 'hv');
await cek(h, '10-hv-talepler', '/');
await cek(h, '11-hv-islerim', '/islerim');
await cek(h, '12-hv-is-detay', `/is/${BITEN_IS}`);
await uzunCek(h, '12-hv-is-detay');
await cek(h, '13-hv-kazanc', '/kazanc');
await uzunCek(h, '13-hv-kazanc');
await cek(h, '14-hv-hesap', '/hesap');
await cek(h, '15-egitim', '/egitim');
await uzunCek(h, '15-egitim');
for (let i = 0; i < 5; i++) {
  const ileri = h.getByText(/Sonraki bölüme geç|Teste geç/);
  if (!(await ileri.count())) break;
  await ileri.first().click();
  await h.waitForTimeout(500);
}
await cek(h, '16-egitim-test', null, 1500);
await uzunCek(h, '16-egitim-test');

writeFileSync(`${klasor}/rapor.txt`, rapor.join('\n') + '\n');
console.log(rapor.join('\n'));
await tarayici.close();
