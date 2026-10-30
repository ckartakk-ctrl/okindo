import { Tabs } from 'expo-router';
import { renk, Simge, yazi, type SimgeAdi } from '@/components/ui';
import { useOturum } from '@/lib/oturum';

function sekmeSimgesi(dolu: SimgeAdi, bos: SimgeAdi) {
  return ({ focused, color }: { focused: boolean; color: string }) => <Simge ad={focused ? dolu : bos} boyut={23} renkli={color} />;
}

export default function SekmeDuzeni() {
  const { mod } = useOturum();
  const hv = mod === 'hv';
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: renk.zemin },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: yazi.baslik, fontWeight: '600', fontSize: 24, color: renk.metin },
        headerTitleAlign: 'left',
        tabBarActiveTintColor: renk.anaKoyu,
        tabBarInactiveTintColor: renk.silik,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { backgroundColor: renk.kart, borderTopColor: renk.cizgi },
        sceneStyle: { backgroundColor: renk.zemin },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: hv ? 'Talepler' : 'okindo',
          tabBarLabel: hv ? 'Talepler' : 'Hizmetler',
          tabBarIcon: hv ? sekmeSimgesi('notifications', 'notifications-outline') : sekmeSimgesi('home', 'home-outline'),
        }}
      />
      <Tabs.Screen name="islerim" options={{ title: 'İşlerim', tabBarIcon: sekmeSimgesi('calendar', 'calendar-outline') }} />
      <Tabs.Screen
        name="kazanc"
        options={{
          title: 'Kazancım',
          href: hv ? undefined : null,
          tabBarIcon: sekmeSimgesi('wallet', 'wallet-outline'),
        }}
      />
      <Tabs.Screen name="hesap" options={{ title: 'Hesabım', tabBarIcon: sekmeSimgesi('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
