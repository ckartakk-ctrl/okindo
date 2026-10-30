-- Pilot için başlangıç verisi.
-- DİKKAT: Mahalleler ve fiyatlar ÖRNEKTİR. Yol haritasının 2. ve 3. gününde gerçekleriyle değiştir
-- (Supabase > Table Editor üzerinden ya da bu dosyayı düzenleyip yeniden çalıştırarak).

-- ------------------------------------------------------------
-- Mahalleler (K56: Çayyolu'nda komşu 3 mahalle — koordinatlar yaklaşık)
-- ------------------------------------------------------------
insert into public.mahalleler (ad, enlem, boylam) values
  ('Konutkent',            39.8855, 32.6830),
  ('Koru',                 39.8790, 32.6990),
  ('Ahmet Taner Kışlalı',  39.8700, 32.6830);

-- ------------------------------------------------------------
-- Kategoriler (K66: pilotta 5 kategori açık)
-- ------------------------------------------------------------
insert into public.kategoriler (ad, sira) values
  ('Temizlik ve düzen', 1),
  ('Küçük tamir ve takma işleri', 2),
  ('Montaj ve kurulum', 3),
  ('Ayak işleri ve günlük yardım', 4),
  ('Taşıma yardımı', 5);

-- ------------------------------------------------------------
-- Hizmetler (örnek fiyatlar: HV'nin eline geçen tutar, KDV hariç; okindo payı üstüne eklenir)
-- Seviye 1 = 215 TL, seviye 2 = 300 TL, seviye 3 = 425 TL (belgedeki örnek tablo)
-- ------------------------------------------------------------
with k as (select id, ad from public.kategoriler)
insert into public.hizmetler (kategori_id, ad, aciklama, fiyat_tipi, seviye, hv_tutari_kh, hv_saatlik_kh, tahmini_dk, sorular, hazirlik)
select k.id, v.ad, v.aciklama, v.fiyat_tipi, v.seviye, v.hv_tutari, v.hv_saatlik, v.dk, v.sorular::jsonb, v.hazirlik
from k join (values
  -- Temizlik (saatli)
  ('Temizlik ve düzen', 'Ev temizliği', 'Genel ev temizliği', 'saatli', 1, null, 200, 120,
   '[{"id":"oda","soru":"Ev kaç oda?","secenekler":["1+1","2+1","3+1","4+1 ve üstü"]},
     {"id":"malzeme","soru":"Temizlik malzemesi evde var mı?","secenekler":["Var","Yok, getirsin"]}]',
   'Değerli eşyalarını kaldır, temizlik malzemelerini bir yere topla.'),
  ('Temizlik ve düzen', 'Banyo ve mutfak derin temizlik', 'Fayans, ocak, dolap içi', 'saatli', 1, null, 200, 120,
   '[{"id":"alan","soru":"Neresi?","secenekler":["Mutfak","Banyo","İkisi de"]}]',
   'Dolap içlerini boşaltırsan iş daha hızlı biter.'),
  ('Temizlik ve düzen', 'Cam silme (iç)', 'Yalnız içeriden ulaşılan camlar', 'saatli', 1, null, 200, 120,
   '[{"id":"cam","soru":"Kaç pencere?","secenekler":["1-4","5-8","9 ve üstü"]}]',
   'Pencere önlerini boşalt. Dışarıdan silme yapılmaz.'),
  ('Temizlik ve düzen', 'Dolap ve gardırop düzenleme', 'Kıyafet ve eşya düzeni', 'saatli', 1, null, 200, 120,
   '[{"id":"dolap","soru":"Kaç dolap?","secenekler":["1","2-3","4 ve üstü"]}]',
   'Atılacakları ve bağışlanacakları önceden ayırabilirsin.'),
  ('Temizlik ve düzen', 'Taşınma sonrası temizlik', 'Boş ev temizliği', 'saatli', 2, null, 220, 180,
   '[{"id":"oda","soru":"Ev kaç oda?","secenekler":["1+1","2+1","3+1","4+1 ve üstü"]}]',
   'Elektrik ve su açık olmalı.'),

  -- Küçük tamir (iş başı)
  ('Küçük tamir ve takma işleri', 'Musluk değişimi', 'Lavabo ya da eviye musluğu', 'is_basi', 2, 300, null, 60,
   '[{"id":"tur","soru":"Musluk mu değişecek, conta mı?","secenekler":["Musluk","Conta"]},
     {"id":"malzeme","soru":"Yeni musluk elinde var mı?","secenekler":["Var","Yok"]},
     {"id":"yer","soru":"Mutfak mı, banyo mu?","secenekler":["Mutfak","Banyo"]}]',
   'Yeni musluğu aldıysan kutusunu aç, lavabo altını boşalt.'),
  ('Küçük tamir ve takma işleri', 'Sifon tamiri', 'Klozet rezervuarı ya da lavabo sifonu', 'is_basi', 2, 300, null, 60,
   '[{"id":"tur","soru":"Hangisi?","secenekler":["Klozet rezervuarı","Lavabo sifonu"]}]',
   'Sorunun olduğu yeri boşalt.'),
  ('Küçük tamir ve takma işleri', 'Kapı kolu ya da menteşe', 'Değişim ya da ayar', 'is_basi', 1, 215, null, 45,
   '[{"id":"adet","soru":"Kaç kapı?","secenekler":["1","2-3","4 ve üstü"]}]', null),
  ('Küçük tamir ve takma işleri', 'Perde rayı ya da korniş takma', 'Duvara ya da tavana', 'is_basi', 2, 300, null, 60,
   '[{"id":"adet","soru":"Kaç pencere?","secenekler":["1","2","3 ve üstü"]},
     {"id":"duvar","soru":"Duvar türü?","secenekler":["Beton","Alçıpan","Bilmiyorum"]}]',
   'Rayları ve vidaları hazır et.'),
  ('Küçük tamir ve takma işleri', 'Avize ya da aplik takma', 'Mevcut bağlantıya takma', 'is_basi', 2, 300, null, 60,
   '[{"id":"adet","soru":"Kaç adet?","secenekler":["1","2","3 ve üstü"]}]',
   'Avizeyi kutusundan çıkar.'),
  ('Küçük tamir ve takma işleri', 'Duvara tablo, ayna ya da raf', 'Delme ve asma', 'is_basi', 1, 215, null, 45,
   '[{"id":"adet","soru":"Kaç parça?","secenekler":["1-2","3-5","6 ve üstü"]}]', null),

  -- Montaj (iş başı)
  ('Montaj ve kurulum', 'Dolap ya da gardırop montajı', 'Paketli mobilya kurulumu', 'is_basi', 3, 425, null, 120,
   '[{"id":"boy","soru":"Kaç kapaklı?","secenekler":["2 kapak","3-4 kapak","5 ve üstü"]}]',
   'Paketleri montaj yapılacak odaya taşı.'),
  ('Montaj ve kurulum', 'Masa, sandalye, sehpa montajı', 'Küçük mobilya', 'is_basi', 1, 215, null, 60,
   '[{"id":"adet","soru":"Kaç parça?","secenekler":["1-2","3-5","6 ve üstü"]}]', null),
  ('Montaj ve kurulum', 'Yatak ya da baza montajı', 'Kurulum', 'is_basi', 2, 300, null, 90,
   '[{"id":"tur","soru":"Hangisi?","secenekler":["Karyola","Baza","Ranza"]}]', null),
  ('Montaj ve kurulum', 'Televizyon duvar askısı', 'Askı montajı', 'is_basi', 2, 300, null, 60,
   '[{"id":"ekran","soru":"Ekran boyutu?","secenekler":["55 inç ve altı","56 inç ve üstü"]},
     {"id":"aski","soru":"Askı elinde var mı?","secenekler":["Var","Yok"]}]',
   'Askıyı ve vidalarını hazır et.'),

  -- Ayak işleri (saatli)
  ('Ayak işleri ve günlük yardım', 'Market ve pazar alışverişi', 'Liste ile alışveriş', 'saatli', 1, null, 150, 120,
   '[{"id":"yer","soru":"Nereden?","secenekler":["Market","Pazar","İkisi de"]}]',
   'Alışveriş listeni mesaj olarak gönder.'),
  ('Ayak işleri ve günlük yardım', 'Kuyrukta bekleme', 'Resmi daire, kurum ya da hastane kuyruğu', 'saatli', 1, null, 150, 120,
   '[]', null),
  ('Ayak işleri ve günlük yardım', 'Evcil hayvan gezdirme', 'Köpek gezdirme', 'saatli', 1, null, 150, 120,
   '[{"id":"boy","soru":"Köpeğin boyu?","secenekler":["Küçük","Orta","Büyük"]}]', null),
  ('Ayak işleri ve günlük yardım', 'Bahçe ve balkon düzenleme', 'Çiçek, saksı, süpürme', 'saatli', 1, null, 150, 120,
   '[]', null),

  -- Taşıma yardımı (saatli, yalnız araçsız — K66)
  ('Taşıma yardımı', 'Ev içinde eşya taşıma', 'Oda değişikliği, mobilya yer değiştirme', 'saatli', 1, null, 200, 120,
   '[{"id":"agir","soru":"En ağır eşya?","secenekler":["Tek kişi taşır","İki kişi gerekir"]}]', null),
  ('Taşıma yardımı', 'Kat çıkarma ya da indirme', 'Bina içinde, araçsız', 'saatli', 1, null, 200, 120,
   '[{"id":"asansor","soru":"Asansör var mı?","secenekler":["Var","Yok"]}]', null),
  ('Taşıma yardımı', 'Kutu açma ve yerleştirme', 'Taşınma sonrası yerleşim', 'saatli', 1, null, 200, 120,
   '[]', 'Kutuların hangi odaya gideceğini işaretle.')
) as v(kategori, ad, aciklama, fiyat_tipi, seviye, hv_tutari, hv_saatlik, dk, sorular, hazirlik)
on k.ad = v.kategori;

-- ------------------------------------------------------------
-- Eğitim testi (K38) — doğru cevap sıfırdan başlayan seçenek numarasıdır
-- ------------------------------------------------------------
insert into public.egitim_sorulari (sira, soru, secenekler, dogru) values
  (1, 'Kapıya vardığında ilk ne yaparsın?',
      '["Zile basar, içeri girerim", "\"Adresteyim\"e basar, kapı kodunu müşteriden isteyip girerim", "Müşteriyi telefonla ararım"]', 1),
  (2, 'İş sırasında müşteri "gelmişken şunu da yap" dedi. Ne yaparsın?',
      '["Yaparım, parasını elden alırım", "Uygulamadan ek iş olarak eklerim, müşteri onaylarsa yaparım", "Reddederim"]', 1),
  (3, 'Bir iş sana riskli göründü (örneğin gaz bağlantısı). Ne yaparsın?',
      '["Dikkatlice denerim", "\"Emin değilsen yapma\": işi bırakır, \"yapılamadı – riskli\" seçerim", "Arkadaşımı çağırırım"]', 1),
  (4, 'Müşteri telefon numaranı istedi. Ne dersin?',
      '["Veririm", "\"Uygulamadan beni seçin, iş direkt bana gelir; aynı fiyat ve sigortalı\" derim", "Instagram hesabımı veririm"]', 1),
  (5, 'İş bittiğinde ne yaparsın?',
      '["Hemen çıkarım", "Bitiş fotoğrafını çeker, işi müşteriye gösterir, \"Bitti\"ye basarım", "Ödemeyi nakit isterim"]', 1);
