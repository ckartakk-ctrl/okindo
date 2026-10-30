import { Text, View } from 'react-native';
import type { HvKarti } from '@/lib/tipler';
import { Metin, renk, Rozet } from './ui';

/** Gelecek kişinin kartı: ad, puan, iş sayısı, rozetler */
export function HvKartGorunumu({ kart, sigortali }: { kart: HvKarti; sigortali?: boolean }) {
  const basHarf = kart.ad.slice(0, 1).toLocaleUpperCase('tr-TR');
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: renk.anaAcik,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: renk.ana }}>{basHarf}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Metin kalin>{kart.ad}</Metin>
        <Metin soluk kucuk>
          {kart.puan ? `★ ${kart.puan.toString().replace('.', ',')}` : 'Yeni'} · {kart.is_sayisi} iş
          {kart.mahalle ? ` · ${kart.mahalle}` : ''}
        </Metin>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {kart.kurucu ? <Rozet tur="soluk">Kurucu</Rozet> : null}
          {sigortali ? <Rozet>Bu işte sigortalı</Rozet> : null}
        </View>
      </View>
    </View>
  );
}
