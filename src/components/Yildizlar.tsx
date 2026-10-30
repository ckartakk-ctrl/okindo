import { Pressable, Text, View } from 'react-native';
import { bosluk, renk, Simge, stil } from './ui';

const anlam = ['', 'Çok kötü', 'Kötü', 'İdare eder', 'İyi', 'Harika'];

/** 1–5 yıldız puanlama. Her yıldız 44×44 dokunma alanı; seçilen puanın anlamı yazıyla da gösterilir. */
export function Yildizlar({ deger, sec }: { deger: number; sec: (p: number) => void }) {
  return (
    <View style={{ gap: bosluk.xs }}>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: bosluk.xs }}>
        {[1, 2, 3, 4, 5].map((p) => (
          <Pressable
            key={p}
            accessibilityRole="radio"
            accessibilityLabel={`${p} yıldız, ${anlam[p]}`}
            accessibilityState={{ checked: deger === p }}
            onPress={() => sec(p)}
            hitSlop={2}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Simge ad={p <= deger ? 'star' : 'star-outline'} boyut={36} renkli={p <= deger ? renk.damga : renk.silik} />
          </Pressable>
        ))}
      </View>
      <Text style={[stil.ikincil, { color: deger ? renk.metin : renk.soluk, marginLeft: bosluk.xs }]}>
        {deger ? anlam[deger] : 'Bir yıldıza dokun'}
      </Text>
    </View>
  );
}
