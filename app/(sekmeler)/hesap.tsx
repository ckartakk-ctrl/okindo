import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ekran, Grup, GrupSatiri, Kart, OkDamgasi, onayla, renk, Rozet, Simge, Tutar, yazi } from '@/components/ui';
import { tl } from '@/lib/bicim';
import { useOturum, type Mod } from '@/lib/oturum';
import { rpc, supabase } from '@/lib/supabase';
import type { Kupon } from '@/lib/tipler';

export default function Hesap() {
  const { profil, mod, modDegistir, cikis } = useOturum();
  const [kuponlar, setKuponlar] = useState<Kupon[]>([]);
  const [okunmamis, setOkunmamis] = useState(0);
  const [destek, setDestek] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    const simdi = new Date().toISOString();
    const [k, b, d] = await Promise.all([
      supabase.from('kuponlar').select('*').is('kullanildi_is_id', null).gt('son_gecerlilik', simdi).order('son_gecerlilik'),
      supabase.from('bildirimler').select('id', { count: 'exact', head: true }).eq('okundu', false),
      supabase.from('ayarlar').select('deger').eq('anahtar', 'destek_telefonu').maybeSingle(),
    ]);
    setKuponlar((k.data as Kupon[]) ?? []);
    setOkunmamis(b.count ?? 0);
    const tel = (d.data as { deger: string } | null)?.deger;
    setDestek(tel && tel.length > 5 ? tel : null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      yukle();
    }, [yukle]),
  );

  if (!profil) return null;

  const basHarf = (profil.ad ?? '?').slice(0, 1).toLocaleUpperCase('tr-TR');
  const hvAktif = profil.hv_durum === 'aktif';

  return (
    <Ekran yenile={yukle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 }}>
        <View>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: renk.anaKoyu,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: yazi.baslik, fontSize: 28, color: '#FFFFFF' }}>{basHarf}</Text>
          </View>
          {hvAktif ? (
            <View style={{ position: 'absolute', right: -8, bottom: -6 }}>
              <OkDamgasi boyut={28} />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: yazi.kalin, fontSize: 20, color: renk.metin }}>
            {profil.ad} {profil.soyad ?? ''}
          </Text>
          <Text style={{ fontSize: 14, color: renk.soluk }}>{profil.telefon ? `+${profil.telefon.replace(/^\+/, '')}` : ''}</Text>
          {hvAktif ? <Rozet tur="damga">Onaylı hizmet veren</Rozet> : null}
        </View>
      </View>

      {profil.hv_durum !== 'yok' ? (
        <ModSecici mod={mod} sec={(m) => {
          modDegistir(m);
          router.replace('/');
        }} />
      ) : (
        <Kart vurgu="koyu" onPress={() => router.push('/hv-basvuru')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: yazi.kalin, fontSize: 17, color: '#FFFFFF' }}>okindo’da iş al</Text>
              <Text style={{ fontSize: 13, lineHeight: 18, color: '#BFE0D8' }}>
                Elinden gelen işi, mahallende kayıtlı ve sigortalı ek gelire çevir.
              </Text>
            </View>
            <Simge ad="arrow-forward-circle" boyut={32} renkli={renk.damga} />
          </View>
        </Kart>
      )}

      {hvAktif && !profil.egitim_tamam_at ? (
        <Grup>
          <GrupSatiri simge="school-outline" baslik="Eğitimi tamamla" alt="İş almaya başlamadan önceki son adım" onPress={() => router.push('/egitim')} />
        </Grup>
      ) : null}

      {mod === 'musteri' ? (
        kuponlar.length ? (
          <Grup baslik="Kuponların">
            {kuponlar.map((k) => (
              <GrupSatiri
                key={k.id}
                simge="pricetag-outline"
                baslik={k.sebep}
                alt={`Son gün ${new Date(k.son_gecerlilik).toLocaleDateString('tr-TR')}. Sıradaki işinde kendiliğinden düşülür.`}
                sag={<Tutar boyut={18} renkli={renk.anaKoyu}>{tl(k.tutar)}</Tutar>}
              />
            ))}
          </Grup>
        ) : null
      ) : null}

      <Grup baslik="Genel">
        <GrupSatiri
          simge="notifications-outline"
          baslik="Bildirimler"
          sag={okunmamis ? <Rozet>{`${okunmamis} yeni`}</Rozet> : undefined}
          onPress={() => router.push('/bildirimler')}
        />
        {destek ? <GrupSatiri simge="call-outline" baslik="okindo’ya sor" alt="Destek hattını ara" onPress={() => Linking.openURL(`tel:${destek}`)} /> : null}
        {profil.yonetici ? <GrupSatiri simge="shield-checkmark-outline" baslik="Yönetici paneli" onPress={() => router.push('/yonetici')} /> : null}
      </Grup>

      <Grup>
        <GrupSatiri simge="log-out-outline" baslik="Çıkış yap" ok={false} onPress={cikis} />
        <GrupSatiri
          simge="trash-outline"
          baslik="Hesabımı sil"
          tehlike
          ok={false}
          onPress={async () => {
            const tamam = await onayla(
              'Hesabını sil',
              'Hesabın ve kişisel bilgilerin silinir. Yasal olarak saklamamız gereken fatura kayıtları süresi dolana kadar kalır.',
              'Hesabımı sil',
            );
            if (!tamam) return;
            await rpc('hesap_silme_istegi');
            await supabase.functions.invoke('hesap-sil');
            await cikis();
          }}
        />
      </Grup>
    </Ekran>
  );
}

/** İki konumlu anahtar: hizmet alıyorum / hizmet veriyorum */
function ModSecici({ mod, sec }: { mod: Mod; sec: (m: Mod) => void }) {
  const secenekler: { deger: Mod; ad: string }[] = [
    { deger: 'musteri', ad: 'Hizmet alıyorum' },
    { deger: 'hv', ad: 'Hizmet veriyorum' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#DDE6E3', borderRadius: 16, padding: 4 }}>
      {secenekler.map((s) => {
        const aktif = s.deger === mod;
        return (
          <Pressable
            key={s.deger}
            accessibilityRole="button"
            accessibilityState={{ selected: aktif }}
            onPress={() => !aktif && sec(s.deger)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              backgroundColor: aktif ? renk.kart : 'transparent',
            }}
          >
            <Text style={{ fontFamily: yazi.kalin, fontSize: 15, color: aktif ? renk.anaKoyu : renk.soluk }}>{s.ad}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
