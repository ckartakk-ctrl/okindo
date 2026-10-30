-- okindo iş kuralları
-- Uygulama, işlerle ilgili her değişikliği bu fonksiyonlarla yapar; fiyat ve para hesabı yalnız burada yapılır.
-- Hata mesajları kullanıcıya doğrudan gösterilecek şekilde Türkçe yazılmıştır.

-- ============================================================
-- KÜÇÜK YARDIMCILAR
-- ============================================================
create or replace function public.hata(p_mesaj text) returns void
language plpgsql as $$ begin raise exception using message = p_mesaj, errcode = 'P0001'; end $$;

create or replace function public.km_mesafe(e1 double precision, b1 double precision, e2 double precision, b2 double precision)
returns numeric language sql stable as $$
  -- Kuş uçuşu mesafe × yol katsayısı (yaklaşık yol mesafesi)
  select round((
    6371 * 2 * asin(sqrt(
      power(sin(radians(e2 - e1) / 2), 2) +
      cos(radians(e1)) * cos(radians(e2)) * power(sin(radians(b2 - b1) / 2), 2)
    )) * public.ayar_num('yol_katsayi')
  )::numeric, 2)
$$;

create or replace function public.yol_ucreti(p_km numeric) returns numeric
language sql stable as $$
  select greatest(0, ceil(p_km - public.ayar_num('yol_ucretsiz_km'))) * public.ayar_num('yol_km_ucret')
$$;

-- K3: okindo payı = 100 TL ile işin oran kadarından hangisi büyükse; pay HV tutarının üstüne eklenir (K4)
create or replace function public.okindo_payi(p_hv numeric, p_oran numeric default null) returns numeric
language plpgsql stable as $$
declare
  v_oran numeric := coalesce(p_oran, public.ayar_num('okindo_oran'));
  v_taban numeric := public.ayar_num('okindo_taban');
begin
  if p_hv <= 0 then return 0; end if;
  if v_oran * (p_hv + v_taban) <= v_taban then
    return v_taban;
  end if;
  return round(p_hv / (1 - v_oran) - p_hv, 2);
end $$;

create or replace function public.kdv_dahil(p numeric) returns numeric
language sql stable as $$ select round(p * (1 + public.ayar_num('kdv_orani')), 2) $$;

create or replace function public.bildir(p_kullanici uuid, p_baslik text, p_metin text, p_is uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into public.bildirimler (kullanici_id, baslik, metin, is_id) values (p_kullanici, p_baslik, p_metin, p_is)
$$;

create or replace function public.yoneticilere_bildir(p_baslik text, p_metin text, p_is uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into public.bildirimler (kullanici_id, baslik, metin, is_id)
  select id, p_baslik, p_metin, p_is from public.profiller where yonetici
$$;

create or replace function public.kupon_ver(p_kullanici uuid, p_tutar numeric, p_sebep text)
returns void language sql security definer set search_path = public as $$
  insert into public.kuponlar (kullanici_id, tutar, sebep, son_gecerlilik)
  values (p_kullanici, p_tutar, p_sebep, now() + make_interval(days => public.ayar_num('kupon_gecerlilik_gun')::int))
$$;

create or replace function public.ad_kisa(p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(ad, 'okindo') || coalesce(' ' || left(soyad, 1) || '.', '') from public.profiller where id = p_id
$$;

-- ============================================================
-- FİYAT
-- ============================================================
-- Müşterinin yeni müşteri indirimi ya da kuponu (birleşmez)
create or replace function public.indirim_bul(p_musteri uuid)
returns table (tutar numeric, tur text, kupon_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  v_onayli int;
  v_ilk_onay timestamptz;
  v_hesap timestamptz;
begin
  select count(*), min(onay_at) into v_onayli, v_ilk_onay
    from public.isler where musteri_id = p_musteri and durum = 'onaylandi' and not tanitim;
  select olusturma_at into v_hesap from public.profiller where id = p_musteri;

  -- İlk iş: daha önce onaylanmış işi yok, ilk iş indirimini kullanmamış, hesap 14 günden yeni
  if v_onayli = 0
     and not exists (select 1 from public.isler where musteri_id = p_musteri
                     and indirim_turu = 'ilk' and durum not in ('iptal', 'gelmedi'))
     and v_hesap > now() - make_interval(days => public.ayar_num('ilk_indirim_gecerlilik_gun')::int) then
    return query select public.ayar_num('yeni_musteri_ilk'), 'ilk'::text, null::uuid;
    return;
  end if;

  -- İkinci iş: tam bir onaylı işi var ve o iş 30 gün içinde onaylandı
  if v_onayli = 1
     and v_ilk_onay > now() - make_interval(days => public.ayar_num('ikinci_indirim_gun')::int)
     and not exists (select 1 from public.isler where musteri_id = p_musteri
                     and indirim_turu = 'ikinci' and durum not in ('iptal', 'gelmedi')) then
    return query select public.ayar_num('yeni_musteri_ikinci'), 'ikinci'::text, null::uuid;
    return;
  end if;

  -- Kupon: süresi dolmamış en büyük kupon
  return query
    select k.tutar, 'kupon'::text, k.id from public.kuponlar k
    where k.kullanici_id = p_musteri and k.kullanildi_is_id is null and k.son_gecerlilik > now()
    order by k.tutar desc, k.son_gecerlilik asc limit 1;
end $$;

-- Fiyat dökümü; uygulama bunu gösterir, talep açılırken aynı hesap tekrar yapılır
create or replace function public.fiyat_dokumu(
  p_hizmet uuid, p_saat numeric, p_acil boolean, p_yol_kh numeric, p_musteri uuid
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  h public.hizmetler;
  v_hv numeric;
  v_pay numeric;
  v_ara numeric;
  v_kdv numeric;
  v_brut numeric;
  v_ind numeric := 0;
  v_ind_tur text;
  v_kupon uuid;
  v_toplam numeric;
  v_min numeric := public.ayar_num('min_odeme');
begin
  select * into h from public.hizmetler where id = p_hizmet and aktif;
  if not found then perform public.hata('Bu hizmet şu an verilmiyor.'); end if;

  if h.fiyat_tipi = 'saatli' then
    if p_saat is null or p_saat < public.ayar_num('saatli_en_az') then
      perform public.hata('Bu iş için en az ' || public.ayar_num('saatli_en_az') || ' saat seçmelisin.');
    end if;
    if p_saat * 2 <> floor(p_saat * 2) then
      perform public.hata('Süre yarım saatlik dilimlerle seçilir.');
    end if;
    v_hv := round(h.hv_saatlik_kh * p_saat, 2);
  else
    v_hv := h.hv_tutari_kh;
  end if;

  if p_acil then v_hv := round(v_hv * public.ayar_num('acil_katsayi'), 2); end if;

  v_pay := public.okindo_payi(v_hv);
  v_ara := v_hv + v_pay + coalesce(p_yol_kh, 0);
  v_kdv := round(v_ara * public.ayar_num('kdv_orani'), 2);
  v_brut := v_ara + v_kdv;

  if p_musteri is not null then
    select i.tutar, i.tur, i.kupon_id into v_ind, v_ind_tur, v_kupon from public.indirim_bul(p_musteri) i;
    v_ind := least(coalesce(v_ind, 0), greatest(0, v_brut - v_min));
    if v_ind <= 0 then v_ind := 0; v_ind_tur := null; v_kupon := null; end if;
  end if;
  v_toplam := v_brut - v_ind;

  return jsonb_build_object(
    'hizmet', h.ad,
    'fiyat_tipi', h.fiyat_tipi,
    'saat', p_saat,
    'acil', p_acil,
    'hv_tutari_kh', v_hv,
    'okindo_payi_kh', v_pay,
    'yol_kh', coalesce(p_yol_kh, 0),
    'ara_toplam_kh', v_ara,
    'kdv', v_kdv,
    'brut_kd', v_brut,
    'indirim_kd', v_ind,
    'indirim_turu', v_ind_tur,
    'kupon_id', v_kupon,
    'musteri_toplam_kd', v_toplam,
    'tahmini_dk', case when h.fiyat_tipi = 'saatli' then (p_saat * 60)::int else h.tahmini_dk end,
    'cikis_ucreti_kd', public.kdv_dahil(public.ayar_num('cikis_ucreti') + coalesce(p_yol_kh, 0)),
    'buyuk_is_uyarisi', v_hv > public.ayar_num('buyuk_is_uyari_tutar')
  );
end $$;

-- Uygulamanın çağırdığı fiyat teklifi (K10 "sadece fiyat" da bunu kullanır)
create or replace function public.fiyat_teklifi(
  p_hizmet uuid, p_saat numeric default null, p_acil boolean default false,
  p_hv uuid default null, p_adres uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_yol numeric := 0;
  v_km numeric;
begin
  if p_hv is not null and p_adres is not null then
    select public.km_mesafe(m.enlem, m.boylam, a.enlem, a.boylam) into v_km
      from public.adresler a, public.profiller p join public.mahalleler m on m.id = p.mahalle_id
      where a.id = p_adres and a.kullanici_id = auth.uid() and p.id = p_hv;
    v_yol := public.yol_ucreti(coalesce(v_km, 0));
  end if;
  return public.fiyat_dokumu(p_hizmet, p_saat, p_acil, v_yol, auth.uid());
end $$;

-- ============================================================
-- HV UYGUNLUĞU
-- ============================================================
create or replace function public.hv_aktif_mi(p_hv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiller p
    where p.id = p_hv and p.hv_durum = 'aktif' and p.egitim_tamam_at is not null
      and p.silinme_istegi_at is null and p.mahalle_id is not null
  )
$$;

create or replace function public.hv_etiketi_var(p_hv uuid, p_hizmet uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.hv_etiketleri e
                 where e.hv_id = p_hv and e.hizmet_id = p_hizmet and e.onayli and not e.askida)
$$;

create or replace function public.hv_km(p_hv uuid, p_enlem double precision, p_boylam double precision) returns numeric
language sql stable security definer set search_path = public as $$
  select public.km_mesafe(m.enlem, m.boylam, p_enlem, p_boylam)
  from public.profiller p join public.mahalleler m on m.id = p.mahalle_id where p.id = p_hv
$$;

create or replace function public.hv_puan(p_hv uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select round(avg(pu.puan)::numeric, 1)
  from public.puanlar pu join public.isler i on i.id = pu.is_id
  where pu.alan_id = p_hv and pu.yon = 'musteri_hv' and not i.tanitim     -- K42, K59
$$;

-- Müşterinin göreceği HV kartı (herkese açık bilgiler)
create or replace function public.hv_karti(p_hv uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id,
    'ad', public.ad_kisa(p.id),
    'foto_yolu', p.foto_yolu,
    'puan', public.hv_puan(p.id),
    'is_sayisi', (select count(*) from public.isler i where i.hv_id = p.id and i.durum = 'onaylandi' and not i.tanitim),
    'kurucu', p.kurucu,
    'mahalle', m.ad
  )
  from public.profiller p left join public.mahalleler m on m.id = p.mahalle_id
  where p.id = p_hv and p.hv_durum in ('aktif', 'askida')
$$;

-- K11: müşteri için uygun HV listesi, önce aynı mahalle sonra mesafe
create or replace function public.uygun_hvler(p_hizmet uuid, p_adres uuid)
returns table (hv_id uuid, kart jsonb, komsu boolean, km numeric, yol_kd numeric, musait boolean)
language plpgsql stable security definer set search_path = public as $$
declare a public.adresler;
begin
  select * into a from public.adresler where id = p_adres and kullanici_id = auth.uid();
  if not found then perform public.hata('Adres bulunamadı.'); end if;

  return query
    select p.id, public.hv_karti(p.id), p.mahalle_id = a.mahalle_id,
           public.hv_km(p.id, a.enlem, a.boylam),
           public.kdv_dahil(public.yol_ucreti(public.hv_km(p.id, a.enlem, a.boylam))),
           p.musait
    from public.profiller p
    where public.hv_aktif_mi(p.id)
      and p.id <> auth.uid()
      and public.hv_etiketi_var(p.id, p_hizmet)
      and not exists (select 1 from public.eslesme_engelleri e where e.hv_id = p.id and e.musteri_id = auth.uid())
      and public.hv_km(p.id, a.enlem, a.boylam) <= public.ayar_num('yol_azami_km')
    order by (p.mahalle_id = a.mahalle_id) desc, p.musait desc, public.hv_km(p.id, a.enlem, a.boylam) asc;
end $$;

-- HV bu talebi görebilir/kabul edebilir mi?
create or replace function public.talep_hv_icin_acik(i public.isler, p_hv uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_km numeric;
  a public.is_adresleri;
begin
  if i.durum <> 'acik' or i.hv_id is not null then return false; end if;
  if p_hv = i.musteri_id or p_hv = any(i.haric_hvler) then return false; end if;
  if not public.hv_aktif_mi(p_hv) or not public.hv_etiketi_var(p_hv, i.hizmet_id) then return false; end if;
  if exists (select 1 from public.eslesme_engelleri e where e.hv_id = p_hv and e.musteri_id = i.musteri_id) then return false; end if;

  select * into a from public.is_adresleri where is_id = i.id;
  v_km := public.hv_km(p_hv, a.enlem, a.boylam);

  if i.hedef_hv_id = p_hv then
    return v_km <= public.ayar_num('yol_azami_km');
  end if;

  -- Hedefli talepte diğerleri, süre dolana ya da müşteri herkese açana kadar göremez (K11, K12)
  if i.hedef_hv_id is not null and i.herkese_acildi_at is null then
    if i.direkt_kod or now() < i.hedef_acilis_at then return false; end if;
  end if;

  -- Herkese açık talep yol ücretsizdir; bu yüzden yalnız ücretsiz mesafedeki HV'ler görür (K16)
  return v_km <= least((select azami_km from public.profiller where id = p_hv), public.ayar_num('yol_ucretsiz_km'));
end $$;

-- K21: HV'nin göreceği açık talepler; yalnız yaklaşık mesafe ve mahalle adı
create or replace function public.hv_acik_talepler()
returns table (
  is_id uuid, hizmet text, kategori text, mahalle text, yaklasik_km numeric,
  planlanan_baslangic timestamptz, saat numeric, acil boolean, cevaplar jsonb, aciklama text,
  hizmet_sorulari jsonb, sana_ozel boolean, brut numeric, stopaj numeric, net numeric
)
language plpgsql stable security definer set search_path = public as $$
declare v_stopaj numeric := public.ayar_num('stopaj_orani');
begin
  return query
    select i.id, h.ad, k.ad, m.ad,
           round(public.hv_km(auth.uid(), a.enlem, a.boylam) * 2) / 2,
           i.planlanan_baslangic, i.saat, i.acil, i.cevaplar, i.aciklama, h.sorular,
           i.hedef_hv_id = auth.uid(),
           i.hv_tutari_kh + i.yol_kh,
           round((i.hv_tutari_kh + i.yol_kh) * v_stopaj, 2),
           (i.hv_tutari_kh + i.yol_kh) - round((i.hv_tutari_kh + i.yol_kh) * v_stopaj, 2)
    from public.isler i
    join public.hizmetler h on h.id = i.hizmet_id
    join public.kategoriler k on k.id = h.kategori_id
    join public.mahalleler m on m.id = i.mahalle_id
    join public.is_adresleri a on a.is_id = i.id
    where i.durum = 'acik' and public.talep_hv_icin_acik(i, auth.uid())
    order by (i.hedef_hv_id = auth.uid()) desc, i.planlanan_baslangic asc;
end $$;

-- ============================================================
-- TALEP AÇMA (K9–K13)
-- ============================================================
create or replace function public._talep_olustur(
  p_musteri uuid, p_hizmet uuid, p_adres uuid, p_baslangic timestamptz, p_saat numeric,
  p_acil boolean, p_cevaplar jsonb, p_aciklama text, p_hedef_hv uuid, p_direkt boolean, p_seri uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  h public.hizmetler;
  k public.kategoriler;
  a public.adresler;
  v_pilot boolean := public.ayar_metin('pilot_modu') = 'true';
  v_baslangic timestamptz := p_baslangic;
  v_yol numeric := 0;
  v_km numeric;
  f jsonb;
  v_dk int;
  v_bas_yerel timestamp;
  v_bitis_yerel timestamp;
  v_is uuid;
  v_odeme_durum text;
begin
  select * into h from public.hizmetler where id = p_hizmet and aktif;
  if not found then perform public.hata('Bu hizmet şu an verilmiyor.'); end if;
  select * into k from public.kategoriler where id = h.kategori_id;
  if v_pilot and not k.pilotta_acik then perform public.hata('Bu hizmeti şu an vermiyoruz.'); end if;
  if v_pilot and h.usta_gerekli then perform public.hata('Bu iş belgeli usta gerektiriyor; şu an vermiyoruz.'); end if;

  select * into a from public.adresler where id = p_adres and kullanici_id = p_musteri;
  if not found then perform public.hata('Adres bulunamadı.'); end if;
  if not exists (select 1 from public.mahalleler where id = a.mahalle_id and aktif) then
    perform public.hata('okindo henüz bu mahallede hizmet vermiyor.');
  end if;

  if p_acil then v_baslangic := greatest(coalesce(p_baslangic, now()), now()); end if;
  if v_baslangic is null or v_baslangic < now() - interval '5 minutes' then
    perform public.hata('Geçmiş bir saat seçilemez.');
  end if;

  if p_hedef_hv is not null then
    if not public.hv_aktif_mi(p_hedef_hv) or not public.hv_etiketi_var(p_hedef_hv, p_hizmet) then
      perform public.hata('Seçtiğin kişi bu işi şu an alamıyor.');
    end if;
    if exists (select 1 from public.eslesme_engelleri where hv_id = p_hedef_hv and musteri_id = p_musteri) then
      perform public.hata('Seçtiğin kişi bu işi şu an alamıyor.');
    end if;
    v_km := public.hv_km(p_hedef_hv, a.enlem, a.boylam);
    if v_km > public.ayar_num('yol_azami_km') then
      perform public.hata('Seçtiğin kişi bu adrese çok uzak.');
    end if;
    v_yol := public.yol_ucreti(v_km);
  end if;

  f := public.fiyat_dokumu(p_hizmet, p_saat, p_acil, v_yol, p_musteri);
  v_dk := (f->>'tahmini_dk')::int;

  -- Çalışma saatleri (K51)
  v_bas_yerel := v_baslangic at time zone 'Europe/Istanbul';
  v_bitis_yerel := v_bas_yerel + make_interval(mins => v_dk);
  if extract(hour from v_bas_yerel) < public.ayar_num('calisma_baslangic')
     or v_bitis_yerel > date_trunc('day', v_bas_yerel) + make_interval(hours => public.ayar_num('calisma_bitis')::int) then
    perform public.hata('İşler ' || lpad(public.ayar_num('calisma_baslangic')::int::text, 2, '0') || ':00 ile '
      || lpad(public.ayar_num('calisma_bitis')::int::text, 2, '0') || ':00 arasında yapılır ve bu saatte bitmelidir. Lütfen başka bir saat seç.');
  end if;

  insert into public.isler (
    musteri_id, hedef_hv_id, direkt_kod, hedef_acilis_at, hizmet_id, mahalle_id, seri_id,
    acil, saat, tahmini_dk, planlanan_baslangic, cevaplar, aciklama,
    buyuk, hv_tutari_kh, yol_kh, okindo_payi_kh, ara_toplam_kh, kdv, brut_kd,
    indirim_kd, indirim_turu, kupon_id, musteri_toplam_kd
  ) values (
    p_musteri, p_hedef_hv, coalesce(p_direkt, false),
    case when p_hedef_hv is null then null
         else now() + make_interval(mins => case when p_direkt then public.ayar_num('direkt_kod_bekleme_dk')
                                                  else public.ayar_num('hedefli_bekleme_dk') end::int) end,
    p_hizmet, a.mahalle_id, p_seri,
    coalesce(p_acil, false), case when h.fiyat_tipi = 'saatli' then p_saat end, v_dk, v_baslangic,
    coalesce(p_cevaplar, '{}'), nullif(trim(p_aciklama), ''),
    (f->>'hv_tutari_kh')::numeric > public.ayar_num('buyuk_is_tutar'),
    (f->>'hv_tutari_kh')::numeric, v_yol, (f->>'okindo_payi_kh')::numeric, (f->>'ara_toplam_kh')::numeric,
    (f->>'kdv')::numeric, (f->>'brut_kd')::numeric,
    (f->>'indirim_kd')::numeric, f->>'indirim_turu', (f->>'kupon_id')::uuid, (f->>'musteri_toplam_kd')::numeric
  ) returning id into v_is;

  if (f->>'kupon_id') is not null then
    update public.kuponlar set kullanildi_is_id = v_is where id = (f->>'kupon_id')::uuid;
  end if;

  insert into public.is_gizli (is_id, kapi_kodu) values (v_is, lpad((floor(random() * 10000))::int::text, 4, '0'));
  insert into public.is_adresleri (is_id, acik_adres, enlem, boylam, notlar)
    values (v_is, a.acik_adres, a.enlem, a.boylam, a.notlar);

  -- Kart blokesi (K29): işe 5 günden fazla varsa kart kaydedilir, bloke sonra yapılır
  if v_baslangic > now() + make_interval(days => public.ayar_num('bloke_on_gun')::int) then
    v_odeme_durum := 'kart_kayitli';
  else
    v_odeme_durum := 'bloke_bekliyor';
  end if;
  insert into public.odemeler (is_id, tur, bloke_tutar, durum)
    values (v_is, 'is', (f->>'musteri_toplam_kd')::numeric, v_odeme_durum);

  if v_odeme_durum = 'kart_kayitli' then
    update public.isler set durum = 'acik' where id = v_is;
    perform public.talep_duyur(v_is);
  end if;
  -- bloke_bekliyor ise iş, ödeme kuruluşu blokeyi onaylayınca açılır (odeme_sonrasi tetikleyicisi)

  return v_is;
end $$;

create or replace function public.talep_olustur(
  p_hizmet uuid, p_adres uuid, p_baslangic timestamptz, p_saat numeric default null,
  p_acil boolean default false, p_cevaplar jsonb default '{}', p_aciklama text default null,
  p_hedef_hv uuid default null, p_direkt boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform public.hata('Önce giriş yapmalısın.'); end if;
  return public._talep_olustur(auth.uid(), p_hizmet, p_adres, p_baslangic, p_saat, p_acil,
                               p_cevaplar, p_aciklama, p_hedef_hv, p_direkt, null);
end $$;

-- Talep açılınca uygun HV'lere bildirim
create or replace function public.talep_duyur(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  i public.isler;
  v_hizmet text;
begin
  select * into i from public.isler where id = p_is;
  select ad into v_hizmet from public.hizmetler where id = i.hizmet_id;
  if i.hedef_hv_id is not null and i.herkese_acildi_at is null then
    perform public.bildir(i.hedef_hv_id, 'Sana özel talep', v_hizmet || ' için seni seçtiler.', p_is);
  else
    insert into public.bildirimler (kullanici_id, baslik, metin, is_id)
    select p.id, 'Yakınında yeni iş', v_hizmet, p_is
    from public.profiller p
    where p.musait and public.talep_hv_icin_acik(i, p.id);
  end if;
end $$;

-- K12: müşteri, "beni direkt çağır" talebini herkese açar
create or replace function public.herkese_ac(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.isler set herkese_acildi_at = now(), direkt_kod = false
   where id = p_is and musteri_id = auth.uid() and durum = 'acik' and hv_id is null;
  if not found then perform public.hata('Bu talep artık açılamaz.'); end if;
  perform public.talep_duyur(p_is);
end $$;

-- ============================================================
-- ÖDEME DURUMLARI
-- Test sağlayıcısında bekleyen işlemler anında tamamlanır.
-- Gerçek sağlayıcıda (iyzico) "odeme-isleyici" fonksiyonu bu satırları işler.
-- ============================================================
create or replace function public.odeme_test_tamamla() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.ayar_metin('odeme_saglayici') = 'test' then
    new.durum := case new.durum
      when 'bloke_bekliyor' then 'bloke'
      when 'kapama_bekliyor' then 'kapandi'
      when 'iade_bekliyor' then 'iade_edildi'
      when 'tahsil_bekliyor' then 'tahsil_edildi'
      else new.durum end;
    if new.saglayici_ref is null and new.durum <> 'kart_kayitli' then
      new.saglayici_ref := 'TEST-' || left(new.id::text, 8);
    end if;
  end if;
  new.guncelleme_at := now();
  return new;
end $$;

create trigger odeme_test before insert or update on public.odemeler
  for each row execute function public.odeme_test_tamamla();

-- İş blokesi tamamlanınca talep açılır; bloke tutmazsa müşteriye haber verilir
create or replace function public.odeme_sonrasi() returns trigger
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  if new.tur <> 'is' then return new; end if;
  select * into i from public.isler where id = new.is_id;
  if new.durum = 'bloke' and i.durum = 'odeme_bekliyor' then
    update public.isler set durum = 'acik' where id = new.is_id;
    perform public.talep_duyur(new.is_id);
  elsif new.durum = 'basarisiz' and (tg_op = 'INSERT' or old.durum <> 'basarisiz') then
    perform public.bildir(i.musteri_id, 'Ödeme blokesi yapılamadı',
      'Kartında bloke yapılamadı. 12 saat içinde kartını güncellemezsen talep iptal olur.', i.id);
  end if;
  return new;
end $$;

create trigger odeme_sonrasi_tetik after insert or update of durum on public.odemeler
  for each row execute function public.odeme_sonrasi();

-- İşin tüm ödemelerini geri ver (blokeyi kaldır)
create or replace function public._is_odemelerini_iade(p_is uuid) returns void
language sql security definer set search_path = public as $$
  update public.odemeler set durum = 'iade_bekliyor', kapama_tutar = 0
   where is_id = p_is and durum in ('bloke', 'bloke_bekliyor', 'kart_kayitli', 'basarisiz')
$$;

-- Ücretsiz iptalde kullanılan kupon geri verilir
create or replace function public._kuponu_geri_ver(p_is uuid) returns void
language sql security definer set search_path = public as $$
  update public.kuponlar set kullanildi_is_id = null where kullanildi_is_id = p_is
$$;

-- Kısmi kapama: iş blokesinden belli bir tutar tahsil edilir, kalanı serbest kalır (çıkış ücreti, geç iptal)
create or replace function public._kismi_tahsil(p_is uuid, p_hv uuid, p_tur text, p_tutar_kh numeric) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_kd numeric := public.kdv_dahil(p_tutar_kh);
  v_stopaj numeric := round(p_tutar_kh * public.ayar_num('stopaj_orani'), 2);
begin
  update public.odemeler set durum = 'kapama_bekliyor', kapama_tutar = least(bloke_tutar, v_kd)
   where is_id = p_is and tur = 'is' and durum in ('bloke', 'kart_kayitli', 'bloke_bekliyor');
  update public.odemeler set durum = 'iade_bekliyor', kapama_tutar = 0
   where is_id = p_is and tur <> 'is' and durum in ('bloke', 'bloke_bekliyor');
  insert into public.hakedisler (is_id, hv_id, tur, brut_kh, stopaj, net)
    values (p_is, p_hv, p_tur, p_tutar_kh, v_stopaj, p_tutar_kh - v_stopaj);
end $$;

-- İşi HV'den alıp yeniden herkese aç (HV iptali, beceri yetmedi, riskli iş)
create or replace function public._isi_yeniden_ac(p_is uuid, p_hv uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.ek_isler set durum = 'reddedildi', karar_at = now()
   where is_id = p_is and durum <> 'reddedildi';
  update public.odemeler set durum = 'iade_bekliyor', kapama_tutar = 0
   where is_id = p_is and tur = 'ek' and durum in ('bloke', 'bloke_bekliyor');
  update public.masraflar set durum = 'reddedildi' where is_id = p_is and durum = 'onay_bekliyor';
  update public.isler set
    hv_id = null, durum = 'acik', haric_hvler = array_append(haric_hvler, p_hv),
    hedef_hv_id = null, direkt_kod = false, herkese_acildi_at = now(),
    kabul_at = null, yolda_at = null, adreste_at = null, adreste_enlem = null, adreste_boylam = null,
    icerde_sorusu_at = null, basladi_at = null, acik_is_bildirim = 0,
    planlanan_baslangic = greatest(planlanan_baslangic, now())
  where id = p_is;
  perform public.talep_duyur(p_is);
end $$;

-- ============================================================
-- İŞ SÜRECİ (K21–K27)
-- ============================================================
create or replace function public._is_kilitle(p_is uuid) returns public.isler
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  select * into i from public.isler where id = p_is for update;
  if not found then perform public.hata('İş bulunamadı.'); end if;
  return i;
end $$;

create or replace function public.is_kabul(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  i public.isler;
  v_hizmet text;
begin
  i := public._is_kilitle(p_is);
  if not public.talep_hv_icin_acik(i, auth.uid()) then
    perform public.hata('Bu talep artık açık değil ya da sana uygun değil.');
  end if;
  -- K27: açık işi olan HV yeni iş alamaz
  if exists (select 1 from public.isler where hv_id = auth.uid() and durum = 'basladi') then
    perform public.hata('Önce devam eden işini bitirmelisin.');
  end if;
  -- Aynı saatte başka işi var mı?
  if exists (
    select 1 from public.isler o
    where o.hv_id = auth.uid() and o.durum in ('kabul', 'yolda', 'adreste')
      and tstzrange(o.planlanan_baslangic, o.planlanan_baslangic + make_interval(mins => o.tahmini_dk))
       && tstzrange(i.planlanan_baslangic, i.planlanan_baslangic + make_interval(mins => i.tahmini_dk))
  ) then
    perform public.hata('Bu saatte başka bir işin var.');
  end if;

  update public.isler set hv_id = auth.uid(), durum = 'kabul', kabul_at = now() where id = p_is;
  select ad into v_hizmet from public.hizmetler where id = i.hizmet_id;
  perform public.bildir(i.musteri_id, 'İşin kabul edildi',
    public.ad_kisa(auth.uid()) || ' ' || v_hizmet || ' işini kabul etti.', p_is);
end $$;

create or replace function public.yola_ciktim(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  i := public._is_kilitle(p_is);
  if i.hv_id is distinct from auth.uid() or i.durum <> 'kabul' then perform public.hata('Bu adım şu an yapılamaz.'); end if;
  update public.isler set durum = 'yolda', yolda_at = now() where id = p_is;
  perform public.bildir(i.musteri_id, 'Yola çıktı', public.ad_kisa(i.hv_id) || ' yola çıktı.', p_is);
end $$;

-- K22, K23, K33: Adresteyim; geç gelmede müşteriye kupon
create or replace function public.adresteyim(p_is uuid, p_enlem double precision, p_boylam double precision) returns void
language plpgsql security definer set search_path = public as $$
declare
  i public.isler;
  v_kod text;
begin
  i := public._is_kilitle(p_is);
  if i.hv_id is distinct from auth.uid() or i.durum not in ('kabul', 'yolda') then
    perform public.hata('Bu adım şu an yapılamaz.');
  end if;
  update public.isler set durum = 'adreste', adreste_at = now(), adreste_enlem = p_enlem, adreste_boylam = p_boylam
   where id = p_is;

  if now() > i.planlanan_baslangic + make_interval(mins => public.ayar_num('gec_gelme_dk')::int) then
    perform public.kupon_ver(i.musteri_id, public.ayar_num('gec_gelme_kupon'), 'Geç gelme');
    insert into public.guvenilirlik_olaylari (hv_id, tur, is_id) values (i.hv_id, 'gec_kaldi', p_is);
  end if;

  select kapi_kodu into v_kod from public.is_gizli where is_id = p_is;
  perform public.bildir(i.musteri_id, public.ad_kisa(i.hv_id) || ' geldi',
    'Kapıyı açınca ona bu kodu söyle: ' || v_kod, p_is);
end $$;

create or replace function public.kapi_kodu_gir(p_is uuid, p_kod text) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  i := public._is_kilitle(p_is);
  if i.hv_id is distinct from auth.uid() or i.durum <> 'adreste' then perform public.hata('Önce "Adresteyim"e basmalısın.'); end if;
  if not exists (select 1 from public.is_gizli where is_id = p_is and kapi_kodu = trim(p_kod)) then
    perform public.hata('Kod yanlış. Kodu müşterinden tekrar iste.');
  end if;
  update public.isler set durum = 'basladi', basladi_at = now() where id = p_is;
  perform public.bildir(i.musteri_id, 'İş başladı',
    public.ad_kisa(i.hv_id) || ' şu an evinde ve sigortalı. Ek iş istersen buradan ekle.', p_is);
end $$;

-- K23: kod girilmediyse müşteri "içeride" onayı verir
create or replace function public.iceride_onayla(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  i := public._is_kilitle(p_is);
  if i.musteri_id <> auth.uid() or i.durum <> 'adreste' then perform public.hata('Bu adım şu an yapılamaz.'); end if;
  update public.isler set durum = 'basladi', basladi_at = now() where id = p_is;
  perform public.bildir(i.hv_id, 'İş başladı', 'Müşterin içeride olduğunu onayladı.', p_is);
end $$;

create or replace function public.foto_kaydet(p_is uuid, p_tur text, p_yol text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.isler where id = p_is and (hv_id = auth.uid() or musteri_id = auth.uid())) then
    perform public.hata('Bu işe fotoğraf ekleyemezsin.');
  end if;
  if split_part(p_yol, '/', 1) <> p_is::text then perform public.hata('Fotoğraf yolu geçersiz.'); end if;
  insert into public.is_fotograflari (is_id, yukleyen_id, tur, yol) values (p_is, auth.uid(), p_tur, p_yol);
end $$;

-- Ek iş için müşteri tutarı: taban tekrar alınmaz, pay toplam üzerinden yeniden hesaplanır (K3, K24)
create or replace function public._ek_musteri_tutari(p_is uuid, p_ek_hv numeric) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare v_mevcut numeric;
begin
  select i.hv_tutari_kh + coalesce(sum(e.hv_tutari_kh) filter (where e.durum = 'onaylandi'), 0)
    into v_mevcut
    from public.isler i left join public.ek_isler e on e.is_id = i.id
    where i.id = p_is group by i.hv_tutari_kh;
  return public.kdv_dahil(p_ek_hv + public.okindo_payi(v_mevcut + p_ek_hv) - public.okindo_payi(v_mevcut));
end $$;

create or replace function public.ek_is_ekle(p_is uuid, p_aciklama text, p_hv_tutari numeric default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  i public.isler;
  v_id uuid;
begin
  i := public._is_kilitle(p_is);
  if i.durum <> 'basladi' or auth.uid() not in (i.hv_id, i.musteri_id) then
    perform public.hata('Ek iş yalnız iş sürerken eklenebilir.');
  end if;
  if auth.uid() = i.hv_id then
    if p_hv_tutari is null or p_hv_tutari <= 0 then perform public.hata('Ek işin tutarını yazmalısın.'); end if;
    insert into public.ek_isler (is_id, ekleyen_id, aciklama, hv_tutari_kh, musteri_tutari_kd, durum)
      values (p_is, auth.uid(), p_aciklama, p_hv_tutari, public._ek_musteri_tutari(p_is, p_hv_tutari), 'onay_bekliyor')
      returning id into v_id;
    perform public.bildir(i.musteri_id, 'Ek iş onayın bekleniyor', p_aciklama, p_is);
  else
    insert into public.ek_isler (is_id, ekleyen_id, aciklama, durum)
      values (p_is, auth.uid(), p_aciklama, 'fiyat_bekliyor') returning id into v_id;
    perform public.bildir(i.hv_id, 'Müşterin ek iş istedi', p_aciklama || ' — tutarını yaz.', p_is);
  end if;
  return v_id;
end $$;

-- HV, müşterinin istediği ek işe tutar yazar
create or replace function public.ek_is_fiyatla(p_ek uuid, p_hv_tutari numeric) returns void
language plpgsql security definer set search_path = public as $$
declare e public.ek_isler; i public.isler;
begin
  select * into e from public.ek_isler where id = p_ek for update;
  i := public._is_kilitle(e.is_id);
  if i.hv_id <> auth.uid() or e.durum <> 'fiyat_bekliyor' or i.durum <> 'basladi' then
    perform public.hata('Bu ek iş fiyatlanamaz.');
  end if;
  if p_hv_tutari is null or p_hv_tutari <= 0 then perform public.hata('Tutar geçersiz.'); end if;
  update public.ek_isler set hv_tutari_kh = p_hv_tutari,
    musteri_tutari_kd = public._ek_musteri_tutari(e.is_id, p_hv_tutari), durum = 'onay_bekliyor'
   where id = p_ek;
  perform public.bildir(i.musteri_id, 'Ek iş onayın bekleniyor', e.aciklama, i.id);
end $$;

-- K17: saatli işte 30 dakika uzatma
create or replace function public.sure_uzat(p_is uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  i public.isler;
  h public.hizmetler;
  v_hv numeric;
  v_id uuid;
begin
  i := public._is_kilitle(p_is);
  select * into h from public.hizmetler where id = i.hizmet_id;
  if h.fiyat_tipi <> 'saatli' or i.durum <> 'basladi' or auth.uid() not in (i.hv_id, i.musteri_id) then
    perform public.hata('Bu işte süre uzatılamaz.');
  end if;
  v_hv := round(h.hv_saatlik_kh * 0.5 * case when i.acil then public.ayar_num('acil_katsayi') else 1 end, 2);
  insert into public.ek_isler (is_id, ekleyen_id, aciklama, hv_tutari_kh, musteri_tutari_kd, durum)
    values (p_is, auth.uid(), '30 dakika uzatma', v_hv, public._ek_musteri_tutari(p_is, v_hv), 'onay_bekliyor')
    returning id into v_id;
  if auth.uid() = i.musteri_id then
    perform public.ek_is_karar(v_id, true);   -- müşteri istediyse onayı da vermiş olur
  else
    perform public.bildir(i.musteri_id, 'Süre uzatma onayın bekleniyor', '30 dakika uzatma', p_is);
  end if;
  return v_id;
end $$;

create or replace function public.ek_is_karar(p_ek uuid, p_kabul boolean) returns void
language plpgsql security definer set search_path = public as $$
declare e public.ek_isler; i public.isler;
begin
  select * into e from public.ek_isler where id = p_ek for update;
  i := public._is_kilitle(e.is_id);
  if i.musteri_id <> auth.uid() or e.durum <> 'onay_bekliyor' or i.durum <> 'basladi' then
    perform public.hata('Bu ek iş için karar verilemez.');
  end if;
  if p_kabul then
    -- tutar, onay anındaki toplam üzerinden yeniden hesaplanır
    update public.ek_isler set durum = 'onaylandi', karar_at = now(),
      musteri_tutari_kd = public._ek_musteri_tutari(e.is_id, e.hv_tutari_kh)
     where id = p_ek returning * into e;
    insert into public.odemeler (is_id, tur, bloke_tutar, durum) values (e.is_id, 'ek', e.musteri_tutari_kd, 'bloke_bekliyor');
    perform public.bildir(i.hv_id, 'Ek iş onaylandı', e.aciklama, i.id);
  else
    update public.ek_isler set durum = 'reddedildi', karar_at = now() where id = p_ek;
    perform public.bildir(i.hv_id, 'Ek iş onaylanmadı', e.aciklama || ' — yalnız anlatılan kısmı yap.', i.id);
  end if;
end $$;

-- K8: malzeme masrafı; müşteri onayıyla ödenir, okindo pay almaz
create or replace function public.masraf_ekle(p_is uuid, p_aciklama text, p_tutar numeric, p_fis_yolu text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i public.isler; v_id uuid;
begin
  i := public._is_kilitle(p_is);
  if i.hv_id <> auth.uid() or i.durum not in ('basladi', 'bitti') then perform public.hata('Masraf şu an eklenemez.'); end if;
  if split_part(p_fis_yolu, '/', 1) <> p_is::text then perform public.hata('Fiş fotoğrafı geçersiz.'); end if;
  insert into public.masraflar (is_id, aciklama, tutar, fis_yolu) values (p_is, p_aciklama, p_tutar, p_fis_yolu)
    returning id into v_id;
  perform public.bildir(i.musteri_id, 'Malzeme masrafı onayın bekleniyor', p_aciklama || ': ' || p_tutar || ' TL', p_is);
  return v_id;
end $$;

create or replace function public.masraf_karar(p_masraf uuid, p_kabul boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m public.masraflar; i public.isler;
begin
  select * into m from public.masraflar where id = p_masraf for update;
  select * into i from public.isler where id = m.is_id;
  if i.musteri_id <> auth.uid() or m.durum <> 'onay_bekliyor' then perform public.hata('Bu masraf için karar verilemez.'); end if;
  update public.masraflar set durum = case when p_kabul then 'onaylandi' else 'reddedildi' end where id = p_masraf;
  perform public.bildir(i.hv_id, case when p_kabul then 'Masraf onaylandı' else 'Masraf onaylanmadı' end, m.aciklama, i.id);
end $$;

-- K26: HV işi bitirir (bitiş fotoğrafı şart)
create or replace function public.isi_bitir(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  i := public._is_kilitle(p_is);
  if i.hv_id is distinct from auth.uid() or i.durum <> 'basladi' then perform public.hata('Bu adım şu an yapılamaz.'); end if;
  if not exists (select 1 from public.is_fotograflari where is_id = p_is and tur = 'bitis') then
    perform public.hata('Önce bitiş fotoğrafını çekmelisin.');
  end if;
  update public.ek_isler set durum = 'reddedildi', karar_at = now()
   where is_id = p_is and durum in ('fiyat_bekliyor', 'onay_bekliyor');
  update public.isler set durum = 'bitti', bitti_at = now() where id = p_is;
  perform public.bildir(i.musteri_id, 'Her şey yolunda mı?',
    'İş bitti. Onayla ya da bir sorun varsa bildir. ' || public.ayar_num('otomatik_onay_saat')
    || ' saat içinde cevap vermezsen iş otomatik onaylanır.', p_is);
end $$;

-- İşi kapatır: tahsilat, HV hakedişi, pay indirimleri (K5, K58), stopaj (K1)
create or replace function public._is_kapat(p_is uuid, p_otomatik boolean, p_iade_kd numeric default 0) returns void
language plpgsql security definer set search_path = public as $$
declare
  i public.isler;
  p public.profiller;
  v_hv_toplam numeric;
  v_pay_std numeric;
  v_fiyat_kh numeric;
  v_oran numeric := public.ayar_num('okindo_oran');
  v_oran_aday numeric;
  v_indirim text;
  v_ay_is int;
  v_pay_etkin numeric;
  v_brut numeric;
  v_musteri_toplam numeric;
  v_oransal numeric := 1;
  v_masraf numeric;
  v_stopaj numeric;
begin
  i := public._is_kilitle(p_is);
  select * into p from public.profiller where id = i.hv_id;

  select i.hv_tutari_kh + coalesce(sum(e.hv_tutari_kh), 0) into v_hv_toplam
    from public.ek_isler e where e.is_id = p_is and e.durum = 'onaylandi';
  v_pay_std := public.okindo_payi(v_hv_toplam);
  v_fiyat_kh := v_hv_toplam + v_pay_std;

  -- Kademe (K5)
  select count(*) into v_ay_is from public.isler
   where hv_id = i.hv_id and durum = 'onaylandi'
     and date_trunc('month', onay_at at time zone 'Europe/Istanbul') = date_trunc('month', now() at time zone 'Europe/Istanbul');
  if v_ay_is >= 50 then v_oran := public.ayar_num('oran_kademe_3'); v_indirim := 'Kademe (50+ iş)';
  elsif v_ay_is >= 20 then v_oran := public.ayar_num('oran_kademe_2'); v_indirim := 'Kademe (21-50 iş)';
  end if;

  -- Kurucu indirimi, rozet şartları sürdükçe (K58)
  if p.kurucu and p.egitim_tamam_at is not null
     and not exists (select 1 from public.guvenilirlik_olaylari g where g.hv_id = p.id and g.tur = 'gelmedi'
                     and g.olusturma_at > now() - interval '30 days')
     and coalesce(public.hv_puan(p.id), 5) > 4.5 then
    v_oran_aday := public.ayar_num('okindo_oran') - public.ayar_num('kurucu_indirim_puan');
    if v_oran_aday < v_oran then v_oran := v_oran_aday; v_indirim := 'Kurucu indirimi'; end if;
  end if;

  -- Aynı müşteriden tekrar iş; planlı düzenli işte uygulanmaz (K5)
  if i.seri_id is null and exists (select 1 from public.isler o where o.musteri_id = i.musteri_id
       and o.hv_id = i.hv_id and o.durum = 'onaylandi' and o.id <> i.id) then
    v_oran_aday := public.ayar_num('okindo_oran') - public.ayar_num('tekrar_indirim_puan');
    if v_oran_aday < v_oran then v_oran := v_oran_aday; v_indirim := 'Tekrar iş indirimi'; end if;
  end if;

  -- İndirimler birleşmez, oran tabanın altına inmez, pay 100 TL'nin altına düşmez (K5)
  v_oran := greatest(v_oran, public.ayar_num('oran_taban'));
  v_pay_etkin := least(v_pay_std, greatest(public.ayar_num('okindo_taban'), round(v_oran * v_fiyat_kh, 2)));
  if v_pay_etkin = v_pay_std then v_indirim := null; end if;

  -- Kurucuların ilk iki ayı (K58, K5'in tek istisnası)
  if p.kurucu then
    if p.ilk_is_at is null or now() < p.ilk_is_at + interval '30 days' then
      v_pay_etkin := 0; v_indirim := 'Kurucu ilk ay (pay yok)';
    elsif now() < p.ilk_is_at + interval '60 days' then
      v_pay_etkin := greatest(50, round(v_pay_etkin / 2, 2)); v_indirim := 'Kurucu ikinci ay (yarı pay)';
    end if;
  end if;

  v_brut := v_fiyat_kh - v_pay_etkin + i.yol_kh;

  -- Kısmi iade (anlaşmazlık kararı): HV'nin payı aynı oranda azalır
  v_musteri_toplam := i.musteri_toplam_kd
    + coalesce((select sum(bloke_tutar) from public.odemeler where is_id = p_is and tur = 'ek' and durum = 'bloke'), 0);
  if coalesce(p_iade_kd, 0) > 0 then
    if p_iade_kd >= v_musteri_toplam then perform public.hata('Kısmi iade toplam tutardan küçük olmalı.'); end if;
    v_oransal := (v_musteri_toplam - p_iade_kd) / v_musteri_toplam;
    v_brut := round(v_brut * v_oransal, 2);
  end if;

  v_stopaj := round(v_brut * public.ayar_num('stopaj_orani'), 2);
  select coalesce(sum(tutar), 0) into v_masraf from public.masraflar where is_id = p_is and durum = 'onaylandi';

  -- Tahsilat: iade varsa yalnız iş blokesinden düşülür, ek iş blokeleri tam kapanır
  if coalesce(p_iade_kd, 0) > (select coalesce(sum(bloke_tutar), 0) from public.odemeler
                               where is_id = p_is and tur = 'is' and durum in ('bloke', 'kart_kayitli')) then
    perform public.hata('Kısmi iade, ana iş tutarını aşamaz.');
  end if;
  update public.odemeler set durum = 'kapama_bekliyor', kapama_tutar = bloke_tutar - coalesce(p_iade_kd, 0)
   where is_id = p_is and tur = 'is' and durum in ('bloke', 'kart_kayitli');
  update public.odemeler set durum = 'kapama_bekliyor', kapama_tutar = bloke_tutar
   where is_id = p_is and tur = 'ek' and durum = 'bloke';
  if v_masraf > 0 then
    insert into public.odemeler (is_id, tur, bloke_tutar, kapama_tutar, durum) values (p_is, 'masraf', 0, v_masraf, 'tahsil_bekliyor');
  end if;

  insert into public.hakedisler (is_id, hv_id, tur, brut_kh, uygulanan_oran, uygulanan_indirim, okindo_payi_kh, stopaj, net, masraf)
    values (p_is, i.hv_id, 'is', v_brut, v_oran, v_indirim, v_pay_etkin, v_stopaj, v_brut - v_stopaj, v_masraf);

  update public.isler set durum = 'onaylandi', onay_at = now(), otomatik_onay = p_otomatik where id = p_is;
  update public.profiller set ilk_is_at = now() where id = i.hv_id and ilk_is_at is null;

  perform public.bildir(i.hv_id, 'Ödemen yolda', 'İş onaylandı. Net ' || (v_brut - v_stopaj) || ' TL hesabına gönderiliyor.', p_is);
  perform public.bildir(i.musteri_id, 'Teşekkürler', 'İşin tamamlandı. ' || public.ad_kisa(i.hv_id) || ' için puan verebilirsin.', p_is);
end $$;

create or replace function public.isi_onayla(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  select * into i from public.isler where id = p_is;
  if i.musteri_id is distinct from auth.uid() or i.durum <> 'bitti' then perform public.hata('Bu iş şu an onaylanamaz.'); end if;
  if exists (select 1 from public.masraflar where is_id = p_is and durum = 'onay_bekliyor') then
    perform public.hata('Önce bekleyen malzeme masrafına karar vermelisin.');
  end if;
  perform public._is_kapat(p_is, false, 0);
end $$;

-- K26: müşteri "sorun var" der; ödeme donar, yöneticiye düşer
create or replace function public.sorun_bildir(p_is uuid, p_aciklama text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i public.isler; v_id uuid;
begin
  i := public._is_kilitle(p_is);
  if i.musteri_id <> auth.uid() or i.durum <> 'bitti' then perform public.hata('Bu iş için şu an sorun bildirilemez.'); end if;
  update public.isler set durum = 'sorun' where id = p_is;
  insert into public.anlasmazliklar (is_id, acan_id, tur, aciklama) values (p_is, auth.uid(), 'sorun', p_aciklama)
    returning id into v_id;
  perform public.bildir(i.hv_id, 'Müşterin bir sorun bildirdi', 'Ödeme inceleme bitene kadar bekleyecek. Fotoğraflarını kontrol et.', p_is);
  perform public.yoneticilere_bildir('Yeni anlaşmazlık', p_aciklama, p_is);
  return v_id;
end $$;

-- K25: iş yapılamadı
create or replace function public.yapilamadi(p_is uuid, p_sebep text, p_aciklama text) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  i := public._is_kilitle(p_is);
  if i.hv_id is distinct from auth.uid() or i.durum not in ('adreste', 'basladi') then
    perform public.hata('Bu adım şu an yapılamaz.');
  end if;
  if p_sebep not in ('musteri', 'beceri', 'riskli') then perform public.hata('Sebep geçersiz.'); end if;

  if p_sebep = 'musteri' then
    if not exists (select 1 from public.is_fotograflari where is_id = p_is and tur = 'yapilamadi') then
      perform public.hata('Sebebi gösteren bir fotoğraf eklemelisin.');
    end if;
    perform public._kismi_tahsil(p_is, i.hv_id, 'cikis', public.ayar_num('cikis_ucreti') + i.yol_kh);
    update public.isler set durum = 'yapilamadi', sonuc_notu = 'Müşteri kaynaklı: ' || coalesce(p_aciklama, '') where id = p_is;
    perform public.bildir(i.musteri_id, 'İş yapılamadı', 'Çıkış ücreti alındı. Sebep: ' || coalesce(p_aciklama, ''), p_is);
  else
    if p_sebep = 'beceri' then
      perform public.kupon_ver(i.musteri_id, public.ayar_num('beceri_kupon'), 'İş yapılamadı');
    else
      insert into public.guvenilirlik_olaylari (hv_id, tur, is_id) values (i.hv_id, 'riskli_birakti', p_is);
    end if;
    perform public._isi_yeniden_ac(p_is, i.hv_id);
    perform public.bildir(i.musteri_id, 'İşini başka birine açtık',
      case when p_sebep = 'riskli' then 'Bu iş için yetkili servis gerekebilir. ' else '' end
      || 'Hiçbir şey ödemedin. İstersen talebi ücretsiz iptal edebilirsin.', p_is);
  end if;
end $$;

-- K22: müşteri evde yok (10 dakika bekleme + fotoğraf)
create or replace function public.evde_yok(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  i := public._is_kilitle(p_is);
  if i.hv_id is distinct from auth.uid() or i.durum <> 'adreste' then perform public.hata('Bu adım şu an yapılamaz.'); end if;
  if now() < i.adreste_at + make_interval(mins => public.ayar_num('evde_yok_bekleme_dk')::int) then
    perform public.hata(public.ayar_num('evde_yok_bekleme_dk') || ' dakika beklemeden bu kayıt açılamaz.');
  end if;
  if not exists (select 1 from public.is_fotograflari where is_id = p_is and tur = 'evde_yok') then
    perform public.hata('Kapının fotoğrafını eklemelisin.');
  end if;
  perform public._kismi_tahsil(p_is, i.hv_id, 'cikis', public.ayar_num('cikis_ucreti') + i.yol_kh);
  update public.isler set durum = 'evde_yok' where id = p_is;
  perform public.bildir(i.musteri_id, 'Sana ulaşamadık', 'Adreste olmadığın için çıkış ücreti alındı.', p_is);
end $$;

-- K35: iptal
create or replace function public.is_iptal(p_is uuid, p_sebep text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  i public.isler;
  v_gec boolean;
begin
  i := public._is_kilitle(p_is);
  v_gec := i.planlanan_baslangic - now() < make_interval(hours => public.ayar_num('gec_iptal_saat')::int);

  if auth.uid() = i.musteri_id then
    if i.durum in ('odeme_bekliyor', 'acik') or (i.durum = 'kabul' and not v_gec) then
      perform public._is_odemelerini_iade(p_is);
      perform public._kuponu_geri_ver(p_is);
    elsif i.durum in ('yolda', 'adreste') then
      perform public._kismi_tahsil(p_is, i.hv_id, 'cikis', public.ayar_num('cikis_ucreti') + i.yol_kh);
    elsif i.durum = 'kabul' then
      perform public._kismi_tahsil(p_is, i.hv_id, 'gec_iptal', public.ayar_num('gec_iptal_ucreti'));
    else
      perform public.hata('Başlamış bir iş iptal edilemez. Sorun varsa bize bildir.');
    end if;
    update public.isler set durum = 'iptal', iptal_at = now(), iptal_eden = 'musteri', sonuc_notu = p_sebep where id = p_is;
    if i.hv_id is not null then
      perform public.bildir(i.hv_id, 'İş iptal edildi', 'Müşteri işi iptal etti.', p_is);
    end if;

  elsif auth.uid() = i.hv_id then
    if i.durum not in ('kabul', 'yolda') then perform public.hata('Bu aşamada iptal edemezsin; "yapılamadı" seçeneğini kullan.'); end if;
    if v_gec then
      insert into public.guvenilirlik_olaylari (hv_id, tur, is_id) values (i.hv_id, 'gec_iptal', p_is);
      perform public.kupon_ver(i.musteri_id, public.ayar_num('hv_iptal_kupon'), 'Özür kuponu');
    end if;
    perform public._isi_yeniden_ac(p_is, i.hv_id);
    perform public.bildir(i.musteri_id, 'Yeni birini arıyoruz', 'Seçtiğin kişi gelemiyor; işini başkalarına açtık.', p_is);
  else
    perform public.hata('Bu işi iptal edemezsin.');
  end if;
end $$;

-- ============================================================
-- PUAN, BAHŞİŞ, MESAJ (K42, K46, K6, K44)
-- ============================================================
create or replace function public.puan_ver(
  p_is uuid, p_puan int, p_yorum text default null, p_anket jsonb default null, p_numara_istedi boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  i public.isler;
  v_yon text;
  v_alan uuid;
  v_onceki public.puanlar;
  v_say int;
begin
  select * into i from public.isler where id = p_is;
  if i.durum <> 'onaylandi' then perform public.hata('Puan yalnız tamamlanan işe verilir.'); end if;
  if now() > i.onay_at + interval '7 days' then perform public.hata('Puan verme süresi doldu.'); end if;
  if auth.uid() = i.musteri_id then v_yon := 'musteri_hv'; v_alan := i.hv_id;
  elsif auth.uid() = i.hv_id then v_yon := 'hv_musteri'; v_alan := i.musteri_id;
  else perform public.hata('Bu işe puan veremezsin.'); end if;

  select * into v_onceki from public.puanlar where is_id = p_is and veren_id = auth.uid();
  insert into public.puanlar (is_id, veren_id, alan_id, yon, puan, yorum, anket, numara_istedi)
    values (p_is, auth.uid(), v_alan, v_yon, p_puan, nullif(trim(p_yorum), ''), p_anket,
            case when v_yon = 'hv_musteri' then p_numara_istedi end)
    on conflict (is_id, veren_id) do update set puan = excluded.puan, yorum = excluded.yorum,
      anket = excluded.anket, numara_istedi = excluded.numara_istedi;

  if v_yon = 'hv_musteri' then
    -- HV 2 ya da altı verirse o müşteriyle bir daha eşleşmez
    if p_puan <= 2 then
      insert into public.eslesme_engelleri (hv_id, musteri_id, sebep) values (auth.uid(), i.musteri_id, 'Düşük puan')
        on conflict do nothing;
    end if;
    -- K46: 2 farklı HV'den "evet" → müşteriye hatırlatma, 3 → yönetici incelemesi
    if p_numara_istedi and coalesce(v_onceki.numara_istedi, false) = false then
      select count(distinct pu.veren_id) into v_say from public.puanlar pu
       where pu.alan_id = i.musteri_id and pu.yon = 'hv_musteri' and pu.numara_istedi
         and pu.olusturma_at > now() - interval '90 days';
      if v_say = 2 then
        perform public.bildir(i.musteri_id, 'Küçük bir hatırlatma', 'Uygulama dışında yapılan işler sigortasız ve güvencesizdir.');
      elsif v_say = 3 then
        insert into public.anlasmazliklar (is_id, tur, aciklama) values (p_is, 'platform_disi', 'Müşteri için 3 farklı HV numara istendiğini bildirdi.');
        perform public.yoneticilere_bildir('Platform dışı iş şüphesi', 'Bir müşteri için 3 farklı bildirim geldi.', p_is);
      end if;
    end if;
  else
    -- Müşteri 2 ya da altı verirse inceleme başlar
    if p_puan <= 2 and v_onceki.id is null then
      insert into public.anlasmazliklar (is_id, acan_id, tur, aciklama) values (p_is, auth.uid(), 'dusuk_puan', p_yorum);
      insert into public.guvenilirlik_olaylari (hv_id, tur, is_id) values (i.hv_id, 'dusuk_puan', p_is);
      perform public.yoneticilere_bildir('Düşük puan', coalesce(p_yorum, ''), p_is);
    end if;
    -- K39: aynı etikette son 2 iş 3 yıldızın altındaysa etiket askıya alınır
    if (select count(*) from (
          select pu.puan from public.puanlar pu join public.isler j on j.id = pu.is_id
          where pu.alan_id = i.hv_id and pu.yon = 'musteri_hv' and j.hizmet_id = i.hizmet_id and not j.tanitim
          order by j.onay_at desc limit 2) son where son.puan < 3) = 2 then
      update public.hv_etiketleri set askida = true where hv_id = i.hv_id and hizmet_id = i.hizmet_id;
      perform public.bildir(i.hv_id, 'Bir etiketin askıya alındı',
        'Bu işte son iki puanın düşük. Kategorinin kısa eğitimini tekrar yapınca etiket yeniden açılır.');
    end if;
  end if;
end $$;

create or replace function public.bahsis_ver(p_is uuid, p_tutar numeric) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  select * into i from public.isler where id = p_is;
  if i.musteri_id is distinct from auth.uid() or i.durum <> 'onaylandi' then perform public.hata('Bahşiş şu an verilemez.'); end if;
  if p_tutar is null or p_tutar < 10 or p_tutar > 2000 then perform public.hata('Bahşiş 10 ile 2.000 TL arasında olmalı.'); end if;
  insert into public.odemeler (is_id, tur, bloke_tutar, kapama_tutar, durum) values (p_is, 'bahsis', 0, p_tutar, 'tahsil_bekliyor');
  update public.hakedisler set bahsis = bahsis + p_tutar where is_id = p_is and tur = 'is';
  perform public.bildir(i.hv_id, 'Bahşiş aldın', p_tutar || ' TL bahşiş gönderildi. Ellerine sağlık!', p_is);
end $$;

create or replace function public.mesaj_gonder(p_is uuid, p_metin text) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler; v_alici uuid;
begin
  select * into i from public.isler where id = p_is;
  if auth.uid() not in (i.musteri_id, coalesce(i.hv_id, '00000000-0000-0000-0000-000000000000'))
     or i.durum not in ('kabul', 'yolda', 'adreste', 'basladi', 'bitti', 'sorun') then
    perform public.hata('Bu işe şu an mesaj gönderilemez.');
  end if;
  insert into public.mesajlar (is_id, gonderen_id, metin) values (p_is, auth.uid(), trim(p_metin));
  v_alici := case when auth.uid() = i.musteri_id then i.hv_id else i.musteri_id end;
  perform public.bildir(v_alici, 'Yeni mesaj', public.ad_kisa(auth.uid()), p_is);
end $$;

-- K45: acil düğmesi — uygulama 112'yi arar, bu fonksiyon yöneticilere kırmızı alarm düşürür
create or replace function public.acil_bildir(p_is uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.isler;
begin
  select * into i from public.isler where id = p_is;
  if auth.uid() is null or auth.uid() not in (i.musteri_id, coalesce(i.hv_id, i.musteri_id)) then
    perform public.hata('Bu iş için acil durum bildiremezsin.');
  end if;
  perform public.yoneticilere_bildir('KIRMIZI ALARM',
    public.ad_kisa(auth.uid()) || ' acil durum bildirdi. 15 dakika içinde dön.', p_is);
end $$;

-- İşteki diğer tarafın kısa bilgisi (müşteri HV'yi, HV müşterinin yalnız adını görür)
create or replace function public.is_karsi_taraf(p_is uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i public.isler;
begin
  select * into i from public.isler where id = p_is;
  if auth.uid() = i.musteri_id and i.hv_id is not null then return public.hv_karti(i.hv_id); end if;
  if auth.uid() = i.hv_id then
    return jsonb_build_object('ad', (select coalesce(ad, 'Müşteri') from public.profiller where id = i.musteri_id));
  end if;
  return null;
end $$;

-- ============================================================
-- HV HESABI
-- ============================================================
create or replace function public.hv_basvur(p_ad text, p_soyad text, p_mahalle uuid, p_etiketler uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_ad), '') = '' or coalesce(trim(p_soyad), '') = '' then perform public.hata('Adını ve soyadını yazmalısın.'); end if;
  if coalesce(array_length(p_etiketler, 1), 0) = 0 then perform public.hata('En az bir hizmet seçmelisin.'); end if;
  update public.profiller set ad = trim(p_ad), soyad = trim(p_soyad), mahalle_id = p_mahalle,
    hv_durum = case when hv_durum = 'yok' then 'basvuru' else hv_durum end
   where id = auth.uid();
  insert into public.hv_etiketleri (hv_id, hizmet_id)
    select auth.uid(), unnest(p_etiketler) on conflict do nothing;
  perform public.yoneticilere_bildir('Yeni HV başvurusu', trim(p_ad) || ' ' || trim(p_soyad));
end $$;

create or replace function public.egitim_sorulari_getir()
returns table (id int, sira int, soru text, secenekler jsonb)
language sql stable security definer set search_path = public as $$
  select id, sira, soru, secenekler from public.egitim_sorulari order by sira
$$;

-- K38: 5 soruluk test; yanlış sorular gösterilir, hemen tekrar denenir
create or replace function public.egitim_tamamla(p_cevaplar jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_yanlis int[];
begin
  select coalesce(array_agg(s.id order by s.sira), '{}') into v_yanlis
    from public.egitim_sorulari s
    where (p_cevaplar ->> s.id::text) is null or (p_cevaplar ->> s.id::text)::int <> s.dogru;
  if array_length(v_yanlis, 1) is null then
    update public.profiller set egitim_tamam_at = now() where id = auth.uid();
    return jsonb_build_object('gecti', true, 'yanlislar', '[]'::jsonb);
  end if;
  return jsonb_build_object('gecti', false, 'yanlislar', to_jsonb(v_yanlis));
end $$;

create or replace function public.musaitlik_ayarla(p_musait boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_musait and not public.hv_aktif_mi(auth.uid()) then
    perform public.hata('Hesabın onaylanıp eğitimin tamamlanınca iş almaya başlayabilirsin.');
  end if;
  update public.profiller set musait = p_musait where id = auth.uid();
end $$;

-- K42: HV yorumlarını ilk 10 puandan sonra, en az 5'lik aylık gruplarda, karışık sırayla görür
create or replace function public.hv_puan_ozeti() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_toplam int;
begin
  select count(*) into v_toplam from public.puanlar pu join public.isler i on i.id = pu.is_id
   where pu.alan_id = auth.uid() and pu.yon = 'musteri_hv' and not i.tanitim;
  if v_toplam < 10 then
    return jsonb_build_object('gorunur', false, 'toplam', v_toplam, 'aylar', '[]'::jsonb);
  end if;
  return jsonb_build_object('gorunur', true, 'toplam', v_toplam, 'aylar', coalesce((
    select jsonb_agg(jsonb_build_object('ay', ay, 'ortalama', ort, 'yorumlar', yorumlar) order by ay desc)
    from (
      select to_char(date_trunc('month', pu.olusturma_at), 'YYYY-MM') ay,
             round(avg(pu.puan)::numeric, 1) ort,
             jsonb_agg(pu.yorum order by random()) filter (where pu.yorum is not null) yorumlar
      from public.puanlar pu join public.isler i on i.id = pu.is_id
      where pu.alan_id = auth.uid() and pu.yon = 'musteri_hv' and not i.tanitim
      group by 1 having count(*) >= 5
    ) g), '[]'::jsonb));
end $$;

-- ============================================================
-- DÜZENLİ İŞ (K13)
-- ============================================================
create or replace function public.duzenli_baslat(
  p_hizmet uuid, p_adres uuid, p_hv uuid, p_ilk_baslangic timestamptz, p_siklik int, p_saat numeric,
  p_cevaplar jsonb default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_seri uuid; h public.hizmetler;
begin
  select * into h from public.hizmetler where id = p_hizmet;
  if h.fiyat_tipi <> 'saatli' or h.kategori_id <> (select id from public.kategoriler where ad = 'Temizlik ve düzen') then
    if public.ayar_metin('pilot_modu') = 'true' then
      perform public.hata('Pilotta düzenli iş yalnız temizlikte var.');
    end if;
  end if;
  insert into public.duzenli_seriler (musteri_id, hv_id, hizmet_id, adres_id, siklik_gun, saat)
    values (auth.uid(), p_hv, p_hizmet, p_adres, p_siklik, p_saat) returning id into v_seri;
  perform public._talep_olustur(auth.uid(), p_hizmet, p_adres, p_ilk_baslangic, p_saat, false,
                                p_cevaplar, null, p_hv, false, v_seri);
  return v_seri;
end $$;

create or replace function public.duzenli_durdur(p_seri uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.duzenli_seriler set aktif = false where id = p_seri and musteri_id = auth.uid();
  if not found then perform public.hata('Seri bulunamadı.'); end if;
end $$;

-- ============================================================
-- HESAP SİLME (K71)
-- ============================================================
create or replace function public.hesap_silme_istegi() returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.isler where (musteri_id = auth.uid() or hv_id = auth.uid())
             and durum in ('kabul', 'yolda', 'adreste', 'basladi', 'bitti', 'sorun')) then
    perform public.hata('Devam eden bir işin var. İş bittikten sonra hesabını silebilirsin.');
  end if;
  update public.isler set durum = 'iptal', iptal_at = now(), iptal_eden = 'musteri'
   where musteri_id = auth.uid() and durum in ('odeme_bekliyor', 'acik');
  perform public._is_odemelerini_iade(id) from public.isler where musteri_id = auth.uid() and iptal_at > now() - interval '1 minute';
  update public.duzenli_seriler set aktif = false where musteri_id = auth.uid();
  update public.profiller set silinme_istegi_at = now(), musait = false where id = auth.uid();
end $$;

-- ============================================================
-- YÖNETİCİ
-- ============================================================
create or replace function public.yonetici_hv_onayla(
  p_hv uuid, p_gorusme_notu text, p_sicil_dogrulandi boolean, p_onayli_etiketler uuid[], p_kurucu boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.yonetici_mi() then perform public.hata('Yetkin yok.'); end if;
  if not p_sicil_dogrulandi then perform public.hata('Adli sicil kaydı e-Devlet''ten doğrulanmadan onay verilemez.'); end if;
  if coalesce(trim(p_gorusme_notu), '') = '' then perform public.hata('Yüz yüze görüşme notunu yazmalısın.'); end if;
  update public.profiller set hv_durum = 'aktif', gorusme_notu = p_gorusme_notu,
    sicil_dogrulama_at = now(), sicil_dogrulayan = auth.uid(), kurucu = p_kurucu
   where id = p_hv;
  update public.hv_etiketleri set onayli = (hizmet_id = any(p_onayli_etiketler)), askida = false where hv_id = p_hv;
  perform public.bildir(p_hv, 'Başvurun onaylandı',
    'Hoş geldin! Eğitimini tamamlayınca iş almaya başlayabilirsin.');
end $$;

create or replace function public.yonetici_hv_durum(p_hv uuid, p_durum text, p_gerekce text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.yonetici_mi() then perform public.hata('Yetkin yok.'); end if;
  if coalesce(trim(p_gerekce), '') = '' then perform public.hata('Gerekçe yazmalısın (K43).'); end if;
  update public.profiller set hv_durum = p_durum, musait = case when p_durum = 'aktif' then musait else false end
   where id = p_hv;
  perform public.bildir(p_hv, 'Hesap durumun değişti', p_gerekce || ' — 7 gün içinde itiraz edebilirsin.');
end $$;

-- K34: yönetici kararı (pilotta ikinci bir kişiye danışılarak)
create or replace function public.yonetici_anlasmazlik_karar(
  p_anlasmazlik uuid, p_sonuc text, p_gerekce text, p_danisilan text, p_iade_kd numeric default 0
) returns void
language plpgsql security definer set search_path = public as $$
declare a public.anlasmazliklar; i public.isler;
begin
  if not public.yonetici_mi() then perform public.hata('Yetkin yok.'); end if;
  if coalesce(trim(p_gerekce), '') = '' then perform public.hata('Kararın gerekçesini yazmalısın.'); end if;
  select * into a from public.anlasmazliklar where id = p_anlasmazlik for update;
  if a.durum = 'karar' then perform public.hata('Bu anlaşmazlık zaten karara bağlandı.'); end if;
  if a.durum = 'itiraz' and a.karar_veren = auth.uid() and public.ayar_metin('pilot_modu') <> 'true' then
    perform public.hata('İtirazı ilk kararı veren değerlendiremez.');
  end if;
  select * into i from public.isler where id = a.is_id;

  if a.tur = 'sorun' and i.durum = 'sorun' then
    if p_sonuc = 'odeme' then
      perform public._is_kapat(i.id, false, 0);
    elsif p_sonuc = 'kismi' then
      perform public._is_kapat(i.id, false, p_iade_kd);
    elsif p_sonuc = 'tam_iade' then
      update public.odemeler set durum = 'iade_bekliyor', kapama_tutar = 0
       where is_id = i.id and durum in ('bloke', 'kart_kayitli');
      update public.isler set durum = 'iptal', iptal_at = now(), iptal_eden = 'yonetici', sonuc_notu = p_gerekce where id = i.id;
    else
      perform public.hata('Sonuç geçersiz.');
    end if;
  end if;

  update public.anlasmazliklar set durum = 'karar', karar = p_sonuc, gerekce = p_gerekce,
    danisilan = p_danisilan, karar_veren = auth.uid(), karar_at = now()
   where id = p_anlasmazlik;
  perform public.bildir(i.musteri_id, 'Kararımız', p_gerekce || ' — 7 gün içinde itiraz edebilirsin.', i.id);
  if i.hv_id is not null then
    perform public.bildir(i.hv_id, 'Kararımız', p_gerekce || ' — 7 gün içinde itiraz edebilirsin.', i.id);
  end if;
end $$;

create or replace function public.itiraz_et(p_anlasmazlik uuid, p_aciklama text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.anlasmazliklar; i public.isler;
begin
  select * into a from public.anlasmazliklar where id = p_anlasmazlik for update;
  select * into i from public.isler where id = a.is_id;
  if auth.uid() not in (i.musteri_id, coalesce(i.hv_id, i.musteri_id)) then perform public.hata('Bu karara itiraz edemezsin.'); end if;
  if a.durum <> 'karar' or now() > a.karar_at + interval '7 days' then perform public.hata('İtiraz süresi geçti.'); end if;
  update public.anlasmazliklar set durum = 'itiraz', aciklama = coalesce(aciklama, '') || E'\nİtiraz: ' || p_aciklama
   where id = p_anlasmazlik;
  perform public.yoneticilere_bildir('Karara itiraz', p_aciklama, a.is_id);
end $$;

-- ============================================================
-- ZAMANLAYICI (her 5 dakikada bir çalışır; 0004 dosyası)
-- ============================================================
create or replace function public.zamanlayici() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v jsonb := '{}';
  n int;
  v_hizmet text;
begin
  -- 1. Kayıtlı kartta bloke zamanı geldi (K29)
  update public.odemeler o set durum = 'bloke_bekliyor'
    from public.isler i
   where o.is_id = i.id and o.durum = 'kart_kayitli' and i.durum not in ('iptal')
     and i.planlanan_baslangic <= now() + make_interval(hours => public.ayar_num('bloke_once_saat')::int);
  get diagnostics n = row_count; v := v || jsonb_build_object('bloke', n);

  -- 2. Bloke 12 saatte düzelmedi → talep iptal (K29)
  for r in select i.* from public.isler i join public.odemeler o on o.is_id = i.id and o.tur = 'is'
            where o.durum = 'basarisiz' and o.guncelleme_at < now() - make_interval(hours => public.ayar_num('bloke_hata_saat')::int)
              and i.durum in ('odeme_bekliyor', 'acik', 'kabul') loop
    update public.isler set durum = 'iptal', iptal_at = now(), iptal_eden = 'sistem', sonuc_notu = 'Bloke yapılamadı' where id = r.id;
    perform public._kuponu_geri_ver(r.id);
    perform public.bildir(r.musteri_id, 'Talep iptal oldu', 'Kartında bloke yapılamadığı için talep iptal oldu.', r.id);
    if r.hv_id is not null then perform public.bildir(r.hv_id, 'İş iptal oldu', 'Müşterinin ödemesi alınamadı.', r.id); end if;
  end loop;

  -- 3. Hedefli talep: süre doldu → herkese açılır (K11) ya da müşteriye sorulur (K12)
  for r in select * from public.isler where durum = 'acik' and hedef_hv_id is not null and herkese_acildi_at is null
             and hedef_acilis_at <= now() loop
    if r.direkt_kod then
      if r.musteriye_soruldu_at is null then
        update public.isler set musteriye_soruldu_at = now() where id = r.id;
        perform public.bildir(r.musteri_id, 'Henüz kabul edilmedi',
          'Seçtiğin kişi 30 dakikadır cevap vermedi. Beklemeye devam edebilir ya da talebi herkese açabilirsin.', r.id);
      end if;
    else
      update public.isler set herkese_acildi_at = now() where id = r.id;
      perform public.talep_duyur(r.id);
    end if;
  end loop;

  -- 4. Kimse kabul etmedi → ücretsiz iptal
  for r in select * from public.isler where durum in ('acik', 'odeme_bekliyor')
             and planlanan_baslangic < now() - make_interval(mins => public.ayar_num('gelmedi_dk')::int) loop
    perform public._is_odemelerini_iade(r.id);
    perform public._kuponu_geri_ver(r.id);
    update public.isler set durum = 'iptal', iptal_at = now(), iptal_eden = 'sistem', sonuc_notu = 'Uygun kişi bulunamadı' where id = r.id;
    perform public.bildir(r.musteri_id, 'Üzgünüz', 'Bu saat için uygun kişi bulamadık. Hiçbir ücret alınmadı.', r.id);
  end loop;

  -- 5. HV gelmedi: ne "Adresteyim" ne kapı kodu (K22, K33)
  for r in select * from public.isler where durum in ('kabul', 'yolda') and adreste_at is null
             and planlanan_baslangic < now() - make_interval(mins => public.ayar_num('gelmedi_dk')::int) loop
    perform public._is_odemelerini_iade(r.id);
    perform public._kuponu_geri_ver(r.id);
    perform public.kupon_ver(r.musteri_id, public.ayar_num('gelmedi_kupon'), 'Hizmet veren gelmedi');
    insert into public.guvenilirlik_olaylari (hv_id, tur, is_id) values (r.hv_id, 'gelmedi', r.id);
    update public.isler set durum = 'gelmedi', sonuc_notu = 'Hizmet veren gelmedi' where id = r.id;
    perform public.bildir(r.musteri_id, 'Çok üzgünüz',
      'Seçtiğin kişi gelmedi. Paran iade edildi ve sana bir kupon verdik. Tek dokunuşla yeniden talep açabilirsin.', r.id);
    perform public.bildir(r.hv_id, 'İşe gelmedin', 'Bu iş "gelmedi" olarak kaydedildi.', r.id);
  end loop;

  -- 6. Kod girilmedi → müşteriye "içeride mi?" sorusu (K23)
  for r in select * from public.isler where durum = 'adreste' and icerde_sorusu_at is null
             and adreste_at < now() - make_interval(mins => public.ayar_num('kapi_kodu_hatirlatma_dk')::int) loop
    update public.isler set icerde_sorusu_at = now() where id = r.id;
    perform public.bildir(r.musteri_id, public.ad_kisa(r.hv_id) || ' içeride mi?',
      'İçerideyse uygulamadan "Evet" de; iş başlasın ve sigorta kapsamı açılsın.', r.id);
  end loop;

  -- 7. Otomatik onay (K26)
  n := 0;
  for r in select * from public.isler where durum = 'bitti'
             and bitti_at < now() - make_interval(hours => case when buyuk then public.ayar_num('otomatik_onay_saat_buyuk')
                                                                else public.ayar_num('otomatik_onay_saat') end::int) loop
    update public.masraflar set durum = 'onaylandi' where is_id = r.id and durum = 'onay_bekliyor';
    perform public._is_kapat(r.id, true, 0);
    n := n + 1;
  end loop;
  v := v || jsonb_build_object('otomatik_onay', n);

  -- 8. Uzun süren açık iş (K27)
  for r in select * from public.isler where durum = 'basladi' and acik_is_bildirim < 2
             and basladi_at < now() - make_interval(mins => tahmini_dk * (acik_is_bildirim + 2)) loop
    if r.acik_is_bildirim = 0 then
      perform public.bildir(r.hv_id, 'İş bitti mi?', 'Bitirdiysen fotoğrafı çek ve "Bitti" de.', r.id);
      perform public.bildir(r.musteri_id, 'İş bitti mi?', 'İş beklenenden uzun sürüyor. Bir sorun varsa bize yaz.', r.id);
    else
      perform public.yoneticilere_bildir('Uzun süren iş', 'Tahmini sürenin 3 katı geçti.', r.id);
    end if;
    update public.isler set acik_is_bildirim = acik_is_bildirim + 1 where id = r.id;
  end loop;

  -- 9. Düzenli iş: sıradaki seansı 6 gün kala oluştur (K13)
  for r in select s.*, (select max(i.planlanan_baslangic) from public.isler i where i.seri_id = s.id) as son
             from public.duzenli_seriler s where s.aktif loop
    if r.son is not null
       and r.son + make_interval(days => r.siklik_gun) <= now() + interval '6 days'
       and r.son + make_interval(days => r.siklik_gun) > now() then
      begin
        perform public._talep_olustur(r.musteri_id, r.hizmet_id, r.adres_id, r.son + make_interval(days => r.siklik_gun),
          r.saat, false, '{}', null, r.hv_id, false, r.id);
      exception when others then
        perform public.bildir(r.musteri_id, 'Düzenli işin oluşturulamadı', sqlerrm);
        update public.duzenli_seriler set aktif = false where id = r.id;
      end;
    end if;
  end loop;

  return v;
end $$;

-- ============================================================
-- YETKİLER: giriş yapmamış kullanıcı hiçbir fonksiyonu çağıramaz;
-- iç fonksiyonlar uygulamadan hiç çağrılamaz
-- ============================================================
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on function public._talep_olustur(uuid, uuid, uuid, timestamptz, numeric, boolean, jsonb, text, uuid, boolean, uuid) from public, anon, authenticated;
revoke execute on function public._is_kapat(uuid, boolean, numeric) from public, anon, authenticated;
revoke execute on function public._is_odemelerini_iade(uuid) from public, anon, authenticated;
revoke execute on function public._kuponu_geri_ver(uuid) from public, anon, authenticated;
revoke execute on function public._kismi_tahsil(uuid, uuid, text, numeric) from public, anon, authenticated;
revoke execute on function public._isi_yeniden_ac(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._is_kilitle(uuid) from public, anon, authenticated;
revoke execute on function public.zamanlayici() from public, anon, authenticated;
revoke execute on function public.bildir(uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.yoneticilere_bildir(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.kupon_ver(uuid, numeric, text) from public, anon, authenticated;
revoke execute on function public.talep_duyur(uuid) from public, anon, authenticated;
revoke execute on function public.fiyat_dokumu(uuid, numeric, boolean, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.indirim_bul(uuid) from public, anon, authenticated;
revoke execute on function public.talep_hv_icin_acik(public.isler, uuid) from public, anon, authenticated;
revoke execute on function public._ek_musteri_tutari(uuid, numeric) from public, anon, authenticated;
