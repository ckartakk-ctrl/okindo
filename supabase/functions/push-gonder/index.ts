// Telefona anlık bildirim (push)
// Veritabanı "bildirimler" tablosuna yeni satır yazınca bu fonksiyonu çağırır (0011_sunucu_zamanlamalari.sql).
// Bildirim, kullanıcının kayıtlı telefonlarına Expo'nun push servisi üzerinden gönderilir.
// Android için Firebase (FCM) anahtarı EAS'e yüklenmiş olmalı (README > Push bildirim).

import { yanit, yoneticiIstemci, zamanlayiciDegilseReddet } from '../_shared/istemci.ts';

type ExpoSonuc = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

Deno.serve(async (istek) => {
  const red = zamanlayiciDegilseReddet(istek);
  if (red) return red;

  const { bildirim_id } = (await istek.json().catch(() => ({}))) as { bildirim_id?: string };
  if (!bildirim_id) return yanit({ hata: 'bildirim_id gerekli' }, 400);

  const db = yoneticiIstemci();
  const { data: b } = await db
    .from('bildirimler')
    .select('id, kullanici_id, baslik, metin, is_id, push_at')
    .eq('id', bildirim_id)
    .maybeSingle();
  if (!b) return yanit({ hata: 'bildirim yok' }, 404);
  if (b.push_at) return yanit({ durum: 'zaten gönderildi' });

  const { data: jetonlar } = await db.from('push_jetonlari').select('jeton').eq('kullanici_id', b.kullanici_id);
  if (!jetonlar?.length) return yanit({ durum: 'kayıtlı telefon yok' });

  const mesajlar = jetonlar.map((j) => ({
    to: j.jeton,
    title: b.baslik,
    body: b.metin ?? '',
    sound: 'default',
    priority: 'high',
    channelId: 'varsayilan',
    data: { is_id: b.is_id, bildirim_id: b.id },
  }));

  const cevap = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}),
    },
    body: JSON.stringify(mesajlar),
  });
  if (!cevap.ok) return yanit({ hata: `Expo push ${cevap.status}` }, 502);
  const { data: sonuclar } = (await cevap.json()) as { data: ExpoSonuc[] };

  // Uygulaması silinmiş telefonların jetonları temizlenir
  const gecersiz = jetonlar
    .filter((_j, i) => sonuclar?.[i]?.details?.error === 'DeviceNotRegistered')
    .map((j) => j.jeton);
  if (gecersiz.length) await db.from('push_jetonlari').delete().in('jeton', gecersiz);

  await db.from('bildirimler').update({ push_at: new Date().toISOString() }).eq('id', b.id);
  return yanit({ gonderilen: sonuclar?.filter((s) => s.status === 'ok').length ?? 0, silinen: gecersiz.length });
});
