// Uygulamanın giriş noktası.
// Başlangıçta oluşan ölümcül bir hata uygulamayı kapatırsa, mesajı saklarız ve
// bir sonraki açılışta ekranda gösteririz (sürüm APK'larında hata ekranı yoktur).
import AsyncStorage from '@react-native-async-storage/async-storage';

const onceki = global.ErrorUtils?.getGlobalHandler?.();
global.ErrorUtils?.setGlobalHandler?.((hata, olumcul) => {
  try {
    const mesaj = `${hata?.name ?? 'Hata'}: ${hata?.message ?? String(hata)}\n${String(hata?.stack ?? '').split('\n').slice(0, 6).join('\n')}`;
    AsyncStorage.setItem('okindo-son-hata', mesaj).catch(() => undefined);
  } catch {
    // saklanamazsa yapacak bir şey yok
  }
  if (onceki) onceki(hata, olumcul);
});

require('expo-router/entry');
