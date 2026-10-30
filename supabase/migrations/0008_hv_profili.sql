-- Müşterinin göreceği HV profili: kart + yaptığı işler + üyelik tarihi + (10 puandan sonra) yorumlar.
-- Yorumlar karışık sırada ve tarihsiz verilir; kimin yazdığı anlaşılmaz (K42).
create or replace function public.hv_profili(p_hv uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_kart jsonb;
  v_toplam int;
begin
  v_kart := public.hv_karti(p_hv);
  if v_kart is null then perform public.hata('Bu kişinin profili şu an görüntülenemiyor.'); end if;

  select count(*) into v_toplam from public.puanlar pu join public.isler i on i.id = pu.is_id
   where pu.alan_id = p_hv and pu.yon = 'musteri_hv' and not i.tanitim;

  return v_kart || jsonb_build_object(
    'uye_olma', (select olusturma_at from public.profiller where id = p_hv),
    'puan_sayisi', v_toplam,
    'hizmetler', coalesce((
      select jsonb_agg(h.ad order by h.ad)
      from public.hv_etiketleri e join public.hizmetler h on h.id = e.hizmet_id
      where e.hv_id = p_hv and e.onayli and not e.askida and h.aktif), '[]'::jsonb),
    'yorumlar', case when v_toplam < 10 then '[]'::jsonb else coalesce((
      select jsonb_agg(y) from (
        select pu.yorum y from public.puanlar pu join public.isler i on i.id = pu.is_id
        where pu.alan_id = p_hv and pu.yon = 'musteri_hv' and not i.tanitim and pu.yorum is not null
        order by random() limit 8) s), '[]'::jsonb) end
  );
end $$;

revoke execute on function public.hv_profili(uuid) from public, anon;
grant execute on function public.hv_profili(uuid) to authenticated;
