// Ödeme işleyici (K28, K29)
// Veritabanındaki "odemeler" tablosunda bekleyen işlemleri ödeme kuruluşuna iletir.
// Ayar "odeme_saglayici" = "test" iken veritabanı bunları kendisi tamamlar; bu fonksiyon hiçbir şey yapmaz.
// iyzico bağlandığında aşağıdaki IyzicoSaglayici doldurulur ve ayar "iyzico" yapılır.
//
// Çalıştırma: Supabase > Edge Functions > odeme-isleyici için her dakika çalışan bir zamanlama kur
// (README, 7. adım). Uygulama da talep açtıktan hemen sonra bu fonksiyonu çağırabilir.

import { yanit, yoneticiIstemci } from '../_shared/istemci.ts';

type Odeme = {
  id: string;
  is_id: string;
  tur: 'is' | 'ek' | 'masraf' | 'bahsis';
  bloke_tutar: number;
  kapama_tutar: number | null;
  durum: string;
  saglayici_ref: string | null;
};

interface OdemeSaglayici {
  /** Kartta bloke (ön provizyon). Dönen değer sağlayıcıdaki işlem numarasıdır. */
  bloke(o: Odeme): Promise<string>;
  /** Blokeyi kapatır; tutar bloke tutarından az olabilir (kısmi kapama, kalan serbest kalır). */
  kapama(o: Odeme): Promise<void>;
  /** Blokeyi iptal eder ya da tahsil edilmiş tutarı iade eder. */
  iade(o: Odeme): Promise<void>;
  /** Kayıtlı karttan doğrudan tahsilat (bahşiş, malzeme). */
  tahsil(o: Odeme): Promise<string>;
}

class IyzicoSaglayici implements OdemeSaglayici {
  // Araştırma notu: iyzico Pazaryeri + ön provizyon + kart saklama. Sandbox hesabının pazaryeri olarak
  // tanımlanması için entegrasyon@iyzico.com'a yazılmalı. API anahtarları Supabase secrets'a girilir:
  // IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL
  // "okindo satıcı, alt üyeye net hakediş" kurgusu için iyzico'nun yazılı onayı alınmadan canlıya geçilmez.
  bloke(_o: Odeme): Promise<string> {
    throw new Error('iyzico henüz bağlanmadı');
  }
  kapama(_o: Odeme): Promise<void> {
    throw new Error('iyzico henüz bağlanmadı');
  }
  iade(_o: Odeme): Promise<void> {
    throw new Error('iyzico henüz bağlanmadı');
  }
  tahsil(_o: Odeme): Promise<string> {
    throw new Error('iyzico henüz bağlanmadı');
  }
}

Deno.serve(async () => {
  const db = yoneticiIstemci();
  const { data: ayar } = await db.from('ayarlar').select('deger').eq('anahtar', 'odeme_saglayici').single();
  if (ayar?.deger === 'test') return yanit({ durum: 'test modu, işlenecek bir şey yok' });

  const saglayici: OdemeSaglayici = new IyzicoSaglayici();
  const { data: bekleyenler } = await db
    .from('odemeler')
    .select('*')
    .in('durum', ['bloke_bekliyor', 'kapama_bekliyor', 'iade_bekliyor', 'tahsil_bekliyor'])
    .order('olusturma_at')
    .limit(50);

  const sonuc = { islenen: 0, hata: 0 };
  for (const o of (bekleyenler ?? []) as Odeme[]) {
    try {
      if (o.durum === 'bloke_bekliyor') {
        const ref = await saglayici.bloke(o);
        await db.from('odemeler').update({ durum: 'bloke', saglayici_ref: ref, hata: null }).eq('id', o.id);
      } else if (o.durum === 'kapama_bekliyor') {
        await saglayici.kapama(o);
        await db.from('odemeler').update({ durum: 'kapandi', hata: null }).eq('id', o.id);
      } else if (o.durum === 'iade_bekliyor') {
        await saglayici.iade(o);
        await db.from('odemeler').update({ durum: 'iade_edildi', hata: null }).eq('id', o.id);
      } else if (o.durum === 'tahsil_bekliyor') {
        const ref = await saglayici.tahsil(o);
        await db.from('odemeler').update({ durum: 'tahsil_edildi', saglayici_ref: ref, hata: null }).eq('id', o.id);
      }
      sonuc.islenen++;
    } catch (e) {
      sonuc.hata++;
      const mesaj = e instanceof Error ? e.message : String(e);
      // Bloke tutmazsa müşteriye bildirim gider ve 12 saat sonra talep iptal olur (veritabanı tetikleyicisi + zamanlayıcı)
      await db
        .from('odemeler')
        .update(o.durum === 'bloke_bekliyor' ? { durum: 'basarisiz', hata: mesaj } : { hata: mesaj })
        .eq('id', o.id);
    }
  }
  return yanit(sonuc);
});
