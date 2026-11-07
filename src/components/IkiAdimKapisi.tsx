import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Linking, Text, View } from 'react-native';
import { Bos, bosluk, Dugme, Ekran, Girdi, Kart, Metin, stil, Yukleniyor } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Durum =
  | { tur: 'yukleniyor' }
  | { tur: 'tamam' }
  | { tur: 'kod'; faktorId: string }
  | { tur: 'kurulum'; faktorId: string; sir: string; uri: string };

/** Yönetici iki adımlı doğrulama ayarı açık mı? (ayarlar tablosu herkese okunur) */
async function ikiAdimZorunlu(): Promise<boolean> {
  const { data } = await supabase.from('ayarlar').select('deger').eq('anahtar', 'yonetici_iki_adim').maybeSingle();
  return data ? Number(data.deger) !== 0 : true;
}

/**
 * Yönetici ekranının kapısı (K52). Oturum iki adımlı doğrulamadan (aal2) geçmediyse içerik gösterilmez.
 * İlk seferde doğrulama uygulaması (Google Authenticator, Microsoft Authenticator…) kurulur,
 * sonraki girişlerde 6 haneli kod sorulur. Veritabanı da aynı kuralı uygular; bu ekran yalnız yolu gösterir.
 */
export function IkiAdimKapisi({ children, dogrulandi }: { children: ReactNode; dogrulandi: () => void }) {
  const [durum, setDurum] = useState<Durum>({ tur: 'yukleniyor' });
  const [kod, setKod] = useState('');

  const hazirla = useCallback(async () => {
    const { data: seviye, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    if (seviye.currentLevel === 'aal2' || !(await ikiAdimZorunlu())) {
      setDurum({ tur: 'tamam' });
      return;
    }
    const { data: faktorler, error: e2 } = await supabase.auth.mfa.listFactors();
    if (e2) throw e2;
    const dogrulanmis = faktorler.totp.find((f) => f.status === 'verified');
    if (dogrulanmis) {
      setDurum({ tur: 'kod', faktorId: dogrulanmis.id });
      return;
    }
    // Yarım kalmış kurulumlar temizlenir, yeni kurulum başlar
    for (const f of faktorler.all.filter((f) => f.status === 'unverified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: yeni, error: e3 } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'okindo yönetici' });
    if (e3) throw e3;
    setDurum({ tur: 'kurulum', faktorId: yeni.id, sir: yeni.totp.secret, uri: yeni.totp.uri });
  }, []);

  useEffect(() => {
    hazirla().catch(() => setDurum({ tur: 'kod', faktorId: '' }));
  }, [hazirla]);

  const dogrula = async (faktorId: string) => {
    if (!faktorId) throw new Error('İki adımlı doğrulama şu an başlatılamadı. Uygulamayı kapatıp yeniden aç.');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: faktorId, code: kod.trim() });
    if (error) throw new Error('Kod tutmadı. Uygulamadaki güncel 6 haneli kodu yaz.');
    setKod('');
    setDurum({ tur: 'tamam' });
    dogrulandi();
  };

  if (durum.tur === 'yukleniyor') return <Yukleniyor tur="form" />;
  if (durum.tur === 'tamam') return <>{children}</>;

  const kodGirdisi = (
    <Girdi
      etiket="6 haneli kod"
      value={kod}
      onChangeText={(t) => setKod(t.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      maxLength={6}
    />
  );

  if (durum.tur === 'kod') {
    return (
      <Ekran
        alt={
          <Dugme simge="shield-checkmark" eksik={kod.length === 6 ? null : '6 haneli kodu yaz'} onPress={() => dogrula(durum.faktorId)}>
            Doğrula
          </Dugme>
        }
      >
        <Bos
          simge="shield-checkmark-outline"
          baslik="Yönetici girişi"
          metin="Doğrulama uygulamandaki okindo kodunu yaz. Bu adım yönetici hesabını telefonun çalınsa bile korur."
        />
        {kodGirdisi}
      </Ekran>
    );
  }

  return (
    <Ekran
      alt={
        <Dugme simge="shield-checkmark" eksik={kod.length === 6 ? null : '6 haneli kodu yaz'} onPress={() => dogrula(durum.faktorId)}>
          Kurulumu bitir
        </Dugme>
      }
    >
      <Text accessibilityRole="header" style={stil.baslik}>
        İki adımlı doğrulamayı kur
      </Text>
      <Metin soluk>Yönetici paneli herkesin bilgisine erişir. Bu yüzden girişte telefonundaki bir uygulamadan kod istenir.</Metin>
      <Kart>
        <View style={{ gap: bosluk.s }}>
          <Metin kalin>1. Doğrulama uygulamasını aç</Metin>
          <Metin soluk kucuk>
            Google Authenticator ya da Microsoft Authenticator. Yoksa önce mağazadan indir.
          </Metin>
          <Dugme tur="ikincil" simge="open-outline" onPress={() => Linking.openURL(durum.uri)}>
            Uygulamaya ekle
          </Dugme>
          <Metin soluk kucuk>
            Düğme çalışmazsa uygulamada “Kurulum anahtarı gir” de ve şunu yaz:
          </Metin>
          <Text selectable style={[stil.metin, { fontVariant: ['tabular-nums'], letterSpacing: 1 }]}>
            {durum.sir}
          </Text>
        </View>
      </Kart>
      <Metin kalin>2. Uygulamadaki 6 haneli kodu yaz</Metin>
      {kodGirdisi}
    </Ekran>
  );
}
