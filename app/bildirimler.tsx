import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Bos, Dugme, Ekran, Grup, GrupSatiri, type SimgeAdi } from '@/components/ui';
import { zaman } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Bildirim } from '@/lib/tipler';

function simgeSec(b: Bildirim): SimgeAdi {
  const t = b.baslik.toLocaleLowerCase('tr-TR');
  if (t.includes('kabul')) return 'person-add-outline';
  if (t.includes('yola')) return 'walk-outline';
  if (t.includes('geldi') || t.includes('kapı')) return 'home-outline';
  if (t.includes('başladı')) return 'construct-outline';
  if (t.includes('yolunda') || t.includes('bitti')) return 'checkmark-done-outline';
  if (t.includes('iptal')) return 'close-circle-outline';
  if (t.includes('onay')) return 'shield-checkmark-outline';
  if (t.includes('talep')) return 'notifications-outline';
  return 'information-circle-outline';
}

/** Gelen kutusu kalıbı: en yeni üstte, okunmamışlar kalın ve solda vurgu çizgisiyle */
export default function Bildirimler() {
  const { oturum } = useOturum();
  const [liste, setListe] = useState<Bildirim[] | null>(null);

  const yukle = useCallback(async () => {
    const { data } = await supabase.from('bildirimler').select('*').order('olusturma_at', { ascending: false }).limit(100);
    setListe((data as Bildirim[]) ?? []);
    await supabase.from('bildirimler').update({ okundu: true }).eq('kullanici_id', oturum!.user.id).eq('okundu', false);
  }, [oturum]);

  useFocusEffect(
    useCallback(() => {
      yukle();
    }, [yukle]),
  );

  if (liste && !liste.length) {
    return (
      <Ekran yenile={yukle}>
        <Bos
          simge="notifications-outline"
          baslik="Henüz bildirimin yok"
          metin="İşin kabul edildiğinde, gelen kişi yola çıktığında ve iş bittiğinde burada haber veririz."
          eylem={<Dugme onPress={() => router.replace('/')}>Hizmetlere göz at</Dugme>}
        />
      </Ekran>
    );
  }
  return (
    <Ekran yenile={yukle}>
      <Grup>
        {(liste ?? []).map((b) => (
          <GrupSatiri
            key={b.id}
            simge={simgeSec(b)}
            vurgulu={!b.okundu}
            baslik={b.baslik}
            alt={`${b.metin}\n${zaman(b.olusturma_at)}`}
            onPress={b.is_id ? () => router.push({ pathname: '/is/[id]', params: { id: b.is_id! } }) : undefined}
          />
        ))}
      </Grup>
    </Ekran>
  );
}
