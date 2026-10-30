-- Pilotta bitiş fotoğrafı isteğe bağlı. Zorunlu yapmak için ayarı 1 yap:
--   update ayarlar set deger = '1' where anahtar = 'bitis_foto_zorunlu';
insert into public.ayarlar (anahtar, deger, aciklama)
values ('bitis_foto_zorunlu', '0', 'İşi bitirmek için bitiş fotoğrafı zorunlu mu (1 evet, 0 hayır)')
on conflict (anahtar) do nothing;

create or replace function public.isi_bitir(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  i := public._is_kilitle(p_is);
  if i.hv_id is distinct from auth.uid() or i.durum <> 'basladi' then perform public.hata('Bu adım şu an yapılamaz.'); end if;
  if public.ayar_num('bitis_foto_zorunlu') = 1
     and not exists (select 1 from public.is_fotograflari where is_id = p_is and tur = 'bitis') then
    perform public.hata('Önce bitiş fotoğrafını çekmelisin.');
  end if;
  update public.ek_isler set durum = 'reddedildi', karar_at = now()
   where is_id = p_is and durum in ('fiyat_bekliyor', 'onay_bekliyor');
  update public.isler set durum = 'bitti', bitti_at = now() where id = p_is;
  perform public.bildir(i.musteri_id, 'Her şey yolunda mı?',
    'İş bitti. Onayla ya da bir sorun varsa bildir. ' || public.ayar_num('otomatik_onay_saat')
    || ' saat içinde cevap vermezsen iş otomatik onaylanır.', p_is);
end $$;
