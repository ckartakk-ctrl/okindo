import * as Bricolage from '@expo-google-fonts/bricolage-grotesque';

/**
 * Başlık yazı tipi: Bricolage Grotesque. Paket dışa aktarım adlarını sürümden sürüme
 * değiştirebildiği için dosyalar adın sonuna göre bulunur; bulunamazsa sistem yazısı kullanılır.
 */
function bul(son: string): number | undefined {
  const tum = Bricolage as unknown as Record<string, unknown>;
  const adaylar = Object.keys(tum)
    .filter((k) => k.endsWith(son) && typeof tum[k] === 'number')
    .sort((a, b) => a.length - b.length);
  return adaylar.length ? (tum[adaylar[0]] as number) : undefined;
}

const liste: [string, number | undefined][] = [
  ['Baslik-600', bul('_600SemiBold')],
  ['Baslik-700', bul('_700Bold')],
  ['Baslik-800', bul('_800ExtraBold')],
];

export const yaziTipleri: Record<string, number> = Object.fromEntries(
  liste.filter((x): x is [string, number] => typeof x[1] === 'number'),
);
