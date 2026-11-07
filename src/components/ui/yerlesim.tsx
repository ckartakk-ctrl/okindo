// Ekran iskeleti: kaydırma, alt çubuk, başlıklar
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { bosluk, renk, stil } from './tema';

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
