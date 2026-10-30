import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AltBaslik, Baslik, Dugme, Ekran, Kart, Metin, Secenekler } from '@/components/ui';
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
      '5 yıldız alanların 8 alışkanlığı: kapıda gülümser ve kendini tanıtır · gelmeden haber verir · galoş giyer · başlamadan ne yapacağını anlatır.',
      '· sorun çıkarsa saklamaz, seçenek sunar · geldiğinden temiz bırakır · bitince işi gösterir · teşekkür ederek ayrılır.',
    ],
  },
  {
    baslik: 'Uygulama akışı',
    kartlar: [
      'Adrese varınca “Adresteyim”e bas. Bu kayıt, müşteri evde yoksa seni korur.',
      'Kapıda müşteriden 4 haneli kodu iste ve gir. Kod girilmeden iş başlamaz ve sigorta kapsamı açılmaz.',
      'Ek iş çıkarsa uygulamadan ekle; müşteri onaylamadan yapma. Bitince fotoğrafı çek ve “Bitti” de.',
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

export default function Egitim() {
  const { profilYenile } = useOturum();
  const [adim, setAdim] = useState(0);
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [cevaplar, setCevaplar] = useState<Record<number, number>>({});
  const [yanlislar, setYanlislar] = useState<number[]>([]);

  useEffect(() => {
    rpc<Soru[]>('egitim_sorulari_getir').then(setSorular);
  }, []);

  if (adim < bolumler.length) {
    const b = bolumler[adim];
    return (
      <Ekran>
        <Baslik alt={`Bölüm ${adim + 1} / ${bolumler.length}`}>{b.baslik}</Baslik>
        {b.kartlar.map((k, i) => (
          <Kart key={i}>
            <Metin>{k}</Metin>
          </Kart>
        ))}
        <Dugme onPress={() => setAdim(adim + 1)}>{adim + 1 < bolumler.length ? 'Devam' : 'Teste geç'}</Dugme>
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

  return (
    <Ekran>
      <Baslik alt="5 sorunun hepsini doğru cevaplamalısın. Yanlışları gösterir, hemen tekrar denemeni sağlarız.">Kısa test</Baslik>
      {sorular.map((s) => (
        <Kart key={s.id} vurgu={yanlislar.includes(s.id) ? 'hata' : undefined}>
          <AltBaslik>{s.soru}</AltBaslik>
          <Secenekler
            secenekler={s.secenekler.map((c, i) => ({ deger: String(i), ad: c }))}
            secili={cevaplar[s.id] === undefined ? null : String(cevaplar[s.id])}
            sec={(d) => {
              setCevaplar({ ...cevaplar, [s.id]: Number(d) });
              setYanlislar(yanlislar.filter((y) => y !== s.id));
            }}
          />
          {yanlislar.includes(s.id) ? <Metin kucuk>Bu cevap doğru değil, tekrar düşün.</Metin> : null}
        </Kart>
      ))}
      <Dugme pasif={Object.keys(cevaplar).length < sorular.length} onPress={bitir}>
        Testi bitir
      </Dugme>
      <Dugme tur="ikincil" onPress={() => setAdim(0)}>
        Eğitimi baştan oku
      </Dugme>
    </Ekran>
  );
}
