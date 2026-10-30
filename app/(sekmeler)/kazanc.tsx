import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AltBaslik, Bos, Ekran, Kart, Metin, Satir } from '@/components/ui';
import { tl, zaman } from '@/lib/bicim';
import { rpc, supabase } from '@/lib/supabase';
import type { Hakedis } from '@/lib/tipler';

type PuanOzeti = { gorunur: boolean; toplam: number; aylar: { ay: string; ortalama: number; yorumlar: string[] | null }[] };

const turAdi: Record<Hakedis['tur'], string> = { is: 'İş', cikis: 'Çıkış ücreti', gec_iptal: 'Geç iptal ücreti' };

export default function Kazanc() {
  const [hakedisler, setHakedisler] = useState<Hakedis[]>([]);
  const [puan, setPuan] = useState<PuanOzeti | null>(null);

  const yukle = useCallback(async () => {
    const { data } = await supabase.from('hakedisler').select('*').order('olusturma_at', { ascending: false }).limit(200);
    setHakedisler((data as Hakedis[]) ?? []);
    setPuan(await rpc<PuanOzeti>('hv_puan_ozeti').catch(() => null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      yukle();
    }, [yukle]),
  );

  const buAy = new Date();
  const ayinkiler = hakedisler.filter((h) => {
    const t = new Date(h.olusturma_at);
    return t.getMonth() === buAy.getMonth() && t.getFullYear() === buAy.getFullYear();
  });
  const topla = (liste: Hakedis[], alan: 'brut_kh' | 'stopaj' | 'net' | 'bahsis' | 'masraf') =>
    liste.reduce((t, h) => t + Number(h[alan]), 0);

  return (
    <Ekran yenile={yukle}>
      <Kart vurgu="ana">
        <Metin soluk kucuk>Bu ay eline geçen</Metin>
        <Metin kalin>{tl(topla(ayinkiler, 'net') + topla(ayinkiler, 'bahsis') + topla(ayinkiler, 'masraf'))}</Metin>
        <Satir sol="Brüt" sag={tl(topla(ayinkiler, 'brut_kh'))} />
        <Satir sol="Vergi kesintisi" sag={`−${tl(topla(ayinkiler, 'stopaj'))}`} />
        <Satir sol="Bahşiş" sag={tl(topla(ayinkiler, 'bahsis'))} />
        <Satir sol="Malzeme geri ödemesi" sag={tl(topla(ayinkiler, 'masraf'))} />
        <Metin soluk kucuk>{ayinkiler.filter((h) => h.tur === 'is').length} iş tamamladın.</Metin>
      </Kart>

      <AltBaslik>Puanların</AltBaslik>
      {puan && puan.gorunur ? (
        puan.aylar.map((a) => (
          <Kart key={a.ay}>
            <Satir sol={a.ay} sag={`★ ${String(a.ortalama).replace('.', ',')}`} kalin />
            {(a.yorumlar ?? []).map((y, i) => (
              <Metin key={i} kucuk>
                “{y}”
              </Metin>
            ))}
          </Kart>
        ))
      ) : (
        <Metin soluk>
          Yorumların, 10 puan aldıktan sonra aylık gruplar halinde görünür. Kimin yazdığı anlaşılmaz. Şu an {puan?.toplam ?? 0} puanın var.
        </Metin>
      )}

      <AltBaslik>İş iş kazancın</AltBaslik>
      {hakedisler.length === 0 ? <Bos baslik="Henüz kazancın yok" metin="İlk işini tamamladığında burada görünür." /> : null}
      {hakedisler.map((h) => (
        <Kart key={h.id}>
          <Satir sol={`${turAdi[h.tur]} · ${zaman(h.olusturma_at)}`} sag={tl(Number(h.net) + Number(h.bahsis) + Number(h.masraf))} kalin />
          <Satir sol="Brüt" sag={tl(h.brut_kh)} />
          <Satir sol="Vergi kesintisi" sag={`−${tl(h.stopaj)}`} />
          {Number(h.bahsis) > 0 ? <Satir sol="Bahşiş" sag={tl(h.bahsis)} /> : null}
          {Number(h.masraf) > 0 ? <Satir sol="Malzeme" sag={tl(h.masraf)} /> : null}
          {h.uygulanan_indirim ? <Metin soluk kucuk>Bu işte uygulanan: {h.uygulanan_indirim}</Metin> : null}
        </Kart>
      ))}
    </Ekran>
  );
}
