import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { BilgiSatiri, bosluk, Bos, Dugme, Ekran, Kart, Metin, OkDamgasi, onayla, renk, Rozet, Sekmeler, Simge, stil, Yukleniyor } from '@/components/ui';
import { durumMetni, hvDurumMetni, saatMetni, tl, zaman } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { rpc, supabase } from '@/lib/supabase';
import type { EkIs, Foto, Is, Masraf, Mesaj } from '@/lib/tipler';
import { Ayrintilar } from '@/components/is/Ayrintilar';
import { DurumAdimlari } from '@/components/is/DurumAdimlari';
import { Fotograflar } from '@/components/is/Fotograflar';
import { HvAnaEylem, HvDurum } from '@/components/is/HvBolumu';
import { Mesajlar } from '@/components/is/Mesajlar';
import { MusteriAnaEylem, MusteriDurum } from '@/components/is/MusteriBolumu';
import { sohbetAcik, type Eylem, type Veri } from '@/components/is/ortak';

// İş ekranı: üst bilgi, sekmeler ve canlı güncelleme. Sekmelerin içeriği src/components/is/ altındadır.
type SekmeAdi = 'durum' | 'mesaj' | 'foto' | 'ayrinti';

export default function IsEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { oturum } = useOturum();
  const ben = oturum!.user.id;
  const [veri, setVeri] = useState<Veri | null>(null);
  const [bulunamadi, setBulunamadi] = useState(false);
  const [sekme, setSekme] = useState<SekmeAdi>('durum');

  const yukle = useCallback(async () => {
    const { data: is } = await supabase
      .from('isler')
      .select('*, hizmetler(ad, fiyat_tipi, hazirlik, sorular)')
      .eq('id', id)
      .maybeSingle();
    if (!is) {
      setBulunamadi(true);
      return;
    }
    const [kod, adres, karsi, ekler, masraflar, fotolar, mesajlar, puan] = await Promise.all([
      supabase.from('is_gizli').select('kapi_kodu').eq('is_id', id).maybeSingle(),
      supabase.from('is_adresleri').select('acik_adres, notlar').eq('is_id', id).maybeSingle(),
      rpc<Veri['karsi']>('is_karsi_taraf', { p_is: id }).catch(() => null),
      supabase.from('ek_isler').select('*').eq('is_id', id).order('olusturma_at'),
      supabase.from('masraflar').select('*').eq('is_id', id).order('olusturma_at'),
      supabase.from('is_fotograflari').select('id, tur, yol').eq('is_id', id),
      supabase.from('mesajlar').select('*').eq('is_id', id).order('olusturma_at'),
      supabase.from('puanlar').select('id').eq('is_id', id).eq('veren_id', ben).maybeSingle(),
    ]);
    setVeri({
      is: is as Is,
      kod: (kod.data as { kapi_kodu: string } | null)?.kapi_kodu ?? null,
      adres: (adres.data as Veri['adres']) ?? null,
      karsi,
      ekler: (ekler.data as EkIs[]) ?? [],
      masraflar: (masraflar.data as Masraf[]) ?? [],
      fotolar: (fotolar.data as Foto[]) ?? [],
      mesajlar: (mesajlar.data as Mesaj[]) ?? [],
      puanVerdim: !!puan.data,
    });
  }, [id, ben]);

  // Karşı tarafın değişiklikleri (yola çıktı, mesaj, ek iş, fiş, fotoğraf) sayfa yenilenmeden görünür.
  // Tablolar Supabase Realtime yayınına 0010 numaralı dosyada eklenir; erişim kuralları burada da geçerlidir.
  useEffect(() => {
    yukle();
    const kanal = supabase
      .channel(`is-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'isler', filter: `id=eq.${id}` }, () => yukle())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ek_isler', filter: `is_id=eq.${id}` }, () => yukle())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mesajlar', filter: `is_id=eq.${id}` }, () => yukle())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'masraflar', filter: `is_id=eq.${id}` }, () => yukle())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'is_fotograflari', filter: `is_id=eq.${id}` }, () => yukle())
      .subscribe();
    return () => {
      supabase.removeChannel(kanal);
    };
  }, [id, yukle]);

  if (bulunamadi) {
    return (
      <Ekran>
        <Bos
          simge="lock-closed-outline"
          baslik="Bu iş görüntülenemiyor"
          metin="İş sana ait değil ya da kaldırılmış. İşlerim listesinden devam edebilirsin."
          eylem={<Dugme onPress={() => router.replace('/islerim')}>İşlerime git</Dugme>}
        />
      </Ekran>
    );
  }
  if (!veri) return <Yukleniyor tur="detay" />;

  const { is } = veri;
  const musteriyim = is.musteri_id === ben;
  const hvyim = is.hv_id === ben;
  const eylem: Eylem = async (ad, parametreler) => {
    await rpc(ad, parametreler);
    await yukle();
  };

  const anaEylem = musteriyim ? <MusteriAnaEylem veri={veri} eylem={eylem} /> : hvyim ? <HvAnaEylem veri={veri} eylem={eylem} /> : null;

  const ust = (
    <>
      <View style={{ backgroundColor: renk.kart, paddingHorizontal: bosluk.l, paddingTop: bosluk.l, paddingBottom: bosluk.m, gap: bosluk.s }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: bosluk.s }}>
          <Rozet tur={['sorun', 'gelmedi', 'iptal', 'evde_yok', 'yapilamadi'].includes(is.durum) ? 'uyari' : is.durum === 'onaylandi' ? 'damga' : 'ana'}>
            {(hvyim && hvDurumMetni[is.durum]) || durumMetni[is.durum]}
          </Rozet>
          {is.durum === 'onaylandi' ? <OkDamgasi boyut={40} /> : null}
        </View>
        <Text accessibilityRole="header" style={[stil.baslik, { fontSize: 24, lineHeight: 28 }]}>
          {is.hizmetler?.ad}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: bosluk.l, rowGap: bosluk.xs }}>
          <BilgiSatiri simge="time-outline">
            {zaman(is.planlanan_baslangic)}
            {is.saat ? `, ${saatMetni(is.saat)}` : ''}
          </BilgiSatiri>
          <BilgiSatiri simge="card-outline">{musteriyim ? tl(is.musteri_toplam_kd) : `${tl(is.hv_tutari_kh + is.yol_kh)} brüt`}</BilgiSatiri>
          {is.acil ? <BilgiSatiri simge="flash-outline" renkli={renk.uyari}>Acil</BilgiSatiri> : null}
        </View>
        <DurumAdimlari durum={is.durum} />
      </View>
      <Sekmeler<SekmeAdi>
        secili={sekme}
        sec={setSekme}
        sekmeler={[
          { deger: 'durum', ad: 'Durum' },
          { deger: 'mesaj', ad: 'Mesajlar', sayi: veri.mesajlar.length || undefined },
          { deger: 'foto', ad: 'Fotoğraflar', sayi: veri.fotolar.length || undefined },
          { deger: 'ayrinti', ad: 'Ayrıntılar' },
        ]}
      />
    </>
  );

  return (
    <Ekran yenile={yukle} ust={ust} alt={sekme === 'mesaj' ? undefined : anaEylem}>
      <Stack.Screen options={{ title: '' }} />
      {sekme === 'durum' ? (
        <>
          {musteriyim ? <MusteriDurum veri={veri} eylem={eylem} /> : null}
          {hvyim ? <HvDurum veri={veri} eylem={eylem} /> : null}
          {sohbetAcik.includes(is.durum) && veri.mesajlar.length ? (
            <Kart onPress={() => setSekme('mesaj')} erisimEtiketi="Mesajlara git">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: bosluk.m }}>
                <Simge ad="chatbubbles-outline" boyut={20} renkli={renk.ana} />
                <View style={{ flex: 1 }}>
                  <Metin kalin>Son mesaj</Metin>
                  <Metin soluk kucuk>{veri.mesajlar[veri.mesajlar.length - 1].metin}</Metin>
                </View>
                <Simge ad="chevron-forward" boyut={20} renkli={renk.silik} />
              </View>
            </Kart>
          ) : null}
          {['kabul', 'yolda', 'adreste', 'basladi', 'bitti'].includes(is.durum) && (musteriyim || hvyim) ? (
            <Dugme
              tur="metin"
              simge="medkit-outline"
              onPress={async () => {
                if (!(await onayla('112’yi ara', '112 aranacak ve okindo’ya hemen haber verilecek.', '112’yi ara'))) return;
                rpc('acil_bildir', { p_is: is.id }).catch(() => undefined);
                await Linking.openURL('tel:112');
              }}
            >
              Acil durumda 112’yi ara
            </Dugme>
          ) : null}
        </>
      ) : null}
      {sekme === 'mesaj' ? <Mesajlar veri={veri} ben={ben} eylem={eylem} /> : null}
      {sekme === 'foto' ? <Fotograflar veri={veri} hvyim={hvyim} eylem={eylem} /> : null}
      {sekme === 'ayrinti' ? <Ayrintilar veri={veri} musteriyim={musteriyim} hvyim={hvyim} eylem={eylem} /> : null}
    </Ekran>
  );
}
