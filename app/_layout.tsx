import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Dugme, renk, stil, Yukleniyor } from '@/components/ui';
import { OturumSaglayici, useOturum } from '@/lib/oturum';
import { ayarHatasi } from '@/lib/supabase';

/** Ekranda hata gösterir; uygulama sessizce kapanmaz. */
function HataEkrani({ baslik, mesaj, tekrar }: { baslik: string; mesaj: string; tekrar?: () => void }) {
  return (
    <SafeAreaView style={stil.ekran}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        <Text style={stil.baslik}>{baslik}</Text>
        <Text style={stil.metin}>Bu ekranın görüntüsünü alıp gönderirsen sorunu hemen düzeltebiliriz.</Text>
        <View style={[stil.kart, { backgroundColor: renk.hataAcik, borderColor: renk.hataAcik }]}>
          <Text selectable style={{ fontSize: 13, color: renk.metin }}>{mesaj}</Text>
        </View>
        {tekrar ? <Dugme onPress={tekrar}>Tekrar dene</Dugme> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** expo-router: ekranlardan birinde hata olursa bu gösterilir */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <HataEkrani baslik="Bir hata oluştu" mesaj={`${error.name}: ${error.message}`} tekrar={retry} />;
}

function Yonlendirici() {
  const { hazir, oturum, profil } = useOturum();
  const bolumler = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hazir) return;
    const ilk = bolumler[0] as string | undefined;
    if (!oturum) {
      if (ilk !== 'giris') router.replace('/giris');
    } else if (profil && (!profil.ad || !profil.mahalle_id)) {
      if (ilk !== 'profil') router.replace('/profil');
    } else if (ilk === 'giris' || ilk === 'profil') {
      router.replace('/');
    }
  }, [hazir, oturum, profil, bolumler, router]);

  if (!hazir) return <Yukleniyor />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: renk.zemin },
        headerShadowVisible: false,
        headerTintColor: renk.metin,
        headerBackTitle: 'Geri',
        contentStyle: { backgroundColor: renk.zemin },
      }}
    >
      <Stack.Screen name="(sekmeler)" options={{ headerShown: false }} />
      <Stack.Screen name="giris" options={{ headerShown: false }} />
      <Stack.Screen name="profil" options={{ title: 'Seni tanıyalım', headerBackVisible: false }} />
      <Stack.Screen name="hizmet/[id]" options={{ title: '' }} />
      <Stack.Screen name="talep" options={{ title: 'Talebi tamamla' }} />
      <Stack.Screen name="adres-ekle" options={{ title: 'Adres ekle', presentation: 'modal' }} />
      <Stack.Screen name="is/[id]" options={{ title: 'İş' }} />
      <Stack.Screen name="hv-basvuru" options={{ title: 'okindo’da iş al' }} />
      <Stack.Screen name="egitim" options={{ title: 'Eğitim' }} />
      <Stack.Screen name="bildirimler" options={{ title: 'Bildirimler' }} />
      <Stack.Screen name="yonetici" options={{ title: 'Yönetici' }} />
    </Stack>
  );
}

export default function KokDuzen() {
  const [sonHata, setSonHata] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem('okindo-son-hata')
      .then((h) => setSonHata(h))
      .catch(() => undefined);
  }, []);

  if (ayarHatasi) {
    return (
      <SafeAreaProvider>
        <HataEkrani baslik="Ayar eksik" mesaj={ayarHatasi} />
      </SafeAreaProvider>
    );
  }
  if (sonHata) {
    return (
      <SafeAreaProvider>
        <HataEkrani
          baslik="Uygulama son açılışta kapandı"
          mesaj={sonHata}
          tekrar={() => {
            AsyncStorage.removeItem('okindo-son-hata').catch(() => undefined);
            setSonHata(null);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <OturumSaglayici>
        <StatusBar style="dark" />
        <Yonlendirici />
      </OturumSaglayici>
    </SafeAreaProvider>
  );
}
