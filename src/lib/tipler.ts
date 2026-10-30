export type IsDurumu =
  | 'odeme_bekliyor' | 'acik' | 'kabul' | 'yolda' | 'adreste' | 'basladi' | 'bitti'
  | 'onaylandi' | 'sorun' | 'iptal' | 'gelmedi' | 'evde_yok' | 'yapilamadi';

export type Profil = {
  id: string;
  telefon: string | null;
  ad: string | null;
  soyad: string | null;
  mahalle_id: string | null;
  yonetici: boolean;
  hv_durum: 'yok' | 'basvuru' | 'aktif' | 'askida' | 'kapali';
  egitim_tamam_at: string | null;
  musait: boolean;
  kurucu: boolean;
  foto_yolu: string | null;
};

export type Mahalle = { id: string; ad: string; enlem: number; boylam: number };
export type Kategori = { id: string; ad: string; sira: number; pilotta_acik: boolean };

export type Soru = { id: string; soru: string; secenekler: string[] };

export type Hizmet = {
  id: string;
  kategori_id: string;
  ad: string;
  aciklama: string | null;
  fiyat_tipi: 'is_basi' | 'saatli';
  seviye: number;
  tahmini_dk: number;
  sorular: Soru[];
  hazirlik: string | null;
  usta_gerekli: boolean;
};

export type Adres = {
  id: string;
  baslik: string;
  acik_adres: string;
  mahalle_id: string;
  enlem: number;
  boylam: number;
  notlar: string | null;
};

export type FiyatDokumu = {
  hizmet: string;
  fiyat_tipi: 'is_basi' | 'saatli';
  saat: number | null;
  acil: boolean;
  hv_tutari_kh: number;
  okindo_payi_kh: number;
  yol_kh: number;
  ara_toplam_kh: number;
  kdv: number;
  brut_kd: number;
  indirim_kd: number;
  indirim_turu: 'ilk' | 'ikinci' | 'kupon' | null;
  musteri_toplam_kd: number;
  tahmini_dk: number;
  cikis_ucreti_kd: number;
  buyuk_is_uyarisi: boolean;
};

export type HvKarti = {
  id: string;
  ad: string;
  foto_yolu: string | null;
  puan: number | null;
  is_sayisi: number;
  kurucu: boolean;
  mahalle: string | null;
};

export type UygunHv = { hv_id: string; kart: HvKarti; komsu: boolean; km: number; yol_kd: number; musait: boolean };

export type AcikTalep = {
  is_id: string;
  hizmet: string;
  kategori: string;
  mahalle: string;
  yaklasik_km: number;
  planlanan_baslangic: string;
  saat: number | null;
  acil: boolean;
  cevaplar: Record<string, string>;
  aciklama: string | null;
  hizmet_sorulari: Soru[];
  sana_ozel: boolean;
  brut: number;
  stopaj: number;
  net: number;
};

export type Is = {
  id: string;
  musteri_id: string;
  hv_id: string | null;
  hedef_hv_id: string | null;
  direkt_kod: boolean;
  musteriye_soruldu_at: string | null;
  herkese_acildi_at: string | null;
  hizmet_id: string;
  seri_id: string | null;
  durum: IsDurumu;
  acil: boolean;
  saat: number | null;
  tahmini_dk: number;
  planlanan_baslangic: string;
  cevaplar: Record<string, string>;
  aciklama: string | null;
  hv_tutari_kh: number;
  yol_kh: number;
  okindo_payi_kh: number;
  kdv: number;
  brut_kd: number;
  indirim_kd: number;
  indirim_turu: string | null;
  musteri_toplam_kd: number;
  adreste_at: string | null;
  icerde_sorusu_at: string | null;
  basladi_at: string | null;
  bitti_at: string | null;
  onay_at: string | null;
  sonuc_notu: string | null;
  olusturma_at: string;
  hizmetler?: { ad: string; fiyat_tipi: 'is_basi' | 'saatli'; hazirlik: string | null; sorular: Soru[] };
};

export type EkIs = {
  id: string;
  is_id: string;
  ekleyen_id: string;
  aciklama: string;
  hv_tutari_kh: number | null;
  musteri_tutari_kd: number | null;
  durum: 'fiyat_bekliyor' | 'onay_bekliyor' | 'onaylandi' | 'reddedildi';
};

export type Masraf = { id: string; aciklama: string; tutar: number; durum: 'onay_bekliyor' | 'onaylandi' | 'reddedildi' };
export type Mesaj = { id: string; gonderen_id: string; metin: string; olusturma_at: string };
export type Foto = { id: string; tur: string; yol: string };

export type Hakedis = {
  id: string;
  is_id: string;
  tur: 'is' | 'cikis' | 'gec_iptal';
  brut_kh: number;
  uygulanan_indirim: string | null;
  okindo_payi_kh: number;
  stopaj: number;
  net: number;
  masraf: number;
  bahsis: number;
  olusturma_at: string;
};

export type Bildirim = { id: string; baslik: string; metin: string; is_id: string | null; okundu: boolean; olusturma_at: string };
export type Kupon = { id: string; tutar: number; sebep: string; son_gecerlilik: string; kullanildi_is_id: string | null };

export type HvProfili = HvKarti & { uye_olma: string; puan_sayisi: number; hizmetler: string[]; yorumlar: string[] };
