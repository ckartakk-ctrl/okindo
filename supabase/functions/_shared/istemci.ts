import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

/** Tüm yetkilere sahip sunucu istemcisi. Anahtar yalnız sunucuda, Supabase "secrets" içinde durur. */
export function yoneticiIstemci() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

export function yanit(govde: unknown, durum = 200) {
  return new Response(JSON.stringify(govde), { status: durum, headers: { 'Content-Type': 'application/json' } });
}

/** İki metni sabit sürede karşılaştırır (sır tahmin edilmesin diye). */
function esitMi(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let fark = 0;
  for (let i = 0; i < x.length; i++) fark |= x[i] ^ y[i];
  return fark === 0;
}

/**
 * Yalnız veritabanı zamanlayıcısından (ya da service_role anahtarıyla) gelen çağrılara izin verir.
 * Uygulamanın içindeki herkese açık anahtarla bu fonksiyonlar çalıştırılamaz.
 * İzin yoksa 401 yanıtı döner, izin varsa null.
 */
export function zamanlayiciDegilseReddet(istek: Request): Response | null {
  const sir = Deno.env.get('ZAMANLAYICI_SIRRI') ?? '';
  const servis = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const gelenSir = istek.headers.get('x-zamanlayici-sirri') ?? '';
  const jeton = (istek.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const izinli = (sir.length >= 16 && esitMi(gelenSir, sir)) || (servis.length > 0 && esitMi(jeton, servis));
  return izinli ? null : yanit({ hata: 'Yetkisiz' }, 401);
}
