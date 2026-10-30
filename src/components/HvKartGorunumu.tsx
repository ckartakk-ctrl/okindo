import { Text, View } from 'react-native';
import { profilFotoAdresi } from '@/lib/foto';
import type { HvKarti } from '@/lib/tipler';
import { Avatar, bosluk, renk, Rozet, Simge, stil, yazi } from './ui';

/** Gelecek kişinin kartı: fotoğraf, ad, puan, iş sayısı, rozetler */
export function HvKartGorunumu({ kart, sigortali }: { kart: HvKarti; sigortali?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: bosluk.m, alignItems: 'center' }}>
      <Avatar ad={kart.ad} foto={profilFotoAdresi(kart.foto_yolu)} boyut={56} onayli />
      <View style={{ flex: 1, gap: bosluk.xs }}>
        <Text style={{ fontFamily: yazi.baslik, fontWeight: '600', fontSize: 18, lineHeight: 24, color: renk.metin }}>{kart.ad}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: bosluk.xs }}>
          {kart.puan ? <Simge ad="star" boyut={16} renkli={renk.damga} /> : null}
          <Text style={[stil.ikincil, { color: renk.soluk }]}>
            {kart.puan ? kart.puan.toString().replace('.', ',') : 'Yeni'}, {kart.is_sayisi} iş{kart.mahalle ? `, ${kart.mahalle}` : ''}
          </Text>
        </View>
        {kart.kurucu || sigortali ? (
          <View style={{ flexDirection: 'row', gap: bosluk.s, flexWrap: 'wrap', marginTop: bosluk.xs }}>
            {kart.kurucu ? <Rozet tur="damga">Kurucu</Rozet> : null}
            {sigortali ? <Rozet>Bu işte sigortalı</Rozet> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
