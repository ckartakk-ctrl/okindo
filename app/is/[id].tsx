import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { FotoGalerisi } from '@/components/FotoGalerisi';
import { HvKartGorunumu } from '@/components/HvKartGorunumu';
import { Yildizlar } from '@/components/Yildizlar';
import {
  BilgiSatiri,
  bosluk,
  Bos,
  boyut,
  Dugme,
  Ekran,
  Girdi,
  Grup,
  GrupSatiri,
  Kart,
  Metin,
  OkDamgasi,
  onayla,
  renk,
  Rozet,
  Satir,
  Secenekler,
  Sekmeler,
  Simge,
  stil,
  yazi,
  Yukleniyor,
} from '@/components/ui';
import { durumMetni, hvDurumMetni, saatMetni, tl, zaman } from '@/lib/bicim';
import { fotoCekVeYukle } from '@/lib/foto';
import { useOturum } from '@/lib/oturum';
import { rpc, supabase } from '@/lib/supabase';
import type { EkIs, Foto, HvKarti, Is, IsDurumu, Masraf, Mesaj } from '@/lib/tipler';

type Veri = {
  is: Is;
  kod: string | null;
  adres: { acik_adres: string; notlar: string | null } | null;
  karsi: (HvKarti & { ad: string }) | { ad: string } | null;
  ekler: EkIs[];
  masraflar: Masraf[];
  fotolar: Foto[];
  mesajlar: Mesaj[];
  puanVerdim: boolean;
};

type Eylem = (ad: string, p: Record<string, unknown>) => Promise<void>;
type SekmeAdi = 'durum' | 'mesaj' | 'foto' | 'ayrinti';

const sohbetAcik: IsDurumu[] = ['kabul', 'yolda', 'adreste', 'basladi', 'bitti', 'sorun'];

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

  useEffect(() => {
    yukle();
    const kanal = supabase
      .channel(`is-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'isler', filter: `id=eq.${id}` }, () => yukle())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ek_isler', filter: `is_id=eq.${id}` }, () => yukle())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mesajlar', filter: `is_id=eq.${id}` }, () => yukle())
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

/* ================================================================== */
/*  İŞİN GİDİŞATI                                                      */
/* ================================================================== */
const adimlar: { durum: IsDurumu; ad: string }[] = [
  { durum: 'kabul', ad: 'Kabul' },
  { durum: 'yolda', ad: 'Yolda' },
  { durum: 'adreste', ad: 'Kapıda' },
  { durum: 'basladi', ad: 'Sürüyor' },
  { durum: 'bitti', ad: 'Bitti' },
  { durum: 'onaylandi', ad: 'Onay' },
];

function DurumAdimlari({ durum }: { durum: IsDurumu }) {
  const sira = adimlar.findIndex((a) => a.durum === durum);
  if (sira < 0) return null;
  return (
    <View
      style={{ flexDirection: 'row', marginTop: bosluk.s }}
      accessible
      accessibilityLabel={`Adım ${sira + 1} / ${adimlar.length}: ${adimlar[sira].ad}`}
    >
      {adimlar.map((a, i) => {
        const gecti = i < sira || durum === 'onaylandi';
        const simdi = i === sira && durum !== 'onaylandi';
        return (
          <View key={a.durum} style={{ flex: 1, alignItems: 'center', gap: bosluk.s }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', height: 20 }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? 'transparent' : i <= sira ? renk.ana : renk.cizgi }} />
              <View
                style={{
                  width: simdi ? 20 : 12,
                  height: simdi ? 20 : 12,
                  borderRadius: 10,
                  backgroundColor: gecti ? renk.ana : simdi ? renk.damga : renk.kart,
                  borderWidth: gecti || simdi ? 0 : 2,
                  borderColor: renk.cizgi,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {simdi ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: renk.metin }} /> : null}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === adimlar.length - 1 ? 'transparent' : i < sira ? renk.ana : renk.cizgi }} />
            </View>
            <Text style={{ fontSize: boyut.meta, lineHeight: 16, fontWeight: simdi ? '600' : '400', color: simdi ? renk.metin : gecti ? renk.anaKoyu : renk.silik }}>
              {a.ad}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ================================================================== */
/*  MÜŞTERİ                                                            */
/* ================================================================== */
function MusteriAnaEylem({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
  const { is } = veri;
  if (is.durum === 'bitti') {
    return (
      <Dugme simge="checkmark-circle" onPress={() => eylem('isi_onayla', { p_is: is.id })}>
        İşi onayla
      </Dugme>
    );
  }
  if (is.durum === 'onaylandi' || is.durum === 'gelmedi') {
    return (
      <Dugme tur={is.durum === 'gelmedi' ? 'ana' : 'ikincil'} simge="repeat" onPress={() => router.push({ pathname: '/hizmet/[id]', params: { id: is.hizmet_id } })}>
        {is.durum === 'gelmedi' ? 'Yeniden talep aç' : 'Aynı işi tekrar yaptır'}
      </Dugme>
    );
  }
  return null;
}

function MusteriDurum({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
  const { is } = veri;
  const [ekIstek, setEkIstek] = useState('');
  const [sorun, setSorun] = useState('');
  const [sorunAcik, setSorunAcik] = useState(false);
  const hv = veri.karsi && 'id' in veri.karsi ? (veri.karsi as HvKarti) : null;

  return (
    <>
      {is.durum === 'acik' ? (
        <Kart vurgu="ana">
          <BilgiSatiri simge="search-outline" renkli={renk.anaKoyu}>
            Talebin yakınındaki onaylı kişilere gönderildi. İlk kabul eden gelecek; kabul edilince sana haber veririz.
          </BilgiSatiri>
        </Kart>
      ) : null}

      {/* K23: kapı kodu */}
      {veri.kod && ['kabul', 'yolda', 'adreste'].includes(is.durum) ? (
        <Kart vurgu="damga" stilEk={{ alignItems: 'center', paddingVertical: bosluk.xl }}>
          <Metin ortali>Kapıyı açınca gelen kişiye bu kodu söyle</Metin>
          <Text
            accessibilityLabel={`Kapı kodu ${veri.kod.split('').join(' ')}`}
            style={{ fontFamily: yazi.baslik, fontWeight: '600', fontSize: 48, lineHeight: 56, letterSpacing: 12, color: renk.metin }}
          >
            {veri.kod}
          </Text>
          <Metin soluk kucuk ortali>
            Kod girilince iş başlar ve sigorta kapsamı açılır.
          </Metin>
        </Kart>
      ) : null}

      {is.durum === 'adreste' && is.icerde_sorusu_at ? (
        <Kart vurgu="uyari">
          <Metin kalin>{veri.karsi?.ad} içeride mi?</Metin>
          <Dugme onPress={() => eylem('iceride_onayla', { p_is: is.id })}>İçeride olduğunu onayla</Dugme>
        </Kart>
      ) : null}

      {is.durum === 'acik' && is.direkt_kod && is.musteriye_soruldu_at && !is.herkese_acildi_at ? (
        <Kart vurgu="uyari">
          <Metin>Seçtiğin kişi henüz kabul etmedi. Bekleyebilir ya da talebi herkese açabilirsin.</Metin>
          <Dugme onPress={() => eylem('herkese_ac', { p_is: is.id })}>Talebi herkese aç</Dugme>
        </Kart>
      ) : null}

      {hv ? (
        <Grup baslik="Gelen kişi">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${hv.ad} profilini aç`}
            onPress={() => router.push({ pathname: '/hv/[id]', params: { id: hv.id } })}
            style={({ pressed }) => [{ padding: bosluk.l, flexDirection: 'row', alignItems: 'center', gap: bosluk.s }, pressed && { backgroundColor: '#F2F6F5' }]}
          >
            <View style={{ flex: 1 }}>
              <HvKartGorunumu kart={hv} sigortali={['basladi', 'bitti'].includes(is.durum)} />
            </View>
            <Simge ad="chevron-forward" boyut={20} renkli={renk.silik} />
          </Pressable>
        </Grup>
      ) : null}

      {/* K24: ek iş */}
      {veri.ekler.length ? (
        <Grup baslik="Ek işler">
          {veri.ekler.map((e) => (
            <View key={e.id} style={{ padding: bosluk.l, gap: bosluk.m }}>
              <Satir sol={e.aciklama} sag={e.musteri_tutari_kd ? tl(e.musteri_tutari_kd) : 'Tutar bekleniyor'} />
              {e.durum === 'onay_bekliyor' && is.durum === 'basladi' ? (
                <View style={{ flexDirection: 'row', gap: bosluk.s }}>
                  <View style={{ flex: 1 }}>
                    <Dugme kucuk onPress={() => eylem('ek_is_karar', { p_ek: e.id, p_kabul: true })}>
                      Ek işi onayla
                    </Dugme>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Dugme kucuk tur="ikincil" onPress={() => eylem('ek_is_karar', { p_ek: e.id, p_kabul: false })}>
                      Reddet
                    </Dugme>
                  </View>
                </View>
              ) : (
                <Rozet tur={e.durum === 'onaylandi' ? 'ana' : e.durum === 'reddedildi' ? 'soluk' : 'uyari'}>
                  {e.durum === 'fiyat_bekliyor' ? 'Tutar bekleniyor' : e.durum === 'onaylandi' ? 'Onaylandı' : e.durum === 'reddedildi' ? 'Reddedildi' : 'Onayın bekleniyor'}
                </Rozet>
              )}
            </View>
          ))}
        </Grup>
      ) : null}

      {is.durum === 'basladi' ? (
        <Kart>
          <Girdi etiket="Ek bir şey mi istiyorsun?" placeholder="Örnek: Banyo musluğu da değişsin" value={ekIstek} onChangeText={setEkIstek} />
          <Dugme
            tur="ikincil"
            eksik={ekIstek.trim().length < 3 ? 'Önce ne istediğini birkaç kelimeyle yaz.' : null}
            onPress={async () => {
              await eylem('ek_is_ekle', { p_is: is.id, p_aciklama: ekIstek.trim() });
              setEkIstek('');
            }}
          >
            Ek iş iste
          </Dugme>
          {is.hizmetler?.fiyat_tipi === 'saatli' ? (
            <Dugme tur="metin" simge="time-outline" onPress={() => eylem('sure_uzat', { p_is: is.id })}>
              Süreyi 30 dakika uzat
            </Dugme>
          ) : null}
        </Kart>
      ) : null}

      {/* K8: malzeme masrafı */}
      {veri.masraflar.length ? (
        <Grup baslik="Malzeme">
          {veri.masraflar.map((m) => (
            <View key={m.id} style={{ padding: bosluk.l, gap: bosluk.m }}>
              <Satir sol={m.aciklama} sag={tl(m.tutar)} />
              {m.durum === 'onay_bekliyor' ? (
                <View style={{ flexDirection: 'row', gap: bosluk.s }}>
                  <View style={{ flex: 1 }}>
                    <Dugme kucuk onPress={() => eylem('masraf_karar', { p_masraf: m.id, p_kabul: true })}>
                      Masrafı onayla
                    </Dugme>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Dugme kucuk tur="ikincil" onPress={() => eylem('masraf_karar', { p_masraf: m.id, p_kabul: false })}>
                      Reddet
                    </Dugme>
                  </View>
                </View>
              ) : (
                <Rozet tur={m.durum === 'onaylandi' ? 'ana' : 'soluk'}>{m.durum === 'onaylandi' ? 'Onaylandı' : 'Reddedildi'}</Rozet>
              )}
            </View>
          ))}
        </Grup>
      ) : null}

      {/* K26: onay ya da sorun */}
      {is.durum === 'bitti' ? (
        <Kart vurgu="ana">
          <Text style={stil.altBaslik}>Her şey yolunda mı?</Text>
          <Metin>Aşağıdan işi onayla. 24 saat içinde cevap vermezsen iş kendiliğinden onaylanır.</Metin>
          {!sorunAcik ? (
            <Dugme tur="ikincil" simge="alert-circle-outline" onPress={() => setSorunAcik(true)}>
              Sorun bildir
            </Dugme>
          ) : (
            <>
              <Girdi etiket="Ne oldu?" value={sorun} onChangeText={setSorun} multiline ipucu="Ödeme inceleme bitene kadar bekler. En geç 48 saat içinde yazılı karar veririz." />
              <Dugme
                tur="tehlike"
                eksik={sorun.trim().length < 5 ? 'Ne olduğunu birkaç kelimeyle yaz.' : null}
                onPress={() => eylem('sorun_bildir', { p_is: is.id, p_aciklama: sorun.trim() })}
              >
                Sorunu bildir
              </Dugme>
            </>
          )}
        </Kart>
      ) : null}

      {is.durum === 'onaylandi' && !veri.puanVerdim ? <MusteriPuani veri={veri} eylem={eylem} /> : null}
      {is.durum === 'onaylandi' ? <Bahsis isId={is.id} ad={veri.karsi?.ad ?? 'Gelen kişi'} eylem={eylem} /> : null}
    </>
  );
}

function MusteriPuani({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
  const [puan, setPuan] = useState(0);
  const [yorum, setYorum] = useState('');
  const [anket, setAnket] = useState<Record<string, string>>({});
  const karsi = veri.karsi as HvKarti | null;
  const caylak = (karsi?.is_sayisi ?? 0) <= 3; // K39: ilk 3 iş anketi
  const anketSorulari = [
    { id: 'zamaninda', soru: 'Zamanında geldi mi?' },
    { id: 'duzgun', soru: 'İş düzgün mü?' },
    { id: 'davranis', soru: 'Evinde iyi davrandı mı?' },
  ];
  const eksikSoru = caylak ? anketSorulari.find((s) => !anket[s.id]) : undefined;
  return (
    <Kart>
      <Text style={stil.altBaslik}>{karsi?.ad} nasıldı?</Text>
      <Yildizlar deger={puan} sec={setPuan} />
      {caylak
        ? anketSorulari.map((s) => (
            <Secenekler
              key={s.id}
              etiket={s.soru}
              secenekler={[
                { deger: 'evet', ad: 'Evet' },
                { deger: 'hayir', ad: 'Hayır' },
              ]}
              secili={anket[s.id]}
              sec={(d) => setAnket({ ...anket, [s.id]: d })}
            />
          ))
        : null}
      <Girdi etiket="Yorumun" istegeBagli value={yorum} onChangeText={setYorum} multiline ipucu="Kim yazdığı anlaşılmayacak şekilde toplu gösterilir." />
      <Dugme
        eksik={!puan ? 'Önce 1 ile 5 arasında yıldız seç.' : eksikSoru ? `“${eksikSoru.soru}” sorusunu cevapla.` : null}
        onPress={() =>
          eylem('puan_ver', {
            p_is: veri.is.id,
            p_puan: puan,
            p_yorum: yorum,
            p_anket: caylak ? Object.fromEntries(Object.entries(anket).map(([k, v]) => [k, v === 'evet'])) : null,
          })
        }
      >
        Puanı gönder
      </Dugme>
    </Kart>
  );
}

function Bahsis({ isId, ad, eylem }: { isId: string; ad: string; eylem: Eylem }) {
  const [gonderildi, setGonderildi] = useState(false);
  if (gonderildi) {
    return (
      <Kart vurgu="ana">
        <BilgiSatiri simge="heart" renkli={renk.anaKoyu}>
          Bahşişin gönderildi. Teşekkürler!
        </BilgiSatiri>
      </Kart>
    );
  }
  return (
    <Kart>
      <Metin kalin>{ad} için bahşiş bırak</Metin>
      <Metin soluk kucuk>Tamamı gelen kişiye gider. Bahşiş faturaya dahil değildir.</Metin>
      <View style={{ flexDirection: 'row', gap: bosluk.s }}>
        {[25, 50, 100].map((t) => (
          <View key={t} style={{ flex: 1 }}>
            <Dugme
              kucuk
              tur="ikincil"
              onPress={async () => {
                if (await onayla(`${tl(t)} bahşiş`, `${ad} kişisine ${tl(t)} bahşiş gönderilsin mi?`, 'Bahşişi gönder')) {
                  await eylem('bahsis_ver', { p_is: isId, p_tutar: t });
                  setGonderildi(true);
                }
              }}
            >
              {tl(t)}
            </Dugme>
          </View>
        ))}
      </View>
    </Kart>
  );
}

/* ================================================================== */
/*  HİZMET VEREN                                                       */
/* ================================================================== */
function HvAnaEylem({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
  const { is } = veri;
  if (is.durum === 'kabul') {
    return (
      <Dugme simge="walk" onPress={() => eylem('yola_ciktim', { p_is: is.id })}>
        Yola çıktığını bildir
      </Dugme>
    );
  }
  if (is.durum === 'yolda') {
    return (
      <Dugme
        simge="location"
        onPress={async () => {
          const izin = await Location.requestForegroundPermissionsAsync();
          if (!izin.granted) throw new Error('Adrese vardığını kaydetmek için konum izni gerekli. Bu kayıt seni "gelmedi" sayılmaktan korur.');
          const k = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          await eylem('adresteyim', { p_is: is.id, p_enlem: k.coords.latitude, p_boylam: k.coords.longitude });
        }}
      >
        Adrese vardım
      </Dugme>
    );
  }
  if (is.durum === 'basladi') {
    return (
      <Dugme
        simge="checkmark-done"
        onPress={async () => {
          if (await onayla('İşi bitir', 'Müşteriye işi gösterdin mi? Onaylayınca müşteriye bildirim gider.', 'İşi bitir')) {
            await eylem('isi_bitir', { p_is: is.id });
          }
        }}
      >
        İşi bitir
      </Dugme>
    );
  }
  return null;
}

function HvDurum({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
  const { is } = veri;
  const [kod, setKod] = useState('');
  const [ekAciklama, setEkAciklama] = useState('');
  const [ekTutar, setEkTutar] = useState('');
  const [fiyatlar, setFiyatlar] = useState<Record<string, string>>({});
  const [masrafAciklama, setMasrafAciklama] = useState('');
  const [masrafTutar, setMasrafTutar] = useState('');

  const fotoVar = (tur: string) => veri.fotolar.some((f) => f.tur === tur);
  const fotoCek = async (tur: string) => {
    const yol = await fotoCekVeYukle(is.id, tur);
    if (yol) await eylem('foto_kaydet', { p_is: is.id, p_tur: tur, p_yol: yol });
  };
  const bekleme = is.adreste_at ? Math.max(0, 10 - Math.floor((Date.now() - new Date(is.adreste_at).getTime()) / 60000)) : 10;
  const tutar = (s: string) => Number(s.replace(',', '.'));

  return (
    <>
      {veri.karsi ? (
        <Grup baslik="Müşteri">
          <GrupSatiri simge="person-outline" baslik={veri.karsi.ad} alt={veri.adres?.acik_adres} />
          {veri.adres?.notlar ? <GrupSatiri simge="document-text-outline" baslik="Müşterinin notu" alt={veri.adres.notlar} /> : null}
        </Grup>
      ) : null}

      {is.durum === 'adreste' ? (
        <Kart vurgu="ana">
          <Text style={stil.altBaslik}>Kapı kodunu gir</Text>
          <Metin>Müşteriden 4 haneli kodu iste. Kod girilmeden iş başlamış sayılmaz ve sigorta kapsamı açılmaz.</Metin>
          <Girdi etiket="Kapı kodu" keyboardType="number-pad" maxLength={4} value={kod} onChangeText={setKod} style={{ fontSize: 24, letterSpacing: 8, fontWeight: '600' }} />
          <Dugme eksik={kod.length !== 4 ? 'Kod 4 haneli olmalı.' : null} onPress={() => eylem('kapi_kodu_gir', { p_is: is.id, p_kod: kod })}>
            İşe başla
          </Dugme>
        </Kart>
      ) : null}

      {is.durum === 'adreste' ? (
        <Kart>
          <Metin kalin>Müşteriye ulaşamıyor musun?</Metin>
          {bekleme > 0 ? (
            <Metin soluk kucuk>{bekleme} dakika daha bekle. Bu sürede Mesajlar sekmesinden yaz.</Metin>
          ) : (
            <Dugme
              tur="ikincil"
              simge="camera-outline"
              onPress={async () => {
                if (!fotoVar('evde_yok')) await fotoCek('evde_yok');
                await eylem('evde_yok', { p_is: is.id });
              }}
            >
              Kapıyı fotoğrafla, evde yok bildir
            </Dugme>
          )}
        </Kart>
      ) : null}

      {is.durum === 'basladi' ? (
        <Grup baslik="Ek iş">
          {veri.ekler.map((e) => (
            <View key={e.id} style={{ padding: bosluk.l, gap: bosluk.m }}>
              <Satir sol={e.aciklama} sag={e.hv_tutari_kh ? tl(e.hv_tutari_kh) : '—'} />
              {e.durum === 'fiyat_bekliyor' ? (
                <>
                  <Girdi
                    etiket="Bu iş için kazancın (TL)"
                    keyboardType="decimal-pad"
                    value={fiyatlar[e.id] ?? ''}
                    onChangeText={(t) => setFiyatlar({ ...fiyatlar, [e.id]: t })}
                  />
                  <Dugme
                    kucuk
                    eksik={!(tutar(fiyatlar[e.id] ?? '') > 0) ? 'Önce tutarı yaz.' : null}
                    onPress={() => eylem('ek_is_fiyatla', { p_ek: e.id, p_hv_tutari: tutar(fiyatlar[e.id] ?? '') })}
                  >
                    Tutarı müşteriye gönder
                  </Dugme>
                </>
              ) : (
                <Rozet tur={e.durum === 'onaylandi' ? 'ana' : e.durum === 'reddedildi' ? 'soluk' : 'uyari'}>
                  {e.durum === 'onay_bekliyor' ? 'Müşteri onayı bekleniyor' : e.durum === 'onaylandi' ? 'Onaylandı, yapabilirsin' : 'Onaylanmadı, yapma'}
                </Rozet>
              )}
            </View>
          ))}
          <View style={{ padding: bosluk.l, gap: bosluk.m }}>
            <Girdi etiket="Ek işi anlat" value={ekAciklama} onChangeText={setEkAciklama} placeholder="Örnek: Banyo musluğu contası" />
            <Girdi etiket="Bu iş için kazancın (TL)" keyboardType="decimal-pad" value={ekTutar} onChangeText={setEkTutar} placeholder="150" />
            <Dugme
              tur="ikincil"
              eksik={ekAciklama.trim().length < 3 ? 'Ek işi birkaç kelimeyle anlat.' : !(tutar(ekTutar) > 0) ? 'Kazancını yaz.' : null}
              onPress={async () => {
                await eylem('ek_is_ekle', { p_is: is.id, p_aciklama: ekAciklama.trim(), p_hv_tutari: tutar(ekTutar) });
                setEkAciklama('');
                setEkTutar('');
              }}
            >
              Müşterinin onayına gönder
            </Dugme>
            <Metin soluk kucuk>Müşteri onaylamadan ek işi yapma; onaylanmayan iş ödenmez.</Metin>
            {is.hizmetler?.fiyat_tipi === 'saatli' ? (
              <Dugme tur="metin" simge="time-outline" onPress={() => eylem('sure_uzat', { p_is: is.id })}>
                30 dakika uzatma iste
              </Dugme>
            ) : null}
          </View>
        </Grup>
      ) : null}

      {['basladi', 'bitti'].includes(is.durum) ? (
        <Grup baslik="Malzeme">
          {veri.masraflar.map((m) => (
            <GrupSatiri
              key={m.id}
              simge="receipt-outline"
              baslik={m.aciklama}
              alt={m.durum === 'onaylandi' ? 'Onaylandı' : m.durum === 'reddedildi' ? 'Reddedildi' : 'Müşteri onayı bekleniyor'}
              sag={tl(m.tutar)}
            />
          ))}
          <View style={{ padding: bosluk.l, gap: bosluk.m }}>
            <Girdi etiket="Ne aldın?" value={masrafAciklama} onChangeText={setMasrafAciklama} placeholder="Örnek: Conta, silikon" />
            <Girdi etiket="Fişteki tutar (TL)" keyboardType="decimal-pad" value={masrafTutar} onChangeText={setMasrafTutar} placeholder="85,50" />
            <Dugme
              tur="ikincil"
              simge="camera-outline"
              eksik={masrafAciklama.trim().length < 2 ? 'Ne aldığını yaz.' : !(tutar(masrafTutar) > 0) ? 'Fişteki tutarı yaz.' : null}
              onPress={async () => {
                const yol = await fotoCekVeYukle(is.id, 'fis');
                if (!yol) return;
                await eylem('masraf_ekle', { p_is: is.id, p_aciklama: masrafAciklama.trim(), p_tutar: tutar(masrafTutar), p_fis_yolu: yol });
                setMasrafAciklama('');
                setMasrafTutar('');
              }}
            >
              Fişi fotoğrafla ve gönder
            </Dugme>
          </View>
        </Grup>
      ) : null}

      {is.durum === 'bitti' ? (
        <Kart vurgu="ana">
          <Metin kalin>Müşteri onayı bekleniyor. Yeni iş alabilirsin.</Metin>
          <Metin kucuk>Hazır cümle: “Uygulamadan onaylar ve birkaç kelime yazarsanız çok sevinirim, yeni işler alabilmem için çok önemli.”</Metin>
        </Kart>
      ) : null}

      {is.durum === 'onaylandi' && !veri.puanVerdim ? <HvPuani isId={is.id} eylem={eylem} /> : null}
      {is.durum === 'onaylandi' && veri.puanVerdim ? (
        <Kart vurgu="damga">
          <View style={{ flexDirection: 'row', gap: bosluk.m, alignItems: 'center' }}>
            <OkDamgasi boyut={40} />
            <Metin>İş tamamlandı. Kazancın Kazancım sekmesinde.</Metin>
          </View>
        </Kart>
      ) : null}
    </>
  );
}

function HvPuani({ isId, eylem }: { isId: string; eylem: Eylem }) {
  const [puan, setPuan] = useState(0);
  const [numara, setNumara] = useState<string | null>(null);
  return (
    <Kart>
      <Text style={stil.altBaslik}>Müşterini puanla</Text>
      <Yildizlar deger={puan} sec={setPuan} />
      {/* K46 */}
      <Secenekler
        etiket="Müşteri numaranı ya da kartvizitini istedi mi?"
        secenekler={[
          { deger: 'hayir', ad: 'Hayır' },
          { deger: 'evet', ad: 'Evet' },
        ]}
        secili={numara}
        sec={setNumara}
      />
      <Metin soluk kucuk>Cevabın gizli kalır ve puanını etkilemez. “Evet” dersen ileride bu müşteriyle bir sorun olursa korunursun.</Metin>
      <Dugme
        eksik={!puan ? 'Önce 1 ile 5 arasında yıldız seç.' : !numara ? 'Numara sorusunu cevapla.' : null}
        onPress={() => eylem('puan_ver', { p_is: isId, p_puan: puan, p_numara_istedi: numara === 'evet' })}
      >
        Puanı gönder
      </Dugme>
    </Kart>
  );
}

/* ================================================================== */
/*  SEKME: MESAJLAR (K44)                                              */
/* ================================================================== */
function Mesajlar({ veri, ben, eylem }: { veri: Veri; ben: string; eylem: Eylem }) {
  const [metin, setMetin] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const acik = sohbetAcik.includes(veri.is.durum);
  const saat = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  async function gonder() {
    if (!metin.trim()) {
      setHata('Göndermek için bir şey yaz.');
      return;
    }
    await eylem('mesaj_gonder', { p_is: veri.is.id, p_metin: metin.trim() });
    setMetin('');
  }

  return (
    <>
      <BilgiSatiri simge="shield-checkmark-outline">
        Güvenliğin için telefon, IBAN ve e-posta mesajlarda gizlenir. okindo senden asla uygulama dışında ödeme istemez.
      </BilgiSatiri>
      {veri.mesajlar.length === 0 ? (
        <Bos
          simge="chatbubbles-outline"
          baslik="Henüz mesaj yok"
          metin={acik ? 'Kapı, otopark ya da malzeme gibi konuları buradan konuşabilirsiniz.' : 'Bu iş için mesajlaşma kapandı.'}
        />
      ) : (
        <View style={{ gap: bosluk.s }}>
          {veri.mesajlar.map((m) => {
            const benim = m.gonderen_id === ben;
            return (
              <View
                key={m.id}
                style={{
                  alignSelf: benim ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: benim ? renk.ana : renk.kart,
                  borderRadius: 16,
                  borderBottomRightRadius: benim ? 4 : 16,
                  borderBottomLeftRadius: benim ? 16 : 4,
                  borderWidth: benim ? 0 : 1,
                  borderColor: renk.cizgi,
                  paddingHorizontal: bosluk.m,
                  paddingVertical: bosluk.s,
                  gap: bosluk.xs,
                }}
              >
                <Text style={[stil.metin, { color: benim ? '#FFFFFF' : renk.metin }]}>{m.metin}</Text>
                <Text style={[stil.meta, { color: benim ? '#CFE9E2' : renk.silik, alignSelf: 'flex-end' }]}>{saat(m.olusturma_at)}</Text>
              </View>
            );
          })}
        </View>
      )}
      {acik ? (
        <View style={{ gap: bosluk.s }}>
          <Text style={stil.etiket}>Mesaj yaz</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: bosluk.s }}>
            <TextInput
              accessibilityLabel="Mesaj yaz"
              value={metin}
              onChangeText={(t) => {
                setMetin(t);
                if (hata) setHata(null);
              }}
              multiline
              placeholder="Örnek: 5 dakikaya oradayım"
              placeholderTextColor={renk.silik}
              style={[stil.girdi, { flex: 1, maxHeight: 120 }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mesajı gönder"
              onPress={() => gonder().catch((e: Error) => setHata(e.message))}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: renk.ana,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Simge ad="send" boyut={20} renkli="#FFFFFF" />
            </Pressable>
          </View>
          {hata ? <Text style={[stil.ikincil, { color: renk.uyari }]}>{hata}</Text> : null}
        </View>
      ) : null}
    </>
  );
}

/* ================================================================== */
/*  SEKME: FOTOĞRAFLAR                                                 */
/* ================================================================== */
function Fotograflar({ veri, hvyim, eylem }: { veri: Veri; hvyim: boolean; eylem: Eylem }) {
  const { is } = veri;
  const fotoVar = (tur: string) => veri.fotolar.some((f) => f.tur === tur);
  const fotoCek = async (tur: string) => {
    const yol = await fotoCekVeYukle(is.id, tur);
    if (yol) await eylem('foto_kaydet', { p_is: is.id, p_tur: tur, p_yol: yol });
  };
  return (
    <>
      {veri.fotolar.length ? (
        <FotoGalerisi fotolar={veri.fotolar} />
      ) : (
        <Bos
          simge="images-outline"
          baslik="Henüz fotoğraf yok"
          metin={hvyim ? 'Başlangıç ve bitiş fotoğrafı, bir anlaşmazlıkta seni korur.' : 'Gelen kişinin çektiği başlangıç ve bitiş fotoğrafları burada görünür.'}
          eylem={
            hvyim && is.durum === 'basladi' ? (
              <Dugme simge="camera-outline" onPress={() => fotoCek(fotoVar('baslangic') ? 'bitis' : 'baslangic')}>
                {fotoVar('baslangic') ? 'Bitiş fotoğrafı ekle' : 'Başlangıç fotoğrafı ekle'}
              </Dugme>
            ) : undefined
          }
        />
      )}
      {hvyim && is.durum === 'basladi' && veri.fotolar.length ? (
        <View style={{ flexDirection: 'row', gap: bosluk.s }}>
          <View style={{ flex: 1 }}>
            <Dugme kucuk tur="ikincil" simge={fotoVar('baslangic') ? 'checkmark' : 'camera-outline'} onPress={() => fotoCek('baslangic')}>
              Başlangıç
            </Dugme>
          </View>
          <View style={{ flex: 1 }}>
            <Dugme kucuk tur="ikincil" simge={fotoVar('bitis') ? 'checkmark' : 'camera-outline'} onPress={() => fotoCek('bitis')}>
              Bitiş
            </Dugme>
          </View>
        </View>
      ) : null}
    </>
  );
}

/* ================================================================== */
/*  SEKME: AYRINTILAR                                                  */
/* ================================================================== */
function Ayrintilar({ veri, musteriyim, hvyim, eylem }: { veri: Veri; musteriyim: boolean; hvyim: boolean; eylem: Eylem }) {
  const { is } = veri;
  const [yapilamadiAcik, setYapilamadiAcik] = useState(false);
  const [yapilamadiNot, setYapilamadiNot] = useState('');
  const cevaplar = Object.entries(is.cevaplar ?? {});
  const iptalEdilebilir = musteriyim && ['odeme_bekliyor', 'acik', 'kabul', 'yolda', 'adreste'].includes(is.durum);
  const gecIptal =
    ['yolda', 'adreste'].includes(is.durum) ||
    (is.durum === 'kabul' && new Date(is.planlanan_baslangic).getTime() - Date.now() < 2 * 3600 * 1000);
  const fotoCek = async (tur: string) => {
    const yol = await fotoCekVeYukle(is.id, tur);
    if (yol) await eylem('foto_kaydet', { p_is: is.id, p_tur: tur, p_yol: yol });
  };

  return (
    <>
      {cevaplar.length || is.aciklama ? (
        <Grup baslik="İşin ayrıntıları">
          {cevaplar.map(([k, v]) => {
            const soru = is.hizmetler?.sorular?.find((s) => s.id === k);
            return <GrupSatiri key={k} baslik={v} alt={soru?.soru ?? k} />;
          })}
          {is.aciklama ? <GrupSatiri baslik={is.aciklama} alt="Müşterinin notu" /> : null}
        </Grup>
      ) : null}

      {is.hizmetler?.hazirlik ? (
        <Grup baslik="Hazırlık">
          <GrupSatiri simge="list-outline" baslik={is.hizmetler.hazirlik} />
        </Grup>
      ) : null}

      {musteriyim ? (
        <Kart>
          <Text style={stil.altBaslik}>Ödeme</Text>
          <Satir sol="Hizmet" sag={tl(Number(is.brut_kd) - Number(is.kdv))} />
          <Satir sol="KDV" sag={tl(is.kdv)} />
          {is.indirim_kd > 0 ? <Satir sol="İndirim" sag={`−${tl(is.indirim_kd)}`} solRenk={renk.ana} /> : null}
          <Satir sol="Toplam (KDV dahil)" sag={tl(is.musteri_toplam_kd)} kalin />
          <Metin soluk kucuk>Tutar kartında bloke; iş bitip sen onaylayana kadar çekilmez.</Metin>
        </Kart>
      ) : null}
      {hvyim ? (
        <Kart>
          <Text style={stil.altBaslik}>Kazancın</Text>
          <Satir sol="İş" sag={tl(is.hv_tutari_kh)} />
          {Number(is.yol_kh) > 0 ? <Satir sol="Yol" sag={tl(is.yol_kh)} /> : null}
          <Satir sol="Brüt" sag={tl(Number(is.hv_tutari_kh) + Number(is.yol_kh))} kalin />
          <Metin soluk kucuk>Onaylanan ek işler ve malzeme ayrıca eklenir. Vergi kesintisi ödemede yapılır.</Metin>
        </Kart>
      ) : null}

      {is.sonuc_notu ? (
        <Grup baslik="Not">
          <GrupSatiri simge="information-circle-outline" baslik={is.sonuc_notu} />
        </Grup>
      ) : null}

      {iptalEdilebilir ? (
        <Dugme
          tur="ikincil"
          simge="close-circle-outline"
          onPress={async () => {
            const tamam = await onayla(
              `“${is.hizmetler?.ad}” talebini iptal et`,
              gecIptal
                ? is.durum === 'kabul'
                  ? 'İşe 2 saatten az kaldı; geç iptal ücreti alınır.'
                  : 'Gelen kişi yola çıktı; çıkış ücreti alınır.'
                : 'İptal ücretsiz. Kartındaki bloke kalkar.',
              'Talebi iptal et',
              true,
            );
            if (tamam) await eylem('is_iptal', { p_is: is.id });
          }}
        >
          {is.seri_id ? 'Bu seansı atla' : 'Talebi iptal et'}
        </Dugme>
      ) : null}

      {hvyim && ['adreste', 'basladi'].includes(is.durum) ? (
        !yapilamadiAcik ? (
          <Dugme tur="ikincil" simge="hand-left-outline" onPress={() => setYapilamadiAcik(true)}>
            İşin yapılamadığını bildir
          </Dugme>
        ) : (
          <Kart vurgu="uyari">
            <Text style={stil.altBaslik}>Neden yapılamıyor?</Text>
            <Girdi etiket="Ne oldu?" value={yapilamadiNot} onChangeText={setYapilamadiNot} placeholder="Örnek: Musluk duvar içi tesisata bağlı" />
            <Dugme
              tur="ikincil"
              onPress={async () => {
                if (!veri.fotolar.some((f) => f.tur === 'yapilamadi')) await fotoCek('yapilamadi');
                await eylem('yapilamadi', { p_is: is.id, p_sebep: 'musteri', p_aciklama: yapilamadiNot });
              }}
            >
              İş farklı çıktı ya da müşteri vazgeçti
            </Dugme>
            <Dugme tur="ikincil" onPress={() => eylem('yapilamadi', { p_is: is.id, p_sebep: 'beceri', p_aciklama: yapilamadiNot })}>
              Becerimi aştığını bildir
            </Dugme>
            <Dugme tur="ikincil" onPress={() => eylem('yapilamadi', { p_is: is.id, p_sebep: 'riskli', p_aciklama: yapilamadiNot })}>
              Riskli bulduğumu bildir
            </Dugme>
            <Metin soluk kucuk>“Emin değilsen yapma.” Riskli bulduğun işi bırakman cezalandırılmaz.</Metin>
          </Kart>
        )
      ) : null}

      {hvyim && ['kabul', 'yolda'].includes(is.durum) ? (
        <Dugme
          tur="ikincil"
          simge="exit-outline"
          onPress={async () => {
            const gec = new Date(is.planlanan_baslangic).getTime() - Date.now() < 2 * 3600 * 1000;
            const tamam = await onayla(
              `“${is.hizmetler?.ad}” işini bırak`,
              gec ? 'İşe 2 saatten az kaldı. Güvenilirlik puanın düşer ve müşteriye özür kuponu verilir.' : 'İş başka birine açılacak.',
              'İşi bırak',
              true,
            );
            if (tamam) {
              await rpc('is_iptal', { p_is: is.id });
              router.back();
            }
          }}
        >
          Gelemeyeceğini bildir
        </Dugme>
      ) : null}
    </>
  );
}
