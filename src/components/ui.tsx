import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { baslikAilesi } from '@/lib/yazitipi';

/* ------------------------------------------------------------------ */
/*  Tasarım dili (VectorLab UX kurallarına göre)                       */
/*  - Yazı ağırlıkları: 400 / 500 / 600. 600'ün üstü yok.              */
/*  - Boyutlar: gövde 16, ikincil 14, meta 12. 12'nin altı yok.        */
/*  - Boşluklar: 4'ün katları (küçük), 8'in katları (büyük).           */
/*  - %60 zemin, %30 beyaz yüzey, %10 yeşil vurgu.                     */
/*  - Tek imza: sarı "OK" damgası (güven işareti).                     */
/* ------------------------------------------------------------------ */

export const renk = {
  zemin: '#EEF2F1',
  kart: '#FFFFFF',
  metin: '#11302B',
  soluk: '#566B66',
  silik: '#7F918D',
  cizgi: '#DCE4E2',
  ana: '#13806F',
  anaKoyu: '#0D5C50',
  anaAcik: '#E1F1EC',
  damga: '#F5C842',
  damgaAcik: '#FCF3D6',
  uyari: '#9A4A08',
  uyariAcik: '#FCEFDC',
  hata: '#B42318',
  hataAcik: '#FCE9E7',
};

/** Başlık yazı tipi (Bricolage Grotesque 600). Yüklenmezse sistem yazısı kullanılır. */
export const yazi = { baslik: baslikAilesi, kalin: baslikAilesi, yari: baslikAilesi };

export const bosluk = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };
export const boyut = { govde: 16, ikincil: 14, meta: 12 };

export type SimgeAdi = ComponentProps<typeof Ionicons>['name'];

export function Simge({ ad, boyut: b = 20, renkli = renk.metin }: { ad: SimgeAdi; boyut?: number; renkli?: string }) {
  return <Ionicons name={ad} size={b} color={renkli} />;
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
  alt,
}: {
  children: ReactNode;
  yenile?: () => Promise<void> | void;
  kaydirma?: boolean;
  /** İçerik boşluğu olmadan en üste yerleşen blok (ör. UstBlok, Sekmeler) */
  ust?: ReactNode;
  /** Alta yapışık eylem çubuğu (form ekranlarında Kaydet / Devam) */
  alt?: ReactNode;
}) {
  const [yenileniyor, setYenileniyor] = useState(false);
  const icerik = <View style={stil.icerik}>{children}</View>;
  return (
    <SafeAreaView style={stil.ekran} edges={alt ? ['left', 'right'] : ['bottom', 'left', 'right']}>
      {kaydirma ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: alt ? bosluk.xl : 48 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            yenile ? (
              <RefreshControl
                refreshing={yenileniyor}
                tintColor={renk.ana}
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
        <View style={{ flex: 1 }}>
          {ust}
          {icerik}
        </View>
      )}
      {alt ? <AltCubuk>{alt}</AltCubuk> : null}
    </SafeAreaView>
  );
}

function AltCubuk({ children }: { children: ReactNode }) {
  const kenar = useSafeAreaInsets();
  return <View style={[stil.altCubuk, { paddingBottom: Math.max(kenar.bottom, bosluk.l) }]}>{children}</View>;
}

/** Koyu yeşil üst blok: ekranın ana konusu (selamlama, arama, müsaitlik) */
export function UstBlok({ children }: { children: ReactNode }) {
  const kenar = useSafeAreaInsets();
  useAcikDurumCubugu();
  return <View style={[stil.ustBlok, { paddingTop: kenar.top + bosluk.l }]}>{children}</View>;
}

/* ------------------------------ Yazı ------------------------------- */

export function Baslik({ children, alt }: { children: ReactNode; alt?: string }) {
  return (
    <View style={{ marginBottom: bosluk.s, gap: bosluk.s }}>
      <Text accessibilityRole="header" style={stil.baslik}>
        {children}
      </Text>
      {alt ? <Text style={[stil.metin, { color: renk.soluk }]}>{alt}</Text> : null}
    </View>
  );
}

export function AltBaslik({ children, sag }: { children: ReactNode; sag?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: bosluk.s }}>
      <Text accessibilityRole="header" style={stil.altBaslik}>
        {children}
      </Text>
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
        kucuk && stil.ikincil,
        renkli ? { color: renkli } : null,
        ortali && { textAlign: 'center' },
      ]}
    >
      {children}
    </Text>
  );
}

/** Para ve sayılar için büyük, karakterli rakamlar */
export function Tutar({ children, boyut: b = 28, renkli = renk.metin }: { children: ReactNode; boyut?: number; renkli?: string }) {
  return (
    <Text
      style={{
        fontFamily: yazi.baslik,
        fontWeight: '600',
        fontSize: b,
        lineHeight: Math.round(b * 1.15),
        color: renkli,
        letterSpacing: -0.4,
        fontVariant: ['tabular-nums'],
      }}
    >
      {children}
    </Text>
  );
}

/* --------------------------- OK damgası ---------------------------- */

/** okindo'nun imzası: hafif eğik, sarı bir onay damgası */
export function OkDamgasi({ boyut: b = 44, egik = true }: { boyut?: number; egik?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel="okindo onaylı"
      style={{
        width: b,
        height: b,
        borderRadius: b / 2,
        backgroundColor: renk.damga,
        alignItems: 'center',
        justifyContent: 'center',
        transform: egik ? [{ rotate: '-10deg' }] : undefined,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: b - 6,
          height: b - 6,
          borderRadius: (b - 6) / 2,
          borderWidth: Math.max(1, b / 30),
          borderColor: renk.metin,
          opacity: 0.85,
        }}
      />
      <Text style={{ fontFamily: yazi.baslik, fontWeight: '600', fontSize: Math.max(12, b * 0.38), color: renk.metin }}>OK</Text>
    </View>
  );
}

/* --------------------------- Profil resmi -------------------------- */

export function Avatar({
  ad,
  foto,
  boyut: b = 48,
  onayli,
}: {
  ad: string;
  foto?: string | null;
  boyut?: number;
  onayli?: boolean;
}) {
  const basHarf = (ad || '?').trim().slice(0, 1).toLocaleUpperCase('tr-TR');
  return (
    <View style={{ width: b, height: b }}>
      {foto ? (
        <Image source={{ uri: foto }} style={{ width: b, height: b, borderRadius: b / 2, backgroundColor: renk.anaAcik }} />
      ) : (
        <View style={{ width: b, height: b, borderRadius: b / 2, backgroundColor: renk.anaKoyu, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: yazi.baslik, fontWeight: '600', fontSize: b * 0.42, color: '#FFFFFF' }}>{basHarf}</Text>
        </View>
      )}
      {onayli ? (
        <View style={{ position: 'absolute', right: -b * 0.12, bottom: -b * 0.08 }}>
          <OkDamgasi boyut={Math.max(20, Math.round(b * 0.44))} />
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------ Kart ------------------------------- */

export function Kart({
  children,
  onPress,
  vurgu,
  stilEk,
  erisimEtiketi,
}: {
  children: ReactNode;
  onPress?: () => void;
  vurgu?: 'ana' | 'uyari' | 'hata' | 'koyu' | 'damga';
  stilEk?: ViewStyle;
  erisimEtiketi?: string;
}) {
  const vurguStil: ViewStyle | null =
    vurgu === 'ana'
      ? { backgroundColor: renk.anaAcik, borderColor: '#C6E4DA' }
      : vurgu === 'uyari'
        ? { backgroundColor: renk.uyariAcik, borderColor: '#F3D9B5' }
        : vurgu === 'hata'
          ? { backgroundColor: renk.hataAcik, borderColor: '#F4C7C2' }
          : vurgu === 'damga'
            ? { backgroundColor: renk.damgaAcik, borderColor: '#F0DE9C' }
            : vurgu === 'koyu'
              ? { backgroundColor: renk.anaKoyu, borderColor: renk.anaKoyu }
              : null;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={erisimEtiketi}
        onPress={onPress}
        style={({ pressed }) => [stil.kart, vurguStil, stilEk, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[stil.kart, vurguStil, stilEk]}>{children}</View>;
}

/* ------------------------- Gruplu liste ----------------------------- */

/** Satırları tek beyaz yüzeyde, ince çizgilerle toplar (liste = L1 yüzey + ayırıcılar) */
export function Grup({ children, baslik, sag }: { children: ReactNode; baslik?: string; sag?: ReactNode }) {
  const satirlar = Children.toArray(children).filter((c) => isValidElement(c));
  return (
    <View style={{ gap: bosluk.s }}>
      {baslik ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: bosluk.xs }}>
          <Text accessibilityRole="header" style={stil.grupBaslik}>
            {baslik}
          </Text>
          {sag}
        </View>
      ) : null}
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
  sol,
  sag,
  onPress,
  tehlike,
  ok = true,
  vurgulu,
}: {
  baslik: string;
  alt?: string;
  simge?: SimgeAdi;
  /** Simge yerine özel öğe (ör. Avatar) */
  sol?: ReactNode;
  sag?: ReactNode;
  onPress?: () => void;
  tehlike?: boolean;
  ok?: boolean;
  /** Okunmamış gibi öne çıkan satır: kalın başlık + soldaki vurgu çizgisi */
  vurgulu?: boolean;
}) {
  const yaziRengi = tehlike ? renk.hata : renk.metin;
  const govde = (
    <>
      {vurgulu ? <View style={stil.vurguCizgisi} /> : null}
      {sol ??
        (simge ? (
          <View style={[stil.simgeKutusu, tehlike && { backgroundColor: renk.hataAcik }]}>
            <Simge ad={simge} boyut={20} renkli={tehlike ? renk.hata : renk.ana} />
          </View>
        ) : null)}
      <View style={{ flex: 1, gap: bosluk.xs }}>
        <Text style={[stil.metin, { fontWeight: vurgulu !== undefined ? (vurgulu ? '600' : '400') : onPress ? '600' : '500', color: yaziRengi }]}>{baslik}</Text>
        {alt ? <Text style={[stil.ikincil, { color: renk.soluk }]}>{alt}</Text> : null}
      </View>
      {typeof sag === 'string' ? <Text style={[stil.ikincil, { color: renk.soluk }]}>{sag}</Text> : sag}
      {onPress && ok ? <Simge ad="chevron-forward" boyut={20} renkli={renk.silik} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={alt ? `${baslik}. ${alt}` : baslik}
        onPress={onPress}
        style={({ pressed }) => [stil.grupSatiri, pressed && { backgroundColor: '#F2F6F5' }]}
      >
        {govde}
      </Pressable>
    );
  }
  return <View style={stil.grupSatiri}>{govde}</View>;
}

/* ----------------------------- Sekmeler ---------------------------- */

/** Detay ekranı sekmeleri: kaydırılabilir satır, etiketler kırılmaz */
export function Sekmeler<T extends string>({
  sekmeler,
  secili,
  sec,
}: {
  sekmeler: { deger: T; ad: string; sayi?: number }[];
  secili: T;
  sec: (d: T) => void;
}) {
  return (
    <View style={stil.sekmeZemin}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: bosluk.s }}>
        {sekmeler.map((s) => {
          const aktif = s.deger === secili;
          return (
            <Pressable
              key={s.deger}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktif }}
              onPress={() => sec(s.deger)}
              style={[stil.sekme, aktif && { borderBottomColor: renk.ana }]}
            >
              <Text numberOfLines={1} style={[stil.metin, { fontWeight: aktif ? '600' : '500', color: aktif ? renk.metin : renk.soluk }]}>
                {s.ad}
              </Text>
              {s.sayi ? (
                <View style={stil.sekmeSayi}>
                  <Text style={{ fontSize: boyut.meta, fontWeight: '600', color: '#FFFFFF' }}>{s.sayi}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ----------------------------- Düğme ------------------------------- */

/**
 * Düğme hiçbir zaman pasif olmaz (forms kuralı). Eksik bir şey varsa `eksik` metni verilir:
 * basınca işlem yapılmaz, sebep düğmenin altında yazılır.
 */
export function Dugme({
  children,
  onPress,
  tur = 'ana',
  eksik,
  simge,
  kucuk,
}: {
  children: string;
  onPress: () => Promise<unknown> | unknown;
  tur?: 'ana' | 'ikincil' | 'tehlike' | 'damga' | 'acik' | 'metin';
  eksik?: string | null;
  simge?: SimgeAdi;
  kucuk?: boolean;
}) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [carkGoster, setCarkGoster] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!eksik) setUyari(null);
  }, [eksik]);
  useEffect(() => () => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
  }, []);

  const zemin = { ana: renk.ana, tehlike: renk.hata, damga: renk.damga, acik: '#FFFFFF', ikincil: renk.kart, metin: 'transparent' }[tur];
  const yaziRengi = { ana: '#FFFFFF', tehlike: '#FFFFFF', damga: renk.metin, acik: renk.anaKoyu, ikincil: renk.metin, metin: renk.ana }[tur];

  return (
    <View style={{ gap: bosluk.s }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: calisiyor }}
        accessibilityHint={eksik ?? undefined}
        disabled={calisiyor}
        onPress={async () => {
          if (eksik) {
            setUyari(eksik);
            return;
          }
          setUyari(null);
          setCalisiyor(true);
          // 100 ms'den kısa işlerde çark gösterilmez (titreme olmasın)
          zamanlayici.current = setTimeout(() => setCarkGoster(true), 100);
          try {
            await onPress();
          } catch (e) {
            hataGoster(e);
          } finally {
            if (zamanlayici.current) clearTimeout(zamanlayici.current);
            setCalisiyor(false);
            setCarkGoster(false);
          }
        }}
        style={({ pressed }) => [
          stil.dugme,
          kucuk && { minHeight: 44, paddingHorizontal: bosluk.m },
          { backgroundColor: zemin },
          tur === 'ikincil' && { borderWidth: 1, borderColor: renk.cizgi },
          pressed && { opacity: 0.85 },
        ]}
      >
        {carkGoster ? (
          <ActivityIndicator color={yaziRengi} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: bosluk.s }}>
            {simge ? <Simge ad={simge} boyut={20} renkli={yaziRengi} /> : null}
            <Text style={[stil.dugmeYazi, kucuk && { fontSize: boyut.ikincil }, { color: yaziRengi }]}>{children}</Text>
          </View>
        )}
      </Pressable>
      {uyari ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: bosluk.s, alignItems: 'flex-start' }}>
          <Simge ad="information-circle" boyut={20} renkli={renk.uyari} />
          <Text style={[stil.ikincil, { color: renk.uyari, flex: 1 }]}>{uyari}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------ Girdi ------------------------------ */

/**
 * Etiket her zaman görünür. Doğrulama ilk ayrılışta (blur) çalışır,
 * kullanıcı alana dönünce ya da yazmaya başlayınca hata hemen kalkar.
 */
export function Girdi({
  etiket,
  ipucu,
  istegeBagli,
  dogrula,
  ...props
}: TextInputProps & {
  etiket: string;
  ipucu?: string;
  istegeBagli?: boolean;
  /** Geçersizse gösterilecek metni döndürür */
  dogrula?: (deger: string) => string | null;
}) {
  const [odak, setOdak] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  return (
    <View style={{ gap: bosluk.s }}>
      <Text style={stil.etiket}>
        {etiket}
        {istegeBagli ? <Text style={{ color: renk.soluk, fontWeight: '400' }}> (isteğe bağlı)</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={renk.silik}
        accessibilityLabel={etiket}
        {...props}
        onFocus={(e) => {
          setOdak(true);
          setHata(null);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setOdak(false);
          if (dogrula) setHata(dogrula(String(props.value ?? '')));
          props.onBlur?.(e);
        }}
        onChangeText={(t) => {
          if (hata) setHata(null);
          props.onChangeText?.(t);
        }}
        style={[
          stil.girdi,
          props.multiline && { minHeight: 96, textAlignVertical: 'top' },
          odak && { borderColor: renk.ana, borderWidth: 2, paddingHorizontal: bosluk.l - 1 },
          hata && { borderColor: renk.hata },
          props.style,
        ]}
      />
      {hata ? (
        <Text accessibilityLiveRegion="polite" style={[stil.ikincil, { color: renk.hata }]}>
          {hata}
        </Text>
      ) : ipucu ? (
        <Text style={[stil.meta, { color: renk.soluk }]}>{ipucu}</Text>
      ) : null}
    </View>
  );
}

/* ---------------------------- Seçenekler --------------------------- */

export function Secenekler<T extends string>({
  secenekler,
  secili,
  sec,
  etiket,
  dikey,
}: {
  secenekler: { deger: T; ad: string; alt?: string }[];
  secili: T | null | undefined;
  sec: (d: T) => void;
  etiket?: string;
  /** Uzun seçenekler alt alta, radyo düğmesi gibi */
  dikey?: boolean;
}) {
  return (
    <View style={{ gap: bosluk.s }}>
      {etiket ? <Text style={stil.etiket}>{etiket}</Text> : null}
      {dikey ? (
        <View style={stil.grup}>
          {secenekler.map((s, i) => {
            const aktif = s.deger === secili;
            return (
              <Fragment key={s.deger}>
                {i > 0 ? <View style={stil.ayirici} /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: aktif }}
                  onPress={() => sec(s.deger)}
                  style={({ pressed }) => [stil.grupSatiri, pressed && { backgroundColor: '#F2F6F5' }]}
                >
                  <View style={[stil.radyo, aktif && { borderColor: renk.ana }]}>
                    {aktif ? <View style={stil.radyoIc} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: bosluk.xs }}>
                    <Text style={[stil.metin, { fontWeight: aktif ? '600' : '400' }]}>{s.ad}</Text>
                    {s.alt ? <Text style={[stil.ikincil, { color: renk.soluk }]}>{s.alt}</Text> : null}
                  </View>
                </Pressable>
              </Fragment>
            );
          })}
        </View>
      ) : (
        <View style={stil.cipler}>
          {secenekler.map((s) => {
            const aktif = s.deger === secili;
            return (
              <Pressable
                key={s.deger}
                accessibilityRole="radio"
                accessibilityState={{ checked: aktif }}
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
      )}
    </View>
  );
}

/* ------------------------- Küçük parçalar --------------------------- */

export function Satir({ sol, sag, kalin, solRenk }: { sol: string; sag: string; kalin?: boolean; solRenk?: string }) {
  return (
    <View style={stil.satir}>
      <Text style={[stil.metin, { color: solRenk ?? (kalin ? renk.metin : renk.soluk), flexShrink: 1 }, kalin && { fontWeight: '600' }]}>
        {sol}
      </Text>
      <Text style={[stil.metin, { fontVariant: ['tabular-nums'] }, kalin && { fontWeight: '600' }]}>{sag}</Text>
    </View>
  );
}

export function Ayirici() {
  return <View style={{ height: 1, backgroundColor: renk.cizgi, marginVertical: bosluk.xs }} />;
}

export function BilgiSatiri({ simge, children, renkli = renk.soluk }: { simge: SimgeAdi; children: ReactNode; renkli?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: bosluk.s }}>
      <View style={{ paddingTop: 2 }}>
        <Simge ad={simge} boyut={16} renkli={renkli} />
      </View>
      <Text style={[stil.ikincil, { color: renkli, flex: 1 }]}>{children}</Text>
    </View>
  );
}

/** Durum rozeti: yalnız gerçek durum bilgisi için (süs için değil) */
export function Rozet({ children, tur = 'ana' }: { children: string; tur?: 'ana' | 'uyari' | 'soluk' | 'damga' | 'hata' }) {
  const zemin = { ana: renk.anaAcik, uyari: renk.uyariAcik, damga: renk.damgaAcik, hata: renk.hataAcik, soluk: '#E6ECEA' }[tur];
  const yaziRengi = { ana: renk.anaKoyu, uyari: renk.uyari, damga: '#6E5200', hata: renk.hata, soluk: renk.soluk }[tur];
  return (
    <View style={[stil.rozet, { backgroundColor: zemin }]}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: yaziRengi }} />
      <Text style={{ color: yaziRengi, fontSize: boyut.meta, lineHeight: 16, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

/** Boş durum: ne olduğunu söyler, neden işe yaradığını anlatır, bir eylem sunar */
export function Bos({ baslik, metin, eylem, simge = 'leaf-outline' }: { baslik: string; metin?: string; eylem?: ReactNode; simge?: SimgeAdi }) {
  return (
    <View style={{ paddingVertical: bosluk.xxl, paddingHorizontal: bosluk.l, alignItems: 'center', gap: bosluk.m }}>
      <View style={[stil.simgeKutusu, { width: 64, height: 64, borderRadius: 32 }]}>
        <Simge ad={simge} boyut={28} renkli={renk.ana} />
      </View>
      <Text accessibilityRole="header" style={[stil.altBaslik, { textAlign: 'center' }]}>
        {baslik}
      </Text>
      {metin ? <Text style={[stil.metin, { color: renk.soluk, textAlign: 'center', maxWidth: 320 }]}>{metin}</Text> : null}
      {eylem ? <View style={{ alignSelf: 'stretch', marginTop: bosluk.s }}>{eylem}</View> : null}
    </View>
  );
}

/* ---------------------------- Yükleniyor --------------------------- */

function Kemik({ en, boy, yuvarlak = 8, stilEk }: { en?: number | `${number}%`; boy: number; yuvarlak?: number; stilEk?: ViewStyle }) {
  return <View style={[{ width: en ?? '100%', height: boy, borderRadius: yuvarlak, backgroundColor: '#E1E8E6' }, stilEk]} />;
}

/**
 * İçerik yüklenirken sayfanın iskeletini gösterir (tam ekran dönen çark yerine).
 * Hareketsizdir; azaltılmış hareket ayarında da aynı görünür.
 */
export function Yukleniyor({ tur = 'liste' }: { tur?: 'liste' | 'detay' | 'form' }) {
  return (
    <View accessibilityLabel="Yükleniyor" accessibilityRole="progressbar" style={[stil.ekran, stil.icerik]}>
      <Kemik en="60%" boy={28} />
      <Kemik en="85%" boy={16} />
      {tur === 'detay' ? (
        <View style={[stil.kart, { gap: bosluk.m }]}>
          <Kemik en="30%" boy={20} yuvarlak={10} />
          <Kemik en="70%" boy={24} />
          <Kemik boy={16} />
          <Kemik boy={40} />
        </View>
      ) : null}
      {tur === 'form' ? (
        <>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ gap: bosluk.s }}>
              <Kemik en="35%" boy={16} />
              <Kemik boy={48} yuvarlak={12} />
            </View>
          ))}
        </>
      ) : (
        <View style={stil.grup}>
          {[0, 1, 2, 3].map((i) => (
            <Fragment key={i}>
              {i > 0 ? <View style={stil.ayirici} /> : null}
              <View style={[stil.grupSatiri, { gap: bosluk.m }]}>
                <Kemik en={40} boy={40} yuvarlak={12} />
                <View style={{ flex: 1, gap: bosluk.s }}>
                  <Kemik en="70%" boy={16} />
                  <Kemik en="45%" boy={12} />
                </View>
              </View>
            </Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------- Uyarı pencereleri ------------------------ */

export function hataGoster(e: unknown) {
  const mesaj = e instanceof Error && e.message ? e.message : 'İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.';
  Alert.alert('İşlem tamamlanamadı', mesaj, [{ text: 'Kapat', style: 'cancel' }]);
}

/**
 * Onay penceresi. Vazgeç her zaman ilk ve varsayılan seçenektir.
 * Silme/iptal gibi geri alınamaz işlerde `tehlikeli` verilir; başlık işin adını içermelidir.
 */
export function onayla(baslik: string, mesaj: string, evet: string, tehlikeli = false): Promise<boolean> {
  return new Promise((coz) =>
    Alert.alert(
      baslik,
      mesaj,
      [
        { text: 'Vazgeç', style: 'cancel', onPress: () => coz(false) },
        { text: evet, style: tehlikeli ? 'destructive' : 'default', onPress: () => coz(true) },
      ],
      { cancelable: true, onDismiss: () => coz(false) },
    ),
  );
}

export const stil = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: renk.zemin },
  icerik: { padding: bosluk.l, gap: bosluk.l },
  ustBlok: {
    backgroundColor: renk.anaKoyu,
    paddingHorizontal: bosluk.l,
    paddingBottom: bosluk.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: bosluk.m,
  },
  altCubuk: {
    backgroundColor: renk.kart,
    borderTopWidth: 1,
    borderTopColor: renk.cizgi,
    paddingHorizontal: bosluk.l,
    paddingTop: bosluk.m,
    gap: bosluk.s,
  },
  baslik: { fontFamily: yazi.baslik, fontWeight: '600', fontSize: 28, lineHeight: 32, color: renk.metin, letterSpacing: -0.4 },
  altBaslik: { fontFamily: yazi.baslik, fontWeight: '600', fontSize: 20, lineHeight: 24, color: renk.metin },
  grupBaslik: { fontSize: boyut.ikincil, lineHeight: 20, fontWeight: '600', color: renk.soluk },
  metin: { fontSize: boyut.govde, color: renk.metin, lineHeight: 24 },
  ikincil: { fontSize: boyut.ikincil, lineHeight: 20 },
  meta: { fontSize: boyut.meta, lineHeight: 16 },
  etiket: { fontSize: boyut.ikincil, lineHeight: 20, fontWeight: '600', color: renk.metin },
  kart: {
    backgroundColor: renk.kart,
    borderRadius: 16,
    padding: bosluk.l,
    borderWidth: 1,
    borderColor: renk.cizgi,
    gap: bosluk.s,
  },
  grup: { backgroundColor: renk.kart, borderRadius: 16, borderWidth: 1, borderColor: renk.cizgi, overflow: 'hidden' },
  grupSatiri: { flexDirection: 'row', alignItems: 'center', gap: bosluk.m, paddingHorizontal: bosluk.l, paddingVertical: bosluk.m, minHeight: 56 },
  ayirici: { height: 1, backgroundColor: renk.cizgi, marginLeft: bosluk.l },
  vurguCizgisi: { position: 'absolute', left: 0, top: bosluk.m, bottom: bosluk.m, width: 4, borderRadius: 2, backgroundColor: renk.ana },
  simgeKutusu: { width: 40, height: 40, borderRadius: 12, backgroundColor: renk.anaAcik, alignItems: 'center', justifyContent: 'center' },
  dugme: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: bosluk.l },
  dugmeYazi: { fontSize: boyut.govde, fontWeight: '600' },
  girdi: {
    backgroundColor: renk.kart,
    borderWidth: 1,
    borderColor: '#C9D5D2',
    borderRadius: 12,
    paddingHorizontal: bosluk.l,
    paddingVertical: bosluk.m,
    minHeight: 48,
    fontSize: boyut.govde,
    color: renk.metin,
  },
  cipler: { flexDirection: 'row', flexWrap: 'wrap', gap: bosluk.s },
  cip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.xs,
    paddingHorizontal: bosluk.l,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: renk.cizgi,
    backgroundColor: renk.kart,
  },
  cipYazi: { fontSize: boyut.ikincil, color: renk.metin, fontWeight: '500' },
  radyo: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: renk.silik, alignItems: 'center', justifyContent: 'center' },
  radyoIc: { width: 12, height: 12, borderRadius: 6, backgroundColor: renk.ana },
  satir: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: bosluk.xs, gap: bosluk.m },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.xs,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: bosluk.s,
    paddingVertical: bosluk.xs,
  },
  sekmeZemin: { backgroundColor: renk.kart, borderBottomWidth: 1, borderBottomColor: renk.cizgi },
  sekme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.s,
    paddingHorizontal: bosluk.m,
    minHeight: 48,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sekmeSayi: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: bosluk.xs, backgroundColor: renk.ana, alignItems: 'center', justifyContent: 'center' },
});
