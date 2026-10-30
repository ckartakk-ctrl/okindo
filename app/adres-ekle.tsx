import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Baslik, Dugme, Ekran, Girdi, Kart, Metin, Secenekler } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Mahalle } from '@/lib/tipler';

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
    if (!izin.granted) throw new Error('Konum izni vermezsen mahallenin merkezini kullanırız.');
    const k = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setKonum({ enlem: k.coords.latitude, boylam: k.coords.longitude });
  }

  async function kaydet() {
    if (!mahalle) throw new Error('Mahalleni seçmelisin.');
    if (acikAdres.trim().length < 8) throw new Error('Açık adresini yaz (sokak, numara, daire).');
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
    if (error) throw new Error('Adres kaydedilemedi. Tekrar dene.');
    router.back();
  }

  return (
    <Ekran>
      <Baslik alt="Tam adresin yalnız işi kabul eden kişiye, iş süresince görünür.">Yeni adres</Baslik>
      <Secenekler
        etiket="Mahalle"
        secenekler={mahalleler.map((m) => ({ deger: m.id, ad: m.ad }))}
        secili={mahalle}
        sec={setMahalle}
      />
      <Girdi etiket="Adres adı" value={baslik} onChangeText={setBaslik} placeholder="Ev, Annemin evi…" />
      <Girdi
        etiket="Açık adres"
        value={acikAdres}
        onChangeText={setAcikAdres}
        placeholder="Sokak, bina no, kat, daire"
        multiline
      />
      <Girdi
        etiket="Gelecek kişi için not (isteğe bağlı)"
        value={notlar}
        onChangeText={setNotlar}
        placeholder="Zil bozuk, ara · Köpeğim var"
      />
      <Kart>
        <Metin>{konum ? 'Konumun alındı.' : 'Gelecek kişinin yolu bulması için konumunu ekleyebilirsin.'}</Metin>
        {!konum ? (
          <Dugme tur="ikincil" onPress={konumAl}>
            Şu anki konumumu kullan
          </Dugme>
        ) : null}
      </Kart>
      <Dugme onPress={kaydet}>Kaydet</Dugme>
    </Ekran>
  );
}
