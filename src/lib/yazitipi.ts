import * as Bricolage from '@expo-google-fonts/bricolage-grotesque';
import { Platform } from 'react-native';

/**
 * Başlık yazı tipi: Bricolage Grotesque 600 (UX kuralı: 600'ün üstünde ağırlık yok).
 * Paket dışa aktarım adlarını sürümden sürüme değiştirebildiği için dosya, adın içinde
 * "600" geçen ilk yazı tipi olarak bulunur. Bulunamazsa başlıklar sistem yazısıyla gösterilir.
 */
function bul(): unknown {
  const tum = Bricolage as unknown as Record<string, unknown>;
  const adaylar = Object.keys(tum)
    .filter((k) => /600/.test(k) && !/italic/i.test(k) && tum[k] != null && typeof tum[k] !== 'function')
    .sort((a, b) => a.length - b.length);
  return adaylar.length ? tum[adaylar[0]] : undefined;
}

const dosya = bul();

/** useFonts'a verilecek liste (boş olabilir) */
export const yaziTipleri: Record<string, number> = dosya ? { 'Baslik-600': dosya as number } : {};

/** Başlık yazı ailesi; yazı tipi bulunamadıysa undefined (sistem yazısı) */
export const baslikAilesi: string | undefined = !dosya
  ? undefined
  : Platform.OS === 'web'
    ? // Tarayıcıda yazı tipi gelmezse tırnaklı (serif) yazıya değil sistem yazısına düşsün
      'Baslik-600, system-ui, -apple-system, Roboto, sans-serif'
    : 'Baslik-600';
