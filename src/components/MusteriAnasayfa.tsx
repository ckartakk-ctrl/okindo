import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Bos, bosluk, Dugme, Ekran, Grup, GrupSatiri, OkDamgasi, renk, Rozet, Simge, stil, UstBlok, yazi, type SimgeAdi } from '@/components/ui';
import { bitmisDurumlar, durumMetni, zaman } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Hizmet, Is, Kategori } from '@/lib/tipler';

/** Türkçe karakterleri sadeleştirerek arama yapar ("musluk" = "MUSLUK", "sifon" = "Sifon") */
function sade(s: string) {
  return s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
}

/** Kategori adından simge: yeni kategori eklenirse varsayılan simge kullanılır */
export function kategoriSimgesi(ad: string): SimgeAdi {
  const a = sade(ad);
  if (a.includes('temiz')) return 'sparkles-outline';
  if (a.includes('tamir')) return 'hammer-outline';
  if (a.includes('montaj')) return 'construct-outline';
  if (a.includes('ayak') || a.includes('gunluk')) return 'basket-outline';
  if (a.includes('tasima')) return 'cube-outline';
  return 'ellipse-outline';
}

/** "Ayak işleri ve günlük yardım" → "Ayak işleri" */
function kisaAd(ad: string) {
  return ad.split(' ve ')[0];
}

/** Liste kalıbı: arama + kategori süzgeci + hizmet listesi */
export function MusteriAnasayfa() {
  const { profil, oturum } = useOturum();
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [hizmetler, setHizmetler] = useState<Hizmet[]>([]);
  const [isler, setIsler] = useState<Is[]>([]);
  const [arama, setArama] = useState('');
  const [seciliKategori, setSeciliKategori] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    const [k, h, i] = await Promise.all([
      supabase.from('kategoriler').select('*').eq('pilotta_acik', true).order('sira'),
      supabase.from('hizmetler').select('*').eq('aktif', true).eq('usta_gerekli', false).order('ad'),
      oturum
        ? supabase
            .from('isler')
            .select('*, hizmetler(ad, fiyat_tipi, hazirlik, sorular)')
            .eq('musteri_id', oturum.user.id)
            .order('olusturma_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);
    setKategoriler((k.data as Kategori[]) ?? []);
    setHizmetler((h.data as Hizmet[]) ?? []);
    setIsler((i.data as Is[]) ?? []);
  }, [oturum]);

  useFocusEffect(
    useCallback(() => {
      yukle();
    }, [yukle]),
  );

  const bulunan = useMemo(() => {
    const a = sade(arama.trim());
    if (!a) return null;
    return hizmetler.filter((h) => sade(h.ad).includes(a) || sade(h.aciklama ?? '').includes(a));
  }, [arama, hizmetler]);

  const kategori = kategoriler.find((k) => k.id === seciliKategori) ?? kategoriler[0];
  const kategoriHizmetleri = kategori ? hizmetler.filter((h) => h.kategori_id === kategori.id) : [];
  const devamEden = isler.find((i) => !bitmisDurumlar.includes(i.durum));
  const tekrarlar = useMemo(() => {
    const goruldu = new Set<string>();
    return isler.filter((i) => i.durum === 'onaylandi' && !goruldu.has(i.hizmet_id) && goruldu.add(i.hizmet_id)).slice(0, 4);
  }, [isler]);
  const kategoriAdi = (kategoriId: string) => kategoriler.find((k) => k.id === kategoriId)?.ad ?? '';

  const ust = (
    <UstBlok>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: yazi.baslik, fontWeight: '600', fontSize: 24, lineHeight: 28, color: '#FFFFFF' }}>okindo</Text>
        <OkDamgasi boyut={40} />
      </View>
      <View style={{ gap: bosluk.xs, marginTop: bosluk.s }}>
        {profil?.ad ? <Text style={[stil.metin, { color: '#CFE9E2' }]}>Merhaba {profil.ad},</Text> : null}
        <Text accessibilityRole="header" style={{ fontFamily: yazi.baslik, fontWeight: '600', fontSize: 32, lineHeight: 36, color: '#FFFFFF' }}>
          Bugün ne yaptıralım?
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: bosluk.s,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          paddingHorizontal: bosluk.m,
          marginTop: bosluk.s,
          minHeight: 52,
        }}
      >
        <Simge ad="search" boyut={20} renkli={renk.soluk} />
        <TextInput
          placeholder="Musluk, dolap montajı, temizlik"
          placeholderTextColor={renk.silik}
          value={arama}
          onChangeText={setArama}
          returnKeyType="search"
          accessibilityLabel="Hizmet ara"
          style={{ flex: 1, fontSize: 16, color: renk.metin, paddingVertical: bosluk.m }}
        />
        {arama ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aramayı temizle"
            onPress={() => setArama('')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Simge ad="close-circle" boyut={20} renkli={renk.silik} />
          </Pressable>
        ) : null}
      </View>
    </UstBlok>
  );

  if (bulunan) {
    return (
      <Ekran yenile={yukle} ust={ust}>
        {bulunan.length ? (
          <Grup baslik={`“${arama.trim()}” için ${bulunan.length} sonuç`}>
            {bulunan.map((h) => (
              <HizmetSatiri key={h.id} hizmet={h} kategori={kategoriAdi(h.kategori_id)} />
            ))}
          </Grup>
        ) : (
          <Bos
            simge="search-outline"
            baslik="Bu aramayla eşleşen iş yok"
            metin="Farklı bir kelimeyle ara ya da kategorilerden en yakın işi seç. Tadilat ve boya gibi büyük işler okindo’da yok."
            eylem={
              <Dugme tur="ikincil" simge="close" onPress={() => setArama('')}>
                Aramayı temizle
              </Dugme>
            }
          />
        )}
      </Ekran>
    );
  }

  return (
    <Ekran yenile={yukle} ust={ust}>
      {devamEden ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Devam eden işin: ${devamEden.hizmetler?.ad}, ${durumMetni[devamEden.durum]}`}
          onPress={() => router.push({ pathname: '/is/[id]', params: { id: devamEden.id } })}
          style={({ pressed }) => [stil.kart, { flexDirection: 'row', alignItems: 'center', gap: bosluk.m, borderColor: '#C6E4DA' }, pressed && { opacity: 0.85 }]}
        >
          <View style={[stil.simgeKutusu, { backgroundColor: renk.ana }]}>
            <Simge ad="pulse" boyut={20} renkli="#FFFFFF" />
          </View>
          <View style={{ flex: 1, gap: bosluk.xs }}>
            <Text style={[stil.ikincil, { color: renk.soluk }]}>Devam eden işin</Text>
            <Text style={[stil.metin, { fontWeight: '600' }]} numberOfLines={1}>
              {devamEden.hizmetler?.ad}
            </Text>
            <Rozet tur={devamEden.durum === 'sorun' ? 'uyari' : 'ana'}>{`${durumMetni[devamEden.durum]}, ${zaman(devamEden.planlanan_baslangic)}`}</Rozet>
          </View>
          <Simge ad="chevron-forward" boyut={20} renkli={renk.silik} />
        </Pressable>
      ) : null}

      <View style={{ gap: bosluk.s }}>
        <Text accessibilityRole="header" style={[stil.grupBaslik, { marginLeft: bosluk.xs }]}>
          Kategoriler
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -bosluk.l }}
          contentContainerStyle={{ paddingHorizontal: bosluk.l, gap: bosluk.s }}
        >
          {kategoriler.map((k) => {
            const secili = k.id === kategori?.id;
            return (
              <Pressable
                key={k.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: secili }}
                accessibilityLabel={k.ad}
                onPress={() => setSeciliKategori(k.id)}
                style={({ pressed }) => ({
                  width: 104,
                  padding: bosluk.m,
                  gap: bosluk.s,
                  borderRadius: 16,
                  backgroundColor: secili ? renk.anaKoyu : renk.kart,
                  borderWidth: 1,
                  borderColor: secili ? renk.anaKoyu : renk.cizgi,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: secili ? 'rgba(255,255,255,0.16)' : renk.anaAcik,
                  }}
                >
                  <Simge ad={kategoriSimgesi(k.ad)} boyut={20} renkli={secili ? '#FFFFFF' : renk.ana} />
                </View>
                <Text numberOfLines={2} style={[stil.ikincil, { fontWeight: '600', color: secili ? '#FFFFFF' : renk.metin }]}>
                  {kisaAd(k.ad)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {kategori ? (
        <Grup baslik={kategori.ad} sag={<Text style={[stil.meta, { color: renk.soluk }]}>{kategoriHizmetleri.length} iş</Text>}>
          {kategoriHizmetleri.map((h) => (
            <HizmetSatiri key={h.id} hizmet={h} />
          ))}
        </Grup>
      ) : null}

      {tekrarlar.length ? (
        <View style={{ gap: bosluk.s }}>
          <Text accessibilityRole="header" style={[stil.grupBaslik, { marginLeft: bosluk.xs }]}>
            Yeniden yaptır
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -bosluk.l }}
            contentContainerStyle={{ paddingHorizontal: bosluk.l, gap: bosluk.s }}
          >
            {tekrarlar.map((i) => (
              <Pressable
                key={i.id}
                accessibilityRole="button"
                accessibilityLabel={`${i.hizmetler?.ad} işini tekrar yaptır`}
                onPress={() => router.push({ pathname: '/hizmet/[id]', params: { id: i.hizmet_id } })}
                style={({ pressed }) => [stil.kart, { width: 200, gap: bosluk.s }, pressed && { opacity: 0.85 }]}
              >
                <Simge ad="repeat" boyut={20} renkli={renk.ana} />
                <Text style={[stil.metin, { fontWeight: '600' }]} numberOfLines={2}>
                  {i.hizmetler?.ad}
                </Text>
                <Text style={[stil.meta, { color: renk.soluk }]}>Son: {zaman(i.planlanan_baslangic)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={[stil.kart, { flexDirection: 'row', gap: bosluk.m, alignItems: 'center', backgroundColor: renk.damgaAcik, borderColor: '#F0DE9C' }]}>
        <OkDamgasi boyut={48} />
        <View style={{ flex: 1, gap: bosluk.xs }}>
          <Text style={[stil.metin, { fontWeight: '600' }]}>Gelen kişiyi tanıyoruz</Text>
          <Text style={[stil.ikincil, { color: renk.soluk }]}>
            Herkesle yüz yüze görüştük, sicilini kontrol ettik. Fiyatı baştan görürsün, iş sırasında sigortalıdır.
          </Text>
        </View>
      </View>
    </Ekran>
  );
}

function HizmetSatiri({ hizmet, kategori }: { hizmet: Hizmet; kategori?: string }) {
  return (
    <GrupSatiri
      simge={kategori ? kategoriSimgesi(kategori) : undefined}
      baslik={hizmet.ad}
      alt={hizmet.aciklama ?? undefined}
      onPress={() => router.push({ pathname: '/hizmet/[id]', params: { id: hizmet.id } })}
    />
  );
}
