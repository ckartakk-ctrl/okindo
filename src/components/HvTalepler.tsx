import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import {
  Ayirici,
  BilgiSatiri,
  Bos,
  bosluk,
  Dugme,
  Ekran,
  Kart,
  Metin,
  renk,
  Rozet,
  Satir,
  Tutar,
  UstBlok,
  yazi,
} from '@/components/ui';
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

  const basitUst = (baslik: string) => (
    <UstBlok>
      <Text style={{ fontSize: 16, color: '#BFE0D8' }}>Merhaba {profil.ad},</Text>
      <Text style={{ fontFamily: yazi.baslik, fontSize: 30, lineHeight: 35, color: '#FFFFFF', letterSpacing: -0.8 }}>{baslik}</Text>
    </UstBlok>
  );

  if (profil.hv_durum === 'basvuru') {
    return (
      <Ekran ust={basitUst('Başvurun elimizde')}>
        <Bos
          simge="hourglass-outline"
          baslik="Başvurunu değerlendiriyoruz"
          metin="Yüz yüze görüşme için seni arayacağız. Onaylanınca komşularından iş almaya başlarsın."
        />
      </Ekran>
    );
  }
  if (profil.hv_durum !== 'aktif') {
    return (
      <Ekran ust={basitUst('Hesabın beklemede')}>
        <Bos
          simge="pause-circle-outline"
          baslik="Hesabın şu an iş alamıyor"
          metin="Sebebini bildirimlerinde görebilirsin. 7 gün içinde itiraz edebilirsin."
          eylem={
            <Dugme tur="ikincil" simge="notifications-outline" onPress={() => router.push('/bildirimler')}>
              Bildirimlere git
            </Dugme>
          }
        />
      </Ekran>
    );
  }
  if (!profil.egitim_tamam_at) {
    return (
      <Ekran ust={basitUst('Başvurun onaylandı')}>
        <Bos
          simge="school-outline"
          baslik="Son adım: 10 dakikalık eğitim"
          metin="Kısa eğitimi okuyup 5 soruluk testi geçince iş almaya başlarsın."
          eylem={
            <Dugme simge="play" onPress={() => router.push('/egitim')}>
              Eğitime başla
            </Dugme>
          }
        />
      </Ekran>
    );
  }

  const ust = (
    <UstBlok>
      <Text style={{ fontSize: 16, color: '#BFE0D8' }}>Merhaba {profil.ad},</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: yazi.baslik, fontSize: 30, lineHeight: 35, color: '#FFFFFF', letterSpacing: -0.8 }}>
            {profil.musait ? 'Müsaitsin' : 'Şu an kapalısın'}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 19, color: '#BFE0D8' }}>
            {profil.musait ? 'Yakınındaki yeni işler sana bildirilir.' : 'Açınca yakınındaki işleri görürsün.'}
          </Text>
        </View>
        <Switch
          accessibilityLabel="Müsaitlik"
          value={profil.musait}
          trackColor={{ true: renk.damga, false: 'rgba(255,255,255,0.25)' }}
          thumbColor="#FFFFFF"
          style={{ transform: [{ scale: 1.15 }] }}
          onValueChange={async (v) => {
            await rpc('musaitlik_ayarla', { p_musait: v });
            await profilYenile();
          }}
        />
      </View>
    </UstBlok>
  );

  return (
    <Ekran yenile={yukle} ust={ust}>
      {talepler.length === 0 ? (
        <Bos
          simge={profil.musait ? 'radio-outline' : 'moon-outline'}
          baslik={profil.musait ? 'Şu an açık talep yok' : 'Talepleri görmek için müsait ol'}
          metin={profil.musait ? 'Yakınında yeni bir iş açıldığında haber vereceğiz.' : undefined}
        />
      ) : (
        <>
          <Text style={{ fontSize: 13, fontWeight: '600', color: renk.soluk, marginLeft: 4 }}>
            {talepler.length} açık talep
          </Text>
          {talepler.map((t) => (
            <TalepKarti key={t.is_id} talep={t} yenile={yukle} />
          ))}
        </>
      )}
    </Ekran>
  );
}

function TalepKarti({ talep, yenile }: { talep: AcikTalep; yenile: () => Promise<void> }) {
  return (
    <Kart stilEk={talep.sana_ozel ? { borderColor: renk.ana, borderWidth: 2 } : undefined}>
      {talep.sana_ozel || talep.acil ? (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {talep.sana_ozel ? <Rozet>Sana özel</Rozet> : null}
          {talep.acil ? <Rozet tur="uyari">Acil</Rozet> : null}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Text style={{ flex: 1, fontFamily: yazi.kalin, fontSize: 18, lineHeight: 23, color: renk.metin }}>{talep.hizmet}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Tutar boyut={24} renkli={renk.anaKoyu}>
            {tl(talep.net)}
          </Tutar>
          <Text style={{ fontSize: 12, color: renk.soluk }}>eline geçecek</Text>
        </View>
      </View>
      <View style={{ gap: 6, marginTop: 2 }}>
        <BilgiSatiri simge="time-outline">
          {zaman(talep.planlanan_baslangic)}
          {talep.saat ? ` · ${saatMetni(talep.saat)}` : ''}
        </BilgiSatiri>
        {/* K21: kabulden önce yalnız yaklaşık mesafe ve mahalle */}
        <BilgiSatiri simge="location-outline">
          {talep.mahalle}, yaklaşık {String(talep.yaklasik_km).replace('.', ',')} km
        </BilgiSatiri>
      </View>
      {Object.keys(talep.cevaplar ?? {}).length || talep.aciklama ? (
        <View style={{ backgroundColor: renk.zemin, borderRadius: 12, padding: 12, gap: 4 }}>
          {Object.entries(talep.cevaplar ?? {}).map(([k, v]) => {
            const soru = talep.hizmet_sorulari?.find((s) => s.id === k);
            return <Metin key={k} kucuk>{`${soru?.soru ?? k} ${v}`}</Metin>;
          })}
          {talep.aciklama ? <Metin kucuk soluk>“{talep.aciklama}”</Metin> : null}
        </View>
      ) : null}
      <Ayirici />
      <Satir sol="Brüt" sag={tl(talep.brut)} />
      <Satir sol="Vergi kesintisi" sag={`−${tl(talep.stopaj)}`} />
      <View style={{ marginTop: bosluk.s }}>
        <Dugme
          simge="checkmark-circle"
          onPress={async () => {
            await rpc('is_kabul', { p_is: talep.is_id });
            await yenile();
            router.push({ pathname: '/is/[id]', params: { id: talep.is_id } });
          }}
        >
          Kabul et
        </Dugme>
      </View>
    </Kart>
  );
}
