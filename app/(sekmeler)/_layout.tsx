import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { renk } from '@/components/ui';
import { useOturum } from '@/lib/oturum';

function Simge({ harf, aktif }: { harf: string; aktif: boolean }) {
  return <Text style={{ fontSize: 18, color: aktif ? renk.ana : renk.soluk }}>{harf}</Text>;
}

export default function SekmeDuzeni() {
  const { mod } = useOturum();
  const hv = mod === 'hv';
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: renk.zemin },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: renk.ana,
        tabBarInactiveTintColor: renk.soluk,
        tabBarStyle: { backgroundColor: renk.kart, borderTopColor: renk.cizgi },
        sceneStyle: { backgroundColor: renk.zemin },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: hv ? 'Talepler' : 'okindo',
          tabBarLabel: hv ? 'Talepler' : 'Hizmetler',
          tabBarIcon: ({ focused }) => <Simge harf={hv ? '◎' : '⌂'} aktif={focused} />,
        }}
      />
      <Tabs.Screen
        name="islerim"
        options={{ title: 'İşlerim', tabBarIcon: ({ focused }) => <Simge harf="☰" aktif={focused} /> }}
      />
      <Tabs.Screen
        name="kazanc"
        options={{
          title: 'Kazancım',
          href: hv ? undefined : null,
          tabBarIcon: ({ focused }) => <Simge harf="₺" aktif={focused} />,
        }}
      />
      <Tabs.Screen
        name="hesap"
        options={{ title: 'Hesabım', tabBarIcon: ({ focused }) => <Simge harf="●" aktif={focused} /> }}
      />
    </Tabs>
  );
}
