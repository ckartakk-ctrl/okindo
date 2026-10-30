import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { FotoGalerisi } from '@/components/FotoGalerisi';
import { HvKartGorunumu } from '@/components/HvKartGorunumu';
import {
  AltBaslik,
  BilgiSatiri,
  Dugme,
  Ekran,
  Girdi,
  Kart,
  Metin,
  OkDamgasi,
  onayla,
  renk,
  Rozet,
  Satir,
  Secenekler,
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

export default function IsEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { oturum } = useOturum();
  const ben = oturum!.user.id;
  const [veri, setVeri] = useState<Veri | null>(null);
  const [bulunamadi, setBulunamadi] = useState(false);

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
        <Metin>Bu işi görüntüleyemiyorsun.</Metin>
      </Ekran>
    );
  }
  if (!veri) return <Yukleniyor />;

  const { is } = veri;
  const musteriyim = is.musteri_id === ben;
  const hvyim = is.hv_id === ben;
  const eylem = async (ad: string, parametreler: Record<string, unknown>) => {
    await rpc(ad, parametreler);
    await yukle();
  };

  return (
    <Ekran yenile={yukle}>
      <Stack.Screen options={{ title: is.hizmetler?.ad ?? 'İş' }} />
      <Kart stilEk={{ padding: 20, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Rozet tur={['sorun', 'gelmedi', 'iptal'].includes(is.durum) ? 'uyari' : is.durum === 'onaylandi' ? 'damga' : 'ana'}>
            {(hvyim && hvDurumMetni[is.durum]) || durumMetni[is.durum]}
          </Rozet>
          {is.durum === 'onaylandi' ? <OkDamgasi boyut={40} /> : null}
        </View>
        <Text style={{ fontFamily: yazi.baslik, fontSize: 24, lineHeight: 29, color: renk.metin, letterSpacing: -0.5 }}>
          {is.hizmetler?.ad}
        </Text>
        <BilgiSatiri simge="time-outline">
          {zaman(is.planlanan_baslangic)}
          {is.saat ? ` · ${saatMetni(is.saat)}` : ''}
        </BilgiSatiri>
        <DurumAdimlari durum={is.durum} />
        {Object.entries(is.cevaplar ?? {}).map(([k, v]) => {
          const soru = is.hizmetler?.sorular?.find((s) => s.id === k);
          return <Metin key={k} soluk kucuk>{`${soru?.soru ?? k} ${v}`}</Metin>;
        })}
        {is.aciklama ? <Metin kucuk>“{is.aciklama}”</Metin> : null}
        {is.acil ? <Rozet tur="uyari">Acil</Rozet> : null}
      </Kart>

      {/* Karşı taraf */}
      {musteriyim && veri.karsi && 'id' in veri.karsi ? (
        <Kart>
          <HvKartGorunumu kart={veri.karsi} sigortali={['basladi', 'bitti'].includes(is.durum)} />
        </Kart>
      ) : null}
      {hvyim && veri.karsi ? (
        <Kart>
          <Metin soluk kucuk>Müşteri</Metin>
          <Metin kalin>{veri.karsi.ad}</Metin>
          {veri.adres ? (
            <>
              <Metin>{veri.adres.acik_adres}</Metin>
              {veri.adres.notlar ? <Metin renkli={renk.uyari}>Not: {veri.adres.notlar}</Metin> : null}
            </>
          ) : null}
        </Kart>
      ) : null}

      {veri.fotolar.length ? (
        <>
          <AltBaslik>Fotoğraflar</AltBaslik>
          <FotoGalerisi fotolar={veri.fotolar} />
        </>
      ) : null}

      {musteriyim ? <MusteriBolumu veri={veri} eylem={eylem} /> : null}
      {hvyim ? <HvBolumu veri={veri} eylem={eylem} /> : null}

      {['kabul', 'yolda', 'adreste', 'basladi', 'bitti', 'sorun'].includes(is.durum) ? (
        <Mesajlar veri={veri} ben={ben} eylem={eylem} />
      ) : null}

      {['kabul', 'yolda', 'adreste', 'basladi', 'bitti'].includes(is.durum) && (musteriyim || hvyim) ? (
        <Dugme
          tur="tehlike"
          simge="medkit-outline"
          onPress={async () => {
            if (!(await onayla('Acil durum', '112 aranacak ve okindo’ya hemen haber verilecek.', '112’yi ara'))) return;
            rpc('acil_bildir', { p_is: is.id }).catch(() => undefined);
            await Linking.openURL('tel:112');
          }}
        >
          Acil durum: 112’yi ara
        </Dugme>
      ) : null}

      {is.sonuc_notu ? (
        <Kart>
          <Metin soluk kucuk>Not</Metin>
          <Metin>{is.sonuc_notu}</Metin>
        </Kart>
      ) : null}
    </Ekran>
  );
}

// ------------------------------------------------------------
// MÜŞTERİ
// ------------------------------------------------------------
function MusteriBolumu({ veri, eylem }: { veri: Veri; eylem: (ad: string, p: Record<string, unknown>) => Promise<void> }) {
  const { is } = veri;
  const [ekIstek, setEkIstek] = useState('');
  const [sorun, setSorun] = useState('');
  const [sorunAcik, setSorunAcik] = useState(false);

  const iptalEdilebilir = ['odeme_bekliyor', 'acik', 'kabul', 'yolda', 'adreste'].includes(is.durum);
  const gecIptal =
    ['yolda', 'adreste'].includes(is.durum) ||
    (is.durum === 'kabul' && new Date(is.planlanan_baslangic).getTime() - Date.now() < 2 * 3600 * 1000);

  return (
    <>
      {/* K23: kapı kodu */}
      {veri.kod && ['kabul', 'yolda', 'adreste'].includes(is.durum) ? (
        <Kart vurgu="ana">
          <Metin>Kapıyı açınca gelen kişiye bu kodu söyle:</Metin>
          <Text style={{ fontFamily: yazi.baslik, fontSize: 48, letterSpacing: 12, color: renk.anaKoyu, textAlign: 'center', marginVertical: 6 }}>
            {veri.kod}
          </Text>
          <Metin soluk kucuk>Kod girildiğinde iş başlar ve sigorta kapsamı açılır.</Metin>
        </Kart>
      ) : null}

      {is.durum === 'adreste' && is.icerde_sorusu_at ? (
        <Kart vurgu="uyari">
          <Metin kalin>{veri.karsi?.ad} içeride mi?</Metin>
          <Dugme onPress={() => eylem('iceride_onayla', { p_is: is.id })}>Evet, içeride</Dugme>
        </Kart>
      ) : null}

      {is.durum === 'acik' && is.direkt_kod && is.musteriye_soruldu_at && !is.herkese_acildi_at ? (
        <Kart vurgu="uyari">
          <Metin>Seçtiğin kişi henüz kabul etmedi. Bekleyebilir ya da talebi herkese açabilirsin.</Metin>
          <Dugme onPress={() => eylem('herkese_ac', { p_is: is.id })}>Herkese aç</Dugme>
        </Kart>
      ) : null}

      {is.hizmetler?.hazirlik && ['acik', 'kabul', 'yolda'].includes(is.durum) ? (
        <Kart>
          <Metin soluk kucuk>Hazırlık</Metin>
          <Metin>{is.hizmetler.hazirlik}</Metin>
        </Kart>
      ) : null}

      {/* K24: ek iş */}
      {veri.ekler.length ? <AltBaslik>Ek işler</AltBaslik> : null}
      {veri.ekler.map((e) => (
        <Kart key={e.id}>
          <Satir sol={e.aciklama} sag={e.musteri_tutari_kd ? tl(e.musteri_tutari_kd) : '—'} />
          {e.durum === 'onay_bekliyor' && is.durum === 'basladi' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Dugme onPress={() => eylem('ek_is_karar', { p_ek: e.id, p_kabul: true })}>Onayla</Dugme>
              </View>
              <View style={{ flex: 1 }}>
                <Dugme tur="ikincil" onPress={() => eylem('ek_is_karar', { p_ek: e.id, p_kabul: false })}>
                  İstemiyorum
                </Dugme>
              </View>
            </View>
          ) : (
            <Metin soluk kucuk>
              {e.durum === 'fiyat_bekliyor' ? 'Tutar bekleniyor' : e.durum === 'onaylandi' ? 'Onaylandı' : 'Onaylanmadı'}
            </Metin>
          )}
        </Kart>
      ))}
      {is.durum === 'basladi' ? (
        <Kart>
          <Girdi etiket="Ek bir şey mi istiyorsun?" placeholder="Örnek: Banyo musluğu da değişsin" value={ekIstek} onChangeText={setEkIstek} />
          <Dugme
            tur="ikincil"
            pasif={ekIstek.trim().length < 3}
            onPress={async () => {
              await eylem('ek_is_ekle', { p_is: is.id, p_aciklama: ekIstek.trim() });
              setEkIstek('');
            }}
          >
            Ek iş iste
          </Dugme>
          {is.hizmetler?.fiyat_tipi === 'saatli' ? (
            <Dugme tur="ikincil" onPress={() => eylem('sure_uzat', { p_is: is.id })}>
              30 dakika uzat
            </Dugme>
          ) : null}
        </Kart>
      ) : null}

      {/* K8: malzeme masrafı */}
      {veri.masraflar.map((m) => (
        <Kart key={m.id}>
          <Satir sol={`Malzeme: ${m.aciklama}`} sag={tl(m.tutar)} />
          {m.durum === 'onay_bekliyor' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Dugme onPress={() => eylem('masraf_karar', { p_masraf: m.id, p_kabul: true })}>Onayla</Dugme>
              </View>
              <View style={{ flex: 1 }}>
                <Dugme tur="ikincil" onPress={() => eylem('masraf_karar', { p_masraf: m.id, p_kabul: false })}>
                  Reddet
                </Dugme>
              </View>
            </View>
          ) : (
            <Metin soluk kucuk>{m.durum === 'onaylandi' ? 'Onaylandı' : 'Onaylanmadı'}</Metin>
          )}
        </Kart>
      ))}

      {/* K26: onay ya da sorun */}
      {is.durum === 'bitti' ? (
        <Kart vurgu="ana">
          <Metin kalin>Her şey yolunda mı?</Metin>
          <Metin kucuk>24 saat içinde cevap vermezsen iş otomatik onaylanır.</Metin>
          <Dugme onPress={() => eylem('isi_onayla', { p_is: is.id })}>Onaylıyorum</Dugme>
          {!sorunAcik ? (
            <Dugme tur="ikincil" onPress={() => setSorunAcik(true)}>
              Sorun var
            </Dugme>
          ) : (
            <>
              <Girdi etiket="Ne oldu?" value={sorun} onChangeText={setSorun} multiline placeholder="Kısaca anlat" />
              <Dugme tur="tehlike" pasif={sorun.trim().length < 5} onPress={() => eylem('sorun_bildir', { p_is: is.id, p_aciklama: sorun.trim() })}>
                Sorunu bildir
              </Dugme>
              <Metin soluk kucuk>Ödeme inceleme bitene kadar bekler. En geç 48 saat içinde yazılı karar veririz.</Metin>
            </>
          )}
        </Kart>
      ) : null}

      {is.durum === 'onaylandi' && !veri.puanVerdim ? <MusteriPuani veri={veri} eylem={eylem} /> : null}
      {is.durum === 'onaylandi' ? <Bahsis isId={is.id} eylem={eylem} /> : null}

      {is.durum === 'onaylandi' ? (
        <Dugme tur="ikincil" onPress={() => router.push({ pathname: '/hizmet/[id]', params: { id: is.hizmet_id } })}>
          Aynı işi tekrar yaptır
        </Dugme>
      ) : null}
      {is.durum === 'gelmedi' ? (
        <Dugme onPress={() => router.push({ pathname: '/hizmet/[id]', params: { id: is.hizmet_id } })}>Yeniden talep aç</Dugme>
      ) : null}

      <AltBaslik>Ödeme</AltBaslik>
      <Kart>
        <Satir sol="Toplam (KDV dahil)" sag={tl(is.musteri_toplam_kd)} kalin />
        {is.indirim_kd > 0 ? <Satir sol="İndirim" sag={`−${tl(is.indirim_kd)}`} /> : null}
        <Metin soluk kucuk>Tutar kartında bloke; iş bitip sen onaylayana kadar çekilmez.</Metin>
      </Kart>

      {iptalEdilebilir ? (
        <Dugme
          tur="ikincil"
          onPress={async () => {
            const tamam = await onayla(
              'Talebi iptal et',
              gecIptal
                ? is.durum === 'kabul'
                  ? 'İşe 2 saatten az kaldı; geç iptal ücreti alınır.'
                  : 'Gelen kişi yola çıktı; çıkış ücreti alınır.'
                : 'İptal ücretsiz. Kartındaki bloke kalkar.',
              'İptal et',
            );
            if (tamam) await eylem('is_iptal', { p_is: is.id });
          }}
        >
          {is.seri_id ? 'Bu seansı atla' : 'Talebi iptal et'}
        </Dugme>
      ) : null}
    </>
  );
}

function MusteriPuani({ veri, eylem }: { veri: Veri; eylem: (ad: string, p: Record<string, unknown>) => Promise<void> }) {
  const [puan, setPuan] = useState<string | null>(null);
  const [yorum, setYorum] = useState('');
  const [anket, setAnket] = useState<Record<string, string>>({});
  const karsi = veri.karsi as HvKarti | null;
  const caylak = (karsi?.is_sayisi ?? 0) <= 3; // K39: ilk 3 iş anketi
  const anketSorulari = [
    { id: 'zamaninda', soru: 'Zamanında geldi mi?' },
    { id: 'duzgun', soru: 'İş düzgün mü?' },
    { id: 'davranis', soru: 'Evinde iyi davrandı mı?' },
  ];
  const anketTamam = !caylak || anketSorulari.every((s) => anket[s.id]);
  return (
    <Kart>
      <Metin kalin>{karsi?.ad} nasıldı?</Metin>
      <Secenekler
        secenekler={['1', '2', '3', '4', '5'].map((p) => ({ deger: p, ad: '★'.repeat(Number(p)) }))}
        secili={puan}
        sec={setPuan}
      />
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
      <Girdi etiket="Yorumun (isteğe bağlı)" value={yorum} onChangeText={setYorum} multiline />
      <Metin soluk kucuk>Yorumun, kim yazdığı anlaşılmayacak şekilde toplu gösterilir.</Metin>
      <Dugme
        pasif={!puan || !anketTamam}
        onPress={() =>
          eylem('puan_ver', {
            p_is: veri.is.id,
            p_puan: Number(puan),
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

function Bahsis({ isId, eylem }: { isId: string; eylem: (ad: string, p: Record<string, unknown>) => Promise<void> }) {
  const [gonderildi, setGonderildi] = useState(false);
  if (gonderildi) return <Metin soluk>Bahşişin gönderildi. Teşekkürler!</Metin>;
  return (
    <Kart>
      <Metin>Bahşiş bırakmak ister misin? Tamamı gelen kişiye gider.</Metin>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[25, 50, 100].map((t) => (
          <View key={t} style={{ flex: 1 }}>
            <Dugme
              tur="ikincil"
              onPress={async () => {
                if (await onayla('Bahşiş', `${tl(t)} bahşiş gönderilsin mi?`, 'Gönder')) {
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
      <Metin soluk kucuk>Bahşiş faturaya dahil değildir.</Metin>
    </Kart>
  );
}

// ------------------------------------------------------------
// HİZMET VEREN
// ------------------------------------------------------------
function HvBolumu({ veri, eylem }: { veri: Veri; eylem: (ad: string, p: Record<string, unknown>) => Promise<void> }) {
  const { is } = veri;
  const [kod, setKod] = useState('');
  const [ekAciklama, setEkAciklama] = useState('');
  const [ekTutar, setEkTutar] = useState('');
  const [fiyatlar, setFiyatlar] = useState<Record<string, string>>({});
  const [masrafAciklama, setMasrafAciklama] = useState('');
  const [masrafTutar, setMasrafTutar] = useState('');
  const [yapilamadiAcik, setYapilamadiAcik] = useState(false);
  const [yapilamadiNot, setYapilamadiNot] = useState('');

  const fotoVar = (tur: string) => veri.fotolar.some((f) => f.tur === tur);
  const fotoCek = async (tur: string) => {
    const yol = await fotoCekVeYukle(is.id, tur);
    if (yol) await eylem('foto_kaydet', { p_is: is.id, p_tur: tur, p_yol: yol });
  };
  const bekleme = is.adreste_at ? Math.max(0, 10 - Math.floor((Date.now() - new Date(is.adreste_at).getTime()) / 60000)) : 10;
  const tutar = (s: string) => Number(s.replace(',', '.'));

  return (
    <>
      <Kart>
        <Satir sol="Bu işten brüt kazancın" sag={tl(is.hv_tutari_kh + is.yol_kh)} />
        <Metin soluk kucuk>Onaylanan ek işler ve malzeme ayrıca eklenir. Vergi kesintisi ödemede yapılır.</Metin>
      </Kart>

      {is.durum === 'kabul' ? <Dugme onPress={() => eylem('yola_ciktim', { p_is: is.id })}>Yola çıktım</Dugme> : null}

      {['kabul', 'yolda'].includes(is.durum) ? (
        <Dugme
          tur={is.durum === 'yolda' ? 'ana' : 'ikincil'}
          onPress={async () => {
            const izin = await Location.requestForegroundPermissionsAsync();
            if (!izin.granted) throw new Error('"Adresteyim" için konum izni gerekli. Bu kayıt seni "gelmedi" sayılmaktan korur.');
            const k = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            await eylem('adresteyim', { p_is: is.id, p_enlem: k.coords.latitude, p_boylam: k.coords.longitude });
          }}
        >
          Adresteyim
        </Dugme>
      ) : null}

      {is.durum === 'adreste' ? (
        <Kart vurgu="ana">
          <Metin kalin>Kapı kodunu müşterinden iste ve gir</Metin>
          <Girdi etiket="Kapı kodu" keyboardType="number-pad" maxLength={4} value={kod} onChangeText={setKod} />
          <Dugme pasif={kod.length !== 4} onPress={() => eylem('kapi_kodu_gir', { p_is: is.id, p_kod: kod })}>
            İşe başla
          </Dugme>
          <Metin soluk kucuk>Kod girilmeden iş başlamış sayılmaz ve sigorta kapsamı açılmaz.</Metin>
        </Kart>
      ) : null}

      {is.durum === 'adreste' ? (
        <Kart>
          <Metin kalin>Müşteriye ulaşamıyor musun?</Metin>
          {bekleme > 0 ? (
            <Metin soluk kucuk>{bekleme} dakika daha beklemelisin. Bu sürede uygulamadan mesaj at.</Metin>
          ) : (
            <Dugme
              tur="ikincil"
              onPress={async () => {
                if (!fotoVar('evde_yok')) await fotoCek('evde_yok');
                await eylem('evde_yok', { p_is: is.id });
              }}
            >
              Kapının fotoğrafını çek ve "evde yok" bildir
            </Dugme>
          )}
        </Kart>
      ) : null}

      {is.durum === 'basladi' ? (
        <>
          <AltBaslik>Fotoğraflar</AltBaslik>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Dugme tur="ikincil" onPress={() => fotoCek('baslangic')}>
                {fotoVar('baslangic') ? 'Başlangıç ✓' : 'Başlangıç fotoğrafı'}
              </Dugme>
            </View>
            <View style={{ flex: 1 }}>
              <Dugme tur="ikincil" onPress={() => fotoCek('bitis')}>
                {fotoVar('bitis') ? 'Bitiş ✓' : 'Bitiş (isteğe bağlı)'}
              </Dugme>
            </View>
          </View>

          <AltBaslik>Ek iş</AltBaslik>
          {veri.ekler.map((e) => (
            <Kart key={e.id}>
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
                    pasif={!(tutar(fiyatlar[e.id] ?? '') > 0)}
                    onPress={() => eylem('ek_is_fiyatla', { p_ek: e.id, p_hv_tutari: tutar(fiyatlar[e.id] ?? '') })}
                  >
                    Müşteriye gönder
                  </Dugme>
                </>
              ) : (
                <Metin soluk kucuk>
                  {e.durum === 'onay_bekliyor' ? 'Müşteri onayı bekleniyor' : e.durum === 'onaylandi' ? 'Onaylandı — yapabilirsin' : 'Onaylanmadı — yapma'}
                </Metin>
              )}
            </Kart>
          ))}
          <Kart>
            <Girdi etiket="Ek işi anlat" value={ekAciklama} onChangeText={setEkAciklama} placeholder="Örnek: Banyo musluğu contası" />
            <Girdi etiket="Bu iş için kazancın (TL)" keyboardType="decimal-pad" value={ekTutar} onChangeText={setEkTutar} />
            <Dugme
              tur="ikincil"
              pasif={ekAciklama.trim().length < 3 || !(tutar(ekTutar) > 0)}
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
              <Dugme tur="ikincil" onPress={() => eylem('sure_uzat', { p_is: is.id })}>
                30 dakika uzatma iste
              </Dugme>
            ) : null}
          </Kart>
        </>
      ) : null}

      {['basladi', 'bitti'].includes(is.durum) ? (
        <>
          <AltBaslik>Malzeme</AltBaslik>
          {veri.masraflar.map((m) => (
            <Satir key={m.id} sol={`${m.aciklama} (${m.durum === 'onaylandi' ? 'onaylandı' : m.durum === 'reddedildi' ? 'reddedildi' : 'bekliyor'})`} sag={tl(m.tutar)} />
          ))}
          <Kart>
            <Girdi etiket="Ne aldın?" value={masrafAciklama} onChangeText={setMasrafAciklama} />
            <Girdi etiket="Fişteki tutar (TL)" keyboardType="decimal-pad" value={masrafTutar} onChangeText={setMasrafTutar} />
            <Dugme
              tur="ikincil"
              pasif={masrafAciklama.trim().length < 2 || !(tutar(masrafTutar) > 0)}
              onPress={async () => {
                const yol = await fotoCekVeYukle(is.id, 'fis');
                if (!yol) return;
                await eylem('masraf_ekle', {
                  p_is: is.id,
                  p_aciklama: masrafAciklama.trim(),
                  p_tutar: tutar(masrafTutar),
                  p_fis_yolu: yol,
                });
                setMasrafAciklama('');
                setMasrafTutar('');
              }}
            >
              Fişin fotoğrafını çek ve gönder
            </Dugme>
          </Kart>
        </>
      ) : null}

      {is.durum === 'basladi' ? (
        <Dugme
          simge="checkmark-done"
          onPress={async () => {
            if (await onayla('İş bitti mi?', 'Müşteriye işi gösterdin mi? Onaylayınca müşteriye bildirim gider.', 'Bitti')) {
              await eylem('isi_bitir', { p_is: is.id });
            }
          }}
        >
          İş bitti
        </Dugme>
      ) : null}

      {['adreste', 'basladi'].includes(is.durum) ? (
        !yapilamadiAcik ? (
          <Dugme tur="ikincil" onPress={() => setYapilamadiAcik(true)}>
            İş yapılamıyor
          </Dugme>
        ) : (
          <Kart vurgu="uyari">
            <Metin kalin>Neden yapılamıyor?</Metin>
            <Girdi etiket="Kısaca anlat" value={yapilamadiNot} onChangeText={setYapilamadiNot} />
            <Dugme
              tur="ikincil"
              onPress={async () => {
                if (!fotoVar('yapilamadi')) await fotoCek('yapilamadi');
                await eylem('yapilamadi', { p_is: is.id, p_sebep: 'musteri', p_aciklama: yapilamadiNot });
              }}
            >
              İş anlatılandan tamamen farklı / müşteri vazgeçti
            </Dugme>
            <Dugme tur="ikincil" onPress={() => eylem('yapilamadi', { p_is: is.id, p_sebep: 'beceri', p_aciklama: yapilamadiNot })}>
              Bu iş benim becerimi aşıyor
            </Dugme>
            <Dugme tur="ikincil" onPress={() => eylem('yapilamadi', { p_is: is.id, p_sebep: 'riskli', p_aciklama: yapilamadiNot })}>
              Riskli, emin değilim
            </Dugme>
            <Metin soluk kucuk>“Emin değilsen yapma.” Riskli bulduğun işi bırakman cezalandırılmaz.</Metin>
          </Kart>
        )
      ) : null}

      {is.durum === 'bitti' ? (
        <Kart>
          <Metin>Müşteri onayı bekleniyor. Yeni iş alabilirsin.</Metin>
          <Metin soluk kucuk>Hazır cümle: “Uygulamadan onaylar ve birkaç kelime yazarsanız çok sevinirim, yeni işler alabilmem için çok önemli.”</Metin>
        </Kart>
      ) : null}

      {is.durum === 'onaylandi' && !veri.puanVerdim ? <HvPuani isId={is.id} eylem={eylem} /> : null}

      {['kabul', 'yolda'].includes(is.durum) ? (
        <Dugme
          tur="ikincil"
          onPress={async () => {
            const gec = new Date(is.planlanan_baslangic).getTime() - Date.now() < 2 * 3600 * 1000;
            const tamam = await onayla(
              'İşi bırak',
              gec ? 'İşe 2 saatten az kaldı. Güvenilirlik puanın düşer ve müşteriye özür kuponu verilir.' : 'İş başka birine açılacak.',
              'Bırak',
            );
            if (tamam) {
              await rpc('is_iptal', { p_is: is.id });
              router.back();
            }
          }}
        >
          Gelemiyorum, işi bırak
        </Dugme>
      ) : null}
    </>
  );
}

function HvPuani({ isId, eylem }: { isId: string; eylem: (ad: string, p: Record<string, unknown>) => Promise<void> }) {
  const [puan, setPuan] = useState<string | null>(null);
  const [numara, setNumara] = useState<string | null>(null);
  return (
    <Kart>
      <Metin kalin>Müşterini puanla</Metin>
      <Secenekler
        secenekler={['1', '2', '3', '4', '5'].map((p) => ({ deger: p, ad: '★'.repeat(Number(p)) }))}
        secili={puan}
        sec={setPuan}
      />
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
        pasif={!puan || !numara}
        onPress={() => eylem('puan_ver', { p_is: isId, p_puan: Number(puan), p_numara_istedi: numara === 'evet' })}
      >
        Gönder
      </Dugme>
    </Kart>
  );
}

// ------------------------------------------------------------
// MESAJLAR (K44)
// ------------------------------------------------------------
function Mesajlar({ veri, ben, eylem }: { veri: Veri; ben: string; eylem: (ad: string, p: Record<string, unknown>) => Promise<void> }) {
  const [metin, setMetin] = useState('');
  return (
    <>
      <AltBaslik>Mesajlar</AltBaslik>
      {veri.mesajlar.map((m) => (
        <View
          key={m.id}
          style={{
            alignSelf: m.gonderen_id === ben ? 'flex-end' : 'flex-start',
            backgroundColor: m.gonderen_id === ben ? renk.anaAcik : renk.kart,
            borderRadius: 12,
            padding: 10,
            maxWidth: '85%',
            borderWidth: 1,
            borderColor: renk.cizgi,
          }}
        >
          <Metin>{m.metin}</Metin>
        </View>
      ))}
      <Girdi etiket="Mesaj yaz" value={metin} onChangeText={setMetin} multiline />
      <Dugme
        tur="ikincil"
        pasif={!metin.trim()}
        onPress={async () => {
          await eylem('mesaj_gonder', { p_is: veri.is.id, p_metin: metin.trim() });
          setMetin('');
        }}
      >
        Gönder
      </Dugme>
      <Metin soluk kucuk>Güvenliğin için telefon, IBAN ve e-posta mesajlarda gizlenir. okindo senden asla uygulama dışında ödeme istemez.</Metin>
    </>
  );
}

// ------------------------------------------------------------
// İŞİN GİDİŞATI: kabulden onaya kadar sıralı adımlar
// ------------------------------------------------------------
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
    <View style={{ flexDirection: 'row', marginTop: 8 }} accessibilityLabel={`Adım ${sira + 1} / ${adimlar.length}: ${adimlar[sira].ad}`}>
      {adimlar.map((a, i) => {
        const gecti = i < sira || durum === 'onaylandi';
        const simdi = i === sira && durum !== 'onaylandi';
        return (
          <View key={a.durum} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
              <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? 'transparent' : i <= sira ? renk.ana : renk.cizgi }} />
              <View
                style={{
                  width: simdi ? 20 : 14,
                  height: simdi ? 20 : 14,
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
              <View
                style={{ flex: 1, height: 3, backgroundColor: i === adimlar.length - 1 ? 'transparent' : i < sira ? renk.ana : renk.cizgi }}
              />
            </View>
            <Text style={{ fontSize: 11, fontWeight: simdi ? '800' : '600', color: simdi ? renk.metin : gecti ? renk.ana : renk.silik }}>
              {a.ad}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
