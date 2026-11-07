// Giriş kodunu Netgsm ile SMS olarak gönderir (Supabase "Send SMS Hook").
//
// Kurulum (README > Gerçek SMS):
//  1. Supabase > Authentication > Hooks > "Send SMS hook" → HTTPS, adres:
//     https://PROJE-KODUN.supabase.co/functions/v1/sms-gonder  → "Generate secret" ile sır üret.
//  2. Sırları ver:
//     npx supabase secrets set SEND_SMS_HOOK_SECRET="v1,whsec_..." NETGSM_KULLANICI=... NETGSM_SIFRE=... NETGSM_BASLIK=OKINDO
//
// Supabase isteği "Standard Webhooks" imzasıyla gönderir; imza tutmazsa SMS gönderilmez.

import { Webhook } from 'npm:standardwebhooks@1.0.0';

type Kanca = { user: { phone: string }; sms: { otp: string } };

function hata(mesaj: string, durum = 400) {
  return new Response(JSON.stringify({ error: { http_code: durum, message: mesaj } }), {
    status: durum,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 905321234567, +90 532 123 45 67, 05321234567 → 5321234567 (Netgsm biçimi) */
export function netgsmNumarasi(telefon: string): string | null {
  const rakam = telefon.replace(/\D/g, '');
  const son10 = rakam.slice(-10);
  return /^5\d{9}$/.test(son10) ? son10 : null;
}

Deno.serve(async (istek) => {
  const govde = await istek.text();
  const sir = (Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
  if (!sir) return hata('SMS kancası ayarlanmamış', 500);

  let veri: Kanca;
  try {
    veri = new Webhook(sir).verify(govde, Object.fromEntries(istek.headers)) as Kanca;
  } catch {
    return hata('İmza geçersiz', 401);
  }

  const no = netgsmNumarasi(veri.user.phone);
  if (!no) return hata('Yalnız Türkiye cep telefonu numaralarına SMS gönderilir.');

  const kullanici = Deno.env.get('NETGSM_KULLANICI');
  const sifre = Deno.env.get('NETGSM_SIFRE');
  const baslik = Deno.env.get('NETGSM_BASLIK');
  if (!kullanici || !sifre || !baslik) return hata('Netgsm bilgileri eksik', 500);

  const cevap = await fetch('https://api.netgsm.com.tr/sms/rest/v2/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(`${kullanici}:${sifre}`)}` },
    body: JSON.stringify({
      msgheader: baslik,
      encoding: 'TR',
      messages: [{ msg: `okindo giriş kodun: ${veri.sms.otp}. Bu kodu kimseyle paylaşma.`, no }],
    }),
  });
  const sonuc = (await cevap.json().catch(() => ({}))) as { code?: string; description?: string };
  // Netgsm başarıda "00" döner
  if (!cevap.ok || sonuc.code !== '00') {
    console.error('Netgsm hatası', cevap.status, sonuc);
    return hata('SMS gönderilemedi, biraz sonra tekrar dene.', 502);
  }
  return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
