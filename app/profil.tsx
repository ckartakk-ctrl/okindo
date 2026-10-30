import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BilgiSatiri, bosluk, Dugme, Ekran, Girdi, OkDamgasi, Secenekler, stil } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Mahalle } from '@/lib/tipler';

/** Form kalıbı (ilk kayıt): ad ve mahalle */
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
    const { error } = await supabase
      .from('profiller')
      .update({ ad: ad.trim(), soyad: soyad.trim() || null, mahalle_id: mahalle })
      .eq('id', oturum!.user.id);
    if (error) throw new Error('Bilgilerin kaydedilemedi. Bağlantını kontrol edip tekrar dene.');
    await profilYenile();
  }

  return (
    <Ekran
      alt={
        <Dugme eksik={!ad.trim() ? 'Adını yaz.' : !mahalle ? 'Mahalleni seç.' : null} onPress={kaydet} simge="arrow-forward">
          Kaydet ve başla
        </Dugme>
      }
    >
      <View style={{ gap: bosluk.m }}>
        <OkDamgasi boyut={56} />
        <Text accessibilityRole="header" style={stil.baslik}>
          Seni tanıyalım
        </Text>
        <BilgiSatiri simge="eye-outline">Gelen kişi yalnız adını ve soyadının baş harfini görür.</BilgiSatiri>
      </View>
      <Girdi etiket="Adın" value={ad} onChangeText={setAd} autoComplete="given-name" dogrula={(d) => (!d.trim() ? 'Adını yaz.' : null)} />
      <Girdi etiket="Soyadın" istegeBagli value={soyad} onChangeText={setSoyad} autoComplete="family-name" />
      <Secenekler etiket="Mahallen" secenekler={mahalleler.map((m) => ({ deger: m.id, ad: m.ad }))} secili={mahalle} sec={setMahalle} />
      <BilgiSatiri simge="map-outline">okindo şu an yalnız bu mahallelerde. Mahallen listede yoksa yakında oradayız.</BilgiSatiri>
    </Ekran>
  );
}
