// İşin gidişatı: adım çubuğu
import { Text, View } from 'react-native';
import { bosluk, boyut, renk } from '@/components/ui';
import type { IsDurumu } from '@/lib/tipler';

const adimlar: { durum: IsDurumu; ad: string }[] = [
  { durum: 'kabul', ad: 'Kabul' },
  { durum: 'yolda', ad: 'Yolda' },
  { durum: 'adreste', ad: 'Kapıda' },
  { durum: 'basladi', ad: 'Sürüyor' },
  { durum: 'bitti', ad: 'Bitti' },
  { durum: 'onaylandi', ad: 'Onay' },
];

export function DurumAdimlari({ durum }: { durum: IsDurumu }) {
  const sira = adimlar.findIndex((a) => a.durum === durum);
  if (sira < 0) return null;
  return (
    <View
      style={{ flexDirection: 'row', marginTop: bosluk.s }}
      accessible
      accessibilityLabel={`Adım ${sira + 1} / ${adimlar.length}: ${adimlar[sira].ad}`}
    >
      {adimlar.map((a, i) => {
        const gecti = i < sira || durum === 'onaylandi';
        const simdi = i === sira && durum !== 'onaylandi';
        return (
          <View key={a.durum} style={{ flex: 1, alignItems: 'center', gap: bosluk.s }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', height: 20 }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? 'transparent' : i <= sira ? renk.ana : renk.cizgi }} />
              <View
                style={{
                  width: simdi ? 20 : 12,
                  height: simdi ? 20 : 12,
                  borderRadius: 10,
                  backgroundColor: gecti ? renk.ana : simdi ? renk.damga : renk.kart,
                  borderWidth: gecti || simdi ? 0 : 2,
                  borderColor: renk.cizgi,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {simdi ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: renk.metin }} /> : null}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === adimlar.length - 1 ? 'transparent' : i < sira ? renk.ana : renk.cizgi }} />
            </View>
            <Text style={{ fontSize: boyut.meta, lineHeight: 16, fontWeight: simdi ? '600' : '400', color: simdi ? renk.metin : gecti ? renk.anaKoyu : renk.silik }}>
              {a.ad}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
