-- okindo pilot veritabanı şeması
-- Kurallar "okindo: Çalışma Mantığı" sürüm 3'e dayanır; parantez içindeki K numaraları o belgedeki onay kaydıdır.
-- Tüm tutarlar TL'dir. "_kh" ekli alanlar KDV hariç, "_kd" ekli alanlar KDV dahildir.

-- ============================================================
-- AYARLAR (yönetici panelinden değişen sayılar)
-- ============================================================
create table public.ayarlar (
  anahtar text primary key,
  deger jsonb not null,
  aciklama text
);

insert into public.ayarlar (anahtar, deger, aciklama) values
  ('kdv_orani',               '0.20', 'KDV oranı (K2)'),
  ('okindo_taban',            '100',  'okindo payının alt sınırı, KDV hariç (K3)'),
  ('okindo_oran',             '0.15', 'okindo payı oranı, kademe 1 (K3, K5)'),
  ('oran_kademe_2',           '0.13', 'Ayda 21-50 iş yapan HV için oran (K5)'),
  ('oran_kademe_3',           '0.11', 'Ayda 50 üstü iş yapan HV için oran (K5)'),
  ('oran_taban',              '0.11', 'Oranın inebileceği en düşük değer (K5)'),
  ('kurucu_indirim_puan',     '0.02', 'Kurucu HV oran indirimi (K58)'),
  ('tekrar_indirim_puan',     '0.03', 'Aynı müşteriden tekrar iş indirimi (K5)'),
  ('acil_katsayi',            '1.3',  'Acil iş katsayısı (K15)'),
  ('yol_ucretsiz_km',         '10',   'Ücretsiz yol mesafesi (K16)'),
  ('yol_km_ucret',            '10',   'Km başı yol ücreti, KDV hariç (K16)'),
  ('yol_azami_km',            '50',   'Bu mesafeyi aşan talep açılmaz (K16)'),
  ('yol_katsayi',             '1.25', 'Kuş uçuşu mesafeyi yol mesafesine çeviren yaklaşık katsayı'),
  ('cikis_ucreti',            '150',  'Çıkış ücreti, KDV hariç, yol ayrıca (K20)'),
  ('gec_iptal_saat',          '2',    'Bu süreden az kala iptal ücretlidir (K35)'),
  ('gec_iptal_ucreti',        '75',   'Müşterinin geç iptal ücreti, KDV hariç (K35)'),
  ('hv_iptal_kupon',          '50',   'HV geç iptal ederse müşteriye kupon (K35)'),
  ('gec_gelme_dk',            '15',   'Bu kadar geç gelinirse müşteriye kupon (K33)'),
  ('gec_gelme_kupon',         '50',   'Geç gelme kuponu tutarı (K33)'),
  ('gelmedi_dk',              '30',   'Planlanan saatten bu kadar sonra Adresteyim yoksa HV gelmedi sayılır (K22, K33)'),
  ('gelmedi_kupon',           '50',   'HV gelmezse müşteriye kupon (K33)'),
  ('beceri_kupon',            '50',   'HV becerisi yetmezse müşteriye kupon (K25)'),
  ('kupon_gecerlilik_gun',    '90',   'Otomatik kuponların varsayılan süresi; süresiz kupon olmaz (K32)'),
  ('evde_yok_bekleme_dk',     '10',   'Müşteriye ulaşılamadan önce beklenecek süre (K22)'),
  ('kapi_kodu_hatirlatma_dk', '5',    'Kod girilmezse müşteriye "içeride mi?" sorusu (K23)'),
  ('hedefli_bekleme_dk',      '10',   'Seçilen kişi kabul etmezse herkese açılma süresi (K11)'),
  ('direkt_kod_bekleme_dk',   '30',   '"Beni direkt çağır" talebinde müşteriye sorma süresi (K12)'),
  ('otomatik_onay_saat',      '24',   'Müşteri cevap vermezse otomatik onay, küçük iş (K26)'),
  ('otomatik_onay_saat_buyuk','48',   'Otomatik onay, büyük iş (K26)'),
  ('bloke_on_gun',            '5',    'İşe bundan fazla gün varsa kart kaydedilir (K29)'),
  ('bloke_once_saat',         '48',   'Kayıtlı kartta bloke işten bu kadar önce yapılır (K29)'),
  ('bloke_hata_saat',         '12',   'Bloke tutmazsa talep bu süre sonra iptal olur (K29)'),
  ('yeni_musteri_ilk',        '100',  'Yeni müşteri ilk iş indirimi, KDV dahil'),
  ('yeni_musteri_ikinci',     '150',  'Yeni müşteri ikinci iş indirimi, KDV dahil'),
  ('ilk_indirim_gecerlilik_gun','14', 'İlk iş indiriminin hesap açıldıktan sonraki geçerlilik süresi'),
  ('ikinci_indirim_gun',      '30',   'İkinci iş indirimi ilk işten sonraki bu süre içinde geçerli'),
  ('min_odeme',               '50',   'Müşterinin her işte ödeyeceği en az tutar, KDV dahil (K32)'),
  ('calisma_baslangic',       '8',    'İşlerin başlayabileceği en erken saat (K51)'),
  ('calisma_bitis',           '22',   'İşlerin bitmesi gereken en geç saat (K51)'),
  ('saatli_en_az',            '2',    'Saatli işlerde en az süre, saat (K17)'),
  ('stopaj_orani',            '0.20', 'HV ödemesinden kesilen gelir vergisi; mali müşavir onayıyla kesinleşir (K1, K72)'),
  ('buyuk_is_tutar',          '5000', 'Büyük iş sınırı, KDV hariç (K19)'),
  ('buyuk_is_uyari_tutar',    '25000','Büyük iş uyarısı sınırı, KDV hariç (K49)'),
  ('pilot_modu',              'true', 'Pilot modu açık mı (K64)'),
  ('odeme_saglayici',         '"test"','test | iyzico. Gerçek ödeme bağlanana kadar test kalır (K28)'),
  ('destek_telefonu',         '""',   '"okindo’ya sor" düğmesinin aradığı numara; boşsa düğme görünmez');

-- ============================================================
-- KATALOG
-- ============================================================
create table public.mahalleler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  ilce text not null default 'Çankaya',
  enlem double precision not null,
  boylam double precision not null,
  aktif boolean not null default true
);

create table public.kategoriler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  sira int not null default 0,
  pilotta_acik boolean not null default true
);

create table public.hizmetler (
  id uuid primary key default gen_random_uuid(),
  kategori_id uuid not null references public.kategoriler(id),
  ad text not null,
  aciklama text,
  fiyat_tipi text not null check (fiyat_tipi in ('is_basi', 'saatli')),
  seviye int not null check (seviye between 1 and 4),          -- 4 = belgeli usta
  hv_tutari_kh numeric(12,2),                                  -- iş başı işlerde HV'nin eline geçen tutar
  hv_saatlik_kh numeric(12,2),                                 -- saatli işlerde HV'nin saatlik tutarı
  tahmini_dk int not null default 60,
  sorular jsonb not null default '[]',                         -- soru kartı (K9)
  hazirlik text,                                               -- müşteriye hazırlık listesi
  usta_gerekli boolean not null default false,                 -- K47
  aktif boolean not null default true,
  check (
    (fiyat_tipi = 'is_basi' and hv_tutari_kh is not null) or
    (fiyat_tipi = 'saatli'  and hv_saatlik_kh is not null)
  )
);

-- ============================================================
-- KULLANICILAR
-- ============================================================
create table public.profiller (
  id uuid primary key references auth.users(id) on delete cascade,
  telefon text,
  ad text,
  soyad text,
  mahalle_id uuid references public.mahalleler(id),
  foto_yolu text,
  yonetici boolean not null default false,
  -- HV alanları (tek hesapla hem hizmet alınır hem verilir)
  hv_durum text not null default 'yok'
    check (hv_durum in ('yok', 'basvuru', 'aktif', 'askida', 'kapali')),
  egitim_tamam_at timestamptz,
  gorusme_notu text,                       -- K37: pilotta yüz yüze görüşme notu
  sicil_dogrulama_at timestamptz,          -- K36: yalnız doğrulama kaydı tutulur, belge saklanmaz
  sicil_dogrulayan uuid,
  musait boolean not null default false,
  azami_km numeric not null default 10,
  kurucu boolean not null default false,   -- K58
  ilk_is_at timestamptz,                   -- kurucu ayları bu tarihten sayılır
  silinme_istegi_at timestamptz,
  olusturma_at timestamptz not null default now()
);

create table public.adresler (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  mahalle_id uuid not null references public.mahalleler(id),
  baslik text not null default 'Ev',
  acik_adres text not null,
  enlem double precision not null,
  boylam double precision not null,
  notlar text,                              -- "zil bozuk, ara", "köpeğim var"
  olusturma_at timestamptz not null default now()
);

create table public.hv_etiketleri (
  hv_id uuid not null references public.profiller(id) on delete cascade,
  hizmet_id uuid not null references public.hizmetler(id),
  onayli boolean not null default false,    -- K37: beceri kontrolünden sonra yönetici onaylar
  askida boolean not null default false,    -- K39: çaylak kontrolü
  primary key (hv_id, hizmet_id)
);

create table public.eslesme_engelleri (
  hv_id uuid not null references public.profiller(id) on delete cascade,
  musteri_id uuid not null references public.profiller(id) on delete cascade,
  sebep text,
  olusturma_at timestamptz not null default now(),
  primary key (hv_id, musteri_id)
);

create table public.egitim_sorulari (
  id serial primary key,
  sira int not null,
  soru text not null,
  secenekler jsonb not null,
  dogru int not null
);

-- ============================================================
-- İŞLER
-- ============================================================
create table public.duzenli_seriler (
  id uuid primary key default gen_random_uuid(),
  musteri_id uuid not null references public.profiller(id) on delete cascade,
  hv_id uuid references public.profiller(id),
  hizmet_id uuid not null references public.hizmetler(id),
  adres_id uuid not null references public.adresler(id),
  siklik_gun int not null check (siklik_gun in (7, 14)),
  saat numeric not null,
  aktif boolean not null default true,
  olusturma_at timestamptz not null default now()
);

create table public.isler (
  id uuid primary key default gen_random_uuid(),
  musteri_id uuid not null references public.profiller(id),
  hv_id uuid references public.profiller(id),
  hedef_hv_id uuid references public.profiller(id),
  direkt_kod boolean not null default false,
  hedef_acilis_at timestamptz,
  herkese_acildi_at timestamptz,
  musteriye_soruldu_at timestamptz,
  haric_hvler uuid[] not null default '{}',
  hizmet_id uuid not null references public.hizmetler(id),
  mahalle_id uuid not null references public.mahalleler(id),
  seri_id uuid references public.duzenli_seriler(id),
  durum text not null default 'odeme_bekliyor' check (durum in (
    'odeme_bekliyor', 'acik', 'kabul', 'yolda', 'adreste', 'basladi', 'bitti',
    'onaylandi', 'sorun', 'iptal', 'gelmedi', 'evde_yok', 'yapilamadi')),
  acil boolean not null default false,
  saat numeric,                              -- saatli işlerde süre
  tahmini_dk int not null,
  planlanan_baslangic timestamptz not null,
  cevaplar jsonb not null default '{}',
  aciklama text,
  tanitim boolean not null default false,    -- K59
  buyuk boolean not null default false,      -- K19
  -- fiyat (talep anındaki)
  hv_tutari_kh numeric(12,2) not null,
  yol_kh numeric(12,2) not null default 0,
  okindo_payi_kh numeric(12,2) not null,
  ara_toplam_kh numeric(12,2) not null,      -- hv + pay + yol
  kdv numeric(12,2) not null,
  brut_kd numeric(12,2) not null,            -- indirim öncesi KDV dahil
  indirim_kd numeric(12,2) not null default 0,
  indirim_turu text,                         -- 'ilk' | 'ikinci' | 'kupon'
  kupon_id uuid,
  musteri_toplam_kd numeric(12,2) not null,  -- müşterinin ödediği
  -- zaman kayıtları
  kabul_at timestamptz,
  yolda_at timestamptz,
  adreste_at timestamptz,
  adreste_enlem double precision,
  adreste_boylam double precision,
  icerde_sorusu_at timestamptz,
  basladi_at timestamptz,
  bitti_at timestamptz,
  onay_at timestamptz,
  otomatik_onay boolean not null default false,
  iptal_at timestamptz,
  iptal_eden text,
  sonuc_notu text,
  acik_is_bildirim int not null default 0,
  olusturma_at timestamptz not null default now()
);
create index isler_durum_idx on public.isler (durum);
create index isler_musteri_idx on public.isler (musteri_id);
create index isler_hv_idx on public.isler (hv_id);

-- Kapı kodu yalnız müşteriye görünür (K23)
create table public.is_gizli (
  is_id uuid primary key references public.isler(id) on delete cascade,
  kapi_kodu text not null
);

-- Tam adres yalnız iş kabulünden sonra ve iş bitene kadar HV'ye görünür (K21, K71)
create table public.is_adresleri (
  is_id uuid primary key references public.isler(id) on delete cascade,
  acik_adres text not null,
  enlem double precision not null,
  boylam double precision not null,
  notlar text
);

create table public.ek_isler (
  id uuid primary key default gen_random_uuid(),
  is_id uuid not null references public.isler(id) on delete cascade,
  ekleyen_id uuid not null references public.profiller(id),
  aciklama text not null,
  hv_tutari_kh numeric(12,2),                -- müşteri eklediyse HV fiyatlayana kadar boş
  musteri_tutari_kd numeric(12,2),
  durum text not null default 'onay_bekliyor'
    check (durum in ('fiyat_bekliyor', 'onay_bekliyor', 'onaylandi', 'reddedildi')),
  karar_at timestamptz,
  olusturma_at timestamptz not null default now()
);

create table public.masraflar (
  id uuid primary key default gen_random_uuid(),
  is_id uuid not null references public.isler(id) on delete cascade,
  aciklama text not null,
  tutar numeric(12,2) not null check (tutar > 0),
  fis_yolu text not null,
  durum text not null default 'onay_bekliyor' check (durum in ('onay_bekliyor', 'onaylandi', 'reddedildi')),
  olusturma_at timestamptz not null default now()
);

create table public.is_fotograflari (
  id uuid primary key default gen_random_uuid(),
  is_id uuid not null references public.isler(id) on delete cascade,
  yukleyen_id uuid not null references public.profiller(id),
  tur text not null check (tur in ('baslangic', 'bitis', 'evde_yok', 'yapilamadi', 'sorun', 'ek_is')),
  yol text not null,
  olusturma_at timestamptz not null default now()
);

-- ============================================================
-- PARA
-- ============================================================
-- Her satır, ödeme kuruluşunda yapılacak ya da yapılmış bir işlemdir.
-- Uygulama parayı tutmaz; sunucu fonksiyonu bu satırları ödeme kuruluşuna iletir (K28).
create table public.odemeler (
  id uuid primary key default gen_random_uuid(),
  is_id uuid not null references public.isler(id) on delete cascade,
  tur text not null check (tur in ('is', 'ek', 'masraf', 'bahsis')),
  bloke_tutar numeric(12,2) not null default 0,
  kapama_tutar numeric(12,2),
  durum text not null check (durum in (
    'kart_kayitli',      -- işe 5 günden fazla var, bloke sonra yapılacak
    'bloke_bekliyor', 'bloke', 'basarisiz',
    'kapama_bekliyor', 'kapandi',
    'iade_bekliyor', 'iade_edildi',
    'tahsil_bekliyor', 'tahsil_edildi')),
  saglayici_ref text,
  hata text,
  olusturma_at timestamptz not null default now(),
  guncelleme_at timestamptz not null default now()
);
create index odemeler_durum_idx on public.odemeler (durum);

create table public.hakedisler (
  id uuid primary key default gen_random_uuid(),
  is_id uuid not null references public.isler(id) on delete cascade,
  hv_id uuid not null references public.profiller(id),
  tur text not null default 'is' check (tur in ('is', 'cikis', 'gec_iptal')),
  brut_kh numeric(12,2) not null,            -- HV'nin brüt hakedişi (yol dahil)
  uygulanan_oran numeric(5,4),
  uygulanan_indirim text,                    -- K5: kazanç ekranında adıyla görünür
  okindo_payi_kh numeric(12,2) not null default 0,
  stopaj numeric(12,2) not null,
  net numeric(12,2) not null,
  masraf numeric(12,2) not null default 0,
  bahsis numeric(12,2) not null default 0,
  olusturma_at timestamptz not null default now()
);

-- Bonuslar okindo'nun kendi kasasından ödenir (K31)
create table public.hv_bakiye (
  id uuid primary key default gen_random_uuid(),
  hv_id uuid not null references public.profiller(id),
  tutar numeric(12,2) not null,
  aciklama text not null,
  odendi_at timestamptz,
  olusturma_at timestamptz not null default now()
);

create table public.kuponlar (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  tutar numeric(12,2) not null check (tutar > 0),
  sebep text not null,
  son_gecerlilik timestamptz not null,       -- K32: süresiz kupon olmaz
  kullanildi_is_id uuid references public.isler(id),
  olusturma_at timestamptz not null default now()
);

-- ============================================================
-- GÜVEN
-- ============================================================
create table public.puanlar (
  id uuid primary key default gen_random_uuid(),
  is_id uuid not null references public.isler(id) on delete cascade,
  veren_id uuid not null references public.profiller(id),
  alan_id uuid not null references public.profiller(id),
  yon text not null check (yon in ('musteri_hv', 'hv_musteri')),
  puan int not null check (puan between 1 and 5),
  yorum text,
  anket jsonb,                               -- K39: çaylak anketi
  numara_istedi boolean,                     -- K46
  olusturma_at timestamptz not null default now(),
  unique (is_id, veren_id)
);

create table public.guvenilirlik_olaylari (
  id uuid primary key default gen_random_uuid(),
  hv_id uuid not null references public.profiller(id),
  tur text not null check (tur in ('gelmedi', 'gec_kaldi', 'gec_iptal', 'riskli_birakti', 'dusuk_puan')),
  is_id uuid references public.isler(id),
  olusturma_at timestamptz not null default now()
);

create table public.anlasmazliklar (
  id uuid primary key default gen_random_uuid(),
  is_id uuid not null references public.isler(id) on delete cascade,
  acan_id uuid references public.profiller(id),
  tur text not null default 'sorun' check (tur in ('sorun', 'dusuk_puan', 'platform_disi', 'itiraz')),
  aciklama text,
  durum text not null default 'acik' check (durum in ('acik', 'karar', 'itiraz')),
  karar text,
  gerekce text,
  danisilan text,                            -- K34: pilotta danışılan ikinci kişi
  karar_veren uuid references public.profiller(id),
  karar_at timestamptz,
  olusturma_at timestamptz not null default now()
);

create table public.mesajlar (
  id uuid primary key default gen_random_uuid(),
  is_id uuid not null references public.isler(id) on delete cascade,
  gonderen_id uuid not null references public.profiller(id),
  metin text not null check (length(metin) between 1 and 1000),
  olusturma_at timestamptz not null default now()
);

create table public.bildirimler (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  baslik text not null,
  metin text not null,
  is_id uuid references public.isler(id) on delete cascade,
  tur text not null default 'islemsel' check (tur in ('islemsel', 'ticari')),
  okundu boolean not null default false,
  olusturma_at timestamptz not null default now()
);
create index bildirimler_kullanici_idx on public.bildirimler (kullanici_id, olusturma_at desc);

-- ============================================================
-- YARDIMCI FONKSİYONLAR
-- ============================================================
create or replace function public.ayar_num(p text) returns numeric
language sql stable security definer set search_path = public as $$
  select (deger #>> '{}')::numeric from public.ayarlar where anahtar = p
$$;

create or replace function public.ayar_metin(p text) returns text
language sql stable security definer set search_path = public as $$
  select deger #>> '{}' from public.ayarlar where anahtar = p
$$;

create or replace function public.yonetici_mi() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select yonetici from public.profiller where id = auth.uid()), false)
$$;

-- Yeni kullanıcı kaydında profil satırı açılır
create or replace function public.yeni_kullanici() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiller (id, telefon) values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger yeni_kullanici_profil
  after insert on auth.users
  for each row execute function public.yeni_kullanici();

-- Mesajlarda telefon, IBAN, e-posta ve sosyal medya hesabı gizlenir (K44)
create or replace function public.mesaj_gizle() returns trigger
language plpgsql as $$
declare t text := new.metin;
begin
  t := regexp_replace(t, 'TR\s?\d{2}(\s?\d{4}){5}\s?\d{2}', '[IBAN gizlendi]', 'gi');
  t := regexp_replace(t, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[e-posta gizlendi]', 'g');
  t := regexp_replace(t, '(\+?90[\s.-]?)?\(?0?5\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}', '[telefon gizlendi]', 'g');
  t := regexp_replace(t, '(\d[\s.-]?){10,}', '[numara gizlendi]', 'g');
  t := regexp_replace(t, '(^|\s)@[A-Za-z0-9_.]{2,}', '\1[hesap gizlendi]', 'g');
  t := regexp_replace(t, '(https?://|www\.)\S+', '[bağlantı gizlendi]', 'gi');
  new.metin := t;
  return new;
end $$;

create trigger mesaj_gizle_tetik
  before insert on public.mesajlar
  for each row execute function public.mesaj_gizle();

-- ============================================================
-- GÜVENLİK (RLS)
-- Yazma işlemlerinin neredeyse tamamı 0002 dosyasındaki fonksiyonlardan geçer;
-- tablolara doğrudan yazma izni yalnız aşağıda açıkça verilenlerde vardır.
-- ============================================================
alter table public.ayarlar enable row level security;
alter table public.mahalleler enable row level security;
alter table public.kategoriler enable row level security;
alter table public.hizmetler enable row level security;
alter table public.profiller enable row level security;
alter table public.adresler enable row level security;
alter table public.hv_etiketleri enable row level security;
alter table public.eslesme_engelleri enable row level security;
alter table public.egitim_sorulari enable row level security;
alter table public.duzenli_seriler enable row level security;
alter table public.isler enable row level security;
alter table public.is_gizli enable row level security;
alter table public.is_adresleri enable row level security;
alter table public.ek_isler enable row level security;
alter table public.masraflar enable row level security;
alter table public.is_fotograflari enable row level security;
alter table public.odemeler enable row level security;
alter table public.hakedisler enable row level security;
alter table public.hv_bakiye enable row level security;
alter table public.kuponlar enable row level security;
alter table public.puanlar enable row level security;
alter table public.guvenilirlik_olaylari enable row level security;
alter table public.anlasmazliklar enable row level security;
alter table public.mesajlar enable row level security;
alter table public.bildirimler enable row level security;

-- Herkese açık katalog
create policy katalog_oku on public.ayarlar for select using (true);
create policy katalog_oku on public.mahalleler for select using (true);
create policy katalog_oku on public.kategoriler for select using (true);
create policy katalog_oku on public.hizmetler for select using (true);
-- egitim_sorulari doğrudan okunmaz; doğru cevaplar gizli kalır (egitim_sorulari_getir fonksiyonu)
create policy yonetici on public.egitim_sorulari for all using (public.yonetici_mi());

-- Profil: kişi yalnız kendi satırını görür ve yalnız izin verilen sütunları değiştirir
create policy kendi_profil on public.profiller for select using (id = auth.uid() or public.yonetici_mi());
create policy kendi_profil_guncelle on public.profiller for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiller from anon, authenticated;
grant update (ad, soyad, mahalle_id, foto_yolu, azami_km) on public.profiller to authenticated;

-- Adresler: kişi kendi adreslerini yönetir
create policy kendi_adres on public.adresler for all
  using (kullanici_id = auth.uid()) with check (kullanici_id = auth.uid());

create policy kendi_etiket on public.hv_etiketleri for select using (hv_id = auth.uid() or public.yonetici_mi());
create policy yonetici on public.eslesme_engelleri for select using (public.yonetici_mi());
create policy kendi_seri on public.duzenli_seriler for select using (musteri_id = auth.uid() or hv_id = auth.uid() or public.yonetici_mi());

-- İşler: müşterisi, atanmış HV ve yönetici görür
create policy taraf on public.isler for select
  using (musteri_id = auth.uid() or hv_id = auth.uid() or public.yonetici_mi());

create policy musteri on public.is_gizli for select
  using (public.yonetici_mi() or exists (select 1 from public.isler i where i.id = is_id and i.musteri_id = auth.uid()));

create policy taraf on public.is_adresleri for select using (
  public.yonetici_mi() or exists (
    select 1 from public.isler i where i.id = is_id and (
      i.musteri_id = auth.uid() or
      (i.hv_id = auth.uid() and i.durum in ('kabul', 'yolda', 'adreste', 'basladi', 'bitti'))
    )
  )
);

create policy taraf on public.ek_isler for select using (
  public.yonetici_mi() or exists (select 1 from public.isler i where i.id = is_id and (i.musteri_id = auth.uid() or i.hv_id = auth.uid())));
create policy taraf on public.masraflar for select using (
  public.yonetici_mi() or exists (select 1 from public.isler i where i.id = is_id and (i.musteri_id = auth.uid() or i.hv_id = auth.uid())));
create policy taraf on public.is_fotograflari for select using (
  public.yonetici_mi() or exists (select 1 from public.isler i where i.id = is_id and (i.musteri_id = auth.uid() or i.hv_id = auth.uid())));
create policy taraf on public.mesajlar for select using (
  public.yonetici_mi() or exists (select 1 from public.isler i where i.id = is_id and (i.musteri_id = auth.uid() or i.hv_id = auth.uid())));

create policy musteri on public.odemeler for select using (
  public.yonetici_mi() or exists (select 1 from public.isler i where i.id = is_id and i.musteri_id = auth.uid()));
create policy kendi on public.hakedisler for select using (hv_id = auth.uid() or public.yonetici_mi());
create policy kendi on public.hv_bakiye for select using (hv_id = auth.uid() or public.yonetici_mi());
create policy kendi on public.kuponlar for select using (kullanici_id = auth.uid() or public.yonetici_mi());
-- Puanı yalnız veren görür; HV'ye toplu gösterim ayrı fonksiyonla yapılır (K42)
create policy veren on public.puanlar for select using (veren_id = auth.uid() or public.yonetici_mi());
create policy kendi on public.guvenilirlik_olaylari for select using (hv_id = auth.uid() or public.yonetici_mi());
create policy taraf on public.anlasmazliklar for select using (
  public.yonetici_mi() or acan_id = auth.uid() or
  exists (select 1 from public.isler i where i.id = is_id and (i.musteri_id = auth.uid() or i.hv_id = auth.uid())));
create policy kendi on public.bildirimler for select using (kullanici_id = auth.uid());
create policy kendi_okundu on public.bildirimler for update using (kullanici_id = auth.uid()) with check (kullanici_id = auth.uid());
revoke update on public.bildirimler from anon, authenticated;
grant update (okundu) on public.bildirimler to authenticated;

-- Canlı güncelleme (iş ekranı, mesajlar, bildirimler)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.isler, public.mesajlar, public.bildirimler, public.ek_isler;
  end if;
end $$;
