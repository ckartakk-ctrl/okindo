// Ödeme işleyici (K28, K29)
// Veritabanındaki "odemeler" tablosunda bekleyen işlemleri ödeme kuruluşuna iletir.
// Ayar "odeme_saglayici" = "test" iken veritabanı bunları kendisi tamamlar; bu fonksiyon hiçbir şey yapmaz.
// iyzico bağlandığında aşağıdaki IyzicoSaglayici doldurulur ve ayar "iyzico" yapılır.
//
// Çalıştırma: veritabanı her dakika çağırır (0011_sunucu_zamanlamalari.sql). Yalnız zamanlayıcı sırrıyla
// ya da service_role anahtarıyla çağrılabilir; uygulamadaki herkese açık anahtarla çağrılamaz.
//
// Çift tahsilatı önleyen üç kural:
//  1. Kayıtlar odeme_isleme_al() ile kilitlenerek alınır; iki işleyici aynı kaydı alamaz.
//  2. Her adım ödeme kuruluşuna sabit bir "işlem anahtarı" ile gider (ödeme id + adım). Aynı anahtar ikinci kez
//     gelirse kuruluş yeni işlem açmaz. Ayrıca kayıt daha önce denenmişse önce kuruluşa "bu işlem yapıldı mı?"
//     diye sorulur; yapıldıysa yeniden gönderilmez.
//  3. Sonuç odeme_isleme_bitir() ile yazılır; kayıt bu arada başka bir duruma geçtiyse (ör. iptal) ezilmez.

import { yanit, yoneticiIstemci, zamanlayiciDegilseReddet } from '../_shared/istemci.ts';

type Adim = 'bloke_bekliyor' | 'kapama_bekliyor' | 'iade_bekliyor' | 'tahsil_bekliyor';

type Odeme = {
  id: string;
  is_id: string;
  tur: 'is' | 'ek' | 'masraf' | 'bahsis';
  bloke_tutar: number;
  kapama_tutar: number | null;
  durum: Adim;
  saglayici_ref: string | null;
  deneme_sayisi: number;
};

/** Ödeme kuruluşu işlemi kesin olarak reddetti (ör. yetersiz bakiye). Yeniden denenmez. */
export class KesinRet extends Error {}

type Sorgu = { yapildi: true; ref: string | null } | { yapildi: false };

interface OdemeSaglayici {
  /** Kartta bloke (ön provizyon). Dönen değer sağlayıcıdaki işlem numarasıdır. */
  bloke(o: Odeme, anahtar: string): Promise<string>;
  /** Blokeyi kapatır; tutar bloke tutarından az olabilir (kısmi kapama, kalan serbest kalır). */
  kapama(o: Odeme, anahtar: string): Promise<void>;
  /** Blokeyi iptal eder ya da tahsil edilmiş tutarı iade eder. */
  iade(o: Odeme, anahtar: string): Promise<void>;
  /** Kayıtlı karttan doğrudan tahsilat (bahşiş, malzeme). */
  tahsil(o: Odeme, anahtar: string): Promise<string>;
  /** Bu işlem anahtarıyla daha önce başarılı bir işlem yapıldı mı? (önceki deneme yarıda kaldıysa) */
  sorgula(o: Odeme, anahtar: string): Promise<Sorgu>;
}

class IyzicoSaglayici implements OdemeSaglayici {
  // Araştırma notu: iyzico Pazaryeri + ön provizyon + kart saklama. Sandbox hesabının pazaryeri olarak
  // tanımlanması için entegrasyon@iyzico.com'a yazılmalı. API anahtarları Supabase secrets'a girilir:
  // IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL
  // "okindo satıcı, alt üyeye net hakediş" kurgusu için iyzico'nun yazılı onayı alınmadan canlıya geçilmez.
  // İşlem anahtarı iyzico isteklerinde "conversationId" olarak gönderilir; sorgula() aynı conversationId ile
  // ödeme sorgusu yapar. Kart reddi gibi kesin hatalarda KesinRet fırlatılır.
  bloke(_o: Odeme, _anahtar: string): Promise<string> {
    throw new Error('iyzico henüz bağlanmadı');
  }
  kapama(_o: Odeme, _anahtar: string): Promise<void> {
    throw new Error('iyzico henüz bağlanmadı');
  }
  iade(_o: Odeme, _anahtar: string): Promise<void> {
    throw new Error('iyzico henüz bağlanmadı');
  }
  tahsil(_o: Odeme, _anahtar: string): Promise<string> {
    throw new Error('iyzico henüz bağlanmadı');
  }
  sorgula(_o: Odeme, _anahtar: string): Promise<Sorgu> {
    throw new Error('iyzico henüz bağlanmadı');
  }
}

const sonrakiDurum: Record<Adim, string> = {
  bloke_bekliyor: 'bloke',
  kapama_bekliyor: 'kapandi',
  iade_bekliyor: 'iade_edildi',
  tahsil_bekliyor: 'tahsil_edildi',
};

async function isle(s: OdemeSaglayici, o: Odeme): Promise<string | null> {
  const anahtar = `okindo-${o.id}-${o.durum}`;
  // Önceki deneme kuruluşa ulaşıp sonucu yazamadan kesildiyse işlemi tekrarlama, sonucu al
  if (o.deneme_sayisi > 1) {
    const s1 = await s.sorgula(o, anahtar);
    if (s1.yapildi) return s1.ref;
  }
  switch (o.durum) {
    case 'bloke_bekliyor':
      return await s.bloke(o, anahtar);
    case 'kapama_bekliyor':
      await s.kapama(o, anahtar);
      return null;
    case 'iade_bekliyor':
      await s.iade(o, anahtar);
      return null;
    case 'tahsil_bekliyor':
      return await s.tahsil(o, anahtar);
  }
}

Deno.serve(async (istek) => {
  const red = zamanlayiciDegilseReddet(istek);
  if (red) return red;

  const db = yoneticiIstemci();
  const { data: ayar } = await db.from('ayarlar').select('deger').eq('anahtar', 'odeme_saglayici').single();
  if (ayar?.deger === 'test') return yanit({ durum: 'test modu, işlenecek bir şey yok' });

  const saglayici: OdemeSaglayici = new IyzicoSaglayici();
  const { data: alinanlar, error } = await db.rpc('odeme_isleme_al', { p_adet: 20 });
  if (error) return yanit({ hata: error.message }, 500);

  const sonuc = { islenen: 0, hata: 0, atlanan: 0 };
  for (const o of (alinanlar ?? []) as Odeme[]) {
    let yeniDurum: string | null = null;
    let ref: string | null = null;
    let hata: string | null = null;
    try {
      ref = await isle(saglayici, o);
      yeniDurum = sonrakiDurum[o.durum];
    } catch (e) {
      hata = e instanceof Error ? e.message : String(e);
      // Bloke kesin reddedilirse müşteriye bildirim gider ve 12 saat sonra talep iptal olur (veritabanı)
      if (e instanceof KesinRet && o.durum === 'bloke_bekliyor') yeniDurum = 'basarisiz';
    }
    const { data: yazildi } = await db.rpc('odeme_isleme_bitir', {
      p_id: o.id,
      p_beklenen_durum: o.durum,
      p_yeni_durum: yeniDurum,
      p_ref: ref,
      p_hata: hata,
    });
    if (!yazildi) sonuc.atlanan++;
    else if (hata) sonuc.hata++;
    else sonuc.islenen++;
  }
  return yanit(sonuc);
});
