-- 1) Ödeme işleyicisi için kilit: aynı ödeme iki kez işlenmez, iki karttan iki kez para çekilmez.
-- 2) Yönetici işlemleri için iki adımlı doğrulama (K52).
-- 3) Telefona anlık bildirim (push) için cihaz jetonları.
-- 4) İş ekranı canlı güncellensin diye tablolar Realtime yayınına eklenir.

-- ------------------------------------------------------------
-- 1) Ödeme kilidi
-- ------------------------------------------------------------
alter table public.odemeler
  add column if not exists islem_kilit_at timestamptz,          -- işleyici bu kaydı aldığında dolar
  add column if not exists deneme_sayisi int not null default 0, -- ödeme kuruluşuna kaç kez gidildi
  add column if not exists elle_kontrol boolean not null default false; -- çok denendi, yönetici bakmalı

-- Ödeme yeni bir adıma geçince (ör. bloke → kapama) deneme sayacı ve kilit sıfırlanır
create or replace function public.odeme_adim_degisti() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.durum is distinct from old.durum then
    new.islem_kilit_at := null;
    new.deneme_sayisi := 0;
    new.elle_kontrol := false;
  end if;
  return new;
end $$;
drop trigger if exists odeme_adim_degisti on public.odemeler;
create trigger odeme_adim_degisti before update of durum on public.odemeler
  for each row execute function public.odeme_adim_degisti();
revoke execute on function public.odeme_adim_degisti() from public, anon, authenticated;

-- İşleyici bekleyen ödemeleri bu fonksiyonla alır. "skip locked" sayesinde aynı anda çalışan iki işleyici
-- aynı kaydı alamaz; kilit 10 dakika içinde bırakılmazsa (işleyici çöktüyse) kayıt yeniden alınabilir.
create or replace function public.odeme_isleme_al(p_adet int default 20) returns setof public.odemeler
language sql security definer set search_path = public as $$
  update public.odemeler o
     set islem_kilit_at = now(), deneme_sayisi = o.deneme_sayisi + 1
   where o.id in (
     select id from public.odemeler
      where durum in ('bloke_bekliyor', 'kapama_bekliyor', 'iade_bekliyor', 'tahsil_bekliyor')
        and not elle_kontrol
        and (islem_kilit_at is null or islem_kilit_at < now() - interval '10 minutes')
      order by olusturma_at
      limit p_adet
      for update skip locked)
  returning o.*
$$;

-- İşleyici sonucu bununla yazar. Kayıt bu sırada başka bir duruma geçtiyse (ör. bloke beklerken iptal edildi)
-- yazılmaz ve false döner; böylece yeni durum ezilmez.
create or replace function public.odeme_isleme_bitir(
  p_id uuid, p_beklenen_durum text, p_yeni_durum text, p_ref text default null, p_hata text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_adet int;
begin
  update public.odemeler
     set durum = coalesce(p_yeni_durum, durum),
         saglayici_ref = coalesce(p_ref, saglayici_ref),
         hata = p_hata,
         islem_kilit_at = null,
         elle_kontrol = (p_yeni_durum is null and deneme_sayisi >= 5)
   where id = p_id and durum = p_beklenen_durum;
  get diagnostics v_adet = row_count;
  -- Durum bu arada değiştiyse bile kuruluştaki işlem numarası kaybolmasın (ör. yapılan blokenin iadesi için gerekir)
  if v_adet = 0 and p_ref is not null then
    update public.odemeler set saglayici_ref = p_ref where id = p_id and saglayici_ref is null;
  end if;
  if v_adet = 1 and p_yeni_durum is null and p_hata is not null then
    if (select deneme_sayisi from public.odemeler where id = p_id) >= 5 then
      perform public.yoneticilere_bildir('Ödeme elle kontrol edilmeli',
        'Bir ödeme 5 kez denendi ve tamamlanamadı: ' || left(p_hata, 200), (select is_id from public.odemeler where id = p_id));
    end if;
  end if;
  return v_adet = 1;
end $$;

-- Yönetici "elle kontrol" işaretini kaldırıp ödemeyi yeniden kuyruğa koyabilir
create or replace function public.yonetici_odeme_yeniden_dene(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.yonetici_mi() then perform public.hata('Yetkin yok.'); end if;
  update public.odemeler set elle_kontrol = false, deneme_sayisi = 0, islem_kilit_at = null where id = p_id;
end $$;

revoke execute on function public.odeme_isleme_al(int) from public, anon, authenticated;
revoke execute on function public.odeme_isleme_bitir(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.odeme_isleme_al(int) to service_role;
grant execute on function public.odeme_isleme_bitir(uuid, text, text, text, text) to service_role;
revoke execute on function public.yonetici_odeme_yeniden_dene(uuid) from public, anon;
grant execute on function public.yonetici_odeme_yeniden_dene(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2) Yönetici için iki adımlı doğrulama (K52)
-- ------------------------------------------------------------
-- Ayar 1 iken yönetici yetkisi yalnız iki adımlı doğrulamayla açılmış oturumda (aal2) geçerlidir.
-- Kilitlenirsen SQL Editor'de geçici olarak kapatabilirsin:
--   update ayarlar set deger = '0' where anahtar = 'yonetici_iki_adim';
insert into public.ayarlar (anahtar, deger, aciklama)
values ('yonetici_iki_adim', '1', 'Yönetici işlemleri için iki adımlı doğrulama zorunlu mu (1 evet, 0 hayır)')
on conflict (anahtar) do nothing;

create or replace function public.yonetici_mi() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select yonetici from public.profiller where id = auth.uid()), false)
     and (coalesce(public.ayar_num('yonetici_iki_adim'), 1) = 0
          or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
$$;

-- ------------------------------------------------------------
-- 3) Push jetonları
-- ------------------------------------------------------------
create table if not exists public.push_jetonlari (
  jeton text primary key,                 -- Expo push jetonu: ExponentPushToken[...]
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  platform text,
  guncelleme_at timestamptz not null default now()
);
create index if not exists push_jetonlari_kullanici_idx on public.push_jetonlari (kullanici_id);
alter table public.push_jetonlari enable row level security;
drop policy if exists kendi on public.push_jetonlari;
create policy kendi on public.push_jetonlari for select using (kullanici_id = auth.uid());

-- Aynı telefona başka hesapla girilirse jeton yeni hesaba geçer
create or replace function public.push_jetonu_kaydet(p_jeton text, p_platform text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform public.hata('Önce giriş yapmalısın.'); end if;
  if p_jeton is null or length(p_jeton) > 200 then perform public.hata('Bildirim jetonu geçersiz.'); end if;
  insert into public.push_jetonlari (jeton, kullanici_id, platform)
  values (p_jeton, auth.uid(), left(p_platform, 20))
  on conflict (jeton) do update set kullanici_id = excluded.kullanici_id, platform = excluded.platform, guncelleme_at = now();
end $$;

-- Çıkış yapınca o telefona bildirim gitmesin
create or replace function public.push_jetonu_sil(p_jeton text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_jetonlari where jeton = p_jeton and kullanici_id = auth.uid()
$$;

revoke execute on function public.push_jetonu_kaydet(text, text) from public, anon;
revoke execute on function public.push_jetonu_sil(text) from public, anon;
grant execute on function public.push_jetonu_kaydet(text, text) to authenticated;
grant execute on function public.push_jetonu_sil(text) to authenticated;

-- Bildirimin telefona gidip gitmediği
alter table public.bildirimler add column if not exists push_at timestamptz;

-- ------------------------------------------------------------
-- 4) Realtime: iş ekranı karşı tarafın değişikliğini anında görür (erişim kuralları Realtime'da da geçerlidir)
-- ------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['isler', 'mesajlar', 'ek_isler', 'masraflar', 'is_fotograflari', 'bildirimler'] loop
      if not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
