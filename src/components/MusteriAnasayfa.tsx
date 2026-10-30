import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AltBaslik, Baslik, Bos, Ekran, Kart, Metin, renk, stil } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Hizmet, Kategori } from '@/lib/tipler';

/** Türkçe karakterleri sadeleştirerek arama yapar ("musluk" = "MUSLUK", "sifon" = "Sifon") */
function sade(s: string) {
  return s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
}

export function MusteriAnasayfa() {
  const { profil } = useOturum();
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [hizmetler, setHizmetler] = useState<Hizmet[]>([]);
  const [arama, setArama] = useState('');

  const yukle = useCallback(async () => {
    const [k, h] = await Promise.all([
      supabase.from('kategoriler').select('*').eq('pilotta_acik', true).order('sira'),
      supabase.from('hizmetler').select('*').eq('aktif', true).eq('usta_gerekli', false).order('ad'),
    ]);
    setKategoriler((k.data as Kategori[]) ?? []);
    setHizmetler((h.data as Hizmet[]) ?? []);
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const bulunan = useMemo(() => {
    const a = sade(arama.trim());
    if (!a) return null;
    return hizmetler.filter((h) => sade(h.ad).includes(a) || sade(h.aciklama ?? '').includes(a));
  }, [arama, hizmetler]);

  return (
    <Ekran yenile={yukle}>
      <Baslik alt="Fiyatı hemen gör, en yakın güvenilir kişi gelsin.">
        {profil?.ad ? `Merhaba ${profil.ad}, ne yaptıralım?` : 'Ne yaptıralım?'}
      </Baslik>
      <TextInput
        placeholder="İşini yaz: musluk, dolap montajı, temizlik…"
        placeholderTextColor={renk.soluk}
        value={arama}
        onChangeText={setArama}
        style={stil.girdi}
        returnKeyType="search"
      />

      {bulunan ? (
        bulunan.length ? (
          bulunan.map((h) => <HizmetSatiri key={h.id} hizmet={h} />)
        ) : (
          <Bos
            baslik="Bunu henüz bulamadık"
            metin="Listeden en yakın işi seç ya da farklı bir kelimeyle ara. Büyük işler (tadilat, boya) için okindo uygun olmayabilir."
          />
        )
      ) : (
        kategoriler.map((k) => (
          <View key={k.id} style={{ gap: 8 }}>
            <AltBaslik>{k.ad}</AltBaslik>
            {hizmetler
              .filter((h) => h.kategori_id === k.id)
              .map((h) => (
                <HizmetSatiri key={h.id} hizmet={h} />
              ))}
          </View>
        ))
      )}
    </Ekran>
  );
}

function HizmetSatiri({ hizmet }: { hizmet: Hizmet }) {
  return (
    <Kart onPress={() => router.push({ pathname: '/hizmet/[id]', params: { id: hizmet.id } })}>
      <Metin kalin>{hizmet.ad}</Metin>
      {hizmet.aciklama ? <Metin soluk kucuk>{hizmet.aciklama}</Metin> : null}
    </Kart>
  );
}
