// Bu dosya otomatik üretilir; elle değiştirme. Yeniden üretmek için: npm run tipler
// (Veritabanı değişince tipler de güncellenmeli; CI eski kalırsa tip hatası verir.)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      adresler: {
        Row: {
          acik_adres: string
          baslik: string
          boylam: number
          enlem: number
          id: string
          kullanici_id: string
          mahalle_id: string
          notlar: string | null
          olusturma_at: string
        }
        Insert: {
          acik_adres: string
          baslik?: string
          boylam: number
          enlem: number
          id?: string
          kullanici_id: string
          mahalle_id: string
          notlar?: string | null
          olusturma_at?: string
        }
        Update: {
          acik_adres?: string
          baslik?: string
          boylam?: number
          enlem?: number
          id?: string
          kullanici_id?: string
          mahalle_id?: string
          notlar?: string | null
          olusturma_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adresler_kullanici_id_fkey"
            columns: ["kullanici_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adresler_mahalle_id_fkey"
            columns: ["mahalle_id"]
            isOneToOne: false
            referencedRelation: "mahalleler"
            referencedColumns: ["id"]
          },
        ]
      }
      anlasmazliklar: {
        Row: {
          acan_id: string | null
          aciklama: string | null
          danisilan: string | null
          durum: string
          gerekce: string | null
          id: string
          is_id: string
          karar: string | null
          karar_at: string | null
          karar_veren: string | null
          olusturma_at: string
          tur: string
        }
        Insert: {
          acan_id?: string | null
          aciklama?: string | null
          danisilan?: string | null
          durum?: string
          gerekce?: string | null
          id?: string
          is_id: string
          karar?: string | null
          karar_at?: string | null
          karar_veren?: string | null
          olusturma_at?: string
          tur?: string
        }
        Update: {
          acan_id?: string | null
          aciklama?: string | null
          danisilan?: string | null
          durum?: string
          gerekce?: string | null
          id?: string
          is_id?: string
          karar?: string | null
          karar_at?: string | null
          karar_veren?: string | null
          olusturma_at?: string
          tur?: string
        }
        Relationships: [
          {
            foreignKeyName: "anlasmazliklar_acan_id_fkey"
            columns: ["acan_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlasmazliklar_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlasmazliklar_karar_veren_fkey"
            columns: ["karar_veren"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      ayarlar: {
        Row: {
          aciklama: string | null
          anahtar: string
          deger: Json
        }
        Insert: {
          aciklama?: string | null
          anahtar: string
          deger: Json
        }
        Update: {
          aciklama?: string | null
          anahtar?: string
          deger?: Json
        }
        Relationships: []
      }
      bildirimler: {
        Row: {
          baslik: string
          id: string
          is_id: string | null
          kullanici_id: string
          metin: string
          okundu: boolean
          olusturma_at: string
          push_at: string | null
          tur: string
        }
        Insert: {
          baslik: string
          id?: string
          is_id?: string | null
          kullanici_id: string
          metin: string
          okundu?: boolean
          olusturma_at?: string
          push_at?: string | null
          tur?: string
        }
        Update: {
          baslik?: string
          id?: string
          is_id?: string | null
          kullanici_id?: string
          metin?: string
          okundu?: boolean
          olusturma_at?: string
          push_at?: string | null
          tur?: string
        }
        Relationships: [
          {
            foreignKeyName: "bildirimler_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bildirimler_kullanici_id_fkey"
            columns: ["kullanici_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      duzenli_seriler: {
        Row: {
          adres_id: string
          aktif: boolean
          hizmet_id: string
          hv_id: string | null
          id: string
          musteri_id: string
          olusturma_at: string
          saat: number
          siklik_gun: number
        }
        Insert: {
          adres_id: string
          aktif?: boolean
          hizmet_id: string
          hv_id?: string | null
          id?: string
          musteri_id: string
          olusturma_at?: string
          saat: number
          siklik_gun: number
        }
        Update: {
          adres_id?: string
          aktif?: boolean
          hizmet_id?: string
          hv_id?: string | null
          id?: string
          musteri_id?: string
          olusturma_at?: string
          saat?: number
          siklik_gun?: number
        }
        Relationships: [
          {
            foreignKeyName: "duzenli_seriler_adres_id_fkey"
            columns: ["adres_id"]
            isOneToOne: false
            referencedRelation: "adresler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duzenli_seriler_hizmet_id_fkey"
            columns: ["hizmet_id"]
            isOneToOne: false
            referencedRelation: "hizmetler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duzenli_seriler_hv_id_fkey"
            columns: ["hv_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duzenli_seriler_musteri_id_fkey"
            columns: ["musteri_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      egitim_sorulari: {
        Row: {
          dogru: number
          id: number
          secenekler: Json
          sira: number
          soru: string
        }
        Insert: {
          dogru: number
          id?: number
          secenekler: Json
          sira: number
          soru: string
        }
        Update: {
          dogru?: number
          id?: number
          secenekler?: Json
          sira?: number
          soru?: string
        }
        Relationships: []
      }
      ek_isler: {
        Row: {
          aciklama: string
          durum: string
          ekleyen_id: string
          hv_tutari_kh: number | null
          id: string
          is_id: string
          karar_at: string | null
          musteri_tutari_kd: number | null
          olusturma_at: string
        }
        Insert: {
          aciklama: string
          durum?: string
          ekleyen_id: string
          hv_tutari_kh?: number | null
          id?: string
          is_id: string
          karar_at?: string | null
          musteri_tutari_kd?: number | null
          olusturma_at?: string
        }
        Update: {
          aciklama?: string
          durum?: string
          ekleyen_id?: string
          hv_tutari_kh?: number | null
          id?: string
          is_id?: string
          karar_at?: string | null
          musteri_tutari_kd?: number | null
          olusturma_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ek_isler_ekleyen_id_fkey"
            columns: ["ekleyen_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ek_isler_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      eslesme_engelleri: {
        Row: {
          hv_id: string
          musteri_id: string
          olusturma_at: string
          sebep: string | null
        }
        Insert: {
          hv_id: string
          musteri_id: string
          olusturma_at?: string
          sebep?: string | null
        }
        Update: {
          hv_id?: string
          musteri_id?: string
          olusturma_at?: string
          sebep?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eslesme_engelleri_hv_id_fkey"
            columns: ["hv_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eslesme_engelleri_musteri_id_fkey"
            columns: ["musteri_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      guvenilirlik_olaylari: {
        Row: {
          hv_id: string
          id: string
          is_id: string | null
          olusturma_at: string
          tur: string
        }
        Insert: {
          hv_id: string
          id?: string
          is_id?: string | null
          olusturma_at?: string
          tur: string
        }
        Update: {
          hv_id?: string
          id?: string
          is_id?: string | null
          olusturma_at?: string
          tur?: string
        }
        Relationships: [
          {
            foreignKeyName: "guvenilirlik_olaylari_hv_id_fkey"
            columns: ["hv_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guvenilirlik_olaylari_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      hakedisler: {
        Row: {
          bahsis: number
          brut_kh: number
          hv_id: string
          id: string
          is_id: string
          masraf: number
          net: number
          okindo_payi_kh: number
          olusturma_at: string
          stopaj: number
          tur: string
          uygulanan_indirim: string | null
          uygulanan_oran: number | null
        }
        Insert: {
          bahsis?: number
          brut_kh: number
          hv_id: string
          id?: string
          is_id: string
          masraf?: number
          net: number
          okindo_payi_kh?: number
          olusturma_at?: string
          stopaj: number
          tur?: string
          uygulanan_indirim?: string | null
          uygulanan_oran?: number | null
        }
        Update: {
          bahsis?: number
          brut_kh?: number
          hv_id?: string
          id?: string
          is_id?: string
          masraf?: number
          net?: number
          okindo_payi_kh?: number
          olusturma_at?: string
          stopaj?: number
          tur?: string
          uygulanan_indirim?: string | null
          uygulanan_oran?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hakedisler_hv_id_fkey"
            columns: ["hv_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hakedisler_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      hizmetler: {
        Row: {
          aciklama: string | null
          ad: string
          aktif: boolean
          fiyat_tipi: string
          hazirlik: string | null
          hv_saatlik_kh: number | null
          hv_tutari_kh: number | null
          id: string
          kategori_id: string
          seviye: number
          sorular: Json
          tahmini_dk: number
          usta_gerekli: boolean
        }
        Insert: {
          aciklama?: string | null
          ad: string
          aktif?: boolean
          fiyat_tipi: string
          hazirlik?: string | null
          hv_saatlik_kh?: number | null
          hv_tutari_kh?: number | null
          id?: string
          kategori_id: string
          seviye: number
          sorular?: Json
          tahmini_dk?: number
          usta_gerekli?: boolean
        }
        Update: {
          aciklama?: string | null
          ad?: string
          aktif?: boolean
          fiyat_tipi?: string
          hazirlik?: string | null
          hv_saatlik_kh?: number | null
          hv_tutari_kh?: number | null
          id?: string
          kategori_id?: string
          seviye?: number
          sorular?: Json
          tahmini_dk?: number
          usta_gerekli?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hizmetler_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategoriler"
            referencedColumns: ["id"]
          },
        ]
      }
      hv_bakiye: {
        Row: {
          aciklama: string
          hv_id: string
          id: string
          odendi_at: string | null
          olusturma_at: string
          tutar: number
        }
        Insert: {
          aciklama: string
          hv_id: string
          id?: string
          odendi_at?: string | null
          olusturma_at?: string
          tutar: number
        }
        Update: {
          aciklama?: string
          hv_id?: string
          id?: string
          odendi_at?: string | null
          olusturma_at?: string
          tutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "hv_bakiye_hv_id_fkey"
            columns: ["hv_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      hv_etiketleri: {
        Row: {
          askida: boolean
          hizmet_id: string
          hv_id: string
          onayli: boolean
        }
        Insert: {
          askida?: boolean
          hizmet_id: string
          hv_id: string
          onayli?: boolean
        }
        Update: {
          askida?: boolean
          hizmet_id?: string
          hv_id?: string
          onayli?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hv_etiketleri_hizmet_id_fkey"
            columns: ["hizmet_id"]
            isOneToOne: false
            referencedRelation: "hizmetler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hv_etiketleri_hv_id_fkey"
            columns: ["hv_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      is_adresleri: {
        Row: {
          acik_adres: string
          boylam: number
          enlem: number
          is_id: string
          notlar: string | null
        }
        Insert: {
          acik_adres: string
          boylam: number
          enlem: number
          is_id: string
          notlar?: string | null
        }
        Update: {
          acik_adres?: string
          boylam?: number
          enlem?: number
          is_id?: string
          notlar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "is_adresleri_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: true
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      is_fotograflari: {
        Row: {
          id: string
          is_id: string
          olusturma_at: string
          tur: string
          yol: string
          yukleyen_id: string
        }
        Insert: {
          id?: string
          is_id: string
          olusturma_at?: string
          tur: string
          yol: string
          yukleyen_id: string
        }
        Update: {
          id?: string
          is_id?: string
          olusturma_at?: string
          tur?: string
          yol?: string
          yukleyen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "is_fotograflari_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "is_fotograflari_yukleyen_id_fkey"
            columns: ["yukleyen_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      is_gizli: {
        Row: {
          is_id: string
          kapi_kodu: string
        }
        Insert: {
          is_id: string
          kapi_kodu: string
        }
        Update: {
          is_id?: string
          kapi_kodu?: string
        }
        Relationships: [
          {
            foreignKeyName: "is_gizli_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: true
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      isler: {
        Row: {
          acik_is_bildirim: number
          aciklama: string | null
          acil: boolean
          adreste_at: string | null
          adreste_boylam: number | null
          adreste_enlem: number | null
          ara_toplam_kh: number
          basladi_at: string | null
          bitti_at: string | null
          brut_kd: number
          buyuk: boolean
          cevaplar: Json
          direkt_kod: boolean
          durum: string
          haric_hvler: string[]
          hedef_acilis_at: string | null
          hedef_hv_id: string | null
          herkese_acildi_at: string | null
          hizmet_id: string
          hv_id: string | null
          hv_tutari_kh: number
          icerde_sorusu_at: string | null
          id: string
          indirim_kd: number
          indirim_turu: string | null
          iptal_at: string | null
          iptal_eden: string | null
          kabul_at: string | null
          kdv: number
          kupon_id: string | null
          mahalle_id: string
          musteri_id: string
          musteri_toplam_kd: number
          musteriye_soruldu_at: string | null
          okindo_payi_kh: number
          olusturma_at: string
          onay_at: string | null
          otomatik_onay: boolean
          planlanan_baslangic: string
          saat: number | null
          seri_id: string | null
          sonuc_notu: string | null
          tahmini_dk: number
          tanitim: boolean
          yol_kh: number
          yolda_at: string | null
        }
        Insert: {
          acik_is_bildirim?: number
          aciklama?: string | null
          acil?: boolean
          adreste_at?: string | null
          adreste_boylam?: number | null
          adreste_enlem?: number | null
          ara_toplam_kh: number
          basladi_at?: string | null
          bitti_at?: string | null
          brut_kd: number
          buyuk?: boolean
          cevaplar?: Json
          direkt_kod?: boolean
          durum?: string
          haric_hvler?: string[]
          hedef_acilis_at?: string | null
          hedef_hv_id?: string | null
          herkese_acildi_at?: string | null
          hizmet_id: string
          hv_id?: string | null
          hv_tutari_kh: number
          icerde_sorusu_at?: string | null
          id?: string
          indirim_kd?: number
          indirim_turu?: string | null
          iptal_at?: string | null
          iptal_eden?: string | null
          kabul_at?: string | null
          kdv: number
          kupon_id?: string | null
          mahalle_id: string
          musteri_id: string
          musteri_toplam_kd: number
          musteriye_soruldu_at?: string | null
          okindo_payi_kh: number
          olusturma_at?: string
          onay_at?: string | null
          otomatik_onay?: boolean
          planlanan_baslangic: string
          saat?: number | null
          seri_id?: string | null
          sonuc_notu?: string | null
          tahmini_dk: number
          tanitim?: boolean
          yol_kh?: number
          yolda_at?: string | null
        }
        Update: {
          acik_is_bildirim?: number
          aciklama?: string | null
          acil?: boolean
          adreste_at?: string | null
          adreste_boylam?: number | null
          adreste_enlem?: number | null
          ara_toplam_kh?: number
          basladi_at?: string | null
          bitti_at?: string | null
          brut_kd?: number
          buyuk?: boolean
          cevaplar?: Json
          direkt_kod?: boolean
          durum?: string
          haric_hvler?: string[]
          hedef_acilis_at?: string | null
          hedef_hv_id?: string | null
          herkese_acildi_at?: string | null
          hizmet_id?: string
          hv_id?: string | null
          hv_tutari_kh?: number
          icerde_sorusu_at?: string | null
          id?: string
          indirim_kd?: number
          indirim_turu?: string | null
          iptal_at?: string | null
          iptal_eden?: string | null
          kabul_at?: string | null
          kdv?: number
          kupon_id?: string | null
          mahalle_id?: string
          musteri_id?: string
          musteri_toplam_kd?: number
          musteriye_soruldu_at?: string | null
          okindo_payi_kh?: number
          olusturma_at?: string
          onay_at?: string | null
          otomatik_onay?: boolean
          planlanan_baslangic?: string
          saat?: number | null
          seri_id?: string | null
          sonuc_notu?: string | null
          tahmini_dk?: number
          tanitim?: boolean
          yol_kh?: number
          yolda_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "isler_hedef_hv_id_fkey"
            columns: ["hedef_hv_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isler_hizmet_id_fkey"
            columns: ["hizmet_id"]
            isOneToOne: false
            referencedRelation: "hizmetler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isler_hv_id_fkey"
            columns: ["hv_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isler_mahalle_id_fkey"
            columns: ["mahalle_id"]
            isOneToOne: false
            referencedRelation: "mahalleler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isler_musteri_id_fkey"
            columns: ["musteri_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isler_seri_id_fkey"
            columns: ["seri_id"]
            isOneToOne: false
            referencedRelation: "duzenli_seriler"
            referencedColumns: ["id"]
          },
        ]
      }
      kategoriler: {
        Row: {
          ad: string
          id: string
          pilotta_acik: boolean
          sira: number
        }
        Insert: {
          ad: string
          id?: string
          pilotta_acik?: boolean
          sira?: number
        }
        Update: {
          ad?: string
          id?: string
          pilotta_acik?: boolean
          sira?: number
        }
        Relationships: []
      }
      kuponlar: {
        Row: {
          id: string
          kullanici_id: string
          kullanildi_is_id: string | null
          olusturma_at: string
          sebep: string
          son_gecerlilik: string
          tutar: number
        }
        Insert: {
          id?: string
          kullanici_id: string
          kullanildi_is_id?: string | null
          olusturma_at?: string
          sebep: string
          son_gecerlilik: string
          tutar: number
        }
        Update: {
          id?: string
          kullanici_id?: string
          kullanildi_is_id?: string | null
          olusturma_at?: string
          sebep?: string
          son_gecerlilik?: string
          tutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "kuponlar_kullanici_id_fkey"
            columns: ["kullanici_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kuponlar_kullanildi_is_id_fkey"
            columns: ["kullanildi_is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      mahalleler: {
        Row: {
          ad: string
          aktif: boolean
          boylam: number
          enlem: number
          id: string
          ilce: string
        }
        Insert: {
          ad: string
          aktif?: boolean
          boylam: number
          enlem: number
          id?: string
          ilce?: string
        }
        Update: {
          ad?: string
          aktif?: boolean
          boylam?: number
          enlem?: number
          id?: string
          ilce?: string
        }
        Relationships: []
      }
      masraflar: {
        Row: {
          aciklama: string
          durum: string
          fis_yolu: string
          id: string
          is_id: string
          olusturma_at: string
          tutar: number
        }
        Insert: {
          aciklama: string
          durum?: string
          fis_yolu: string
          id?: string
          is_id: string
          olusturma_at?: string
          tutar: number
        }
        Update: {
          aciklama?: string
          durum?: string
          fis_yolu?: string
          id?: string
          is_id?: string
          olusturma_at?: string
          tutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "masraflar_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      mesajlar: {
        Row: {
          gonderen_id: string
          id: string
          is_id: string
          metin: string
          olusturma_at: string
        }
        Insert: {
          gonderen_id: string
          id?: string
          is_id: string
          metin: string
          olusturma_at?: string
        }
        Update: {
          gonderen_id?: string
          id?: string
          is_id?: string
          metin?: string
          olusturma_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesajlar_gonderen_id_fkey"
            columns: ["gonderen_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesajlar_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      odemeler: {
        Row: {
          bloke_tutar: number
          deneme_sayisi: number
          durum: string
          elle_kontrol: boolean
          guncelleme_at: string
          hata: string | null
          id: string
          is_id: string
          islem_kilit_at: string | null
          kapama_tutar: number | null
          olusturma_at: string
          saglayici_ref: string | null
          tur: string
        }
        Insert: {
          bloke_tutar?: number
          deneme_sayisi?: number
          durum: string
          elle_kontrol?: boolean
          guncelleme_at?: string
          hata?: string | null
          id?: string
          is_id: string
          islem_kilit_at?: string | null
          kapama_tutar?: number | null
          olusturma_at?: string
          saglayici_ref?: string | null
          tur: string
        }
        Update: {
          bloke_tutar?: number
          deneme_sayisi?: number
          durum?: string
          elle_kontrol?: boolean
          guncelleme_at?: string
          hata?: string | null
          id?: string
          is_id?: string
          islem_kilit_at?: string | null
          kapama_tutar?: number | null
          olusturma_at?: string
          saglayici_ref?: string | null
          tur?: string
        }
        Relationships: [
          {
            foreignKeyName: "odemeler_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
        ]
      }
      profiller: {
        Row: {
          ad: string | null
          azami_km: number
          egitim_tamam_at: string | null
          foto_yolu: string | null
          gorusme_notu: string | null
          hv_durum: string
          id: string
          ilk_is_at: string | null
          kurucu: boolean
          mahalle_id: string | null
          musait: boolean
          olusturma_at: string
          sicil_dogrulama_at: string | null
          sicil_dogrulayan: string | null
          silinme_istegi_at: string | null
          soyad: string | null
          telefon: string | null
          yonetici: boolean
        }
        Insert: {
          ad?: string | null
          azami_km?: number
          egitim_tamam_at?: string | null
          foto_yolu?: string | null
          gorusme_notu?: string | null
          hv_durum?: string
          id: string
          ilk_is_at?: string | null
          kurucu?: boolean
          mahalle_id?: string | null
          musait?: boolean
          olusturma_at?: string
          sicil_dogrulama_at?: string | null
          sicil_dogrulayan?: string | null
          silinme_istegi_at?: string | null
          soyad?: string | null
          telefon?: string | null
          yonetici?: boolean
        }
        Update: {
          ad?: string | null
          azami_km?: number
          egitim_tamam_at?: string | null
          foto_yolu?: string | null
          gorusme_notu?: string | null
          hv_durum?: string
          id?: string
          ilk_is_at?: string | null
          kurucu?: boolean
          mahalle_id?: string | null
          musait?: boolean
          olusturma_at?: string
          sicil_dogrulama_at?: string | null
          sicil_dogrulayan?: string | null
          silinme_istegi_at?: string | null
          soyad?: string | null
          telefon?: string | null
          yonetici?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiller_mahalle_id_fkey"
            columns: ["mahalle_id"]
            isOneToOne: false
            referencedRelation: "mahalleler"
            referencedColumns: ["id"]
          },
        ]
      }
      push_jetonlari: {
        Row: {
          guncelleme_at: string
          jeton: string
          kullanici_id: string
          platform: string | null
        }
        Insert: {
          guncelleme_at?: string
          jeton: string
          kullanici_id: string
          platform?: string | null
        }
        Update: {
          guncelleme_at?: string
          jeton?: string
          kullanici_id?: string
          platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_jetonlari_kullanici_id_fkey"
            columns: ["kullanici_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      puanlar: {
        Row: {
          alan_id: string
          anket: Json | null
          id: string
          is_id: string
          numara_istedi: boolean | null
          olusturma_at: string
          puan: number
          veren_id: string
          yon: string
          yorum: string | null
        }
        Insert: {
          alan_id: string
          anket?: Json | null
          id?: string
          is_id: string
          numara_istedi?: boolean | null
          olusturma_at?: string
          puan: number
          veren_id: string
          yon: string
          yorum?: string | null
        }
        Update: {
          alan_id?: string
          anket?: Json | null
          id?: string
          is_id?: string
          numara_istedi?: boolean | null
          olusturma_at?: string
          puan?: number
          veren_id?: string
          yon?: string
          yorum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "puanlar_alan_id_fkey"
            columns: ["alan_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puanlar_is_id_fkey"
            columns: ["is_id"]
            isOneToOne: false
            referencedRelation: "isler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puanlar_veren_id_fkey"
            columns: ["veren_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _ek_musteri_tutari: {
        Args: { p_ek_hv: number; p_is: string }
        Returns: number
      }
      _is_kapat: {
        Args: { p_iade_kd?: number; p_is: string; p_otomatik: boolean }
        Returns: undefined
      }
      _is_kilitle: {
        Args: { p_is: string }
        Returns: {
          acik_is_bildirim: number
          aciklama: string | null
          acil: boolean
          adreste_at: string | null
          adreste_boylam: number | null
          adreste_enlem: number | null
          ara_toplam_kh: number
          basladi_at: string | null
          bitti_at: string | null
          brut_kd: number
          buyuk: boolean
          cevaplar: Json
          direkt_kod: boolean
          durum: string
          haric_hvler: string[]
          hedef_acilis_at: string | null
          hedef_hv_id: string | null
          herkese_acildi_at: string | null
          hizmet_id: string
          hv_id: string | null
          hv_tutari_kh: number
          icerde_sorusu_at: string | null
          id: string
          indirim_kd: number
          indirim_turu: string | null
          iptal_at: string | null
          iptal_eden: string | null
          kabul_at: string | null
          kdv: number
          kupon_id: string | null
          mahalle_id: string
          musteri_id: string
          musteri_toplam_kd: number
          musteriye_soruldu_at: string | null
          okindo_payi_kh: number
          olusturma_at: string
          onay_at: string | null
          otomatik_onay: boolean
          planlanan_baslangic: string
          saat: number | null
          seri_id: string | null
          sonuc_notu: string | null
          tahmini_dk: number
          tanitim: boolean
          yol_kh: number
          yolda_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "isler"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _is_odemelerini_iade: { Args: { p_is: string }; Returns: undefined }
      _isi_yeniden_ac: {
        Args: { p_hv: string; p_is: string }
        Returns: undefined
      }
      _kismi_tahsil: {
        Args: { p_hv: string; p_is: string; p_tur: string; p_tutar_kh: number }
        Returns: undefined
      }
      _kuponu_geri_ver: { Args: { p_is: string }; Returns: undefined }
      _talep_olustur: {
        Args: {
          p_aciklama: string
          p_acil: boolean
          p_adres: string
          p_baslangic: string
          p_cevaplar: Json
          p_direkt: boolean
          p_hedef_hv: string
          p_hizmet: string
          p_musteri: string
          p_saat: number
          p_seri: string
        }
        Returns: string
      }
      acil_bildir: { Args: { p_is: string }; Returns: undefined }
      ad_kisa: { Args: { p_id: string }; Returns: string }
      adresteyim: {
        Args: { p_boylam: number; p_enlem: number; p_is: string }
        Returns: undefined
      }
      ayar_metin: { Args: { p: string }; Returns: string }
      ayar_num: { Args: { p: string }; Returns: number }
      bahsis_ver: {
        Args: { p_is: string; p_tutar: number }
        Returns: undefined
      }
      bildir: {
        Args: {
          p_baslik: string
          p_is?: string
          p_kullanici: string
          p_metin: string
        }
        Returns: undefined
      }
      duzenli_baslat: {
        Args: {
          p_adres: string
          p_cevaplar?: Json
          p_hizmet: string
          p_hv: string
          p_ilk_baslangic: string
          p_saat: number
          p_siklik: number
        }
        Returns: string
      }
      duzenli_durdur: { Args: { p_seri: string }; Returns: undefined }
      egitim_sorulari_getir: {
        Args: never
        Returns: {
          id: number
          secenekler: Json
          sira: number
          soru: string
        }[]
      }
      egitim_tamamla: { Args: { p_cevaplar: Json }; Returns: Json }
      ek_is_ekle: {
        Args: { p_aciklama: string; p_hv_tutari?: number; p_is: string }
        Returns: string
      }
      ek_is_fiyatla: {
        Args: { p_ek: string; p_hv_tutari: number }
        Returns: undefined
      }
      ek_is_karar: {
        Args: { p_ek: string; p_kabul: boolean }
        Returns: undefined
      }
      evde_yok: { Args: { p_is: string }; Returns: undefined }
      fiyat_dokumu: {
        Args: {
          p_acil: boolean
          p_hizmet: string
          p_musteri: string
          p_saat: number
          p_yol_kh: number
        }
        Returns: Json
      }
      fiyat_teklifi: {
        Args: {
          p_acil?: boolean
          p_adres?: string
          p_hizmet: string
          p_hv?: string
          p_saat?: number
        }
        Returns: Json
      }
      foto_kaydet: {
        Args: { p_is: string; p_tur: string; p_yol: string }
        Returns: undefined
      }
      hata: { Args: { p_mesaj: string }; Returns: undefined }
      herkese_ac: { Args: { p_is: string }; Returns: undefined }
      hesap_silme_istegi: { Args: never; Returns: undefined }
      hv_acik_talepler: {
        Args: never
        Returns: {
          aciklama: string
          acil: boolean
          brut: number
          cevaplar: Json
          hizmet: string
          hizmet_sorulari: Json
          is_id: string
          kategori: string
          mahalle: string
          net: number
          planlanan_baslangic: string
          saat: number
          sana_ozel: boolean
          stopaj: number
          yaklasik_km: number
        }[]
      }
      hv_aktif_mi: { Args: { p_hv: string }; Returns: boolean }
      hv_basvur: {
        Args: {
          p_ad: string
          p_etiketler: string[]
          p_mahalle: string
          p_soyad: string
        }
        Returns: undefined
      }
      hv_etiketi_var: {
        Args: { p_hizmet: string; p_hv: string }
        Returns: boolean
      }
      hv_karti: { Args: { p_hv: string }; Returns: Json }
      hv_km: {
        Args: { p_boylam: number; p_enlem: number; p_hv: string }
        Returns: number
      }
      hv_profili: { Args: { p_hv: string }; Returns: Json }
      hv_puan: { Args: { p_hv: string }; Returns: number }
      hv_puan_ozeti: { Args: never; Returns: Json }
      iceride_onayla: { Args: { p_is: string }; Returns: undefined }
      indirim_bul: {
        Args: { p_musteri: string }
        Returns: {
          kupon_id: string
          tur: string
          tutar: number
        }[]
      }
      is_iptal: { Args: { p_is: string; p_sebep?: string }; Returns: undefined }
      is_kabul: { Args: { p_is: string }; Returns: undefined }
      is_karsi_taraf: { Args: { p_is: string }; Returns: Json }
      isi_bitir: { Args: { p_is: string }; Returns: undefined }
      isi_onayla: { Args: { p_is: string }; Returns: undefined }
      itiraz_et: {
        Args: { p_aciklama: string; p_anlasmazlik: string }
        Returns: undefined
      }
      kapi_kodu_gir: {
        Args: { p_is: string; p_kod: string }
        Returns: undefined
      }
      kdv_dahil: { Args: { p: number }; Returns: number }
      km_mesafe: {
        Args: { b1: number; b2: number; e1: number; e2: number }
        Returns: number
      }
      kupon_ver: {
        Args: { p_kullanici: string; p_sebep: string; p_tutar: number }
        Returns: undefined
      }
      masraf_ekle: {
        Args: {
          p_aciklama: string
          p_fis_yolu: string
          p_is: string
          p_tutar: number
        }
        Returns: string
      }
      masraf_karar: {
        Args: { p_kabul: boolean; p_masraf: string }
        Returns: undefined
      }
      mesaj_gonder: {
        Args: { p_is: string; p_metin: string }
        Returns: undefined
      }
      musaitlik_ayarla: { Args: { p_musait: boolean }; Returns: undefined }
      odeme_isleme_al: {
        Args: { p_adet?: number }
        Returns: Database["public"]["Tables"]["odemeler"]["Row"][]
      }
      odeme_isleme_bitir: {
        Args: {
          p_beklenen_durum: string
          p_hata?: string
          p_id: string
          p_ref?: string
          p_yeni_durum: string
        }
        Returns: boolean
      }
      okindo_payi: { Args: { p_hv: number; p_oran?: number }; Returns: number }
      puan_ver: {
        Args: {
          p_anket?: Json
          p_is: string
          p_numara_istedi?: boolean
          p_puan: number
          p_yorum?: string
        }
        Returns: undefined
      }
      push_jetonu_kaydet: {
        Args: { p_jeton: string; p_platform?: string }
        Returns: undefined
      }
      push_jetonu_sil: {
        Args: { p_jeton: string }
        Returns: undefined
      }
      sorun_bildir: {
        Args: { p_aciklama: string; p_is: string }
        Returns: string
      }
      sure_uzat: { Args: { p_is: string }; Returns: string }
      talep_duyur: { Args: { p_is: string }; Returns: undefined }
      talep_hv_icin_acik: {
        Args: { i: Database["public"]["Tables"]["isler"]["Row"]; p_hv: string }
        Returns: boolean
      }
      talep_olustur: {
        Args: {
          p_aciklama?: string
          p_acil?: boolean
          p_adres: string
          p_baslangic: string
          p_cevaplar?: Json
          p_direkt?: boolean
          p_hedef_hv?: string
          p_hizmet: string
          p_saat?: number
        }
        Returns: string
      }
      uygun_hvler: {
        Args: { p_adres: string; p_hizmet: string }
        Returns: {
          hv_id: string
          kart: Json
          km: number
          komsu: boolean
          musait: boolean
          yol_kd: number
        }[]
      }
      yapilamadi: {
        Args: { p_aciklama: string; p_is: string; p_sebep: string }
        Returns: undefined
      }
      yol_ucreti: { Args: { p_km: number }; Returns: number }
      yola_ciktim: { Args: { p_is: string }; Returns: undefined }
      yonetici_anlasmazlik_karar: {
        Args: {
          p_anlasmazlik: string
          p_danisilan: string
          p_gerekce: string
          p_iade_kd?: number
          p_sonuc: string
        }
        Returns: undefined
      }
      yonetici_hv_durum: {
        Args: { p_durum: string; p_gerekce: string; p_hv: string }
        Returns: undefined
      }
      yonetici_hv_onayla: {
        Args: {
          p_gorusme_notu: string
          p_hv: string
          p_kurucu?: boolean
          p_onayli_etiketler: string[]
          p_sicil_dogrulandi: boolean
        }
        Returns: undefined
      }
      yonetici_mi: { Args: never; Returns: boolean }
      yonetici_odeme_yeniden_dene: {
        Args: { p_id: string }
        Returns: undefined
      }
      yoneticilere_bildir: {
        Args: { p_baslik: string; p_is?: string; p_metin: string }
        Returns: undefined
      }
      zamanlayici: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
