import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anahtar) {
  throw new Error('.env dosyasında EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY olmalı. README’deki 2. adıma bak.');
}

export const supabase = createClient(url, anahtar, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Veritabanı fonksiyonunu çağırır; hata varsa kullanıcıya gösterilecek Türkçe mesajla fırlatır. */
export async function rpc<T = unknown>(ad: string, parametreler: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(ad, parametreler);
  if (error) throw new Error(error.message || 'Bir şeyler ters gitti. Lütfen tekrar dene.');
  return data as T;
}
