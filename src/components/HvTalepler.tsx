import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { Bos, Dugme, Ekran, Kart, Metin, renk, Rozet, Satir } from '@/components/ui';
import { saatMetni, tl, zaman } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { rpc, supabase } from '@/lib/supabase';
import type { AcikTalep } from '@/lib/tipler';

export function HvTalepler() {
  const { profil, profilYenile } = useOturum();
  const [talepler, setTalepler] = useState<AcikTalep[]>([]);

  const aktif = profil?.hv_durum === 'aktif' && !!profil.egitim_tamam_at;

  const yukle = useCallback(async () => {
    if (!aktif) return;
    setTalepler(await rpc<AcikTalep[]>('hv_acik_talepler'));
  }, [aktif]);

  useFocusEffect(
    useCallback(() => {
      yukle().catch(() => undefined);
    }, [yukle]),
  );

  // Yeni talep geldiğinde listeyi yenile
  useEffect(() => {
    if (!aktif || !profil) return;
    const kanal = supabase
      .channel('hv-bildirim')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bildirimler', filter: `kullanici_id=eq.${profil.id}` }, () =>
        yukle().catch(() => undefined),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(kanal);
    };
  }, [aktif, profil, yukle]);

  if (!profil) return null;

  if (profil.hv_durum === 'basvuru') {
    return (
      <Ekran>
        <Bos
          baslik="Başvurunu değerlendiriyoruz"
          metin="Yakında sen de komşularına faydalı olmak için okindo’da olacaksın. Yüz yüze görüşme için seni arayacağız."
        />
      </Ekran>
    );
  }
  if (profil.hv_durum !== 'aktif') {
    return (
      <Ekran>
        <Bos baslik="Hesabın şu an iş alamıyor" metin="Bildirimlerinde sebebini görebilirsin. 7 gün içinde itiraz edebilirsin." />
      </Ekran>
    );
  }
  if (!profil.egitim_tamam_at) {
    return (
      <Ekran>
        <Bos
          baslik="Son adım: 10 dakikalık eğitim"
          metin="Eğitimi tamamlayınca iş almaya başlayabilirsin."
          eylem={<Dugme onPress={() => router.push('/egitim')}>Eğitime başla</Dugme>}
        />
      </Ekran>
    );
  }

  return (
    <Ekran yenile={yukle}>
      <Kart vurgu={profil.musait ? 'ana' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Metin kalin>{profil.musait ? 'Müsaitsin' : 'Müsait değilsin'}</Metin>
            <Metin soluk kucuk>{profil.musait ? 'Yakınındaki yeni işler sana bildirilir.' : 'Açınca yakınındaki işleri görürsün.'}</Metin>
          </View>
          <Switch
            value={profil.musait}
            trackColor={{ true: renk.ana, false: renk.cizgi }}
            onValueChange={async (v) => {
              await rpc('musaitlik_ayarla', { p_musait: v });
              await profilYenile();
            }}
          />
        </View>
      </Kart>

      {talepler.length === 0 ? (
        <Bos baslik="Şu an açık talep yok" metin="Yeni bir iş geldiğinde haber vereceğiz." />
      ) : (
        talepler.map((t) => <TalepKarti key={t.is_id} talep={t} yenile={yukle} />)
      )}
    </Ekran>
  );
}

function TalepKarti({ talep, yenile }: { talep: AcikTalep; yenile: () => Promise<void> }) {
  return (
    <Kart vurgu={talep.sana_ozel ? 'ana' : undefined}>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {talep.sana_ozel ? <Rozet>Sana özel</Rozet> : null}
        {talep.acil ? <Rozet tur="uyari">Acil</Rozet> : null}
      </View>
      <Metin kalin>{talep.hizmet}</Metin>
      <Metin soluk>
        {zaman(talep.planlanan_baslangic)}
        {talep.saat ? ` · ${saatMetni(talep.saat)}` : ''}
      </Metin>
      {/* K21: kabulden önce yalnız yaklaşık mesafe ve mahalle */}
      <Metin soluk>
        {talep.mahalle} · yaklaşık {String(talep.yaklasik_km).replace('.', ',')} km
      </Metin>
      {Object.entries(talep.cevaplar ?? {}).map(([k, v]) => {
        const soru = talep.hizmet_sorulari?.find((s) => s.id === k);
        return <Metin key={k} kucuk>{`${soru?.soru ?? k} ${v}`}</Metin>;
      })}
      {talep.aciklama ? <Metin kucuk>“{talep.aciklama}”</Metin> : null}
      <View style={{ height: 1, backgroundColor: renk.cizgi, marginVertical: 4 }} />
      <Satir sol="Brüt" sag={tl(talep.brut)} />
      <Satir sol="Vergi kesintisi" sag={`−${tl(talep.stopaj)}`} />
      <Satir sol="Eline geçecek" sag={tl(talep.net)} kalin />
      <Dugme
        onPress={async () => {
          await rpc('is_kabul', { p_is: talep.is_id });
          await yenile();
          router.push({ pathname: '/is/[id]', params: { id: talep.is_id } });
        }}
      >
        Kabul et
      </Dugme>
    </Kart>
  );
}
