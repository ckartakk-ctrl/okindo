import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const renk = {
  zemin: '#F6F5F1',
  kart: '#FFFFFF',
  metin: '#1C1B19',
  soluk: '#6B6862',
  cizgi: '#E4E1DA',
  ana: '#13806F',
  anaAcik: '#E3F2EF',
  uyari: '#B45309',
  uyariAcik: '#FDF3E3',
  hata: '#B42318',
  hataAcik: '#FDECEA',
};

export const bosluk = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };

export function Ekran({
  children,
  yenile,
  kaydirma = true,
}: {
  children: ReactNode;
  yenile?: () => Promise<void> | void;
  kaydirma?: boolean;
}) {
  const [yenileniyor, setYenileniyor] = useState(false);
  const icerik = <View style={stil.icerik}>{children}</View>;
  return (
    <SafeAreaView style={stil.ekran} edges={['bottom', 'left', 'right']}>
      {kaydirma ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            yenile ? (
              <RefreshControl
                refreshing={yenileniyor}
                onRefresh={async () => {
                  setYenileniyor(true);
                  try {
                    await yenile();
                  } finally {
                    setYenileniyor(false);
                  }
                }}
              />
            ) : undefined
          }
        >
          {icerik}
        </ScrollView>
      ) : (
        icerik
      )}
    </SafeAreaView>
  );
}

export function Baslik({ children, alt }: { children: ReactNode; alt?: string }) {
  return (
    <View style={{ marginBottom: bosluk.l }}>
      <Text style={stil.baslik}>{children}</Text>
      {alt ? <Text style={[stil.metin, { color: renk.soluk, marginTop: 4 }]}>{alt}</Text> : null}
    </View>
  );
}

export function AltBaslik({ children }: { children: ReactNode }) {
  return <Text style={stil.altBaslik}>{children}</Text>;
}

export function Metin({ children, soluk, kalin, kucuk, renkli }: { children: ReactNode; soluk?: boolean; kalin?: boolean; kucuk?: boolean; renkli?: string }) {
  return (
    <Text
      style={[
        stil.metin,
        soluk && { color: renk.soluk },
        kalin && { fontWeight: '600' },
        kucuk && { fontSize: 13 },
        renkli ? { color: renkli } : null,
      ]}
    >
      {children}
    </Text>
  );
}

export function Kart({ children, onPress, vurgu }: { children: ReactNode; onPress?: () => void; vurgu?: 'ana' | 'uyari' | 'hata' }) {
  const vurguStil: ViewStyle | null =
    vurgu === 'ana'
      ? { backgroundColor: renk.anaAcik, borderColor: renk.anaAcik }
      : vurgu === 'uyari'
        ? { backgroundColor: renk.uyariAcik, borderColor: renk.uyariAcik }
        : vurgu === 'hata'
          ? { backgroundColor: renk.hataAcik, borderColor: renk.hataAcik }
          : null;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [stil.kart, vurguStil, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[stil.kart, vurguStil]}>{children}</View>;
}

export function Dugme({
  children,
  onPress,
  tur = 'ana',
  pasif,
}: {
  children: string;
  onPress: () => Promise<unknown> | unknown;
  tur?: 'ana' | 'ikincil' | 'tehlike';
  pasif?: boolean;
}) {
  const [calisiyor, setCalisiyor] = useState(false);
  const zemin = tur === 'ana' ? renk.ana : tur === 'tehlike' ? renk.hata : renk.kart;
  const yazi = tur === 'ikincil' ? renk.metin : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={pasif || calisiyor}
      onPress={async () => {
        setCalisiyor(true);
        try {
          await onPress();
        } catch (e) {
          hataGoster(e);
        } finally {
          setCalisiyor(false);
        }
      }}
      style={({ pressed }) => [
        stil.dugme,
        { backgroundColor: zemin, opacity: pasif ? 0.4 : pressed ? 0.8 : 1 },
        tur === 'ikincil' && { borderWidth: 1, borderColor: renk.cizgi },
      ]}
    >
      {calisiyor ? <ActivityIndicator color={yazi} /> : <Text style={[stil.dugmeYazi, { color: yazi }]}>{children}</Text>}
    </Pressable>
  );
}

export function Girdi({ etiket, ipucu, ...props }: TextInputProps & { etiket: string; ipucu?: string }) {
  return (
    <View style={{ marginBottom: bosluk.m }}>
      <Text style={stil.etiket}>{etiket}</Text>
      <TextInput placeholderTextColor={renk.soluk} style={stil.girdi} {...props} />
      {ipucu ? <Text style={[stil.metin, { fontSize: 12, color: renk.soluk, marginTop: 4 }]}>{ipucu}</Text> : null}
    </View>
  );
}

export function Secenekler<T extends string>({
  secenekler,
  secili,
  sec,
  etiket,
}: {
  secenekler: { deger: T; ad: string }[];
  secili: T | null | undefined;
  sec: (d: T) => void;
  etiket?: string;
}) {
  return (
    <View style={{ marginBottom: bosluk.m }}>
      {etiket ? <Text style={stil.etiket}>{etiket}</Text> : null}
      <View style={stil.cipler}>
        {secenekler.map((s) => {
          const aktif = s.deger === secili;
          return (
            <Pressable
              key={s.deger}
              accessibilityRole="button"
              accessibilityState={{ selected: aktif }}
              onPress={() => sec(s.deger)}
              style={[stil.cip, aktif && { backgroundColor: renk.ana, borderColor: renk.ana }]}
            >
              <Text style={[stil.cipYazi, aktif && { color: '#FFFFFF' }]}>{s.ad}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Satir({ sol, sag, kalin }: { sol: string; sag: string; kalin?: boolean }) {
  return (
    <View style={stil.satir}>
      <Text style={[stil.metin, kalin && { fontWeight: '700' }]}>{sol}</Text>
      <Text style={[stil.metin, kalin && { fontWeight: '700' }]}>{sag}</Text>
    </View>
  );
}

export function Rozet({ children, tur = 'ana' }: { children: string; tur?: 'ana' | 'uyari' | 'soluk' }) {
  const zemin = tur === 'ana' ? renk.anaAcik : tur === 'uyari' ? renk.uyariAcik : '#EEEDE8';
  const yazi = tur === 'ana' ? renk.ana : tur === 'uyari' ? renk.uyari : renk.soluk;
  return (
    <View style={[stil.rozet, { backgroundColor: zemin }]}>
      <Text style={{ color: yazi, fontSize: 12, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export function Bos({ baslik, metin, eylem }: { baslik: string; metin?: string; eylem?: ReactNode }) {
  return (
    <View style={{ paddingVertical: 32, alignItems: 'center', gap: 8 }}>
      <Text style={[stil.altBaslik, { textAlign: 'center' }]}>{baslik}</Text>
      {metin ? <Text style={[stil.metin, { color: renk.soluk, textAlign: 'center' }]}>{metin}</Text> : null}
      {eylem}
    </View>
  );
}

export function Yukleniyor() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: renk.zemin }}>
      <ActivityIndicator color={renk.ana} />
    </View>
  );
}

export function hataGoster(e: unknown) {
  const mesaj = e instanceof Error ? e.message : 'Bir şeyler ters gitti. Lütfen tekrar dene.';
  Alert.alert('Olmadı', mesaj);
}

export function onayla(baslik: string, mesaj: string, evet: string): Promise<boolean> {
  return new Promise((coz) =>
    Alert.alert(baslik, mesaj, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => coz(false) },
      { text: evet, onPress: () => coz(true) },
    ]),
  );
}

export const stil = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: renk.zemin },
  icerik: { padding: bosluk.l, gap: bosluk.m },
  baslik: { fontSize: 24, fontWeight: '700', color: renk.metin },
  altBaslik: { fontSize: 17, fontWeight: '600', color: renk.metin, marginTop: bosluk.s },
  metin: { fontSize: 15, color: renk.metin, lineHeight: 21 },
  etiket: { fontSize: 13, fontWeight: '600', color: renk.soluk, marginBottom: 6 },
  kart: {
    backgroundColor: renk.kart,
    borderRadius: 14,
    padding: bosluk.l,
    borderWidth: 1,
    borderColor: renk.cizgi,
    gap: bosluk.s,
  },
  dugme: { minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: bosluk.l },
  dugmeYazi: { fontSize: 16, fontWeight: '600' },
  girdi: {
    backgroundColor: renk.kart,
    borderWidth: 1,
    borderColor: renk.cizgi,
    borderRadius: 12,
    paddingHorizontal: bosluk.m,
    paddingVertical: 12,
    fontSize: 16,
    color: renk.metin,
  },
  cipler: { flexDirection: 'row', flexWrap: 'wrap', gap: bosluk.s },
  cip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: renk.cizgi,
    backgroundColor: renk.kart,
  },
  cipYazi: { fontSize: 14, color: renk.metin, fontWeight: '500' },
  satir: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  rozet: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
