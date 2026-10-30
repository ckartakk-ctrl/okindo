import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AltBaslik, Bos, bosluk, Ekran, Grup, GrupSatiri, OkDamgasi, renk, Simge, UstBlok, yazi, type SimgeAdi } from '@/components/ui';
import { useOturum } from '@/lib/oturum';
import { supabase } from '@/lib/supabase';
import type { Hizmet, Kategori } from '@/lib/tipler';

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

export function MusteriAnasayfa() {
  const { profil } = useOturum();
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [hizmetler, setHizmetler] = useState<Hizmet[]>([]);
  const [arama, setArama] = useState('');
  const [seciliKategori, setSeciliKategori] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    const [k, h] = await Promise.all([
      supabase.from('kategoriler').select('*').eq('pilotta_acik', true).order('sira'),
      supabase.from('hizmetler').select('*').eq('aktif', true).eq('usta_gerekli', false).order('ad'),
    ]);
    setKategoriler((k.data as Kategori[]) ?? []);
    setHizmetler((h.data as Hizmet[]) ?? []);
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const bulunan = useMemo(() => {
    const a = sade(arama.trim());
    if (!a) return null;
    return hizmetler.filter((h) => sade(h.ad).includes(a) || sade(h.aciklama ?? '').includes(a));
  }, [arama, hizmetler]);

  const kategori = kategoriler.find((k) => k.id === seciliKategori) ?? kategoriler[0];
  const kategoriHizmetleri = kategori ? hizmetler.filter((h) => h.kategori_id === kategori.id) : [];

  const ust = (
    <UstBlok>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: yazi.baslik, fontSize: 22, color: '#FFFFFF', letterSpacing: -0.5 }}>okindo</Text>
        <OkDamgasi boyut={38} />
      </View>
      <View style={{ gap: 2, marginTop: bosluk.s }}>
        {profil?.ad ? <Text style={{ fontSize: 16, color: '#BFE0D8' }}>Merhaba {profil.ad},</Text> : null}
        <Text style={{ fontFamily: yazi.baslik, fontSize: 32, lineHeight: 37, color: '#FFFFFF', letterSpacing: -0.8 }}>
          Bugün ne yaptıralım?
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          paddingHorizontal: 14,
          marginTop: bosluk.s,
        }}
      >
        <Simge ad="search" boyut={20} renkli={renk.soluk} />
        <TextInput
          placeholder="Musluk, dolap montajı, temizlik…"
          placeholderTextColor={renk.silik}
          value={arama}
          onChangeText={setArama}
          returnKeyType="search"
          accessibilityLabel="Hizmet ara"
          style={{ flex: 1, fontSize: 16, color: renk.metin, paddingVertical: 14 }}
        />
        {arama ? (
          <Pressable accessibilityLabel="Aramayı temizle" hitSlop={10} onPress={() => setArama('')}>
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
          <Grup baslik={`${bulunan.length} sonuç`}>
            {bulunan.map((h) => (
              <HizmetSatiri key={h.id} hizmet={h} />
            ))}
          </Grup>
        ) : (
          <Bos
            simge="search-outline"
            baslik="Bunu henüz bulamadık"
            metin="Farklı bir kelimeyle ara ya da kategorilerden en yakın işi seç. Tadilat ve boya gibi büyük işler okindo’da yok."
          />
        )}
      </Ekran>
    );
  }

  return (
    <Ekran yenile={yukle} ust={ust}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -bosluk.l }}
        contentContainerStyle={{ paddingHorizontal: bosluk.l, gap: 10, paddingTop: 4 }}
      >
        {kategoriler.map((k) => {
          const secili = k.id === kategori?.id;
          return (
            <Pressable
              key={k.id}
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              onPress={() => setSeciliKategori(k.id)}
              style={({ pressed }) => ({
                width: 104,
                padding: 12,
                gap: 10,
                borderRadius: 18,
                backgroundColor: secili ? renk.ana : renk.kart,
                borderWidth: 1,
                borderColor: secili ? renk.ana : renk.cizgi,
                transform: pressed ? [{ scale: 0.97 }] : undefined,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: secili ? 'rgba(255,255,255,0.18)' : renk.anaAcik,
                }}
              >
                <Simge ad={kategoriSimgesi(k.ad)} boyut={22} renkli={secili ? '#FFFFFF' : renk.ana} />
              </View>
              <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', lineHeight: 18, color: secili ? '#FFFFFF' : renk.metin }}>
                {kisaAd(k.ad)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {kategori ? (
        <>
          <AltBaslik>{kategori.ad}</AltBaslik>
          <Grup>
            {kategoriHizmetleri.map((h) => (
              <HizmetSatiri key={h.id} hizmet={h} />
            ))}
          </Grup>
        </>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          gap: 14,
          alignItems: 'center',
          backgroundColor: renk.damgaAcik,
          borderRadius: 20,
          padding: bosluk.l,
          marginTop: bosluk.s,
        }}
      >
        <OkDamgasi boyut={46} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: yazi.kalin, fontSize: 16, color: renk.metin }}>Gelen kişiyi tanıyoruz</Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: renk.soluk }}>
            Herkesle yüz yüze görüştük, sicilini kontrol ettik. Fiyatı baştan görürsün, iş sırasında sigortalıdır.
          </Text>
        </View>
      </View>
    </Ekran>
  );
}

function HizmetSatiri({ hizmet }: { hizmet: Hizmet }) {
  return (
    <GrupSatiri
      baslik={hizmet.ad}
      alt={hizmet.aciklama ?? undefined}
      onPress={() => router.push({ pathname: '/hizmet/[id]', params: { id: hizmet.id } })}
    />
  );
}
