import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Bos, Ekran, Kart, Metin } from '@/components/ui';
import { zaman } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Bildirim } from '@/lib/tipler';

export default function Bildirimler() {
  const { oturum } = useOturum();
  const [liste, setListe] = useState<Bildirim[]>([]);

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

  if (!liste.length) {
    return (
      <Ekran>
        <Bos baslik="Bildirimin yok" />
      </Ekran>
    );
  }
  return (
    <Ekran yenile={yukle}>
      {liste.map((b) => (
        <Kart
          key={b.id}
          vurgu={b.okundu ? undefined : 'ana'}
          onPress={b.is_id ? () => router.push({ pathname: '/is/[id]', params: { id: b.is_id! } }) : undefined}
        >
          <Metin kalin>{b.baslik}</Metin>
          <Metin>{b.metin}</Metin>
          <Metin soluk kucuk>{zaman(b.olusturma_at)}</Metin>
        </Kart>
      ))}
    </Ekran>
  );
}
