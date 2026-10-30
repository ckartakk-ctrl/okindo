import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { FiyatKarti } from '@/components/FiyatKarti';
import { HvKartGorunumu } from '@/components/HvKartGorunumu';
import { AltBaslik, Dugme, Ekran, Kart, Metin, Rozet, Secenekler, Yukleniyor } from '@/components/ui';
import { gunAdi, tl } from '@/lib/bicim';
import { rpc, supabase } from '@/lib/supabase';
import type { Adres, FiyatDokumu, Hizmet, UygunHv } from '@/lib/tipler';

type Parametreler = { hizmetId: string; saat: string; acil: string; cevaplar: string; aciklama: string };

function gunler(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function TalepEkrani() {
  const p = useLocalSearchParams<Parametreler>();
  const saat = p.saat ? Number(p.saat) : null;
  const acil = p.acil === '1';

  const [hizmet, setHizmet] = useState<(Hizmet & { kategoriler: { ad: string } }) | null>(null);
  const [adresler, setAdresler] = useState<Adres[]>([]);
  const [adres, setAdres] = useState<string | null>(null);
  const [gun, setGun] = useState<string>(gunler()[1].toISOString());
  const [baslangicSaati, setBaslangicSaati] = useState<number | null>(null);
  const [hvler, setHvler] = useState<UygunHv[]>([]);
  const [hv, setHv] = useState<string | null>(null);
  const [tekrar, setTekrar] = useState<'yok' | '7' | '14'>('yok');
  const [fiyat, setFiyat] = useState<FiyatDokumu | null>(null);
  const [testOdeme, setTestOdeme] = useState(true);

  useEffect(() => {
    supabase
      .from('hizmetler')
      .select('*, kategoriler(ad)')
      .eq('id', p.hizmetId)
      .single()
      .then(({ data }) => setHizmet(data as Hizmet & { kategoriler: { ad: string } }));
    supabase
      .from('ayarlar')
      .select('deger')
      .eq('anahtar', 'odeme_saglayici')
      .single()
      .then(({ data }) => setTestOdeme(data?.deger === 'test'));
  }, [p.hizmetId]);

  const adresleriYukle = useCallback(async () => {
    const { data } = await supabase.from('adresler').select('*').order('olusturma_at');
    const liste = (data as Adres[]) ?? [];
    setAdresler(liste);
    setAdres((once) => once ?? liste[0]?.id ?? null);
  }, []);
  useFocusEffect(
    useCallback(() => {
      adresleriYukle();
    }, [adresleriYukle]),
  );

  useEffect(() => {
    if (!adres) return;
    rpc<UygunHv[]>('uygun_hvler', { p_hizmet: p.hizmetId, p_adres: adres }).then(setHvler).catch(() => setHvler([]));
  }, [adres, p.hizmetId]);

  useEffect(() => {
    rpc<FiyatDokumu>('fiyat_teklifi', { p_hizmet: p.hizmetId, p_saat: saat, p_acil: acil, p_hv: hv, p_adres: adres })
      .then(setFiyat)
      .catch(() => setFiyat(null));
  }, [p.hizmetId, saat, acil, hv, adres]);

  const sureDk = fiyat?.tahmini_dk ?? 60;
  const saatler = useMemo(() => {
    const secilenGun = new Date(gun);
    const simdi = new Date();
    const liste: number[] = [];
    for (let s = 8; s <= 21; s++) {
      const bas = new Date(secilenGun);
      bas.setHours(s, 0, 0, 0);
      const bitis = new Date(bas.getTime() + sureDk * 60000);
      const sinir = new Date(secilenGun);
      sinir.setHours(22, 0, 0, 0);
      if (bas.getTime() > simdi.getTime() + 60 * 60000 && bitis <= sinir) liste.push(s);
    }
    return liste;
  }, [gun, sureDk]);

  if (!hizmet) return <Yukleniyor />;

  const duzenliOlabilir = hizmet.fiyat_tipi === 'saatli' && hizmet.kategoriler.ad === 'Temizlik ve düzen';
  const secilenHv = hvler.find((h) => h.hv_id === hv) ?? null;

  function baslangic(): string {
    if (acil) return new Date().toISOString();
    const d = new Date(gun);
    d.setHours(baslangicSaati ?? 0, 0, 0, 0);
    return d.toISOString();
  }

  async function talepAc() {
    if (!adres) throw new Error('Bir adres seçmelisin.');
    if (!acil && baslangicSaati === null) throw new Error('Bir saat seçmelisin.');
    let isId: string;
    if (tekrar !== 'yok') {
      if (!hv) throw new Error('Düzenli işte her seferinde aynı kişi gelir; listeden birini seç.');
      const seri = await rpc<string>('duzenli_baslat', {
        p_hizmet: p.hizmetId,
        p_adres: adres,
        p_hv: hv,
        p_ilk_baslangic: baslangic(),
        p_siklik: Number(tekrar),
        p_saat: saat,
        p_cevaplar: JSON.parse(p.cevaplar || '{}'),
      });
      const { data } = await supabase.from('isler').select('id').eq('seri_id', seri).single();
      isId = (data as { id: string }).id;
    } else {
      isId = await rpc<string>('talep_olustur', {
        p_hizmet: p.hizmetId,
        p_adres: adres,
        p_baslangic: baslangic(),
        p_saat: saat,
        p_acil: acil,
        p_cevaplar: JSON.parse(p.cevaplar || '{}'),
        p_aciklama: p.aciklama || null,
        p_hedef_hv: hv,
      });
    }
    router.dismissAll();
    router.push({ pathname: '/is/[id]', params: { id: isId } });
  }

  return (
    <Ekran>
      <AltBaslik>Adres</AltBaslik>
      {adresler.length ? (
        <Secenekler
          secenekler={adresler.map((a) => ({ deger: a.id, ad: `${a.baslik} · ${a.acik_adres}` }))}
          secili={adres}
          sec={setAdres}
        />
      ) : (
        <Metin soluk>Henüz kayıtlı adresin yok.</Metin>
      )}
      <Dugme tur="ikincil" onPress={() => router.push('/adres-ekle')}>
        Yeni adres ekle
      </Dugme>

      {!acil ? (
        <>
          <AltBaslik>Gün ve saat</AltBaslik>
          <Secenekler
            secenekler={gunler().map((d) => ({ deger: d.toISOString(), ad: gunAdi(d) }))}
            secili={gun}
            sec={(g) => {
              setGun(g);
              setBaslangicSaati(null);
            }}
          />
          {saatler.length ? (
            <Secenekler
              secenekler={saatler.map((s) => ({ deger: String(s), ad: `${String(s).padStart(2, '0')}:00` }))}
              secili={baslangicSaati === null ? null : String(baslangicSaati)}
              sec={(s) => setBaslangicSaati(Number(s))}
            />
          ) : (
            <Metin soluk>Bu gün için uygun saat kalmadı. İşler 08:00 ile 22:00 arasında yapılır.</Metin>
          )}
        </>
      ) : (
        <Kart vurgu="uyari">
          <Metin>Acil talep: şu an müsait olan en yakın kişiye gider.</Metin>
        </Kart>
      )}

      <AltBaslik>Kim gelsin?</AltBaslik>
      <Kart onPress={() => setHv(null)} vurgu={hv === null ? 'ana' : undefined}>
        <Metin kalin>En uygun kişiyi okindo bulsun</Metin>
        <Metin soluk kucuk>Talep yakınındaki müsait kişilere gider; ilk kabul eden gelir. Yol ücreti yok.</Metin>
      </Kart>
      {hvler.map((h) => (
        <Kart key={h.hv_id} onPress={() => setHv(h.hv_id)} vurgu={hv === h.hv_id ? 'ana' : undefined}>
          <HvKartGorunumu kart={h.kart} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {h.komsu ? <Rozet>Komşun</Rozet> : null}
            {!h.musait ? <Rozet tur="soluk">Şu an müsait değil</Rozet> : null}
            {h.yol_kd > 0 ? <Rozet tur="uyari">{`Yol ${tl(h.yol_kd)}`}</Rozet> : null}
          </View>
        </Kart>
      ))}
      {hv ? <Metin soluk kucuk>Seçtiğin kişi 10 dakika içinde kabul etmezse talep diğer uygun kişilere açılır.</Metin> : null}

      {duzenliOlabilir && !acil ? (
        <Secenekler
          etiket="Düzenli olsun mu?"
          secenekler={[
            { deger: 'yok', ad: 'Tek seferlik' },
            { deger: '7', ad: 'Her hafta' },
            { deger: '14', ad: 'İki haftada bir' },
          ]}
          secili={tekrar}
          sec={(t) => setTekrar(t as 'yok' | '7' | '14')}
        />
      ) : null}
      {tekrar !== 'yok' ? (
        <Metin soluk kucuk>
          Her seferinde aynı kişi gelir ve saatin ona ayrılır. Bir seansı 24 saat öncesine kadar ücretsiz atlayabilir, düzenli işi
          istediğin an bırakabilirsin.
        </Metin>
      ) : null}

      {fiyat ? <FiyatKarti fiyat={fiyat} /> : null}
      {secilenHv && !secilenHv.musait ? (
        <Metin soluk kucuk>Seçtiğin kişi şu an müsait görünmüyor; yine de talebini görebilir.</Metin>
      ) : null}

      {testOdeme ? (
        <Kart vurgu="uyari">
          <Metin kalin>Test ödemesi</Metin>
          <Metin kucuk>Pilot testinde kartından gerçek para çekilmez.</Metin>
        </Kart>
      ) : null}

      <Dugme onPress={talepAc} pasif={!adres || (!acil && baslangicSaati === null)}>
        {fiyat ? `Talebi aç · ${tl(fiyat.musteri_toplam_kd)}` : 'Talebi aç'}
      </Dugme>
      <Metin soluk kucuk>
        Tutar kartında bloke edilir, iş bitip sen onaylayana kadar çekilmez. İşe 2 saatten fazla varken iptal ücretsizdir.
      </Metin>
    </Ekran>
  );
}
