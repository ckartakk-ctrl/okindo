import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Ayirici, Bos, Dugme, Ekran, Grup, GrupSatiri, Kart, Metin, renk, Satir, Simge, stil, Tutar } from '@/components/ui';
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
  const isSayisi = ayinkiler.filter((h) => h.tur === 'is').length;
  const acikYazi = '#BFE0D8';

  return (
    <Ekran yenile={yukle}>
      <Kart vurgu="koyu" stilEk={{ padding: 24, gap: 8 }}>
        <Text style={[stil.ikincil, { color: acikYazi }]}>Bu ay eline geçen</Text>
        <Tutar boyut={40} renkli="#FFFFFF">
          {tl(topla(ayinkiler, 'net') + topla(ayinkiler, 'bahsis') + topla(ayinkiler, 'masraf'))}
        </Tutar>
        <Text style={[stil.ikincil, { color: renk.damga, fontWeight: '600', marginBottom: 8 }]}>
          {isSayisi ? `${isSayisi} iş tamamladın` : 'Bu ay henüz iş tamamlamadın'}
        </Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 4 }} />
        {[
          ['Brüt', tl(topla(ayinkiler, 'brut_kh'))],
          ['Vergi kesintisi', `−${tl(topla(ayinkiler, 'stopaj'))}`],
          ['Bahşiş', tl(topla(ayinkiler, 'bahsis'))],
          ['Malzeme geri ödemesi', tl(topla(ayinkiler, 'masraf'))],
        ].map(([sol, sag]) => (
          <View key={sol} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={[stil.metin, { color: acikYazi }]}>{sol}</Text>
            <Text style={[stil.metin, { color: '#FFFFFF', fontVariant: ['tabular-nums'] }]}>{sag}</Text>
          </View>
        ))}
      </Kart>

      {puan && puan.gorunur ? (
        <Grup baslik="Puanların">
          {puan.aylar.map((a) => (
            <View key={a.ay} style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[stil.metin, { fontWeight: '600' }]}>{a.ay}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Simge ad="star" boyut={16} renkli={renk.damga} />
                  <Text style={[stil.metin, { fontWeight: '600' }]}>{String(a.ortalama).replace('.', ',')}</Text>
                </View>
              </View>
              {(a.yorumlar ?? []).map((y, i) => (
                <Metin key={i} kucuk soluk>
                  “{y}”
                </Metin>
              ))}
            </View>
          ))}
        </Grup>
      ) : (
        <Grup baslik="Puanların">
          <GrupSatiri
            simge="star-outline"
            baslik={`${puan?.toplam ?? 0} puan aldın`}
            alt="Yorumlar 10 puandan sonra aylık gruplar halinde görünür. Kimin yazdığı anlaşılmaz."
          />
        </Grup>
      )}

      {hakedisler.length === 0 ? (
        <Bos
          simge="wallet-outline"
          baslik="Henüz kazancın yok"
          metin="Tamamladığın her işin brüt, vergi ve net tutarı burada görünür."
          eylem={<Dugme simge="notifications-outline" onPress={() => router.push('/')}>Açık talepleri gör</Dugme>}
        />
      ) : (
        <Grup baslik="İş iş kazancın">
          {hakedisler.map((h) => (
            <View key={h.id} style={{ padding: 16, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={[stil.metin, { fontWeight: '600' }]}>{turAdi[h.tur]}</Text>
                <Tutar boyut={18}>{tl(Number(h.net) + Number(h.bahsis) + Number(h.masraf))}</Tutar>
              </View>
              <Text style={[stil.ikincil, { color: renk.soluk, marginBottom: 4 }]}>{zaman(h.olusturma_at)}</Text>
              <Ayirici />
              <Satir sol="Brüt" sag={tl(h.brut_kh)} />
              <Satir sol="Vergi kesintisi" sag={`−${tl(h.stopaj)}`} />
              {Number(h.bahsis) > 0 ? <Satir sol="Bahşiş" sag={tl(h.bahsis)} /> : null}
              {Number(h.masraf) > 0 ? <Satir sol="Malzeme" sag={tl(h.masraf)} /> : null}
              {h.uygulanan_indirim ? <Metin soluk kucuk>Bu işte uygulanan: {h.uygulanan_indirim}</Metin> : null}
            </View>
          ))}
        </Grup>
      )}
    </Ekran>
  );
}
