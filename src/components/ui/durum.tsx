// Yükleniyor iskeleti, hata ve onay pencereleri
import { Fragment } from 'react';
import { Alert, View, type ViewStyle } from 'react-native';
import { bosluk, stil } from './tema';

function Kemik({ en, boy, yuvarlak = 8, stilEk }: { en?: number | `${number}%`; boy: number; yuvarlak?: number; stilEk?: ViewStyle }) {
  return <View style={[{ width: en ?? '100%', height: boy, borderRadius: yuvarlak, backgroundColor: '#E1E8E6' }, stilEk]} />;
}

/**
 * İçerik yüklenirken sayfanın iskeletini gösterir (tam ekran dönen çark yerine).
 * Hareketsizdir; azaltılmış hareket ayarında da aynı görünür.
 */
export function Yukleniyor({ tur = 'liste' }: { tur?: 'liste' | 'detay' | 'form' }) {
  return (
    <View accessibilityLabel="Yükleniyor" accessibilityRole="progressbar" style={[stil.ekran, stil.icerik]}>
      <Kemik en="60%" boy={28} />
      <Kemik en="85%" boy={16} />
      {tur === 'detay' ? (
        <View style={[stil.kart, { gap: bosluk.m }]}>
          <Kemik en="30%" boy={20} yuvarlak={10} />
          <Kemik en="70%" boy={24} />
          <Kemik boy={16} />
          <Kemik boy={40} />
        </View>
      ) : null}
      {tur === 'form' ? (
        <>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ gap: bosluk.s }}>
              <Kemik en="35%" boy={16} />
              <Kemik boy={48} yuvarlak={12} />
            </View>
          ))}
        </>
      ) : (
        <View style={stil.grup}>
          {[0, 1, 2, 3].map((i) => (
            <Fragment key={i}>
              {i > 0 ? <View style={stil.ayirici} /> : null}
              <View style={[stil.grupSatiri, { gap: bosluk.m }]}>
                <Kemik en={40} boy={40} yuvarlak={12} />
                <View style={{ flex: 1, gap: bosluk.s }}>
                  <Kemik en="70%" boy={16} />
                  <Kemik en="45%" boy={12} />
                </View>
              </View>
            </Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------- Uyarı pencereleri ------------------------ */

export function hataGoster(e: unknown) {
  const mesaj = e instanceof Error && e.message ? e.message : 'İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.';
  Alert.alert('İşlem tamamlanamadı', mesaj, [{ text: 'Kapat', style: 'cancel' }]);
}

/**
 * Onay penceresi. Vazgeç her zaman ilk ve varsayılan seçenektir.
 * Silme/iptal gibi geri alınamaz işlerde `tehlikeli` verilir; başlık işin adını içermelidir.
 */
export function onayla(baslik: string, mesaj: string, evet: string, tehlikeli = false): Promise<boolean> {
  return new Promise((coz) =>
    Alert.alert(
      baslik,
      mesaj,
      [
        { text: 'Vazgeç', style: 'cancel', onPress: () => coz(false) },
        { text: evet, style: tehlikeli ? 'destructive' : 'default', onPress: () => coz(true) },
      ],
      { cancelable: true, onDismiss: () => coz(false) },
    ),
  );
}
