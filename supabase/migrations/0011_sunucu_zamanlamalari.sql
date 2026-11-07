-- Sunucu fonksiyonlarını veritabanından çağırır (yalnız gerçek Supabase'de; yerel testlerde atlanır).
--   * odeme-isleyici: her dakika bekleyen ödemeleri işler
--   * push-gonder:    yeni bildirim yazılınca telefona anlık bildirim gönderir
--
-- ÖNCE (bir kez): Supabase > SQL Editor'de iki gizli değeri kasaya (Vault) koy:
--   select vault.create_secret('https://PROJE-KODUN.supabase.co', 'proje_adresi');
--   select vault.create_secret('UZUN-RASTGELE-BIR-METIN', 'zamanlayici_sirri');
-- Aynı "zamanlayici_sirri" değerini sunucu fonksiyonlarına da ver:
--   npx supabase secrets set ZAMANLAYICI_SIRRI=UZUN-RASTGELE-BIR-METIN
-- Kasada değer yoksa aşağıdaki çağrılar sessizce hiçbir şey yapmaz.

create extension if not exists pg_net;

create or replace function public.sunucu_fonksiyonu_cagir(p_ad text, p_govde jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_adres text;
  v_sir text;
begin
  select decrypted_secret into v_adres from vault.decrypted_secrets where name = 'proje_adresi';
  select decrypted_secret into v_sir from vault.decrypted_secrets where name = 'zamanlayici_sirri';
  if v_adres is null or v_sir is null then return; end if;
  perform net.http_post(
    url := rtrim(v_adres, '/') || '/functions/v1/' || p_ad,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-zamanlayici-sirri', v_sir),
    body := p_govde,
    timeout_milliseconds := 10000);
end $$;
revoke execute on function public.sunucu_fonksiyonu_cagir(text, jsonb) from public, anon, authenticated;

-- Ödeme işleyici her dakika (test modunda fonksiyon hemen döner)
select cron.unschedule('okindo-odeme-isleyici')
 where exists (select 1 from cron.job where jobname = 'okindo-odeme-isleyici');
select cron.schedule('okindo-odeme-isleyici', '* * * * *', $$select public.sunucu_fonksiyonu_cagir('odeme-isleyici')$$);

-- Yeni bildirim → telefona push
create or replace function public.bildirim_push_tetik() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.push_jetonlari where kullanici_id = new.kullanici_id) then
    perform public.sunucu_fonksiyonu_cagir('push-gonder', jsonb_build_object('bildirim_id', new.id));
  end if;
  return new;
end $$;
revoke execute on function public.bildirim_push_tetik() from public, anon, authenticated;

drop trigger if exists bildirim_push on public.bildirimler;
create trigger bildirim_push after insert on public.bildirimler
  for each row execute function public.bildirim_push_tetik();
