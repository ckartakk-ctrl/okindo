-- Profil fotoğrafı: herkese açık depo, her kullanıcı yalnız kendi klasörüne ("<kullanıcı-id>/...") yazar.
insert into storage.buckets (id, name, public) values ('profil-fotograflari', 'profil-fotograflari', true)
on conflict (id) do nothing;

drop policy if exists "profil fotografi yukle" on storage.objects;
create policy "profil fotografi yukle" on storage.objects for insert to authenticated
with check (bucket_id = 'profil-fotograflari' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "profil fotografi guncelle" on storage.objects;
create policy "profil fotografi guncelle" on storage.objects for update to authenticated
using (bucket_id = 'profil-fotograflari' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "profil fotografi sil" on storage.objects;
create policy "profil fotografi sil" on storage.objects for delete to authenticated
using (bucket_id = 'profil-fotograflari' and split_part(name, '/', 1) = auth.uid()::text);

