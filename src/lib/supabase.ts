import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { kullaniciMesaji } from './hata';
import type { FonksiyonAdi, Veritabani } from './veritabaniTipi';

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const anahtar = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

/** Ayarlar eksik ya da hatalıysa uygulama kapanmaz; bu mesaj ekranda gösterilir. */
export const ayarHatasi: string | null = !url
  ? 'SUPABASE_URL boş. GitHub > Settings > Secrets and variables > Actions içinde SUPABASE_URL ekli olmalı.'
  : !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)
    ? `SUPABASE_URL biçimi hatalı. "https://proje-kodun.supabase.co" gibi olmalı. Şu an "${url.slice(0, 12)}…" ile başlıyor ve ${url.length} karakter.`
    : !anahtar
      ? 'SUPABASE_KEY boş. GitHub secrets içinde Supabase anon public anahtarı ekli olmalı.'
      : anahtar.split('.').length !== 3 && !anahtar.startsWith('sb_publishable_')
        ? `SUPABASE_KEY biçimi hatalı (${anahtar.length} karakter). Supabase > Project Settings > API sayfasındaki "anon public" anahtarı olmalı.`
        : null;

export const supabase = createClient<Veritabani>(ayarHatasi ? 'https://ayar-eksik.supabase.co' : url, ayarHatasi ? 'ayar-eksik' : anahtar, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Veritabanı fonksiyonunu çağırır; hata varsa kullanıcıya gösterilecek Türkçe mesajla fırlatır. */
export async function rpc<T = unknown>(ad: FonksiyonAdi, parametreler: Record<string, unknown> = {}): Promise<T> {
  // Parametreler ekranlarda serbest nesne olarak verilir; adı ise tiplidir
  const { data, error } = await supabase.rpc(ad, parametreler as never);
  if (error) throw new Error(kullaniciMesaji(error.message));
  return data as T;
}
