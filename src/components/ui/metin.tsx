// Metin, tutar, damga, avatar, rozet
import { type ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import { Simge, type SimgeAdi } from './Simge';
import { bosluk, boyut, renk, stil, yazi } from './tema';

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
