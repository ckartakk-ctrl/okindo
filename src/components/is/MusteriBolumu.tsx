// İş ekranı: müşteri tarafı
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HvKartGorunumu } from '@/components/HvKartGorunumu';
import { Yildizlar } from '@/components/Yildizlar';
import { BilgiSatiri, bosluk, Dugme, Girdi, Grup, Kart, Metin, onayla, renk, Rozet, Satir, Secenekler, Simge, stil, yazi } from '@/components/ui';
import { tl } from '@/lib/bicim';
import type { HvKarti } from '@/lib/tipler';
import type { Veri, Eylem } from './ortak';

export function MusteriAnaEylem({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
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

export function MusteriDurum({ veri, eylem }: { veri: Veri; eylem: Eylem }) {
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
