import type { FonksiyonAdi } from '@/lib/veritabaniTipi';
import type { EkIs, Foto, HvKarti, Is, IsDurumu, Masraf, Mesaj } from '@/lib/tipler';

/** İş ekranının bütün sekmelerinin kullandığı veri */
export type Veri = {
  is: Is;
  kod: string | null;
  adres: { acik_adres: string; notlar: string | null } | null;
  karsi: (HvKarti & { ad: string }) | { ad: string } | null;
  ekler: EkIs[];
  masraflar: Masraf[];
  fotolar: Foto[];
  mesajlar: Mesaj[];
  puanVerdim: boolean;
};

/** Veritabanı fonksiyonunu çağırıp ekranı yeniler */
export type Eylem = (ad: FonksiyonAdi, p: Record<string, unknown>) => Promise<void>;

/** Bu durumlarda iki taraf mesajlaşabilir */
export const sohbetAcik: IsDurumu[] = ['kabul', 'yolda', 'adreste', 'basladi', 'bitti', 'sorun'];
