import { Text, View } from 'react-native';
import type { HvKarti } from '@/lib/tipler';
import { OkDamgasi, renk, Rozet, Simge, yazi } from './ui';

/** Gelecek kişinin kartı: ad, puan, iş sayısı, rozetler */
export function HvKartGorunumu({ kart, sigortali }: { kart: HvKarti; sigortali?: boolean }) {
  const basHarf = kart.ad.slice(0, 1).toLocaleUpperCase('tr-TR');
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <View>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: renk.anaKoyu,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: yazi.baslik, fontSize: 24, color: '#FFFFFF' }}>{basHarf}</Text>
        </View>
        <View style={{ position: 'absolute', right: -6, bottom: -4 }}>
          <OkDamgasi boyut={24} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: yazi.kalin, fontSize: 17, color: renk.metin }}>{kart.ad}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {kart.puan ? <Simge ad="star" boyut={14} renkli={renk.damga} /> : null}
          <Text style={{ fontSize: 13, color: renk.soluk }}>
            {kart.puan ? kart.puan.toString().replace('.', ',') : 'Yeni'} · {kart.is_sayisi} iş
            {kart.mahalle ? ` · ${kart.mahalle}` : ''}
          </Text>
        </View>
        {kart.kurucu || sigortali ? (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            {kart.kurucu ? <Rozet tur="damga">Kurucu</Rozet> : null}
            {sigortali ? <Rozet>Bu işte sigortalı</Rozet> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
