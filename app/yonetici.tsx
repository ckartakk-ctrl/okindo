import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { AltBaslik, Bos, Dugme, Ekran, Girdi, Kart, Metin, renk, Rozet, Satir, Secenekler } from '@/components/ui';
import { tl, zaman } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { rpc, supabase } from '@/lib/supabase';

type Basvuru = {
  id: string;
  ad: string | null;
  soyad: string | null;
  telefon: string | null;
  mahalleler: { ad: string } | null;
  hv_etiketleri: { hizmet_id: string; hizmetler: { ad: string } }[];
};

type Anlasmazlik = {
  id: string;
  tur: 'sorun' | 'dusuk_puan' | 'platform_disi' | 'itiraz';
  durum: 'acik' | 'itiraz';
  aciklama: string | null;
  olusturma_at: string;
  isler: { id: string; durum: string; musteri_toplam_kd: number; hizmetler: { ad: string } };
};

const turAdi: Record<Anlasmazlik['tur'], string> = {
  sorun: 'Müşteri sorun bildirdi',
  dusuk_puan: 'Düşük puan',
  platform_disi: 'Platform dışı iş şüphesi',
  itiraz: 'İtiraz',
};

export default function Yonetici() {
  const { profil } = useOturum();
  const [basvurular, setBasvurular] = useState<Basvuru[]>([]);
  const [anlasmazliklar, setAnlasmazliklar] = useState<Anlasmazlik[]>([]);
  const [aktifHv, setAktifHv] = useState(0);

  const yukle = useCallback(async () => {
    const [b, a, s] = await Promise.all([
      supabase
        .from('profiller')
        .select('id, ad, soyad, telefon, mahalleler(ad), hv_etiketleri(hizmet_id, hizmetler(ad))')
        .eq('hv_durum', 'basvuru')
        .order('olusturma_at'),
      supabase
        .from('anlasmazliklar')
        .select('id, tur, durum, aciklama, olusturma_at, isler(id, durum, musteri_toplam_kd, hizmetler(ad))')
        .in('durum', ['acik', 'itiraz'])
        .order('olusturma_at'),
      supabase.from('profiller').select('id', { count: 'exact', head: true }).eq('hv_durum', 'aktif'),
    ]);
    setBasvurular((b.data as unknown as Basvuru[]) ?? []);
    setAnlasmazliklar((a.data as unknown as Anlasmazlik[]) ?? []);
    setAktifHv(s.count ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      yukle();
    }, [yukle]),
  );

  if (!profil?.yonetici) return <Bos baslik="Bu sayfa yalnız yönetici içindir." />;

  return (
    <Ekran yenile={yukle}>
      <Metin soluk>Aktif HV: {aktifHv} / 50</Metin>

      <AltBaslik>HV başvuruları ({basvurular.length})</AltBaslik>
      {basvurular.length === 0 ? <Metin soluk>Bekleyen başvuru yok.</Metin> : null}
      {basvurular.map((b) => (
        <BasvuruKarti key={b.id} basvuru={b} kurucuOlabilir={aktifHv < 50} yenile={yukle} />
      ))}

      <AltBaslik>Anlaşmazlıklar ({anlasmazliklar.length})</AltBaslik>
      {anlasmazliklar.length === 0 ? <Metin soluk>Açık anlaşmazlık yok.</Metin> : null}
      {anlasmazliklar.map((a) => (
        <AnlasmazlikKarti key={a.id} kayit={a} yenile={yukle} />
      ))}

      <Metin soluk kucuk>
        Fiyat, süre ve oran ayarları için Supabase panelinde “ayarlar” tablosunu kullan. Hizmet açıp kapatmak için “hizmetler”
        tablosundaki “aktif” sütununu değiştir.
      </Metin>
    </Ekran>
  );
}

function BasvuruKarti({ basvuru, kurucuOlabilir, yenile }: { basvuru: Basvuru; kurucuOlabilir: boolean; yenile: () => Promise<void> }) {
  const [not, setNot] = useState('');
  const [sicil, setSicil] = useState(false);
  const [kurucu, setKurucu] = useState(kurucuOlabilir);
  const [onayli, setOnayli] = useState<string[]>([]);

  return (
    <Kart>
      <Metin kalin>
        {basvuru.ad} {basvuru.soyad}
      </Metin>
      <Metin soluk kucuk>
        {basvuru.mahalleler?.ad ?? ''} · +{basvuru.telefon?.replace(/^\+/, '')}
      </Metin>
      <Metin soluk kucuk>Yüz yüze kontrolde başarılı olduğu işleri işaretle (K37):</Metin>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {basvuru.hv_etiketleri.map((e) => {
          const aktif = onayli.includes(e.hizmet_id);
          return (
            <Pressable
              key={e.hizmet_id}
              onPress={() => setOnayli(aktif ? onayli.filter((x) => x !== e.hizmet_id) : [...onayli, e.hizmet_id])}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: aktif ? renk.ana : renk.cizgi,
                backgroundColor: aktif ? renk.ana : renk.kart,
              }}
            >
              <Metin kucuk renkli={aktif ? '#FFFFFF' : undefined}>
                {e.hizmetler.ad}
              </Metin>
            </Pressable>
          );
        })}
      </View>
      <Girdi etiket="Yüz yüze görüşme notu" value={not} onChangeText={setNot} multiline placeholder="Tarih, gözlemin, yaptırdığın kontrol" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Metin kucuk>Adli sicil e-Devlet’ten doğrulandı (belge saklanmaz)</Metin>
        <Switch value={sicil} onValueChange={setSicil} trackColor={{ true: renk.ana, false: renk.cizgi }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Metin kucuk>Kurucu HV (ilk 50 kişi)</Metin>
        <Switch value={kurucu} onValueChange={setKurucu} trackColor={{ true: renk.ana, false: renk.cizgi }} />
      </View>
      <Dugme
        pasif={!sicil || !not.trim() || onayli.length === 0}
        onPress={async () => {
          await rpc('yonetici_hv_onayla', {
            p_hv: basvuru.id,
            p_gorusme_notu: not.trim(),
            p_sicil_dogrulandi: sicil,
            p_onayli_etiketler: onayli,
            p_kurucu: kurucu,
          });
          await yenile();
        }}
      >
        Onayla
      </Dugme>
    </Kart>
  );
}

function AnlasmazlikKarti({ kayit, yenile }: { kayit: Anlasmazlik; yenile: () => Promise<void> }) {
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [iade, setIade] = useState('');
  const [gerekce, setGerekce] = useState('');
  const [danisilan, setDanisilan] = useState('');
  const sorunMu = kayit.tur === 'sorun' && kayit.isler.durum === 'sorun';

  return (
    <Kart vurgu="uyari">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Rozet tur="uyari">{kayit.durum === 'itiraz' ? 'İtiraz' : turAdi[kayit.tur]}</Rozet>
        <Metin soluk kucuk>{zaman(kayit.olusturma_at)}</Metin>
      </View>
      <Satir sol={kayit.isler.hizmetler.ad} sag={tl(kayit.isler.musteri_toplam_kd)} />
      {kayit.aciklama ? <Metin>“{kayit.aciklama}”</Metin> : null}
      <Dugme tur="ikincil" onPress={() => router.push({ pathname: '/is/[id]', params: { id: kayit.isler.id } })}>
        İşi ve fotoğrafları aç
      </Dugme>
      {sorunMu ? (
        <Secenekler
          etiket="Karar"
          secenekler={[
            { deger: 'odeme', ad: 'HV haklı, ödeme yapılsın' },
            { deger: 'kismi', ad: 'Kısmi iade' },
            { deger: 'tam_iade', ad: 'Tam iade' },
          ]}
          secili={sonuc}
          sec={setSonuc}
        />
      ) : null}
      {sonuc === 'kismi' ? <Girdi etiket="İade tutarı (KDV dahil, TL)" keyboardType="decimal-pad" value={iade} onChangeText={setIade} /> : null}
      <Girdi etiket="Gerekçe (iki tarafa da gönderilir)" value={gerekce} onChangeText={setGerekce} multiline />
      <Girdi etiket="Danıştığın kişi (K34)" value={danisilan} onChangeText={setDanisilan} />
      <Dugme
        pasif={!gerekce.trim() || (sorunMu && !sonuc)}
        onPress={async () => {
          await rpc('yonetici_anlasmazlik_karar', {
            p_anlasmazlik: kayit.id,
            p_sonuc: sorunMu ? sonuc : 'incelendi',
            p_gerekce: gerekce.trim(),
            p_danisilan: danisilan.trim() || null,
            p_iade_kd: sonuc === 'kismi' ? Number(iade.replace(',', '.')) : 0,
          });
          await yenile();
        }}
      >
        Kararı gönder
      </Dugme>
    </Kart>
  );
}
