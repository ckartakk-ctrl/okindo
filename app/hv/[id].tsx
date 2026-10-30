import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Avatar, BilgiSatiri, Bos, bosluk, Dugme, Ekran, Grup, GrupSatiri, Kart, renk, Rozet, Simge, stil, Tutar, Yukleniyor } from '@/components/ui';
import { profilFotoAdresi } from '@/lib/foto';
import { rpc } from '@/lib/supabase';
import type { HvProfili } from '@/lib/tipler';

const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Detay kalıbı: gelecek kişinin herkese açık profili (müşteri görür) */
export default function HvProfilEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<HvProfili | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setP(await rpc<HvProfili>('hv_profili', { p_hv: id }));
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Profil açılamadı.');
    }
  }, [id]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  if (hata) {
    return (
      <Ekran>
        <Bos
          simge="person-outline"
          baslik="Profil açılamadı"
          metin={hata}
          eylem={
            <Dugme tur="ikincil" onPress={() => router.back()}>
              Geri dön
            </Dugme>
          }
        />
      </Ekran>
    );
  }
  if (!p) return <Yukleniyor tur="detay" />;

  const uye = new Date(p.uye_olma);

  return (
    <Ekran yenile={yukle}>
      <View style={{ alignItems: 'center', gap: bosluk.m, paddingTop: bosluk.s }}>
        <Avatar ad={p.ad} foto={profilFotoAdresi(p.foto_yolu)} boyut={96} onayli />
        <Text accessibilityRole="header" style={[stil.baslik, { textAlign: 'center' }]}>
          {p.ad}
        </Text>
        <View style={{ flexDirection: 'row', gap: bosluk.s, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Rozet tur="damga">okindo onaylı</Rozet>
          {p.kurucu ? <Rozet>Kurucu</Rozet> : null}
        </View>
      </View>

      <View style={[stil.grup, { flexDirection: 'row' }]}>
        {[
          { deger: p.puan ? String(p.puan).replace('.', ',') : 'Yeni', ad: p.puan ? `${p.puan_sayisi} puan` : 'Henüz puan yok', simge: 'star' as const },
          { deger: String(p.is_sayisi), ad: 'tamamlanan iş', simge: 'checkmark-circle' as const },
          { deger: p.mahalle ?? '—', ad: 'mahalle', simge: 'location' as const },
        ].map((k, i) => (
          <View key={k.ad} style={{ flex: 1, padding: bosluk.m, alignItems: 'center', gap: bosluk.xs, borderLeftWidth: i ? 1 : 0, borderLeftColor: renk.cizgi }}>
            <Simge ad={k.simge} boyut={20} renkli={k.simge === 'star' ? renk.damga : renk.ana} />
            <Tutar boyut={k.deger.length > 6 ? 16 : 22}>{k.deger}</Tutar>
            <Text style={[stil.meta, { color: renk.soluk, textAlign: 'center' }]}>{k.ad}</Text>
          </View>
        ))}
      </View>

      <Kart>
        <Text style={stil.altBaslik}>Neden güvenebilirsin?</Text>
        <BilgiSatiri simge="people-outline">okindo ekibi bu kişiyle yüz yüze görüştü ve yaptığı işten küçük bir uygulama gördü.</BilgiSatiri>
        <BilgiSatiri simge="document-text-outline">e-Devlet barkodlu adli sicil kaydı kontrol edildi, 6 ayda bir yenilenir.</BilgiSatiri>
        <BilgiSatiri simge="shield-checkmark-outline">Kapı kodu girildiği andan iş bitene kadar sigortalı.</BilgiSatiri>
        <BilgiSatiri simge="calendar-outline">{`${aylar[uye.getMonth()]} ${uye.getFullYear()} tarihinden beri okindo’da.`}</BilgiSatiri>
      </Kart>

      {p.hizmetler.length ? (
        <Grup baslik="Yapabildiği işler">
          {p.hizmetler.map((h) => (
            <GrupSatiri key={h} simge="checkmark" baslik={h} />
          ))}
        </Grup>
      ) : null}

      <Grup baslik="Müşteri yorumları">
        {p.yorumlar.length ? (
          p.yorumlar.map((y, i) => (
            <View key={i} style={{ padding: bosluk.l, flexDirection: 'row', gap: bosluk.m }}>
              <Simge ad="chatbox-ellipses-outline" boyut={20} renkli={renk.silik} />
              <Text style={[stil.metin, { flex: 1 }]}>“{y}”</Text>
            </View>
          ))
        ) : (
          <GrupSatiri
            simge="time-outline"
            baslik="Yorumlar 10 puandan sonra görünür"
            alt="Kim yazdığı anlaşılmasın diye yorumlar toplu ve karışık sırayla gösterilir."
          />
        )}
      </Grup>
    </Ekran>
  );
}
