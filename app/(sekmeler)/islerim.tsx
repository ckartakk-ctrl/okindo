import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bos, bosluk, Dugme, Ekran, Grup, renk, Rozet, Simge, stil, Yukleniyor, type SimgeAdi } from '@/components/ui';
import { bitmisDurumlar, durumMetni, hvDurumMetni, tl, zaman } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Is, IsDurumu } from '@/lib/tipler';

const durumSimgesi: Record<IsDurumu, SimgeAdi> = {
  odeme_bekliyor: 'card-outline',
  acik: 'search-outline',
  kabul: 'person-outline',
  yolda: 'walk-outline',
  adreste: 'home-outline',
  basladi: 'construct-outline',
  bitti: 'hourglass-outline',
  onaylandi: 'checkmark-circle',
  sorun: 'alert-circle-outline',
  iptal: 'close-circle-outline',
  gelmedi: 'close-circle-outline',
  evde_yok: 'close-circle-outline',
  yapilamadi: 'close-circle-outline',
};

function rozetTuru(d: IsDurumu): 'ana' | 'uyari' | 'soluk' | 'damga' {
  if (['sorun', 'gelmedi'].includes(d)) return 'uyari';
  if (d === 'onaylandi') return 'damga';
  if (bitmisDurumlar.includes(d)) return 'soluk';
  return 'ana';
}

export default function Islerim() {
  const { oturum, mod } = useOturum();
  const [isler, setIsler] = useState<Is[] | null>(null);
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

  if (!isler) return <Yukleniyor />;

  const devam = isler.filter((i) => !bitmisDurumlar.includes(i.durum));
  const gecmis = isler.filter((i) => bitmisDurumlar.includes(i.durum));

  if (!isler.length) {
    return (
      <Ekran yenile={yukle}>
        <Bos
          simge="calendar-clear-outline"
          baslik="Henüz işin yok"
          metin={mod === 'hv' ? 'Kabul ettiğin işler burada görünür.' : 'Açtığın talepler ve geçmiş işlerin burada görünür.'}
          eylem={
            mod === 'musteri' ? (
              <Dugme simge="add" onPress={() => router.push('/')}>
                İlk işini aç
              </Dugme>
            ) : (
              <Dugme simge="notifications-outline" onPress={() => router.push('/')}>
                Açık talepleri gör
              </Dugme>
            )
          }
        />
      </Ekran>
    );
  }

  const satir = (i: Is) => {
    const bitti = bitmisDurumlar.includes(i.durum);
    return (
      <Pressable
        key={i.id}
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/is/[id]', params: { id: i.id } })}
        style={({ pressed }) => [stil.grupSatiri, { alignItems: 'flex-start' }, pressed && { backgroundColor: '#F3F7F5' }]}
      >
        <View style={[stil.simgeKutusu, bitti && { backgroundColor: '#EEF1F0' }]}>
          <Simge ad={durumSimgesi[i.durum]} boyut={19} renkli={bitti ? renk.silik : renk.ana} />
        </View>
        <View style={{ flex: 1, gap: bosluk.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[stil.metin, { fontWeight: '600', flex: 1 }]} numberOfLines={1}>
              {i.hizmetler?.ad}
            </Text>
            <Text style={[stil.metin, { fontWeight: '600', fontVariant: ['tabular-nums'] }]}>
              {mod === 'musteri' ? tl(i.musteri_toplam_kd) : tl(i.hv_tutari_kh + i.yol_kh)}
            </Text>
          </View>
          <Text style={[stil.ikincil, { color: renk.soluk }]}>
            {zaman(i.planlanan_baslangic)}
            {i.seri_id ? ' · Düzenli' : ''}
          </Text>
          <Rozet tur={rozetTuru(i.durum)}>{(mod === 'hv' && hvDurumMetni[i.durum]) || durumMetni[i.durum]}</Rozet>
        </View>
      </Pressable>
    );
  };

  return (
    <Ekran yenile={yukle}>
      {devam.length ? <Grup baslik="Devam edenler">{devam.map(satir)}</Grup> : null}
      {gecmis.length ? <Grup baslik="Geçmiş">{gecmis.map(satir)}</Grup> : null}
    </Ekran>
  );
}
