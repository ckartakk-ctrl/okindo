import { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { fotoAdresi } from '@/lib/foto';
import type { Foto } from '@/lib/tipler';
import { Metin } from './ui';

const turAdi: Record<string, string> = {
  baslangic: 'Başlangıç',
  bitis: 'Bitiş',
  evde_yok: 'Kapı',
  yapilamadi: 'Yapılamadı',
  sorun: 'Sorun',
  ek_is: 'Ek iş',
};

export function FotoGalerisi({ fotolar }: { fotolar: Foto[] }) {
  const [adresler, setAdresler] = useState<Record<string, string>>({});

  useEffect(() => {
    let iptal = false;
    Promise.all(fotolar.map(async (f) => [f.id, await fotoAdresi(f.yol)] as const)).then((liste) => {
      if (iptal) return;
      setAdresler(Object.fromEntries(liste.filter(([, a]) => a) as [string, string][]));
    });
    return () => {
      iptal = true;
    };
  }, [fotolar]);

  if (!fotolar.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {fotolar.map((f) => (
        <View key={f.id} style={{ gap: 4 }}>
          {adresler[f.id] ? (
            <Image source={{ uri: adresler[f.id] }} style={{ width: 120, height: 120, borderRadius: 10 }} />
          ) : (
            <View style={{ width: 120, height: 120, borderRadius: 10, backgroundColor: '#E4E1DA' }} />
          )}
          <Metin soluk kucuk>{turAdi[f.tur] ?? f.tur}</Metin>
        </View>
      ))}
    </ScrollView>
  );
}
