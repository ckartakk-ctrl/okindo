// İş ekranı: hizmet veren (HV) tarafı
import * as Location from 'expo-location';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Yildizlar } from '@/components/Yildizlar';
import { bosluk, Dugme, Girdi, Grup, GrupSatiri, Kart, Metin, OkDamgasi, onayla, Rozet, Satir, Secenekler, stil } from '@/components/ui';
import { tl } from '@/lib/bicim';
import { fotoCekVeYukle } from '@/lib/foto';
import type { Veri, Eylem } from './ortak';

export function HvAnaEylem({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
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

export function HvDurum({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
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
