-- "Sigorta" ifadeleri "okindo güvencesi" ile değiştirilir (iş başına sigorta ürünü yok;
-- hasarı okindo kendisi, iş başına 2.500 TL'ye kadar karşılar).
insert into public.ayarlar (anahtar, deger, aciklama)
values ('guvence_ust_sinir', '2500', 'okindo güvencesi: iş başına karşılanan en yüksek hasar tutarı (TL)')
on conflict (anahtar) do nothing;

do $$
declare
  r record;
  d text;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and pg_get_functiondef(p.oid) ilike '%sigorta%'
  loop
    d := pg_get_functiondef(r.oid);
    d := replace(d, ' şu an evinde ve sigortalı. Ek iş', ' şu an evinde; iş okindo güvencesi altında. Ek iş');
    d := replace(d, 'Uygulama dışında yapılan işler sigortasız ve güvencesizdir.', 'Uygulama dışında yapılan işler okindo güvencesi dışındadır.');
    d := replace(d, 'iş başlasın ve sigorta kapsamı açılsın.', 'iş başlasın ve okindo güvencesi açılsın.');
    execute d;
  end loop;
end $$;

update public.egitim_sorulari
set secenekler = replace(secenekler::text, 'aynı fiyat ve sigortalı', 'aynı fiyat ve okindo güvencesiyle')::jsonb
where secenekler::text like '%sigortalı%';
