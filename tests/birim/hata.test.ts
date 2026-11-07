import { genelHata, kullaniciMesaji } from '@/lib/hata';

describe('kullaniciMesaji', () => {
  it('veritabanının Türkçe kural mesajını olduğu gibi gösterir', () => {
    expect(kullaniciMesaji('Önce giriş yapmalısın.')).toBe('Önce giriş yapmalısın.');
    expect(kullaniciMesaji('10 dakika beklemeden bu kayıt açılamaz.')).toBe('10 dakika beklemeden bu kayıt açılamaz.');
  });
  it('teknik hataları sade cümleye çevirir', () => {
    expect(kullaniciMesaji('permission denied for function _is_kapat')).toBe(genelHata);
    expect(kullaniciMesaji('TypeError: Network request failed')).toBe(genelHata);
    expect(kullaniciMesaji('JWT expired')).toBe(genelHata);
    expect(kullaniciMesaji('Could not find the function public.x in the schema cache')).toBe(genelHata);
  });
  it('boş mesajda genel cümle', () => {
    expect(kullaniciMesaji('')).toBe(genelHata);
    expect(kullaniciMesaji(null)).toBe(genelHata);
  });
});
