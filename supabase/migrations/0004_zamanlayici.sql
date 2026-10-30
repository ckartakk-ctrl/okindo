-- Zamanlayıcıyı her 5 dakikada bir çalıştırır (Supabase'de pg_cron eklentisi hazırdır).
-- Supabase > Database > Extensions bölümünden "pg_cron" açık olmalı.
create extension if not exists pg_cron;

select cron.schedule('okindo-zamanlayici', '*/5 * * * *', $$select public.zamanlayici()$$);
