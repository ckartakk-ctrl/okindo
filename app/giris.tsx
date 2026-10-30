import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bosluk, Dugme, Girdi, Metin, renk, stil } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/** Telefon numarasını +90 ile başlayan biçime çevirir: "0532 123 45 67" → "+905321234567" */
function telefonDuzelt(girdi: string): string | null {
  const rakam = girdi.replace(/\D/g, '');
  const yerel = rakam.startsWith('90') ? rakam.slice(2) : rakam.startsWith('0') ? rakam.slice(1) : rakam;
  return /^5\d{9}$/.test(yerel) ? `+90${yerel}` : null;
}

export default function Giris() {
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
    if (error) throw new Error('Kod doğru değil ya da süresi doldu.');
  }

  return (
    <SafeAreaView style={stil.ekran}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ padding: bosluk.xl, gap: bosluk.l }}>
          <View style={{ gap: 6, marginBottom: bosluk.l }}>
            <Text style={{ fontSize: 34, fontWeight: '800', color: renk.ana }}>okindo</Text>
            <Text style={[stil.metin, { fontSize: 18, color: renk.soluk }]}>okindo’ysa OK.</Text>
          </View>
          {!gonderildi ? (
            <>
              <Girdi
                etiket="Cep telefonun"
                placeholder="05xx xxx xx xx"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={telefon}
                onChangeText={setTelefon}
              />
              <Dugme onPress={kodGonder}>Kodu gönder</Dugme>
              <Metin soluk kucuk>
                Telefonuna tek kullanımlık bir kod göndereceğiz. Numaran hiçbir zaman hizmet verene gösterilmez.
              </Metin>
            </>
          ) : (
            <>
              <Metin>{gonderildi} numarasına gelen 6 haneli kodu yaz.</Metin>
              <Girdi etiket="Kod" keyboardType="number-pad" autoComplete="sms-otp" maxLength={6} value={kod} onChangeText={setKod} />
              <Dugme onPress={kodDogrula} pasif={kod.trim().length < 6}>
                Giriş yap
              </Dugme>
              <Dugme tur="ikincil" onPress={() => setGonderildi(null)}>
                Numarayı değiştir
              </Dugme>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
