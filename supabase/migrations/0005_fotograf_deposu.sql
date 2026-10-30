-- İş fotoğrafları ve fişler için gizli depo.
-- Dosya yolu her zaman "<iş-id>/<dosya-adı>" biçimindedir; yalnız o işin müşterisi, HV'si ve yönetici erişir.
insert into storage.buckets (id, name, public) values ('is-fotograflari', 'is-fotograflari', false)
on conflict (id) do nothing;

create policy "is fotografi yukle" on storage.objects for insert to authenticated
with check (
  bucket_id = 'is-fotograflari' and exists (
    select 1 from public.isler i
    where i.id::text = split_part(name, '/', 1) and (i.hv_id = auth.uid() or i.musteri_id = auth.uid())
  )
);

create policy "is fotografi oku" on storage.objects for select to authenticated
using (
  bucket_id = 'is-fotograflari' and (
    public.yonetici_mi() or exists (
      select 1 from public.isler i
      where i.id::text = split_part(name, '/', 1) and (i.hv_id = auth.uid() or i.musteri_id = auth.uid())
    )
  )
);
