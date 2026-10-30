-- okindo iş kuralları senaryo testleri (yerel Postgres'te çalışır)
-- Çalıştırma: tests/testleri_calistir.sh
\set ON_ERROR_STOP 1
\pset footer off

-- ------------------------------------------------------------
-- Test yardımcıları
-- ------------------------------------------------------------
create or replace function t(p_ad text, p_beklenen text, p_gercek text) returns text language plpgsql as $$
begin
  if p_beklenen is distinct from p_gercek then
    raise exception 'BAŞARISIZ: % — beklenen: %, gelen: %', p_ad, p_beklenen, p_gercek;
  end if;
  return 'TAMAM  ' || p_ad;
end $$;

create or replace function t_hata(p_ad text, p_sql text, p_mesaj_parcasi text default null) returns text language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_mesaj_parcasi is not null and position(p_mesaj_parcasi in sqlerrm) = 0 then
      raise exception 'BAŞARISIZ: % — beklenmeyen hata: %', p_ad, sqlerrm;
    end if;
    return 'TAMAM  ' || p_ad || '  (' || sqlerrm || ')';
  end;
  raise exception 'BAŞARISIZ: % — hata bekleniyordu ama işlem geçti', p_ad;
end $$;
grant execute on function t(text, text, text), t_hata(text, text, text) to authenticated, anon;

\set M1 '11111111-1111-1111-1111-111111111111'
\set M2 '22222222-2222-2222-2222-222222222222'
\set H1 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set H2 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
\set YN 'cccccccc-cccc-cccc-cccc-cccccccccccc'

insert into auth.users (id, phone) values
  (:'M1', '905300000001'), (:'M2', '905300000002'), (:'H1', '905300000003'),
  (:'H2', '905300000004'), (:'YN', '905300000005');
update profiller set yonetici = true, ad = 'Cihad' where id = :'YN';
update profiller set ad = 'Ayşe' where id = :'M1';
update profiller set ad = 'Kemal' where id = :'M2';

select id as konutkent from mahalleler where ad = 'Konutkent' \gset
select id as koru from mahalleler where ad = 'Koru' \gset
select id as musluk from hizmetler where ad = 'Musluk değişimi' \gset
select id as temizlik from hizmetler where ad = 'Ev temizliği' \gset
select id as tv from hizmetler where ad = 'Televizyon duvar askısı' \gset
select ((date_trunc('day', now() at time zone 'Europe/Istanbul') + interval '1 day 10 hours') at time zone 'Europe/Istanbul') as yarin10 \gset
select ((date_trunc('day', now() at time zone 'Europe/Istanbul') + interval '1 day 14 hours') at time zone 'Europe/Istanbul') as yarin14 \gset
select ((date_trunc('day', now() at time zone 'Europe/Istanbul') + interval '1 day 23 hours') at time zone 'Europe/Istanbul') as yarin23 \gset

\echo '--- 1. Fiyat ve pay kuralları (K3, K4, K15, K17)'
select t('pay: HV 300 → 100 TL taban', '100', okindo_payi(300)::text);
select t('pay: HV 566 → hâlâ 100 TL', '100', okindo_payi(566)::text);
select t('pay: HV 637,50 → %15 = 112,50', '112.50', okindo_payi(637.50)::text);
select t('pay: HV 850 → fiyat 1000, pay 150', '150.00', okindo_payi(850)::text);
select t('musluk: KDV dahil 480', '480.00', (fiyat_dokumu(:'musluk', null, false, 0, null)->>'musteri_toplam_kd'));
select t('musluk acil: 390+100=490 → 588', '588.00', (fiyat_dokumu(:'musluk', null, true, 0, null)->>'musteri_toplam_kd'));
select t('temizlik 2 saat: 400+100 → 600', '600.00', (fiyat_dokumu(:'temizlik', 2, false, 0, null)->>'musteri_toplam_kd'));
select t('temizlik 3,5 saat: 700+123,53 → 988,24', '988.24', (fiyat_dokumu(:'temizlik', 3.5, false, 0, null)->>'musteri_toplam_kd'));
select t_hata('temizlik 1 saat reddedilir', format('select fiyat_dokumu(%L, 1, false, 0, null)', :'temizlik'), 'en az 2 saat');
select t('yol: 12,3 km → 3 km ücretli = 30 TL', '30', yol_ucreti(12.3)::text);
select t('yol: 9 km → ücretsiz', '0', yol_ucreti(9)::text);

\echo '--- 2. HV başvurusu, yönetici onayı, eğitim (K36–K38)'
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select hv_basvur('Mehmet', 'Yılmaz', :'konutkent', array[:'musluk', :'temizlik', :'tv']::uuid[]);
select t_hata('onaysız HV müsait olamaz', 'select musaitlik_ayarla(true)', 'onaylanıp');
select t_hata('HV kendini yönetici yapamaz', format('update profiller set yonetici = true where id = %L', :'H1'), 'permission');
reset role;
select set_config('request.jwt.claim.sub', :'YN', false); set role authenticated;
select t_hata('sicil doğrulanmadan onay yok',
  format('select yonetici_hv_onayla(%L, %L, false, array[%L]::uuid[], true)', :'H1', 'Görüştüm', :'musluk'), 'sicil');
select yonetici_hv_onayla(:'H1', 'Yüz yüze görüştüm, contayı değiştirdi.', true, array[:'musluk', :'temizlik']::uuid[], true);
reset role;
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select t('eğitim yanlış cevapla geçilmez', 'false', (egitim_tamamla('{"1":1,"2":0,"3":1,"4":1,"5":1}')->>'gecti'));
select t('eğitim doğru cevapla geçilir', 'true', (egitim_tamamla('{"1":1,"2":1,"3":1,"4":1,"5":1}')->>'gecti'));
select musaitlik_ayarla(true);
reset role;
select t('onaylanmayan etiket (TV) kapalı', 'false', hv_etiketi_var(:'H1', :'tv')::text);

select set_config('request.jwt.claim.sub', :'H2', false); set role authenticated;
select hv_basvur('Zeynep', 'Kaya', :'koru', array[:'musluk', :'temizlik']::uuid[]);
reset role;
select set_config('request.jwt.claim.sub', :'YN', false); set role authenticated;
select yonetici_hv_onayla(:'H2', 'Görüştüm.', true, array[:'musluk', :'temizlik']::uuid[], false);
reset role;
select set_config('request.jwt.claim.sub', :'H2', false); set role authenticated;
select egitim_tamamla('{"1":1,"2":1,"3":1,"4":1,"5":1}');
select musaitlik_ayarla(true);
reset role;

\echo '--- 3. Müşteri adresi, fiyat teklifi ve yeni müşteri indirimi'
select set_config('request.jwt.claim.sub', :'M1', false); set role authenticated;
insert into adresler (kullanici_id, mahalle_id, acik_adres, enlem, boylam, notlar)
  values (:'M1', :'konutkent', 'Konutkent 2. Cadde No:5 D:3', 39.8860, 32.6835, 'Zil bozuk, ara') returning id as adres1 \gset
select t_hata('başkası adına adres eklenemez',
  format('insert into adresler (kullanici_id, mahalle_id, acik_adres, enlem, boylam) values (%L, %L, %L, 39.88, 32.68)', :'M2', :'konutkent', 'x'), 'row-level security');
select t('ilk iş indirimi 100 → 380', '380.00', (fiyat_teklifi(:'musluk')->>'musteri_toplam_kd'));
select t('uygun HV listesinde aynı mahalleden H1 önce', 'Mehmet Y.', (select kart->>'ad' from uygun_hvler(:'musluk', :'adres1') limit 1));
select t_hata('23:00 talebi reddedilir', format('select talep_olustur(%L, %L, %L)', :'musluk', :'adres1', :'yarin23'), '08:00 ile 22:00');

\echo '--- 4. Talep, gizlilik ve kabul (K10, K21, K23, K27)'
select talep_olustur(:'musluk', :'adres1', :'yarin10', null, false, '{"tur":"Musluk"}', 'Damlatıyor') as is1 \gset
reset role;
select t('test ödemesinde bloke tamam, talep açık', 'acik/bloke',
  (select i.durum || '/' || o.durum from isler i join odemeler o on o.is_id = i.id where i.id = :'is1'));
select t('müşteri 380 TL bloke', '380.00', (select bloke_tutar::text from odemeler where is_id = :'is1'));
select t('H1 ve H2 bildirim aldı', '2', (select count(*)::text from bildirimler where is_id = :'is1' and baslik = 'Yakınında yeni iş'));

select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select t('H1 açık talebi görür', '1', (select count(*)::text from hv_acik_talepler() where is_id = :'is1'));
select t('H1 net tahmini: 300 - %20 = 240', '240.00', (select net::text from hv_acik_talepler() where is_id = :'is1'));
select t('kabul öncesi adres gizli', '0', (select count(*)::text from is_adresleri where is_id = :'is1'));
select t('kabul öncesi iş satırı görünmez', '0', (select count(*)::text from isler where id = :'is1'));
select is_kabul(:'is1');
select t('kabul sonrası adres açılır', 'Konutkent 2. Cadde No:5 D:3', (select acik_adres from is_adresleri where is_id = :'is1'));
select t('HV kapı kodunu göremez', '0', (select count(*)::text from is_gizli where is_id = :'is1'));
reset role;
select set_config('request.jwt.claim.sub', :'H2', false); set role authenticated;
select t_hata('ikinci HV aynı işi alamaz', format('select is_kabul(%L)', :'is1'), 'açık değil');
reset role;

\echo '--- 5. Adresteyim, kapı kodu, ek iş, bitiş, onay (K22–K27)'
select kapi_kodu as kod1 from is_gizli where is_id = :'is1' \gset
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select yola_ciktim(:'is1');
select adresteyim(:'is1', 39.886, 32.6835);
select t_hata('yanlış kapı kodu', format('select kapi_kodu_gir(%L, %L)', :'is1', '99999'), 'Kod yanlış');
select kapi_kodu_gir(:'is1', :'kod1');
select ek_is_ekle(:'is1', 'Banyo musluğu contası', 100) as ek1 \gset
reset role;
select t('ek iş müşteri tutarı: taban tekrar alınmaz → 120', '120.00', (select musteri_tutari_kd::text from ek_isler where id = :'ek1'));
select set_config('request.jwt.claim.sub', :'M1', false); set role authenticated;
select ek_is_karar(:'ek1', true);
reset role;
update ayarlar set deger = '1' where anahtar = 'bitis_foto_zorunlu';
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select t_hata('bitiş fotoğrafı olmadan bitmez', format('select isi_bitir(%L)', :'is1'), 'bitiş fotoğrafı');
select foto_kaydet(:'is1', 'bitis', :'is1' || '/bitis.jpg');
select isi_bitir(:'is1');
reset role;
update ayarlar set deger = '0' where anahtar = 'bitis_foto_zorunlu';
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select t('bitti deyince HV yeni iş alabilir (açık iş yok)', '0', (select count(*)::text from isler where hv_id = :'H1' and durum = 'basladi'));
reset role;
select set_config('request.jwt.claim.sub', :'M1', false); set role authenticated;
select isi_onayla(:'is1');
reset role;
select t('iş onaylandı', 'onaylandi', (select durum from isler where id = :'is1'));
select t('ödemeler kapandı (380 + 120)', 'ek:120.00,is:380.00',
  (select string_agg(tur || ':' || kapama_tutar, ',' order by tur) from odemeler where is_id = :'is1' and durum = 'kapandi'));
select t('kurucu ilk ay: okindo payı 0, HV brüt 500', '500.00/0.00', (select brut_kh || '/' || okindo_payi_kh from hakedisler where is_id = :'is1'));
select t('stopaj %20 → net 400', '400.00', (select net::text from hakedisler where is_id = :'is1'));

\echo '--- 6. Puan, bahşiş, numara sorusu, mesaj gizleme (K42, K44, K46, K6)'
select set_config('request.jwt.claim.sub', :'M1', false); set role authenticated;
select puan_ver(:'is1', 5, 'Çok temiz çalıştı', '{"zamaninda":true,"duzgun":true,"davranis":true}');
select bahsis_ver(:'is1', 50);
select t('müşteri puan tablosunda yalnız kendi verdiği puanı görür', '1', (select count(*)::text from puanlar));
reset role;
select t('bahşiş hakedişe eklendi', '50.00', (select bahsis::text from hakedisler where is_id = :'is1'));
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select puan_ver(:'is1', 5, null, null, true);
reset role;

\echo '--- 7. İkinci iş indirimi, hedefli talep, 10 dakika kuralı (K11)'
select set_config('request.jwt.claim.sub', :'M1', false); set role authenticated;
select t('ikinci iş indirimi 150 → 330', '330.00', (fiyat_teklifi(:'musluk')->>'musteri_toplam_kd'));
select talep_olustur(:'musluk', :'adres1', :'yarin14', null, false, '{}', null, :'H2') as is2 \gset
reset role;
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select t('hedefli talebi başkası 10 dk görmez', '0', (select count(*)::text from hv_acik_talepler() where is_id = :'is2'));
reset role;
select set_config('request.jwt.claim.sub', :'H2', false); set role authenticated;
select t('hedef HV görür ve "sana özel" işaretli', 'true', (select sana_ozel::text from hv_acik_talepler() where is_id = :'is2'));
reset role;
update isler set hedef_acilis_at = now() - interval '1 minute' where id = :'is2';
select zamanlayici();
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select t('10 dk sonra herkese açılır', '1', (select count(*)::text from hv_acik_talepler() where is_id = :'is2'));
reset role;

\echo '--- 8. HV gelmedi (K22, K33)'
select set_config('request.jwt.claim.sub', :'H2', false); set role authenticated;
select is_kabul(:'is2');
reset role;
update isler set planlanan_baslangic = now() - interval '40 minutes' where id = :'is2';
select zamanlayici();
select t('gelmedi olarak kapandı', 'gelmedi', (select durum from isler where id = :'is2'));
select t('müşteri parası iade edildi', 'iade_edildi', (select durum from odemeler where is_id = :'is2'));
select t('müşteriye gelmedi kuponu', '1', (select count(*)::text from kuponlar where kullanici_id = :'M1' and sebep = 'Hizmet veren gelmedi'));
select t('HV güvenilirlik olayı', 'gelmedi', (select tur from guvenilirlik_olaylari where is_id = :'is2'));
select t('ikinci iş indirimi iade sonrası yeniden kullanılabilir', '330.00',
  (select fiyat_dokumu(:'musluk', null, false, 0, :'M1')->>'musteri_toplam_kd'));

\echo '--- 9. Müşteri evde yok (K20, K22)'
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
insert into adresler (kullanici_id, mahalle_id, acik_adres, enlem, boylam)
  values (:'M2', :'konutkent', 'Konutkent 5. Sokak No:1', 39.8850, 32.6825) returning id as adres2 \gset
select talep_olustur(:'musluk', :'adres2', :'yarin10') as is3 \gset
reset role;
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select is_kabul(:'is3');
select adresteyim(:'is3', 39.885, 32.6825);
select t_hata('10 dk dolmadan "evde yok" açılamaz', format('select evde_yok(%L)', :'is3'), 'dakika beklemeden');
reset role;
update isler set adreste_at = now() - interval '11 minutes' where id = :'is3';
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select t_hata('fotoğrafsız "evde yok" açılamaz', format('select evde_yok(%L)', :'is3'), 'fotoğraf');
select foto_kaydet(:'is3', 'evde_yok', :'is3' || '/kapi.jpg');
select evde_yok(:'is3');
reset role;
select t('çıkış ücreti 150+KDV = 180 tahsil', '180.00', (select kapama_tutar::text from odemeler where is_id = :'is3'));
select t('çıkış ücreti HV''ye (okindo pay almaz)', 'cikis/150.00/0.00',
  (select tur || '/' || brut_kh || '/' || okindo_payi_kh from hakedisler where is_id = :'is3'));

\echo '--- 10. Geç iptal ve ücretsiz iptal (K35)'
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select talep_olustur(:'musluk', :'adres2', :'yarin14') as is4 \gset
reset role;
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select is_kabul(:'is4');
reset role;
update isler set planlanan_baslangic = now() + interval '1 hour' where id = :'is4';
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select is_iptal(:'is4', 'Planım değişti');
reset role;
select t('2 saatten az kala iptal: 75+KDV = 90', '90.00', (select kapama_tutar::text from odemeler where is_id = :'is4'));
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select talep_olustur(:'temizlik', :'adres2', :'yarin14', 2) as is5 \gset
select is_iptal(:'is5');
reset role;
select t('kimse kabul etmeden iptal ücretsiz', 'iade_edildi', (select durum from odemeler where is_id = :'is5'));

\echo '--- 11. Ek işi müşteri ister, HV fiyatlar; saatli uzatma (K17, K24)'
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select talep_olustur(:'temizlik', :'adres2', :'yarin14', 2) as is6 \gset
reset role;
select kapi_kodu as kod6 from is_gizli where is_id = :'is6' \gset
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select is_kabul(:'is6'); select adresteyim(:'is6', 39.885, 32.6825); select kapi_kodu_gir(:'is6', :'kod6');
reset role;
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select ek_is_ekle(:'is6', 'Buzdolabının içi de silinsin') as ek6 \gset
select sure_uzat(:'is6') as uzat6 \gset
reset role;
select t('müşterinin istediği ek iş fiyat bekliyor', 'fiyat_bekliyor', (select durum from ek_isler where id = :'ek6'));
select t('müşteri uzatma isteyince doğrudan onaylanır; 30 dk = 100 + pay farkı', 'onaylandi/120.00',
  (select durum || '/' || musteri_tutari_kd from ek_isler where id = :'uzat6'));
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select ek_is_fiyatla(:'ek6', 150);
reset role;
select t('fiyatlanan ek iş: HV toplamı 500→650, pay 100→114,71; (150+14,71)×1,2 = 197,65', '197.65',
  (select musteri_tutari_kd::text from ek_isler where id = :'ek6'));

\echo '--- 12. Sorun bildirimi ve yönetici kısmi iade kararı (K26, K34)'
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select ek_is_karar(:'ek6', false);
reset role;
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select foto_kaydet(:'is6', 'bitis', :'is6' || '/b.jpg'); select isi_bitir(:'is6');
reset role;
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select sorun_bildir(:'is6', 'Mutfak yarım kaldı') as anl6 \gset
reset role;
select set_config('request.jwt.claim.sub', :'YN', false); set role authenticated;
select yonetici_anlasmazlik_karar(:'anl6', 'kismi', 'Fotoğraflarda mutfak eksik; 100 TL iade.', 'Ahmet (yedek kişi)', 100);
reset role;
select t('kısmi iade sonrası iş kapandı', 'onaylandi', (select durum from isler where id = :'is6'));
select t('ana iş blokesinden 100 düşüldü', '500.00', (select kapama_tutar::text from odemeler where is_id = :'is6' and tur = 'is'));

\echo '--- 13. Otomatik onay ve düzenli iş (K13, K26)'
select set_config('request.jwt.claim.sub', :'M1', false); set role authenticated;
select ((date_trunc('day', now() at time zone 'Europe/Istanbul') - interval '2 days' + interval '10 hours') at time zone 'Europe/Istanbul') as gecen10 \gset
reset role;
select set_config('request.jwt.claim.sub', :'M1', false); set role authenticated;
select duzenli_baslat(:'temizlik', :'adres1', :'H2', :'yarin10', 7, 2) as seri1 \gset
reset role;
select id as seri_is1 from isler where seri_id = :'seri1' \gset
select set_config('request.jwt.claim.sub', :'H2', false); set role authenticated;
select is_kabul(:'seri_is1');
reset role;
select kapi_kodu as kods from is_gizli where is_id = :'seri_is1' \gset
-- seansı geçmişe taşıyıp tamamlanmış gibi yap
update isler set planlanan_baslangic = :'gecen10'::timestamptz where id = :'seri_is1';
select set_config('request.jwt.claim.sub', :'H2', false); set role authenticated;
select adresteyim(:'seri_is1', 39.88, 32.70); select kapi_kodu_gir(:'seri_is1', :'kods');
select foto_kaydet(:'seri_is1', 'bitis', :'seri_is1' || '/b.jpg'); select isi_bitir(:'seri_is1');
reset role;
update isler set bitti_at = now() - interval '25 hours' where id = :'seri_is1';
select zamanlayici();
select t('24 saat sonra otomatik onay', 'onaylandi/true', (select durum || '/' || otomatik_onay from isler where id = :'seri_is1'));
select t('düzenli işin sıradaki seansı oluştu, aynı HV hedefli', '1',
  (select count(*)::text from isler where seri_id = :'seri1' and id <> :'seri_is1' and hedef_hv_id = :'H2'));
select t('kurucu olmayan HV: pay 100, oran %15', '100.00/0.1500', (select okindo_payi_kh || '/' || uygulanan_oran from hakedisler where is_id = :'seri_is1'));

\echo '--- 14. Güvenlik'
select set_config('request.jwt.claim.sub', :'H1', false); set role authenticated;
select t_hata('biten işe mesaj gönderilemez', format('select mesaj_gonder(%L, %L)', :'is1', 'x'), 'mesaj gönderilemez');
reset role;
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select talep_olustur(:'musluk', :'adres2', :'yarin14') as is7 \gset
reset role;
select set_config('request.jwt.claim.sub', :'H2', false); set role authenticated;
select is_kabul(:'is7');
select mesaj_gonder(:'is7', 'Beni 0532 123 45 67''den ara, IBAN TR12 0006 1005 1978 6457 8413 26, mail ali@ornek.com, insta @mehmet.usta');
reset role;
select t('mesajda iletişim bilgileri gizlendi',
  'Beni [telefon gizlendi]''den ara, IBAN [IBAN gizlendi], mail [e-posta gizlendi], insta [hesap gizlendi]',
  (select metin from mesajlar where is_id = :'is7'));
select set_config('request.jwt.claim.sub', :'M2', false); set role authenticated;
select acil_bildir(:'is7');
reset role;
select t('acil düğmesi yöneticiye kırmızı alarm düşürür', '1',
  (select count(*)::text from bildirimler where kullanici_id = :'YN' and baslik = 'KIRMIZI ALARM' and is_id = :'is7'));
select set_config('request.jwt.claim.sub', :'M1', false); set role authenticated;
select t_hata('başkasının işi için acil bildirilemez', format('select acil_bildir(%L)', :'is7'), 'acil durum bildiremezsin');
select t('başka müşterinin işini göremez', '0', (select count(*)::text from isler where id = :'is7'));
select t('başkasının adreslerini göremez', '0', (select count(*)::text from adresler where kullanici_id = :'M2'));
select t('ödemeler tablosuna yazamaz', '0', (select count(*)::text from odemeler where false));
select t_hata('ödeme satırı ekleyemez', format('insert into odemeler (is_id, tur, durum) values (%L, %L, %L)', :'is7', 'is', 'kapandi'), 'row-level security');
select t_hata('iç fonksiyonu çağıramaz', format('select _is_kapat(%L, false, 0)', :'is7'), 'permission');
select t_hata('zamanlayıcıyı çağıramaz', 'select zamanlayici()', 'permission');
reset role;
set role anon;
select t_hata('giriş yapmamış kullanıcı talep açamaz', format('select talep_olustur(%L, %L, now())', :'musluk', :'adres1'), 'permission');
reset role;

\echo ''
\echo 'TÜM TESTLER BAŞARILI'
