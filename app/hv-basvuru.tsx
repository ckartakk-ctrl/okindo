import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AltBaslik, Baslik, Dugme, Ekran, Girdi, Kart, Metin, renk, Secenekler } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { rpc, supabase } from '@/lib/supabase';
import type { Hizmet, Kategori, Mahalle } from '@/lib/tipler';

export default function HvBasvuru() {
  const { profil, profilYenile, modDegistir } = useOturum();
  const [ad, setAd] = useState(profil?.ad ?? '');
  const [soyad, setSoyad] = useState(profil?.soyad ?? '');
  const [mahalle, setMahalle] = useState<string | null>(profil?.mahalle_id ?? null);
  const [mahalleler, setMahalleler] = useState<Mahalle[]>([]);
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [hizmetler, setHizmetler] = useState<Hizmet[]>([]);
  const [secili, setSecili] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('mahalleler').select('*').eq('aktif', true).order('ad').then(({ data }) => setMahalleler((data as Mahalle[]) ?? []));
    supabase.from('kategoriler').select('*').eq('pilotta_acik', true).order('sira').then(({ data }) => setKategoriler((data as Kategori[]) ?? []));
    supabase.from('hizmetler').select('*').eq('aktif', true).eq('usta_gerekli', false).order('ad').then(({ data }) => setHizmetler((data as Hizmet[]) ?? []));
  }, []);

  function degistir(id: string) {
    setSecili((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function gonder() {
    if (!mahalle) throw new Error('Mahalleni seçmelisin.');
    await rpc('hv_basvur', { p_ad: ad, p_soyad: soyad, p_mahalle: mahalle, p_etiketler: secili });
    await profilYenile();
    modDegistir('hv');
    router.replace('/');
  }

  return (
    <Ekran>
      <Baslik alt="Ek gelir, kendi saatini seç. Talebe bakmak ve iş almak ücretsiz.">Elinden gelen işi gelire çevir</Baslik>
      <Kart>
        <Metin kalin>Nasıl işliyor?</Metin>
        <Metin kucuk>1. Başvurunu gönder ve yapabildiğin işleri seç.</Metin>
        <Metin kucuk>2. Seninle yüz yüze görüşürüz; kimlik ve e-Devlet barkodlu adli sicil kaydını getirirsin, seçtiğin işlerden küçük bir uygulama yaparsın.</Metin>
        <Metin kucuk>3. 10 dakikalık eğitimi tamamlarsın ve iş almaya başlarsın.</Metin>
      </Kart>

      <Girdi etiket="Adın" value={ad} onChangeText={setAd} />
      <Girdi etiket="Soyadın" value={soyad} onChangeText={setSoyad} />
      <Secenekler etiket="Yaşadığın mahalle" secenekler={mahalleler.map((m) => ({ deger: m.id, ad: m.ad }))} secili={mahalle} sec={setMahalle} />

      <AltBaslik>Hangi işleri yapabilirsin?</AltBaslik>
      {kategoriler.map((k) => (
        <View key={k.id} style={{ gap: 6 }}>
          <Metin soluk kucuk>{k.ad}</Metin>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {hizmetler
              .filter((h) => h.kategori_id === k.id)
              .map((h) => {
                const aktif = secili.includes(h.id);
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => degistir(h.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: aktif }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: aktif ? renk.ana : renk.cizgi,
                      backgroundColor: aktif ? renk.ana : renk.kart,
                    }}
                  >
                    <Metin kucuk renkli={aktif ? '#FFFFFF' : undefined}>
                      {h.ad}
                    </Metin>
                  </Pressable>
                );
              })}
          </View>
        </View>
      ))}
      <Metin soluk kucuk>
        Gaz, kombi, elektrik panosu, dış cephe ve yüksekte çalışma okindo’da hiçbir zaman yapılmaz.
      </Metin>
      <Dugme pasif={!ad.trim() || !soyad.trim() || !mahalle || secili.length === 0} onPress={gonder}>
        Başvurumu gönder
      </Dugme>
    </Ekran>
  );
}
