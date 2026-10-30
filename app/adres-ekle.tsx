import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { BilgiSatiri, Dugme, Ekran, Girdi, Kart, renk, Secenekler, stil } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Mahalle } from '@/lib/tipler';

/** Form kalıbı: yeni adres */
export default function AdresEkle() {
  const { oturum, profil } = useOturum();
  const [mahalleler, setMahalleler] = useState<Mahalle[]>([]);
  const [mahalle, setMahalle] = useState<string | null>(profil?.mahalle_id ?? null);
  const [baslik, setBaslik] = useState('Ev');
  const [acikAdres, setAcikAdres] = useState('');
  const [notlar, setNotlar] = useState('');
  const [konum, setKonum] = useState<{ enlem: number; boylam: number } | null>(null);

  useEffect(() => {
    supabase
      .from('mahalleler')
      .select('*')
      .eq('aktif', true)
      .order('ad')
      .then(({ data }) => setMahalleler((data as Mahalle[]) ?? []));
  }, []);

  async function konumAl() {
    const izin = await Location.requestForegroundPermissionsAsync();
    if (!izin.granted) throw new Error('Konum izni kapalı. Sorun değil; mahallenin merkezini kullanırız.');
    const k = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setKonum({ enlem: k.coords.latitude, boylam: k.coords.longitude });
  }

  async function kaydet() {
    const m = mahalleler.find((x) => x.id === mahalle)!;
    const { error } = await supabase.from('adresler').insert({
      kullanici_id: oturum!.user.id,
      mahalle_id: mahalle,
      baslik: baslik.trim() || 'Ev',
      acik_adres: acikAdres.trim(),
      notlar: notlar.trim() || null,
      enlem: konum?.enlem ?? m.enlem,
      boylam: konum?.boylam ?? m.boylam,
    });
    if (error) throw new Error('Adres kaydedilemedi. Bağlantını kontrol edip tekrar dene.');
    router.back();
  }

  return (
    <Ekran
      alt={
        <Dugme
          simge="checkmark"
          eksik={!mahalle ? 'Mahalleni seç.' : acikAdres.trim().length < 8 ? 'Açık adresini yaz: sokak, bina no, kat, daire.' : null}
          onPress={kaydet}
        >
          Adresi kaydet
        </Dugme>
      }
    >
      <Text accessibilityRole="header" style={stil.baslik}>
        Yeni adres
      </Text>
      <BilgiSatiri simge="eye-off-outline">Tam adresin yalnız işi kabul eden kişiye, iş süresince görünür.</BilgiSatiri>
      <Secenekler etiket="Mahalle" secenekler={mahalleler.map((m) => ({ deger: m.id, ad: m.ad }))} secili={mahalle} sec={setMahalle} />
      <Girdi etiket="Adres adı" value={baslik} onChangeText={setBaslik} placeholder="Ev, Annemin evi" />
      <Girdi
        etiket="Açık adres"
        value={acikAdres}
        onChangeText={setAcikAdres}
        placeholder="Lale Sk. No 4, Kat 2, Daire 5"
        multiline
        dogrula={(d) => (d.trim().length < 8 ? 'Sokak, bina no, kat ve daireyi yaz.' : null)}
      />
      <Girdi etiket="Gelecek kişi için not" istegeBagli value={notlar} onChangeText={setNotlar} placeholder="Zil bozuk, kapıdan ara" />
      <Kart vurgu={konum ? 'ana' : undefined}>
        <BilgiSatiri simge={konum ? 'checkmark-circle' : 'navigate-outline'} renkli={konum ? renk.anaKoyu : renk.soluk}>
          {konum ? 'Konumun eklendi. Gelecek kişi yolu kolayca bulur.' : 'Gelecek kişinin yolu bulması için konumunu ekleyebilirsin.'}
        </BilgiSatiri>
        {!konum ? (
          <Dugme tur="ikincil" simge="locate-outline" onPress={konumAl}>
            Şu anki konumumu ekle
          </Dugme>
        ) : null}
      </Kart>
    </Ekran>
  );
}
