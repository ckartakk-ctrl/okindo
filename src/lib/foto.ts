import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase } from './supabase';

const ALFABE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 metni ham bayta çevirir (Android'de dosyayı fetch ile okumak güvenilir değil) */
function base64Coz(b64: string): ArrayBuffer {
  const temiz = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const uzunluk = Math.floor((temiz.length * 3) / 4);
  const bayt = new Uint8Array(uzunluk);
  let j = 0;
  for (let i = 0; i < temiz.length; i += 4) {
    const a = ALFABE.indexOf(temiz[i]);
    const b = ALFABE.indexOf(temiz[i + 1]);
    const c = i + 2 < temiz.length ? ALFABE.indexOf(temiz[i + 2]) : 0;
    const d = i + 3 < temiz.length ? ALFABE.indexOf(temiz[i + 3]) : 0;
    const sayi = (a << 18) | (b << 12) | (c << 6) | d;
    if (j < uzunluk) bayt[j++] = (sayi >> 16) & 255;
    if (j < uzunluk && i + 2 < temiz.length) bayt[j++] = (sayi >> 8) & 255;
    if (j < uzunluk && i + 3 < temiz.length) bayt[j++] = sayi & 255;
  }
  return bayt.buffer.slice(0, j);
}

/** Kamera mı galeri mi? Kullanıcıya sorar. */
function kaynakSor(): Promise<'kamera' | 'galeri' | null> {
  return new Promise((coz) =>
    Alert.alert('Fotoğraf ekle', 'Fotoğrafı nereden ekleyeceksin?', [
      { text: 'Vazgeç', style: 'cancel', onPress: () => coz(null) },
      { text: 'Galeriden seç', onPress: () => coz('galeri') },
      { text: 'Fotoğraf çek', onPress: () => coz('kamera') },
    ], { cancelable: true, onDismiss: () => coz(null) }),
  );
}

/**
 * Kamerayla ya da galeriden fotoğraf alır ve iş klasörüne yükler.
 * Dönen yol "<iş-id>/<dosya>.jpg" biçimindedir; veritabanına bu yol kaydedilir.
 */
export async function fotoCekVeYukle(isId: string, onEk: string, kaynak?: 'kamera' | 'galeri'): Promise<string | null> {
  const secim = kaynak ?? (await kaynakSor());
  if (!secim) return null;

  const izin =
    secim === 'kamera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!izin.granted) {
    throw new Error(
      secim === 'kamera'
        ? 'Kamera izni kapalı. Telefon ayarlarında okindo için kamera iznini aç ya da "Galeriden seç"i kullan.'
        : 'Galeri izni kapalı. Telefon ayarlarında okindo için fotoğraf iznini aç.',
    );
  }

  const ayar: ImagePicker.ImagePickerOptions = { quality: 0.4, base64: true, mediaTypes: ['images'], exif: false };
  let sonuc: ImagePicker.ImagePickerResult;
  try {
    sonuc = secim === 'kamera' ? await ImagePicker.launchCameraAsync(ayar) : await ImagePicker.launchImageLibraryAsync(ayar);
  } catch {
    throw new Error(
      secim === 'kamera' ? 'Kamera açılamadı. "Galeriden seç" ile telefonun kamerasıyla çektiğin fotoğrafı ekleyebilirsin.' : 'Galeri açılamadı.',
    );
  }
  if (sonuc.canceled || !sonuc.assets?.length) return null;

  const dosya = sonuc.assets[0];
  if (!dosya.base64) throw new Error('Fotoğraf okunamadı. Bir kez daha dene.');

  const yol = `${isId}/${onEk}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('is-fotograflari')
    .upload(yol, base64Coz(dosya.base64), { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error('Fotoğraf yüklenemedi. Bağlantını kontrol edip tekrar dene.');
  return yol;
}

export async function fotoAdresi(yol: string): Promise<string | null> {
  const { data } = await supabase.storage.from('is-fotograflari').createSignedUrl(yol, 60 * 30);
  return data?.signedUrl ?? null;
}

/** Profil fotoğrafının herkese açık adresi (yol yoksa null) */
export function profilFotoAdresi(yol: string | null | undefined): string | null {
  if (!yol) return null;
  return supabase.storage.from('profil-fotograflari').getPublicUrl(yol).data.publicUrl;
}

/** Profil fotoğrafı seçtirir, kare kırpar, yükler ve profile kaydeder. Yeni yolu döndürür. */
export async function profilFotoYukle(kullaniciId: string): Promise<string | null> {
  const secim = await kaynakSor();
  if (!secim) return null;
  const izin =
    secim === 'kamera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!izin.granted) throw new Error('Fotoğraf eklemek için telefon ayarlarından okindo’ya izin ver.');
  const ayar: ImagePicker.ImagePickerOptions = { quality: 0.5, base64: true, mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1] };
  const sonuc = secim === 'kamera' ? await ImagePicker.launchCameraAsync(ayar) : await ImagePicker.launchImageLibraryAsync(ayar);
  if (sonuc.canceled || !sonuc.assets?.[0]?.base64) return null;
  const yol = `${kullaniciId}/profil-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('profil-fotograflari')
    .upload(yol, base64Coz(sonuc.assets[0].base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error('Fotoğraf yüklenemedi. Bağlantını kontrol edip tekrar dene.');
  const { error: e2 } = await supabase.from('profiller').update({ foto_yolu: yol }).eq('id', kullaniciId);
  if (e2) throw new Error('Fotoğraf kaydedilemedi. Tekrar dene.');
  return yol;
}
