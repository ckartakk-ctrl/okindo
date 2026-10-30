import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BilgiSatiri, bosluk, Dugme, Girdi, OkDamgasi, renk, useAcikDurumCubugu, yazi } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/** Telefon numarasını +90 ile başlayan biçime çevirir: "0532 123 45 67" → "+905321234567" */
function telefonDuzelt(girdi: string): string | null {
  const rakam = girdi.replace(/\D/g, '');
  const yerel = rakam.startsWith('90') ? rakam.slice(2) : rakam.startsWith('0') ? rakam.slice(1) : rakam;
  return /^5\d{9}$/.test(yerel) ? `+90${yerel}` : null;
}

/** "+905321234567" → "0532 123 45 67" */
function okunur(t: string) {
  const y = t.replace('+90', '0');
  return `${y.slice(0, 4)} ${y.slice(4, 7)} ${y.slice(7, 9)} ${y.slice(9)}`;
}

export default function Giris() {
  const kenar = useSafeAreaInsets();
  useAcikDurumCubugu();
  const [telefon, setTelefon] = useState('');
  const [kod, setKod] = useState('');
  const [gonderildi, setGonderildi] = useState<string | null>(null);

  async function kodGonder() {
    const t = telefonDuzelt(telefon);
    if (!t) throw new Error('Cep telefonu numaranı 05xx xxx xx xx biçiminde yaz.');
    const { error } = await supabase.auth.signInWithOtp({ phone: t });
    if (error) throw new Error('Kod gönderilemedi. Biraz sonra tekrar dene.');
    setGonderildi(t);
  }

  async function kodDogrula() {
    if (!gonderildi) return;
    const { error } = await supabase.auth.verifyOtp({ phone: gonderildi, token: kod.trim(), type: 'sms' });
    if (error) throw new Error('Kod doğru değil ya da süresi dolmuş. Yeni kod isteyebilirsin.');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: renk.anaKoyu }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingTop: kenar.top + 40, paddingHorizontal: bosluk.xl, paddingBottom: 36 }}>
          <OkDamgasi boyut={88} />
          <Text style={{ fontFamily: yazi.baslik, fontSize: 52, lineHeight: 56, color: '#FFFFFF', letterSpacing: -1.5, marginTop: 28 }}>
            okindo
          </Text>
          <Text style={{ fontFamily: yazi.yari, fontSize: 22, color: renk.damga, marginTop: 2 }}>okindo’ysa OK.</Text>
          <Text style={{ fontSize: 16, lineHeight: 23, color: '#BFE0D8', marginTop: 14, maxWidth: 320 }}>
            Mahallendeki küçük işler için tanıdık, güvenilir eller. Fiyatı baştan gör, gönlün rahat olsun.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: renk.zemin,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: bosluk.xl,
            paddingBottom: kenar.bottom + bosluk.xl,
            gap: bosluk.m,
          }}
        >
          {!gonderildi ? (
            <>
              <Text style={{ fontFamily: yazi.kalin, fontSize: 20, color: renk.metin, marginBottom: 4 }}>Telefonunla gir</Text>
              <Girdi
                etiket="Cep telefonun"
                placeholder="05xx xxx xx xx"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={telefon}
                onChangeText={setTelefon}
              />
              <Dugme simge="chatbubble-ellipses-outline" onPress={kodGonder}>
                Kodu gönder
              </Dugme>
              <BilgiSatiri simge="lock-closed-outline">Numaran hizmet verene hiçbir zaman gösterilmez.</BilgiSatiri>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: yazi.kalin, fontSize: 20, color: renk.metin }}>Kodu yaz</Text>
              <Text style={{ fontSize: 15, lineHeight: 21, color: renk.soluk, marginBottom: 4 }}>
                {okunur(gonderildi)} numarasına 6 haneli bir kod gönderdik.
              </Text>
              <Girdi
                etiket="Doğrulama kodu"
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                value={kod}
                onChangeText={setKod}
                style={{ letterSpacing: 8, fontSize: 22, fontWeight: '700' }}
              />
              <Dugme onPress={kodDogrula} pasif={kod.trim().length < 6}>
                Giriş yap
              </Dugme>
              <Dugme
                tur="ikincil"
                onPress={() => {
                  setKod('');
                  setGonderildi(null);
                }}
              >
                Numarayı değiştir
              </Dugme>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
