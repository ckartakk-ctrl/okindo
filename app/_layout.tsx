import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { renk, Yukleniyor } from '@/components/ui';
import { OturumSaglayici, useOturum } from '@/lib/oturum';

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
  return (
    <SafeAreaProvider>
      <OturumSaglayici>
        <StatusBar style="dark" />
        <Yonlendirici />
      </OturumSaglayici>
    </SafeAreaProvider>
  );
}
