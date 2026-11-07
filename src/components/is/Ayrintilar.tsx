// İş ekranı: Ayrıntılar sekmesi
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Dugme, Girdi, Grup, GrupSatiri, Kart, Metin, onayla, renk, Satir, stil } from '@/components/ui';
import { tl } from '@/lib/bicim';
import { fotoCekVeYukle } from '@/lib/foto';
import { rpc } from '@/lib/supabase';
import type { Veri, Eylem } from './ortak';

export function Ayrintilar({ veri, musteriyim, hvyim, eylem }: { veri: Veri; musteriyim: boolean; hvyim: boolean; eylem: Eylem }) {
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
