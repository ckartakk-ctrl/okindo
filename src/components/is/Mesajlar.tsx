// İş ekranı: Mesajlar sekmesi (K44)
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { BilgiSatiri, bosluk, Bos, renk, Simge, stil } from '@/components/ui';
import type { Veri, Eylem } from './ortak';
import { sohbetAcik } from './ortak';

export function Mesajlar({ veri, ben, eylem }: { veri: Veri; ben: string; eylem: Eylem }) {
  const [metin, setMetin] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const acik = sohbetAcik.includes(veri.is.durum);
  const saat = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  async function gonder() {
    if (!metin.trim()) {
      setHata('Göndermek için bir şey yaz.');
      return;
    }
    await eylem('mesaj_gonder', { p_is: veri.is.id, p_metin: metin.trim() });
    setMetin('');
  }

  return (
    <>
      <BilgiSatiri simge="shield-checkmark-outline">
        Güvenliğin için telefon, IBAN ve e-posta mesajlarda gizlenir. okindo senden asla uygulama dışında ödeme istemez.
      </BilgiSatiri>
      {veri.mesajlar.length === 0 ? (
        <Bos
          simge="chatbubbles-outline"
          baslik="Henüz mesaj yok"
          metin={acik ? 'Kapı, otopark ya da malzeme gibi konuları buradan konuşabilirsiniz.' : 'Bu iş için mesajlaşma kapandı.'}
        />
      ) : (
        <View style={{ gap: bosluk.s }}>
          {veri.mesajlar.map((m) => {
            const benim = m.gonderen_id === ben;
            return (
              <View
                key={m.id}
                style={{
                  alignSelf: benim ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: benim ? renk.ana : renk.kart,
                  borderRadius: 16,
                  borderBottomRightRadius: benim ? 4 : 16,
                  borderBottomLeftRadius: benim ? 16 : 4,
                  borderWidth: benim ? 0 : 1,
                  borderColor: renk.cizgi,
                  paddingHorizontal: bosluk.m,
                  paddingVertical: bosluk.s,
                  gap: bosluk.xs,
                }}
              >
                <Text style={[stil.metin, { color: benim ? '#FFFFFF' : renk.metin }]}>{m.metin}</Text>
                <Text style={[stil.meta, { color: benim ? '#CFE9E2' : renk.silik, alignSelf: 'flex-end' }]}>{saat(m.olusturma_at)}</Text>
              </View>
            );
          })}
        </View>
      )}
      {acik ? (
        <View style={{ gap: bosluk.s }}>
          <Text style={stil.etiket}>Mesaj yaz</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: bosluk.s }}>
            <TextInput
              accessibilityLabel="Mesaj yaz"
              value={metin}
              onChangeText={(t) => {
                setMetin(t);
                if (hata) setHata(null);
              }}
              multiline
              placeholder="Örnek: 5 dakikaya oradayım"
              placeholderTextColor={renk.silik}
              style={[stil.girdi, { flex: 1, maxHeight: 120 }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mesajı gönder"
              onPress={() => gonder().catch((e: Error) => setHata(e.message))}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: renk.ana,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Simge ad="send" boyut={20} renkli="#FFFFFF" />
            </Pressable>
          </View>
          {hata ? <Text style={[stil.ikincil, { color: renk.uyari }]}>{hata}</Text> : null}
        </View>
      ) : null}
    </>
  );
}
