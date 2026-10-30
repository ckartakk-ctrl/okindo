import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { AltBaslik, Bos, Dugme, Ekran, Kart, Metin, Rozet } from '@/components/ui';
import { bitmisDurumlar, durumMetni, hvDurumMetni, tl, zaman } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Is } from '@/lib/tipler';

export default function Islerim() {
  const { oturum, mod } = useOturum();
  const [isler, setIsler] = useState<Is[]>([]);
  const ben = oturum!.user.id;

  const yukle = useCallback(async () => {
    const sutun = mod === 'hv' ? 'hv_id' : 'musteri_id';
    const { data } = await supabase
      .from('isler')
      .select('*, hizmetler(ad, fiyat_tipi, hazirlik, sorular)')
      .eq(sutun, ben)
      .order('planlanan_baslangic', { ascending: false })
      .limit(100);
    setIsler((data as Is[]) ?? []);
  }, [ben, mod]);

  useFocusEffect(
    useCallback(() => {
      yukle();
    }, [yukle]),
  );

  const devam = isler.filter((i) => !bitmisDurumlar.includes(i.durum));
  const gecmis = isler.filter((i) => bitmisDurumlar.includes(i.durum));

  if (!isler.length) {
    return (
      <Ekran yenile={yukle}>
        <Bos
          baslik="Henüz işin yok"
          metin={mod === 'hv' ? 'Kabul ettiğin işler burada görünür.' : 'Açtığın talepler burada görünür.'}
          eylem={mod === 'musteri' ? <Dugme onPress={() => router.push('/')}>Hizmetlere göz at</Dugme> : undefined}
        />
      </Ekran>
    );
  }

  const satir = (i: Is) => (
    <Kart key={i.id} onPress={() => router.push({ pathname: '/is/[id]', params: { id: i.id } })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Metin kalin>{i.hizmetler?.ad}</Metin>
        <Rozet tur={['sorun', 'gelmedi'].includes(i.durum) ? 'uyari' : bitmisDurumlar.includes(i.durum) ? 'soluk' : 'ana'}>
          {(mod === 'hv' && hvDurumMetni[i.durum]) || durumMetni[i.durum]}
        </Rozet>
      </View>
      <Metin soluk kucuk>
        {zaman(i.planlanan_baslangic)}
        {mod === 'musteri' ? ` · ${tl(i.musteri_toplam_kd)}` : ` · ${tl(i.hv_tutari_kh + i.yol_kh)}`}
        {i.seri_id ? ' · Düzenli' : ''}
      </Metin>
    </Kart>
  );

  return (
    <Ekran yenile={yukle}>
      {devam.length ? <AltBaslik>Devam edenler</AltBaslik> : null}
      {devam.map(satir)}
      {gecmis.length ? <AltBaslik>Geçmiş</AltBaslik> : null}
      {gecmis.map(satir)}
    </Ekran>
  );
}
