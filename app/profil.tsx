import { useEffect, useState } from 'react';
import { Baslik, Dugme, Ekran, Girdi, Metin, Secenekler } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Mahalle } from '@/lib/tipler';

export default function ProfilEkrani() {
  const { oturum, profil, profilYenile } = useOturum();
  const [ad, setAd] = useState(profil?.ad ?? '');
  const [soyad, setSoyad] = useState(profil?.soyad ?? '');
  const [mahalle, setMahalle] = useState<string | null>(profil?.mahalle_id ?? null);
  const [mahalleler, setMahalleler] = useState<Mahalle[]>([]);

  useEffect(() => {
    supabase
      .from('mahalleler')
      .select('*')
      .eq('aktif', true)
      .order('ad')
      .then(({ data }) => setMahalleler((data as Mahalle[]) ?? []));
  }, []);

  async function kaydet() {
    if (!ad.trim()) throw new Error('Adını yazmalısın.');
    if (!mahalle) throw new Error('Mahalleni seçmelisin.');
    const { error } = await supabase
      .from('profiller')
      .update({ ad: ad.trim(), soyad: soyad.trim() || null, mahalle_id: mahalle })
      .eq('id', oturum!.user.id);
    if (error) throw new Error('Kaydedilemedi. Tekrar dene.');
    await profilYenile();
  }

  return (
    <Ekran>
      <Baslik alt="Hizmet verenler yalnız adını görür.">Merhaba!</Baslik>
      <Girdi etiket="Adın" value={ad} onChangeText={setAd} autoComplete="given-name" />
      <Girdi etiket="Soyadın" value={soyad} onChangeText={setSoyad} autoComplete="family-name" />
      <Secenekler
        etiket="Mahallen"
        secenekler={mahalleler.map((m) => ({ deger: m.id, ad: m.ad }))}
        secili={mahalle}
        sec={setMahalle}
      />
      <Metin soluk kucuk>
        okindo şu an yalnız bu mahallelerde hizmet veriyor. Mahallen listede yoksa yakında oradayız.
      </Metin>
      <Dugme onPress={kaydet}>Devam</Dugme>
    </Ekran>
  );
}
