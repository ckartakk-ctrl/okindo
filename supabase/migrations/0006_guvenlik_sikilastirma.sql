-- Supabase güvenlik denetiminin bulduğu iki konu:
-- 1) Uygulamanın doğrudan çağırmadığı yardımcı fonksiyonlar dışarıya kapatılır.
-- 2) Yardımcı fonksiyonların arama yolu sabitlenir.

alter function public.hata(text) set search_path = public;
alter function public.km_mesafe(double precision, double precision, double precision, double precision) set search_path = public;
alter function public.yol_ucreti(numeric) set search_path = public;
alter function public.okindo_payi(numeric, numeric) set search_path = public;
alter function public.kdv_dahil(numeric) set search_path = public;
alter function public.mesaj_gizle() set search_path = public;

revoke execute on function public.ad_kisa(uuid) from public, anon, authenticated;
revoke execute on function public.hv_km(uuid, double precision, double precision) from public, anon, authenticated;
revoke execute on function public.hv_puan(uuid) from public, anon, authenticated;
revoke execute on function public.hv_aktif_mi(uuid) from public, anon, authenticated;
revoke execute on function public.hv_etiketi_var(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.ayar_num(text) from public, anon, authenticated;
revoke execute on function public.ayar_metin(text) from public, anon, authenticated;
revoke execute on function public.yeni_kullanici() from public, anon, authenticated;
revoke execute on function public.odeme_test_tamamla() from public, anon, authenticated;
revoke execute on function public.odeme_sonrasi() from public, anon, authenticated;
revoke execute on function public.mesaj_gizle() from public, anon, authenticated;
revoke execute on function public.km_mesafe(double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke execute on function public.yol_ucreti(numeric) from public, anon, authenticated;
revoke execute on function public.okindo_payi(numeric, numeric) from public, anon, authenticated;
revoke execute on function public.kdv_dahil(numeric) from public, anon, authenticated;
revoke execute on function public.hata(text) from public, anon, authenticated;
