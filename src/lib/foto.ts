import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/**
 * Kamerayla (ya da galeriden) fotoğraf çeker ve iş klasörüne yükler.
 * Dönen yol "<iş-id>/<dosya>.jpg" biçimindedir; veritabanına bu yol kaydedilir.
 */
export async function fotoCekVeYukle(isId: string, onEk: string, kaynak: 'kamera' | 'galeri' = 'kamera'): Promise<string | null> {
  const izin =
    kaynak === 'kamera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!izin.granted) throw new Error('Fotoğraf için izin vermelisin. Telefon ayarlarından okindo’ya kamera izni ver.');

  const sonuc =
    kaynak === 'kamera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ['images'] });
  if (sonuc.canceled || !sonuc.assets?.length) return null;

  const dosya = sonuc.assets[0];
  const veri = await (await fetch(dosya.uri)).arrayBuffer();
  const yol = `${isId}/${onEk}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('is-fotograflari').upload(yol, veri, { contentType: 'image/jpeg' });
  if (error) throw new Error('Fotoğraf yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.');
  return yol;
}

export async function fotoAdresi(yol: string): Promise<string | null> {
  const { data } = await supabase.storage.from('is-fotograflari').createSignedUrl(yol, 60 * 30);
  return data?.signedUrl ?? null;
}
