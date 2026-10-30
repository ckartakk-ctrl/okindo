import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BilgiSatiri, bosluk, Dugme, Ekran, Grup, Kart, Metin, renk, Secenekler, Simge, stil } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { rpc } from '@/lib/supabase';

type Soru = { id: number; sira: number; soru: string; secenekler: string[] };

// K38: beş bölüm, her biri birkaç kart
const bolumler: { baslik: string; kartlar: string[] }[] = [
  {
    baslik: 'okindo nasıl çalışır',
    kartlar: [
      'Müşteri işi seçer, fiyatı baştan görür. Fiyat senin onayın olmadan değişmez, müşterinin onayı olmadan artmaz.',
      'Sen işi kabul etmeden önce eline geçecek net tutarı görürsün. Talebe bakmak ve iş almak ücretsiz.',
      'İşi kabul edip etmemek, saatlerin ve bölgen tamamen senin kararın.',
    ],
  },
  {
    baslik: 'Güvenlik ve yapılmayan işler',
    kartlar: [
      '“Emin değilsen yapma.” Riskli gördüğün işi bırakabilirsin; bu yüzden cezalandırılmazsın.',
      'Gaz ve kombi, elektrik panosu, dış cephe ve iskele ya da balkon dışında yüksekte çalışma hiçbir zaman yapılmaz.',
      'Elektrik tesisatı ve duvar içi su tesisatı yalnız belgeli ustanın işidir.',
      'Acil durumda 112’yi ara ve bize hemen haber ver.',
    ],
  },
  {
    baslik: 'Müşteri evinde',
    kartlar: [
      'Kapıda gülümse ve kendini tanıt. Gelmeden önce haber ver.',
      'Galoş giy. Başlamadan ne yapacağını anlat.',
      'Sorun çıkarsa saklama, seçenek sun.',
      'Geldiğinden temiz bırak. Bitince işi göster, teşekkür ederek ayrıl.',
    ],
  },
  {
    baslik: 'Uygulama akışı',
    kartlar: [
      'Adrese varınca “Adrese vardım”a bas. Bu kayıt, müşteri evde yoksa seni korur.',
      'Kapıda müşteriden 4 haneli kodu iste ve gir. Kod girilmeden iş başlamaz ve sigorta kapsamı açılmaz.',
      'Ek iş çıkarsa uygulamadan ekle; müşteri onaylamadan yapma. Bitince istersen fotoğraf çek ve “İşi bitir”e bas.',
    ],
  },
  {
    baslik: 'Para ve kurallar',
    kartlar: [
      'Paran müşteri onaylayınca hesabına gönderilir. Bonuslar bir sonraki iş ödemenle ya da en geç hafta sonunda ödenir.',
      'Bu müşteriyi sana okindo getirdi; sigortan, ödeme güvencen ve yeni müşterilerin bu kurala bağlı: okindo’dan tanıştığın müşteriyle 12 ay uygulama dışında iş yapılmaz.',
      'Müşteri numaranı isterse: “Ben işlerimi okindo sayesinde alıyorum. Uygulamadan beni seçin, iş direkt bana gelir; aynı fiyat ve sigortalı.”',
    ],
  },
];

/** Form kalıbı (sihirbaz): adım çubuğu + adım başına doğrulama + alta yapışık Devam */
function AdimCubugu({ adim, toplam }: { adim: number; toplam: number }) {
  return (
    <View accessible accessibilityLabel={`Adım ${adim + 1} / ${toplam}`} style={{ gap: bosluk.s }}>
      <View style={{ flexDirection: 'row', gap: bosluk.xs }}>
        {Array.from({ length: toplam }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= adim ? renk.ana : renk.cizgi }} />
        ))}
      </View>
      <Text style={[stil.ikincil, { color: renk.soluk }]}>{adim < toplam - 1 ? `Bölüm ${adim + 1} / ${toplam - 1}` : 'Son adım: kısa test'}</Text>
    </View>
  );
}

export default function Egitim() {
  const { profilYenile } = useOturum();
  const [adim, setAdim] = useState(0);
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [cevaplar, setCevaplar] = useState<Record<number, number>>({});
  const [yanlislar, setYanlislar] = useState<number[]>([]);
  const toplam = bolumler.length + 1;

  useEffect(() => {
    rpc<Soru[]>('egitim_sorulari_getir').then(setSorular).catch(() => setSorular([]));
  }, []);

  if (adim < bolumler.length) {
    const b = bolumler[adim];
    return (
      <Ekran
        alt={
          <View style={{ flexDirection: 'row', gap: bosluk.s }}>
            {adim > 0 ? (
              <View style={{ flex: 1 }}>
                <Dugme tur="ikincil" onPress={() => setAdim(adim - 1)}>
                  Geri
                </Dugme>
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Dugme simge="arrow-forward" onPress={() => setAdim(adim + 1)}>
                {adim + 1 < bolumler.length ? 'Sonraki bölüme geç' : 'Teste geç'}
              </Dugme>
            </View>
          </View>
        }
      >
        <AdimCubugu adim={adim} toplam={toplam} />
        <Text accessibilityRole="header" style={stil.baslik}>
          {b.baslik}
        </Text>
        <Grup>
          {b.kartlar.map((k, i) => (
            <View key={i} style={{ padding: bosluk.l, flexDirection: 'row', gap: bosluk.m }}>
              <Simge ad="checkmark-circle" boyut={20} renkli={renk.ana} />
              <Text style={[stil.metin, { flex: 1 }]}>{k}</Text>
            </View>
          ))}
        </Grup>
      </Ekran>
    );
  }

  async function bitir() {
    const sonuc = await rpc<{ gecti: boolean; yanlislar: number[] }>('egitim_tamamla', { p_cevaplar: cevaplar });
    if (sonuc.gecti) {
      await profilYenile();
      router.replace('/');
    } else {
      setYanlislar(sonuc.yanlislar);
    }
  }

  const cevapsiz = sorular.length - Object.keys(cevaplar).length;

  return (
    <Ekran
      alt={
        <View style={{ flexDirection: 'row', gap: bosluk.s }}>
          <View style={{ flex: 1 }}>
            <Dugme tur="ikincil" onPress={() => setAdim(0)}>
              Baştan oku
            </Dugme>
          </View>
          <View style={{ flex: 2 }}>
            <Dugme simge="checkmark-done" eksik={cevapsiz > 0 ? `${cevapsiz} soru cevapsız kaldı.` : null} onPress={bitir}>
              Testi bitir
            </Dugme>
          </View>
        </View>
      }
    >
      <AdimCubugu adim={toplam - 1} toplam={toplam} />
      <Text accessibilityRole="header" style={stil.baslik}>
        Kısa test
      </Text>
      <Metin soluk>5 sorunun hepsini doğru cevaplamalısın. Yanlışları gösterir, hemen tekrar denemeni sağlarız.</Metin>
      {sorular.map((s, i) => (
        <Kart key={s.id} vurgu={yanlislar.includes(s.id) ? 'hata' : undefined}>
          <Text style={[stil.metin, { fontWeight: '600' }]}>
            {i + 1}. {s.soru}
          </Text>
          <Secenekler
            dikey
            secenekler={s.secenekler.map((c, j) => ({ deger: String(j), ad: c }))}
            secili={cevaplar[s.id] === undefined ? null : String(cevaplar[s.id])}
            sec={(d) => {
              setCevaplar({ ...cevaplar, [s.id]: Number(d) });
              setYanlislar(yanlislar.filter((y) => y !== s.id));
            }}
          />
          {yanlislar.includes(s.id) ? (
            <BilgiSatiri simge="refresh-outline" renkli={renk.hata}>
              Bu cevap doğru değil. Bir daha düşünüp başka bir seçenek işaretle.
            </BilgiSatiri>
          ) : null}
        </Kart>
      ))}
    </Ekran>
  );
}
