import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { FiyatKarti } from '@/components/FiyatKarti';
import { kategoriSimgesi } from '@/components/MusteriAnasayfa';
import { BilgiSatiri, bosluk, Dugme, Ekran, Girdi, Kart, Metin, renk, Secenekler, Simge, stil, Tutar, Yukleniyor } from '@/components/ui';
import { saatMetni, tl } from '@/lib/bicim';
import { rpc, supabase } from '@/lib/supabase';
import type { FiyatDokumu, Hizmet } from '@/lib/tipler';

const saatSecenekleri = [2, 2.5, 3, 3.5, 4, 5, 6];

/** Form kalıbı: hizmeti tarif et, fiyatı gör, devam et */
export default function HizmetEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hizmet, setHizmet] = useState<(Hizmet & { kategoriler: { ad: string } | null }) | null>(null);
  const [cevaplar, setCevaplar] = useState<Record<string, string>>({});
  const [saat, setSaat] = useState<number>(2);
  const [acil, setAcil] = useState(false);
  const [aciklama, setAciklama] = useState('');
  const [fiyat, setFiyat] = useState<FiyatDokumu | null>(null);
  const [fiyatHatasi, setFiyatHatasi] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('hizmetler')
      .select('*, kategoriler(ad)')
      .eq('id', id)
      .single()
      .then(({ data }) => setHizmet(data as Hizmet & { kategoriler: { ad: string } | null }));
  }, [id]);

  useEffect(() => {
    if (!hizmet) return;
    setFiyatHatasi(null);
    rpc<FiyatDokumu>('fiyat_teklifi', {
      p_hizmet: hizmet.id,
      p_saat: hizmet.fiyat_tipi === 'saatli' ? saat : null,
      p_acil: acil,
    })
      .then(setFiyat)
      .catch((e: Error) => setFiyatHatasi(e.message));
  }, [hizmet, saat, acil]);

  if (!hizmet) return <Yukleniyor tur="form" />;

  const eksikSoru = hizmet.sorular.find((s) => !cevaplar[s.id]);

  const alt = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: bosluk.m }}>
      <View style={{ flex: 1 }}>
        <Text style={[stil.meta, { color: renk.soluk }]}>KDV dahil</Text>
        {fiyat ? (
          <Tutar boyut={24} renkli={renk.anaKoyu}>
            {tl(fiyat.musteri_toplam_kd)}
          </Tutar>
        ) : (
          <Text style={[stil.metin, { color: renk.soluk }]}>Hesaplanıyor</Text>
        )}
      </View>
      <View style={{ flex: 1.3 }}>
        <Dugme
          simge="arrow-forward"
          eksik={fiyatHatasi ? fiyatHatasi : !fiyat ? 'Fiyat hesaplanıyor, bir saniye.' : eksikSoru ? `Önce “${eksikSoru.soru}” sorusunu cevapla.` : null}
          onPress={() =>
            router.push({
              pathname: '/talep',
              params: {
                hizmetId: hizmet.id,
                saat: hizmet.fiyat_tipi === 'saatli' ? String(saat) : '',
                acil: acil ? '1' : '0',
                cevaplar: JSON.stringify(cevaplar),
                aciklama,
              },
            })
          }
        >
          Gün ve adres seç
        </Dugme>
      </View>
    </View>
  );

  return (
    <Ekran alt={alt}>
      <Stack.Screen options={{ title: '' }} />
      <View style={{ gap: bosluk.m }}>
        <View style={[stil.simgeKutusu, { width: 56, height: 56, borderRadius: 16 }]}>
          <Simge ad={kategoriSimgesi(hizmet.kategoriler?.ad ?? '')} boyut={28} renkli={renk.ana} />
        </View>
        <Text accessibilityRole="header" style={stil.baslik}>
          {hizmet.ad}
        </Text>
        {hizmet.aciklama ? <Metin soluk>{hizmet.aciklama}</Metin> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: bosluk.l, rowGap: bosluk.xs }}>
          <BilgiSatiri simge="time-outline">
            {hizmet.fiyat_tipi === 'saatli' ? 'Saatlik ücret' : `Yaklaşık ${Math.round(hizmet.tahmini_dk / 15) * 15} dakika`}
          </BilgiSatiri>
          <BilgiSatiri simge="lock-closed-outline">{hizmet.fiyat_tipi === 'saatli' ? 'Süre onayın olmadan uzamaz' : 'Sabit fiyat'}</BilgiSatiri>
        </View>
      </View>

      <Kart>
        {hizmet.sorular.map((s) => (
          <Secenekler
            key={s.id}
            etiket={s.soru}
            secenekler={s.secenekler.map((c) => ({ deger: c, ad: c }))}
            secili={cevaplar[s.id]}
            sec={(c) => setCevaplar({ ...cevaplar, [s.id]: c })}
          />
        ))}

        {hizmet.fiyat_tipi === 'saatli' ? (
          <Secenekler
            etiket="Ne kadar sürsün?"
            secenekler={saatSecenekleri.map((s) => ({ deger: String(s), ad: saatMetni(s) }))}
            secili={String(saat)}
            sec={(s) => setSaat(Number(s))}
          />
        ) : null}

        <Secenekler
          etiket="Ne zaman?"
          dikey
          secenekler={[
            { deger: 'hayir', ad: 'Gün ve saat seçeceğim', alt: 'Sonraki adımda 7 gün içinden seçersin' },
            { deger: 'evet', ad: 'Acil, hemen gelsin', alt: 'Şu an müsait en yakın kişiye gider' },
          ]}
          secili={acil ? 'evet' : 'hayir'}
          sec={(d) => setAcil(d === 'evet')}
        />

        <Girdi
          etiket="Eklemek istediğin bir şey var mı?"
          istegeBagli
          placeholder="Örnek: Mutfak lavabosu, soldaki musluk"
          value={aciklama}
          onChangeText={setAciklama}
          multiline
        />
      </Kart>

      {fiyatHatasi ? (
        <Kart vurgu="hata">
          <BilgiSatiri simge="alert-circle-outline" renkli={renk.hata}>
            {fiyatHatasi}
          </BilgiSatiri>
        </Kart>
      ) : fiyat ? (
        <>
          {fiyat.buyuk_is_uyarisi ? (
            <Kart vurgu="uyari">
              <BilgiSatiri simge="information-circle-outline" renkli={renk.uyari}>
                okindo küçük işler içindir. Devam edebilirsin; talebini biz de inceleyeceğiz.
              </BilgiSatiri>
            </Kart>
          ) : null}
          <FiyatKarti fiyat={fiyat} />
        </>
      ) : null}

      <Metin soluk kucuk>Talep açmadıkça kimseye bir şey gitmez ve kartından para çekilmez. Sadece fiyata bakabilirsin.</Metin>
    </Ekran>
  );
}
