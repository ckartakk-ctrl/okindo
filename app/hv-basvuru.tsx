import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BilgiSatiri, bosluk, Dugme, Ekran, Girdi, Kart, renk, Secenekler, Simge, stil } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { rpc, supabase } from '@/lib/supabase';
import type { Hizmet, Kategori, Mahalle } from '@/lib/tipler';

const adimlar = [
  { simge: 'document-text-outline' as const, metin: 'Başvurunu gönder ve yapabildiğin işleri seç.' },
  { simge: 'people-outline' as const, metin: 'Yüz yüze görüşürüz. Kimliğini ve e-Devlet barkodlu adli sicil kaydını getirirsin, seçtiğin işlerden küçük bir uygulama yaparsın.' },
  { simge: 'school-outline' as const, metin: '10 dakikalık eğitimi tamamlarsın ve iş almaya başlarsın.' },
];

/** Form kalıbı: HV başvurusu */
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
    await rpc('hv_basvur', { p_ad: ad, p_soyad: soyad, p_mahalle: mahalle, p_etiketler: secili });
    await profilYenile();
    modDegistir('hv');
    router.replace('/');
  }

  const eksik = !ad.trim() ? 'Adını yaz.' : !soyad.trim() ? 'Soyadını yaz.' : !mahalle ? 'Mahalleni seç.' : !secili.length ? 'Yapabildiğin en az bir işi seç.' : null;

  return (
    <Ekran
      alt={
        <Dugme simge="send" eksik={eksik} onPress={gonder}>
          {secili.length ? `Başvurumu gönder (${secili.length} iş)` : 'Başvurumu gönder'}
        </Dugme>
      }
    >
      <Text accessibilityRole="header" style={stil.baslik}>
        Elinden gelen işi gelire çevir
      </Text>
      <BilgiSatiri simge="wallet-outline">Kendi saatini seç. Talebe bakmak ve iş almak ücretsiz.</BilgiSatiri>

      <Kart>
        <Text style={stil.altBaslik}>Nasıl işliyor?</Text>
        {adimlar.map((a, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: bosluk.m, alignItems: 'flex-start' }}>
            <View style={[stil.simgeKutusu, { width: 32, height: 32, borderRadius: 16 }]}>
              <Text style={[stil.ikincil, { fontWeight: '600', color: renk.anaKoyu }]}>{i + 1}</Text>
            </View>
            <Text style={[stil.metin, { flex: 1 }]}>{a.metin}</Text>
          </View>
        ))}
      </Kart>

      <Girdi etiket="Adın" value={ad} onChangeText={setAd} autoComplete="given-name" dogrula={(d) => (!d.trim() ? 'Adını yaz.' : null)} />
      <Girdi etiket="Soyadın" value={soyad} onChangeText={setSoyad} autoComplete="family-name" dogrula={(d) => (!d.trim() ? 'Soyadını yaz.' : null)} />
      <Secenekler etiket="Yaşadığın mahalle" secenekler={mahalleler.map((m) => ({ deger: m.id, ad: m.ad }))} secili={mahalle} sec={setMahalle} />

      <Text style={stil.altBaslik}>Hangi işleri yapabilirsin?</Text>
      {kategoriler.map((k) => (
        <View key={k.id} style={{ gap: bosluk.s }}>
          <Text style={stil.etiket}>{k.ad}</Text>
          <View style={stil.cipler}>
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
                    style={[stil.cip, aktif && { backgroundColor: renk.anaKoyu, borderColor: renk.anaKoyu }]}
                  >
                    <Simge ad={aktif ? 'checkbox' : 'square-outline'} boyut={16} renkli={aktif ? '#FFFFFF' : renk.silik} />
                    <Text style={[stil.cipYazi, aktif && { color: '#FFFFFF' }]}>{h.ad}</Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      ))}
      <Kart vurgu="uyari">
        <BilgiSatiri simge="warning-outline" renkli={renk.uyari}>
          Gaz, kombi, elektrik panosu, dış cephe ve yüksekte çalışma okindo’da hiçbir zaman yapılmaz.
        </BilgiSatiri>
      </Kart>
    </Ekran>
  );
}
