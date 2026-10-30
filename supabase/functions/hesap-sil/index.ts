// Hesap silme (K71)
// Kişisel bilgiler silinir ve giriş kapatılır. Fatura ve iş kayıtları yasal saklama süresi boyunca
// anonim olarak kalır (iş kayıtları kişiye bağlı olduğu için kullanıcı satırı "yumuşak" silinir).

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { yanit, yoneticiIstemci } from '../_shared/istemci.ts';

Deno.serve(async (istek) => {
  const jeton = istek.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jeton) return yanit({ hata: 'Giriş gerekli' }, 401);

  const kullaniciIstemci = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
  });
  const { data: oturum } = await kullaniciIstemci.auth.getUser();
  if (!oturum.user) return yanit({ hata: 'Giriş gerekli' }, 401);
  const id = oturum.user.id;

  const db = yoneticiIstemci();
  const { data: profil } = await db.from('profiller').select('silinme_istegi_at').eq('id', id).single();
  if (!profil?.silinme_istegi_at) return yanit({ hata: 'Önce uygulamadan silme isteği gönderilmeli' }, 400);

  await db.from('adresler').delete().eq('kullanici_id', id);
  await db.from('hv_etiketleri').delete().eq('hv_id', id);
  await db
    .from('profiller')
    .update({
      ad: 'Silinmiş',
      soyad: null,
      telefon: null,
      foto_yolu: null,
      gorusme_notu: null,
      musait: false,
      hv_durum: 'kapali',
    })
    .eq('id', id);

  const { error } = await db.auth.admin.deleteUser(id, true);
  if (error) return yanit({ hata: 'Hesap silinemedi, lütfen destekle iletişime geç' }, 500);
  return yanit({ tamam: true });
});
