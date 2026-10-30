import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { fotoAdresi } from '@/lib/foto';
import type { Foto } from '@/lib/tipler';
import { bosluk, renk, Simge, stil } from './ui';

const turAdi: Record<string, string> = {
  baslangic: 'Başlangıç',
  bitis: 'Bitiş',
  evde_yok: 'Kapı',
  yapilamadi: 'Yapılamadı',
  sorun: 'Sorun',
  ek_is: 'Ek iş',
  fis: 'Fiş',
};

/** İki sütunlu fotoğraf ızgarası; açılamayan fotoğrafta boş kutu yerine açıklama gösterir */
export function FotoGalerisi({ fotolar }: { fotolar: Foto[] }) {
  const [adresler, setAdresler] = useState<Record<string, string | null>>({});
  const [bozuk, setBozuk] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let iptal = false;
    Promise.all(fotolar.map(async (f) => [f.id, await fotoAdresi(f.yol).catch(() => null)] as const)).then((liste) => {
      if (!iptal) setAdresler(Object.fromEntries(liste));
    });
    return () => {
      iptal = true;
    };
  }, [fotolar]);

  if (!fotolar.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: bosluk.m }}>
      {fotolar.map((f) => {
        const adres = adresler[f.id];
        const yuklenmedi = adres === null || bozuk[f.id];
        return (
          <View key={f.id} style={{ width: '47%', gap: bosluk.s }}>
            <View style={{ aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E1E8E6', borderWidth: 1, borderColor: renk.cizgi }}>
              {adres && !bozuk[f.id] ? (
                <Image
                  source={{ uri: adres }}
                  accessibilityLabel={`${turAdi[f.tur] ?? f.tur} fotoğrafı`}
                  onError={() => setBozuk((b) => ({ ...b, [f.id]: true }))}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : yuklenmedi ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: bosluk.xs, padding: bosluk.s }}>
                  <Simge ad="image-outline" boyut={24} renkli={renk.silik} />
                  <Text style={[stil.meta, { color: renk.soluk, textAlign: 'center' }]}>Fotoğraf açılamadı</Text>
                </View>
              ) : null}
            </View>
            <Text style={[stil.ikincil, { color: renk.soluk }]}>{turAdi[f.tur] ?? f.tur}</Text>
          </View>
        );
      })}
    </View>
  );
}
