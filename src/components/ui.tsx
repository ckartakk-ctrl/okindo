import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Children, Fragment, isValidElement, useCallback, useState, type ComponentProps, type ReactNode } from 'react';
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
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Tasarım dili                                                       */
/*  Zemin soğuk nane grisi, yazılar koyu yeşil mürekkep.               */
/*  Tek vurgu: sarı "OK" damgası — güvenin işareti.                   */
/* ------------------------------------------------------------------ */

export const renk = {
  zemin: '#EDF2F0',
  kart: '#FFFFFF',
  metin: '#0F2E29',
  soluk: '#5C706B',
  silik: '#8A9A96',
  cizgi: '#DAE3E0',
  ana: '#13806F',
  anaKoyu: '#0B4F45',
  anaAcik: '#DCEFE9',
  damga: '#F5C842',
  damgaAcik: '#FDF4D3',
  uyari: '#A4500B',
  uyariAcik: '#FCEFDC',
  hata: '#B42318',
  hataAcik: '#FCE9E7',
};

export const yazi = {
  baslik: 'Baslik-800',
  kalin: 'Baslik-700',
  yari: 'Baslik-600',
};

export const bosluk = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export type SimgeAdi = ComponentProps<typeof Ionicons>['name'];

export function Simge({ ad, boyut = 20, renkli = renk.metin }: { ad: SimgeAdi; boyut?: number; renkli?: string }) {
  return <Ionicons name={ad} size={boyut} color={renkli} />;
}

/** Ekran üstünde koyu zemin varken durum çubuğu yazıları açık renk olur */
export function useAcikDurumCubugu() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );
}

/* ------------------------------ Ekran ------------------------------ */

export function Ekran({
  children,
  yenile,
  kaydirma = true,
  ust,
}: {
  children: ReactNode;
  yenile?: () => Promise<void> | void;
  kaydirma?: boolean;
  /** İçerik boşluğu olmadan en üste yerleşen blok (ör. UstBlok) */
  ust?: ReactNode;
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
                tintColor={ust ? '#FFFFFF' : renk.ana}
                colors={[renk.ana]}
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
          {ust}
          {icerik}
        </ScrollView>
      ) : (
        <>
          {ust}
          {icerik}
        </>
      )}
    </SafeAreaView>
  );
}

/** Koyu yeşil üst blok: selamlama, arama, müsaitlik gibi ekranın ana konusu burada durur */
export function UstBlok({ children }: { children: ReactNode }) {
  const kenar = useSafeAreaInsets();
  useAcikDurumCubugu();
  return <View style={[stil.ustBlok, { paddingTop: kenar.top + bosluk.l }]}>{children}</View>;
}

/* ------------------------------ Yazı ------------------------------- */

export function Baslik({ children, alt }: { children: ReactNode; alt?: string }) {
  return (
    <View style={{ marginBottom: bosluk.s, gap: 6 }}>
      <Text style={stil.baslik}>{children}</Text>
      {alt ? <Text style={[stil.metin, { color: renk.soluk }]}>{alt}</Text> : null}
    </View>
  );
}

export function AltBaslik({ children, sag }: { children: ReactNode; sag?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: bosluk.m }}>
      <Text style={stil.altBaslik}>{children}</Text>
      {sag}
    </View>
  );
}

export function Metin({
  children,
  soluk,
  kalin,
  kucuk,
  renkli,
  ortali,
}: {
  children: ReactNode;
  soluk?: boolean;
  kalin?: boolean;
  kucuk?: boolean;
  renkli?: string;
  ortali?: boolean;
}) {
  return (
    <Text
      style={[
        stil.metin,
        soluk && { color: renk.soluk },
        kalin && { fontWeight: '600' },
        kucuk && { fontSize: 13, lineHeight: 18 },
        renkli ? { color: renkli } : null,
        ortali && { textAlign: 'center' },
      ]}
    >
      {children}
    </Text>
  );
}

/** Para ve sayılar için büyük, karakterli rakamlar */
export function Tutar({ children, boyut = 28, renkli = renk.metin }: { children: ReactNode; boyut?: number; renkli?: string }) {
  return (
    <Text style={{ fontFamily: yazi.baslik, fontSize: boyut, color: renkli, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>
      {children}
    </Text>
  );
}

/* --------------------------- OK damgası ---------------------------- */

/** okindo'nun imzası: hafif eğik, sarı bir onay damgası */
export function OkDamgasi({ boyut = 44, egik = true }: { boyut?: number; egik?: boolean }) {
  return (
    <View
      accessibilityLabel="okindo onaylı"
      style={{
        width: boyut,
        height: boyut,
        borderRadius: boyut / 2,
        backgroundColor: renk.damga,
        alignItems: 'center',
        justifyContent: 'center',
        transform: egik ? [{ rotate: '-10deg' }] : undefined,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: boyut - 6,
          height: boyut - 6,
          borderRadius: (boyut - 6) / 2,
          borderWidth: Math.max(1, boyut / 30),
          borderColor: renk.metin,
          opacity: 0.85,
        }}
      />
      <Text style={{ fontFamily: yazi.baslik, fontSize: boyut * 0.38, color: renk.metin, letterSpacing: -0.5 }}>OK</Text>
    </View>
  );
}

/* ------------------------------ Kart ------------------------------- */

export function Kart({
  children,
  onPress,
  vurgu,
  stilEk,
}: {
  children: ReactNode;
  onPress?: () => void;
  vurgu?: 'ana' | 'uyari' | 'hata' | 'koyu';
  stilEk?: ViewStyle;
}) {
  const vurguStil: ViewStyle | null =
    vurgu === 'ana'
      ? { backgroundColor: renk.anaAcik, borderColor: renk.anaAcik }
      : vurgu === 'uyari'
        ? { backgroundColor: renk.uyariAcik, borderColor: renk.uyariAcik }
        : vurgu === 'hata'
          ? { backgroundColor: renk.hataAcik, borderColor: renk.hataAcik }
          : vurgu === 'koyu'
            ? { backgroundColor: renk.anaKoyu, borderColor: renk.anaKoyu }
            : null;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [stil.kart, vurguStil, stilEk, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[stil.kart, vurguStil, stilEk]}>{children}</View>;
}

/* ------------------------- Gruplu liste ----------------------------- */

/** Ayrı ayrı kartlar yerine satırları tek beyaz zeminde, ince çizgilerle toplar */
export function Grup({ children, baslik }: { children: ReactNode; baslik?: string }) {
  const satirlar = Children.toArray(children).filter((c) => isValidElement(c));
  return (
    <View style={{ gap: bosluk.s }}>
      {baslik ? <Text style={stil.grupBaslik}>{baslik}</Text> : null}
      <View style={stil.grup}>
        {satirlar.map((c, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={stil.ayirici} /> : null}
            {c}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export function GrupSatiri({
  baslik,
  alt,
  simge,
  sag,
  onPress,
  tehlike,
  ok = true,
}: {
  baslik: string;
  alt?: string;
  simge?: SimgeAdi;
  sag?: ReactNode;
  onPress?: () => void;
  tehlike?: boolean;
  ok?: boolean;
}) {
  const yaziRengi = tehlike ? renk.hata : renk.metin;
  const govde = (
    <>
      {simge ? (
        <View style={[stil.simgeKutusu, tehlike && { backgroundColor: renk.hataAcik }]}>
          <Simge ad={simge} boyut={19} renkli={tehlike ? renk.hata : renk.ana} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[stil.metin, { fontWeight: '600', color: yaziRengi }]}>{baslik}</Text>
        {alt ? <Text style={[stil.metin, { fontSize: 13, lineHeight: 18, color: renk.soluk }]}>{alt}</Text> : null}
      </View>
      {typeof sag === 'string' ? <Text style={[stil.metin, { color: renk.soluk }]}>{sag}</Text> : sag}
      {onPress && ok ? <Simge ad="chevron-forward" boyut={18} renkli={renk.silik} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [stil.grupSatiri, pressed && { backgroundColor: '#F3F7F5' }]}
      >
        {govde}
      </Pressable>
    );
  }
  return <View style={stil.grupSatiri}>{govde}</View>;
}

/* ----------------------------- Düğme ------------------------------- */

export function Dugme({
  children,
  onPress,
  tur = 'ana',
  pasif,
  simge,
}: {
  children: string;
  onPress: () => Promise<unknown> | unknown;
  tur?: 'ana' | 'ikincil' | 'tehlike' | 'damga' | 'acik';
  pasif?: boolean;
  simge?: SimgeAdi;
}) {
  const [calisiyor, setCalisiyor] = useState(false);
  const zemin =
    tur === 'ana'
      ? renk.ana
      : tur === 'tehlike'
        ? renk.hata
        : tur === 'damga'
          ? renk.damga
          : tur === 'acik'
            ? '#FFFFFF'
            : renk.kart;
  const yaziRengi = tur === 'ana' || tur === 'tehlike' ? '#FFFFFF' : tur === 'acik' ? renk.anaKoyu : renk.metin;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!pasif, busy: calisiyor }}
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
        { backgroundColor: zemin, opacity: pasif ? 0.4 : 1 },
        tur === 'ikincil' && { borderWidth: 1.5, borderColor: renk.cizgi },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.88 },
      ]}
    >
      {calisiyor ? (
        <ActivityIndicator color={yaziRengi} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {simge ? <Simge ad={simge} boyut={19} renkli={yaziRengi} /> : null}
          <Text style={[stil.dugmeYazi, { color: yaziRengi }]}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ------------------------------ Girdi ------------------------------ */

export function Girdi({ etiket, ipucu, ...props }: TextInputProps & { etiket: string; ipucu?: string }) {
  const [odak, setOdak] = useState(false);
  return (
    <View style={{ marginBottom: bosluk.s }}>
      <Text style={stil.etiket}>{etiket}</Text>
      <TextInput
        placeholderTextColor={renk.silik}
        {...props}
        onFocus={(e) => {
          setOdak(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setOdak(false);
          props.onBlur?.(e);
        }}
        style={[stil.girdi, props.multiline && { minHeight: 88, textAlignVertical: 'top' }, odak && { borderColor: renk.ana }, props.style]}
      />
      {ipucu ? <Text style={[stil.metin, { fontSize: 12, color: renk.soluk, marginTop: 6 }]}>{ipucu}</Text> : null}
    </View>
  );
}

/* ---------------------------- Seçenekler --------------------------- */

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
    <View style={{ marginBottom: bosluk.s }}>
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
              style={({ pressed }) => [
                stil.cip,
                aktif && { backgroundColor: renk.anaKoyu, borderColor: renk.anaKoyu },
                pressed && !aktif && { backgroundColor: renk.anaAcik },
              ]}
            >
              {aktif ? <Simge ad="checkmark" boyut={16} renkli="#FFFFFF" /> : null}
              <Text style={[stil.cipYazi, aktif && { color: '#FFFFFF' }]}>{s.ad}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------- Küçük parçalar --------------------------- */

export function Satir({ sol, sag, kalin, solRenk }: { sol: string; sag: string; kalin?: boolean; solRenk?: string }) {
  const k: TextStyle | false = !!kalin && { fontWeight: '700' };
  return (
    <View style={stil.satir}>
      <Text style={[stil.metin, { color: solRenk ?? (kalin ? renk.metin : renk.soluk) }, k]}>{sol}</Text>
      <Text style={[stil.metin, { fontVariant: ['tabular-nums'] }, k]}>{sag}</Text>
    </View>
  );
}

export function Ayirici() {
  return <View style={[stil.ayirici, { marginLeft: 0, marginVertical: 4 }]} />;
}

export function BilgiSatiri({ simge, children, renkli = renk.soluk }: { simge: SimgeAdi; children: ReactNode; renkli?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Simge ad={simge} boyut={16} renkli={renkli} />
      <Text style={[stil.metin, { fontSize: 14, color: renkli, flex: 1 }]}>{children}</Text>
    </View>
  );
}

export function Rozet({ children, tur = 'ana' }: { children: string; tur?: 'ana' | 'uyari' | 'soluk' | 'damga' | 'hata' }) {
  const zemin =
    tur === 'ana'
      ? renk.anaAcik
      : tur === 'uyari'
        ? renk.uyariAcik
        : tur === 'damga'
          ? renk.damgaAcik
          : tur === 'hata'
            ? renk.hataAcik
            : '#E7ECEA';
  const yaziRengi =
    tur === 'ana' ? renk.anaKoyu : tur === 'uyari' ? renk.uyari : tur === 'damga' ? '#7A5A00' : tur === 'hata' ? renk.hata : renk.soluk;
  return (
    <View style={[stil.rozet, { backgroundColor: zemin }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: yaziRengi }} />
      <Text style={{ color: yaziRengi, fontSize: 12, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}

export function Bos({ baslik, metin, eylem, simge = 'leaf-outline' }: { baslik: string; metin?: string; eylem?: ReactNode; simge?: SimgeAdi }) {
  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: bosluk.l, alignItems: 'center', gap: 10 }}>
      <View style={[stil.simgeKutusu, { width: 64, height: 64, borderRadius: 32, marginBottom: 6 }]}>
        <Simge ad={simge} boyut={28} renkli={renk.ana} />
      </View>
      <Text style={[stil.altBaslik, { textAlign: 'center' }]}>{baslik}</Text>
      {metin ? <Text style={[stil.metin, { color: renk.soluk, textAlign: 'center', maxWidth: 320 }]}>{metin}</Text> : null}
      {eylem ? <View style={{ alignSelf: 'stretch', marginTop: 8 }}>{eylem}</View> : null}
    </View>
  );
}

export function Yukleniyor() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: renk.zemin }}>
      <ActivityIndicator color={renk.ana} size="large" />
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
  ustBlok: {
    backgroundColor: renk.anaKoyu,
    paddingHorizontal: bosluk.l,
    paddingBottom: bosluk.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: bosluk.m,
  },
  baslik: { fontFamily: yazi.baslik, fontSize: 28, lineHeight: 33, color: renk.metin, letterSpacing: -0.6 },
  altBaslik: { fontFamily: yazi.kalin, fontSize: 18, lineHeight: 23, color: renk.metin, letterSpacing: -0.2 },
  grupBaslik: { fontSize: 13, fontWeight: '600', color: renk.soluk, marginLeft: 4, marginTop: bosluk.s },
  metin: { fontSize: 15, color: renk.metin, lineHeight: 21 },
  etiket: { fontSize: 14, fontWeight: '600', color: renk.metin, marginBottom: 8 },
  kart: {
    backgroundColor: renk.kart,
    borderRadius: 20,
    padding: bosluk.l,
    borderWidth: 1,
    borderColor: renk.cizgi,
    gap: bosluk.s,
  },
  grup: { backgroundColor: renk.kart, borderRadius: 20, borderWidth: 1, borderColor: renk.cizgi, overflow: 'hidden' },
  grupSatiri: { flexDirection: 'row', alignItems: 'center', gap: bosluk.m, paddingHorizontal: bosluk.l, paddingVertical: 14, minHeight: 56 },
  ayirici: { height: StyleSheet.hairlineWidth * 2, backgroundColor: renk.cizgi, marginLeft: bosluk.l },
  simgeKutusu: { width: 38, height: 38, borderRadius: 12, backgroundColor: renk.anaAcik, alignItems: 'center', justifyContent: 'center' },
  dugme: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: bosluk.l },
  dugmeYazi: { fontFamily: yazi.kalin, fontSize: 16, letterSpacing: -0.1 },
  girdi: {
    backgroundColor: renk.kart,
    borderWidth: 1.5,
    borderColor: renk.cizgi,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: renk.metin,
  },
  cipler: { flexDirection: 'row', flexWrap: 'wrap', gap: bosluk.s },
  cip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: renk.cizgi,
    backgroundColor: renk.kart,
  },
  cipYazi: { fontSize: 14, color: renk.metin, fontWeight: '600' },
  satir: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 12 },
  rozet: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
