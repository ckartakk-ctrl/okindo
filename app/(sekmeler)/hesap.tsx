import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { AltBaslik, Dugme, Ekran, Kart, Metin, onayla, Satir, Secenekler } from '@/components/ui';
import { tl } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
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

  return (
    <Ekran yenile={yukle}>
      <Kart>
        <Metin kalin>
          {profil.ad} {profil.soyad ?? ''}
        </Metin>
        <Metin soluk>{profil.telefon ? `+${profil.telefon.replace(/^\+/, '')}` : ''}</Metin>
      </Kart>

      {profil.hv_durum !== 'yok' ? (
        <Secenekler
          etiket="Uygulamayı nasıl kullanıyorsun?"
          secenekler={[
            { deger: 'musteri', ad: 'Hizmet alıyorum' },
            { deger: 'hv', ad: 'Hizmet veriyorum' },
          ]}
          secili={mod}
          sec={(m) => {
            modDegistir(m as 'musteri' | 'hv');
            router.replace('/');
          }}
        />
      ) : (
        <Kart onPress={() => router.push('/hv-basvuru')}>
          <Metin kalin>okindo’da iş al</Metin>
          <Metin soluk kucuk>Elinden gelen işi kayıtlı ve sigortalı ek gelire çevir.</Metin>
        </Kart>
      )}

      {profil.hv_durum === 'aktif' && !profil.egitim_tamam_at ? (
        <Dugme onPress={() => router.push('/egitim')}>Eğitimi tamamla</Dugme>
      ) : null}

      <Kart onPress={() => router.push('/bildirimler')}>
        <Satir sol="Bildirimler" sag={okunmamis ? `${okunmamis} yeni` : ''} />
      </Kart>

      {mod === 'musteri' ? (
        <>
          <AltBaslik>Kuponların</AltBaslik>
          {kuponlar.length ? (
            kuponlar.map((k) => (
              <Kart key={k.id}>
                <Satir sol={k.sebep} sag={tl(k.tutar)} kalin />
                <Metin soluk kucuk>Son gün: {new Date(k.son_gecerlilik).toLocaleDateString('tr-TR')} · sıradaki işinde kendiliğinden düşülür</Metin>
              </Kart>
            ))
          ) : (
            <Metin soluk>Şu an kuponun yok.</Metin>
          )}
        </>
      ) : null}

      {profil.yonetici ? (
        <Dugme tur="ikincil" onPress={() => router.push('/yonetici')}>
          Yönetici paneli
        </Dugme>
      ) : null}

      {destek ? (
        <Dugme tur="ikincil" onPress={() => Linking.openURL(`tel:${destek}`)}>
          okindo’ya sor (destek)
        </Dugme>
      ) : null}

      <Dugme tur="ikincil" onPress={cikis}>
        Çıkış yap
      </Dugme>
      <Dugme
        tur="tehlike"
        onPress={async () => {
          const tamam = await onayla(
            'Hesabını sil',
            'Hesabın ve kişisel bilgilerin silinir. Yasal olarak saklamamız gereken fatura kayıtları süresi dolana kadar kalır.',
            'Sil',
          );
          if (!tamam) return;
          await rpc('hesap_silme_istegi');
          await supabase.functions.invoke('hesap-sil');
          await cikis();
        }}
      >
        Hesabımı sil
      </Dugme>
    </Ekran>
  );
}
