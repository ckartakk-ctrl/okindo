import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FiyatKarti } from '@/components/FiyatKarti';
import { AltBaslik, Baslik, Dugme, Ekran, Girdi, Kart, Metin, Secenekler, Yukleniyor } from '@/components/ui';
import { saatMetni } from '@/lib/bicim';
import { rpc, supabase } from '@/lib/supabase';
import type { FiyatDokumu, Hizmet } from '@/lib/tipler';

const saatSecenekleri = [2, 2.5, 3, 3.5, 4, 5, 6];

export default function HizmetEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hizmet, setHizmet] = useState<Hizmet | null>(null);
  const [cevaplar, setCevaplar] = useState<Record<string, string>>({});
  const [saat, setSaat] = useState<number>(2);
  const [acil, setAcil] = useState(false);
  const [aciklama, setAciklama] = useState('');
  const [fiyat, setFiyat] = useState<FiyatDokumu | null>(null);
  const [fiyatHatasi, setFiyatHatasi] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('hizmetler')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setHizmet(data as Hizmet));
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

  if (!hizmet) return <Yukleniyor />;

  const sorularTamam = hizmet.sorular.every((s) => cevaplar[s.id]);

  return (
    <Ekran>
      <Stack.Screen options={{ title: hizmet.ad }} />
      <Baslik alt={hizmet.aciklama ?? undefined}>{hizmet.ad}</Baslik>

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
        secenekler={[
          { deger: 'hayir', ad: 'Bir gün ve saat seçeceğim' },
          { deger: 'evet', ad: 'Acil, hemen' },
        ]}
        secili={acil ? 'evet' : 'hayir'}
        sec={(d) => setAcil(d === 'evet')}
      />

      <Girdi
        etiket="Eklemek istediğin bir şey var mı? (isteğe bağlı)"
        placeholder="Örnek: Mutfak lavabosu, sol taraftaki musluk"
        value={aciklama}
        onChangeText={setAciklama}
        multiline
      />

      {fiyatHatasi ? (
        <Kart vurgu="hata">
          <Metin>{fiyatHatasi}</Metin>
        </Kart>
      ) : fiyat ? (
        <>
          <AltBaslik>Fiyat</AltBaslik>
          {fiyat.buyuk_is_uyarisi ? (
            <Kart vurgu="uyari">
              <Metin>okindo küçük işler içindir. Devam edebilirsin; talebini biz de inceleyeceğiz.</Metin>
            </Kart>
          ) : null}
          <FiyatKarti fiyat={fiyat} />
        </>
      ) : null}

      <View style={{ gap: 8, marginTop: 8 }}>
        <Dugme
          pasif={!fiyat || !sorularTamam}
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
          {sorularTamam ? 'İşi yaptır' : 'Önce soruları cevapla'}
        </Dugme>
        <Metin soluk kucuk>
          Sadece fiyat öğrenmek istediysen hiçbir şey yapmana gerek yok. Talep açmadıkça kimseye bir şey gitmez, kartından para
          çekilmez.
        </Metin>
      </View>
    </Ekran>
  );
}
