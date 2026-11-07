import type { Database } from './veritabani';
import type { Soru } from './tipler';

/**
 * Otomatik üretilen veritabanı tiplerinde JSON sütunlar "Json" görünür.
 * Uygulamanın bildiği biçimleri burada üstüne yazarız; veritabani.ts dosyası elle değiştirilmez.
 */
type Ustune<T, U> = Omit<T, keyof U> & U;
type Genel = Database['public'];
type Hizmetler = Genel['Tables']['hizmetler'];

export type Veritabani = Ustune<
  Database,
  {
    public: Ustune<
      Genel,
      {
        Tables: Ustune<
          Genel['Tables'],
          {
            hizmetler: Ustune<
              Hizmetler,
              {
                Row: Ustune<Hizmetler['Row'], { sorular: Soru[] }>;
                Insert: Ustune<Hizmetler['Insert'], { sorular?: Soru[] }>;
                Update: Ustune<Hizmetler['Update'], { sorular?: Soru[] }>;
              }
            >;
          }
        >;
      }
    >;
  }
>;

/** Uygulamanın çağırabildiği veritabanı fonksiyonlarının adları (yanlış yazılırsa tip hatası verir) */
export type FonksiyonAdi = keyof Genel['Functions'];
