import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Avatar, BilgiSatiri, bosluk, Ekran, Grup, GrupSatiri, hataGoster, Kart, onayla, renk, Rozet, Simge, stil, Tutar, yazi } from '@/components/ui';
import { profilFotoAdresi, profilFotoYukle } from '@/lib/foto';
import { tl } from '@/lib/bicim';
import { useOturum, type Mod } from '@/lib/oturum';
import { rpc, supabase } from '@/lib/supabase';
import type { Kupon } from '@/lib/tipler';

export default function Hesap() {
  const { profil, mod, modDegistir, cikis, profilYenile } = useOturum();
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

  const hvAktif = profil.hv_durum === 'aktif';

  return (
    <Ekran yenile={yukle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: bosluk.l, paddingVertical: bosluk.xs }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profil.foto_yolu ? 'Profil fotoğrafını değiştir' : 'Profil fotoğrafı ekle'}
          onPress={async () => {
            try {
              if (await profilFotoYukle(profil.id)) await profilYenile();
            } catch (e) {
              hataGoster(e);
            }
          }}
        >
          <Avatar ad={profil.ad ?? '?'} foto={profilFotoAdresi(profil.foto_yolu)} boyut={72} onayli={hvAktif} />
          <View style={{ position: 'absolute', left: -4, bottom: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: renk.kart, borderWidth: 1, borderColor: renk.cizgi, alignItems: 'center', justifyContent: 'center' }}>
            <Simge ad="camera" boyut={16} renkli={renk.anaKoyu} />
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: bosluk.xs }}>
          <Text style={[stil.altBaslik]}>
            {profil.ad} {profil.soyad ?? ''}
          </Text>
          <Text style={[stil.ikincil, { color: renk.soluk }]}>{profil.telefon ? `+${profil.telefon.replace(/^\+/, '')}` : ''}</Text>
          {hvAktif ? <Rozet tur="damga">Onaylı hizmet veren</Rozet> : null}
        </View>
      </View>
      {hvAktif && !profil.foto_yolu ? (
        <Kart vurgu="damga">
          <BilgiSatiri simge="camera-outline" renkli="#6E5200">
            Fotoğraflı profiller daha çok tercih edilir. Yüzünün net göründüğü bir fotoğraf ekle.
          </BilgiSatiri>
        </Kart>
      ) : null}

      {profil.hv_durum !== 'yok' ? (
        <ModSecici mod={mod} sec={(m) => {
          modDegistir(m);
          router.replace('/');
        }} />
      ) : (
        <Kart vurgu="koyu" onPress={() => router.push('/hv-basvuru')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[stil.altBaslik, { color: '#FFFFFF' }]}>okindo’da iş al</Text>
              <Text style={[stil.ikincil, { color: '#CFE9E2' }]}>
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
              `“${[profil.ad, profil.soyad].filter(Boolean).join(' ')}” hesabını sil`,
              'Hesabın ve kişisel bilgilerin silinir. Yasal olarak saklamamız gereken fatura kayıtları süresi dolana kadar kalır. Bu işlem geri alınamaz.',
              'Hesabımı sil',
              true,
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
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: '#DDE6E3', borderRadius: 12, padding: bosluk.xs }}>
      {secenekler.map((s) => {
        const aktif = s.deger === mod;
        return (
          <Pressable
            key={s.deger}
            accessibilityRole="radio"
            accessibilityState={{ checked: aktif }}
            onPress={() => !aktif && sec(s.deger)}
            style={{
              flex: 1,
              minHeight: 44,
              justifyContent: 'center',
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: aktif ? renk.kart : 'transparent',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: aktif ? '600' : '500', color: aktif ? renk.anaKoyu : renk.soluk }}>{s.ad}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
