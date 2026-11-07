import { focusManager, QueryClient, useQuery, type QueryKey } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { hataKaydet } from './hataTakibi';

/**
 * Veri çekme ve önbellek (TanStack Query).
 * Ekranlar veriyi bir "anahtar" ile ister; aynı veri başka ekranda istenirse önbellekten hemen gelir,
 * arka planda yenilenir. Bağlantı koparsa 2 kez yeniden denenir.
 */
export const sorguIstemcisi = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    },
  },
});

sorguIstemcisi.getQueryCache().subscribe((olay) => {
  if (olay.type === 'updated' && olay.action.type === 'error') hataKaydet(olay.action.error, { sorgu: olay.query.queryKey });
});

// Uygulama arka plandan öne gelince eski veriler yenilenir
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (durum) => focusManager.setFocused(durum === 'active'));
}

/**
 * Ekrana her dönüldüğünde (sekme değişimi, geri tuşu) veriyi yenileyen sorgu.
 * `yenile` aşağı çekip yenileme için Ekran bileşenine verilir.
 */
export function useEkranSorgusu<T>(anahtar: QueryKey, getir: () => Promise<T>, acik = true) {
  const sorgu = useQuery({ queryKey: anahtar, queryFn: getir, enabled: acik });
  const ilk = useRef(true);
  const { refetch } = sorgu;
  useFocusEffect(
    useCallback(() => {
      // İlk açılışta useQuery zaten çekiyor; sonraki dönüşlerde yenile
      if (ilk.current) {
        ilk.current = false;
        return;
      }
      if (acik) refetch();
    }, [refetch, acik]),
  );
  const yenile = useCallback(async () => {
    await refetch();
  }, [refetch]);
  return { ...sorgu, yenile };
}

/** Supabase sorgusunun hatasını fırlatır, veriyi döndürür */
export function veriYaDaHata<T>(sonuc: { data: T | null; error: { message: string } | null }): T {
  if (sonuc.error) throw new Error(sonuc.error.message);
  return sonuc.data as T;
}
