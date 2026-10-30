import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { FiyatKarti } from '@/components/FiyatKarti';
import { HvKartGorunumu } from '@/components/HvKartGorunumu';
import {
  BilgiSatiri,
  bosluk,
  Dugme,
  Ekran,
  Kart,
  Metin,
  renk,
  Rozet,
  Secenekler,
  Simge,
  stil,
  Tutar,
  Yukleniyor,
} from '@/components/ui';
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

/** Seçilebilir satır: radyo düğmesi + içerik (adres ve kişi seçimi için) */
function SecimSatiri({ secili, sec, children, etiket }: { secili: boolean; sec: () => void; children: ReactNode; etiket: string }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={etiket}
      accessibilityState={{ checked: secili }}
      onPress={sec}
      style={({ pressed }) => [stil.grupSatiri, { alignItems: 'center' }, secili && { backgroundColor: '#F4FAF8' }, pressed && { backgroundColor: '#EEF5F3' }]}
    >
      <View style={[stil.radyo, secili && { borderColor: renk.ana }]}>{secili ? <View style={stil.radyoIc} /> : null}</View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

/** Form kalıbı: adres, zaman ve kişi seçip talebi aç */
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
    // Varsayılan: en son eklenen adres (yeni eklediysen o seçili gelir)
    setAdres((once) => (once && liste.some((a) => a.id === once) ? once : (liste[liste.length - 1]?.id ?? null)));
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

  if (!hizmet) return <Yukleniyor tur="form" />;

  const duzenliOlabilir = hizmet.fiyat_tipi === 'saatli' && hizmet.kategoriler.ad === 'Temizlik ve düzen';
  const secilenHv = hvler.find((h) => h.hv_id === hv) ?? null;

  function baslangic(): string {
    if (acil) return new Date().toISOString();
    const d = new Date(gun);
    d.setHours(baslangicSaati ?? 0, 0, 0, 0);
    return d.toISOString();
  }

  const eksik = !adres
    ? 'Önce işin yapılacağı adresi ekle.'
    : !acil && baslangicSaati === null
      ? 'Bir başlangıç saati seç.'
      : tekrar !== 'yok' && !hv
        ? 'Düzenli işte her seferinde aynı kişi gelir; listeden birini seç.'
        : null;

  async function talepAc() {
    let isId: string;
    if (tekrar !== 'yok') {
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

  const alt = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: bosluk.m }}>
        <View style={{ flex: 1 }}>
          <Text style={[stil.meta, { color: renk.soluk }]}>{testOdeme ? 'Test ödemesi, para çekilmez' : 'KDV dahil'}</Text>
          {fiyat ? (
            <Tutar boyut={24} renkli={renk.anaKoyu}>
              {tl(fiyat.musteri_toplam_kd)}
            </Tutar>
          ) : (
            <Text style={[stil.metin, { color: renk.soluk }]}>Hesaplanıyor</Text>
          )}
        </View>
        <View style={{ flex: 1.3 }}>
          <Dugme simge="checkmark-circle" eksik={eksik} onPress={talepAc}>
            Talebi aç
          </Dugme>
        </View>
      </View>
    </>
  );

  return (
    <Ekran alt={alt}>
      <Text accessibilityRole="header" style={stil.baslik}>
        {hizmet.ad}
      </Text>

      {/* 1. Adres */}
      <View style={{ gap: bosluk.s }}>
        <Text style={stil.altBaslik}>Nereye?</Text>
        <View style={stil.grup}>
          {adresler.map((a, i) => (
            <Fragment key={a.id}>
              {i > 0 ? <View style={stil.ayirici} /> : null}
              <SecimSatiri secili={adres === a.id} sec={() => setAdres(a.id)} etiket={`${a.baslik}, ${a.acik_adres}`}>
                <Text style={[stil.metin, { fontWeight: '600' }]}>{a.baslik}</Text>
                <Text style={[stil.ikincil, { color: renk.soluk }]} numberOfLines={2}>
                  {a.acik_adres}
                </Text>
              </SecimSatiri>
            </Fragment>
          ))}
          {adresler.length ? <View style={stil.ayirici} /> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/adres-ekle')}
            style={({ pressed }) => [stil.grupSatiri, pressed && { backgroundColor: '#F2F6F5' }]}
          >
            <View style={stil.simgeKutusu}>
              <Simge ad="add" boyut={20} renkli={renk.ana} />
            </View>
            <Text style={[stil.metin, { fontWeight: '600', color: renk.ana, flex: 1 }]}>Yeni adres ekle</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Zaman */}
      <View style={{ gap: bosluk.s }}>
        <Text style={stil.altBaslik}>Ne zaman?</Text>
        {!acil ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -bosluk.l }}
              contentContainerStyle={{ paddingHorizontal: bosluk.l, gap: bosluk.s }}
            >
              {gunler().map((d) => {
                const secili = d.toISOString() === gun;
                const [ust, altYazi] = gunAdi(d).includes(' ') ? gunAdi(d).split(' ') : [gunAdi(d), String(d.getDate())];
                return (
                  <Pressable
                    key={d.toISOString()}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: secili }}
                    accessibilityLabel={gunAdi(d)}
                    onPress={() => {
                      setGun(d.toISOString());
                      setBaslangicSaati(null);
                    }}
                    style={{
                      width: 64,
                      paddingVertical: bosluk.m,
                      borderRadius: 12,
                      alignItems: 'center',
                      gap: bosluk.xs,
                      backgroundColor: secili ? renk.anaKoyu : renk.kart,
                      borderWidth: 1,
                      borderColor: secili ? renk.anaKoyu : renk.cizgi,
                    }}
                  >
                    <Text style={[stil.ikincil, { color: secili ? '#CFE9E2' : renk.soluk }]}>{ust}</Text>
                    <Text style={[stil.metin, { fontWeight: '600', color: secili ? '#FFFFFF' : renk.metin }]}>{altYazi}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {saatler.length ? (
              <Secenekler
                etiket="Başlangıç saati"
                secenekler={saatler.map((s) => ({ deger: String(s), ad: `${String(s).padStart(2, '0')}:00` }))}
                secili={baslangicSaati === null ? null : String(baslangicSaati)}
                sec={(s) => setBaslangicSaati(Number(s))}
              />
            ) : (
              <Kart>
                <BilgiSatiri simge="moon-outline">Bu gün için uygun saat kalmadı. İşler 08:00 ile 22:00 arasında yapılır; başka bir gün seç.</BilgiSatiri>
              </Kart>
            )}
          </>
        ) : (
          <Kart vurgu="uyari">
            <BilgiSatiri simge="flash-outline" renkli={renk.uyari}>
              Acil talep: şu an müsait olan en yakın kişiye gider.
            </BilgiSatiri>
          </Kart>
        )}
      </View>

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
          Her seferinde aynı kişi gelir ve saatin ona ayrılır. Bir seansı 24 saat öncesine kadar ücretsiz atlayabilir, düzenli işi istediğin an
          bırakabilirsin.
        </Metin>
      ) : null}

      {/* 3. Kişi */}
      <View style={{ gap: bosluk.s }}>
        <Text style={stil.altBaslik}>Kim gelsin?</Text>
        <View style={stil.grup}>
          <SecimSatiri secili={hv === null} sec={() => setHv(null)} etiket="En uygun kişiyi okindo bulsun">
            <Text style={[stil.metin, { fontWeight: '600' }]}>En uygun kişiyi okindo bulsun</Text>
            <Text style={[stil.ikincil, { color: renk.soluk }]}>Yakınındaki müsait kişilere gider, ilk kabul eden gelir. Yol ücreti yok.</Text>
          </SecimSatiri>
          {hvler.map((h) => (
            <Fragment key={h.hv_id}>
              <View style={stil.ayirici} />
              <SecimSatiri secili={hv === h.hv_id} sec={() => setHv(h.hv_id)} etiket={h.kart.ad}>
                <View style={{ gap: bosluk.s }}>
                  <HvKartGorunumu kart={h.kart} />
                  {h.komsu || !h.musait || h.yol_kd > 0 ? (
                    <View style={{ flexDirection: 'row', gap: bosluk.s, flexWrap: 'wrap' }}>
                      {h.komsu ? <Rozet>Komşun</Rozet> : null}
                      {!h.musait ? <Rozet tur="soluk">Şu an müsait değil</Rozet> : null}
                      {h.yol_kd > 0 ? <Rozet tur="uyari">{`Yol ${tl(h.yol_kd)}`}</Rozet> : null}
                    </View>
                  ) : null}
                </View>
              </SecimSatiri>
            </Fragment>
          ))}
        </View>
        {hv ? <Metin soluk kucuk>Seçtiğin kişi 10 dakika içinde kabul etmezse talep diğer uygun kişilere açılır.</Metin> : null}
        {secilenHv && !secilenHv.musait ? <Metin soluk kucuk>Seçtiğin kişi şu an müsait görünmüyor; yine de talebini görebilir.</Metin> : null}
      </View>

      {fiyat ? <FiyatKarti fiyat={fiyat} /> : null}

      <BilgiSatiri simge="card-outline">
        Tutar kartında bloke edilir, iş bitip sen onaylayana kadar çekilmez. İşe 2 saatten fazla varken iptal ücretsizdir.
      </BilgiSatiri>
    </Ekran>
  );
}
