// Kart, grup ve liste satırları, boş durum
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { Simge, type SimgeAdi } from './Simge';
import { bosluk, renk, stil } from './tema';

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
