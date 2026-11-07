/** Kullanıcıya gösterilen genel hata cümlesi */
export const genelHata = 'Bu işlem şu an tamamlanamadı. Bağlantını kontrol edip tekrar dene; sorun sürerse okindo’ya yaz.';

const teknikDesen = /schema cache|function|permission denied|violates|syntax|JWT|relation|column|PGRST|fetch|network/i;

/**
 * Veritabanının kendi Türkçe kural mesajları ("Önce giriş yapmalısın.") olduğu gibi gösterilir;
 * teknik hatalar (izin, bağlantı, şema) sade bir cümleye çevrilir.
 */
export function kullaniciMesaji(mesaj: string | null | undefined): string {
  if (!mesaj || teknikDesen.test(mesaj)) return genelHata;
  return mesaj;
}
