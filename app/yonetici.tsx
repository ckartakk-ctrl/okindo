import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Bos, bosluk, Dugme, Ekran, Girdi, Grup, GrupSatiri, Kart, Metin, renk, Rozet, Satir, Secenekler, Simge, stil, Tutar } from '@/components/ui';
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

  if (!profil?.yonetici) {
    return (
      <Ekran>
        <Bos
          simge="lock-closed-outline"
          baslik="Bu sayfa yöneticiler için"
          metin="Hesabında yönetici yetkisi yok. Hesabım sayfasına dönebilirsin."
          eylem={<Dugme onPress={() => router.replace('/hesap')}>Hesabıma dön</Dugme>}
        />
      </Ekran>
    );
  }

  const kutular = [
    { ad: 'Aktif HV', deger: `${aktifHv}`, alt: 'kurucu hedefi 50', simge: 'people' as const },
    { ad: 'Bekleyen başvuru', deger: `${basvurular.length}`, alt: basvurular.length ? 'görüşme bekliyor' : 'hepsi tamam', simge: 'person-add' as const },
    { ad: 'Açık anlaşmazlık', deger: `${anlasmazliklar.length}`, alt: anlasmazliklar.length ? '48 saat içinde karar' : 'hepsi tamam', simge: 'alert-circle' as const },
  ];

  return (
    <Ekran yenile={yukle}>
      <Text accessibilityRole="header" style={stil.baslik}>
        Yönetim
      </Text>
      <View style={{ flexDirection: 'row', gap: bosluk.s }}>
        {kutular.map((k) => (
          <View key={k.ad} style={[stil.kart, { flex: 1, gap: bosluk.xs, padding: bosluk.m }]}>
            <Simge ad={k.simge} boyut={20} renkli={k.simge === 'alert-circle' && anlasmazliklar.length ? renk.uyari : renk.ana} />
            <Tutar boyut={28}>{k.deger}</Tutar>
            <Text style={[stil.ikincil, { fontWeight: '600' }]}>{k.ad}</Text>
            <Text style={[stil.meta, { color: renk.soluk }]}>{k.alt}</Text>
          </View>
        ))}
      </View>

      {basvurular.length ? (
        <Text accessibilityRole="header" style={[stil.grupBaslik, { marginLeft: bosluk.xs }]}>{`HV başvuruları (${basvurular.length})`}</Text>
      ) : null}
      {basvurular.length ? null : (<Grup baslik={`HV başvuruları (0)`}>
        {basvurular.length === 0 ? (
          <GrupSatiri simge="checkmark-done-outline" baslik="Bekleyen başvuru yok" alt="Yeni başvuru gelince burada ve bildirimlerinde görünür." />
        ) : null}
      </Grup>)}
      {basvurular.map((b) => (
        <BasvuruKarti key={b.id} basvuru={b} kurucuOlabilir={aktifHv < 50} yenile={yukle} />
      ))}

      {anlasmazliklar.length ? (
        <Text accessibilityRole="header" style={[stil.grupBaslik, { marginLeft: bosluk.xs }]}>{`Anlaşmazlıklar (${anlasmazliklar.length})`}</Text>
      ) : null}
      {anlasmazliklar.length ? null : (<Grup baslik={`Anlaşmazlıklar (0)`}>
        {anlasmazliklar.length === 0 ? (
          <GrupSatiri simge="happy-outline" baslik="Açık anlaşmazlık yok" alt="Müşteri sorun bildirirse ya da HV itiraz ederse burada görünür." />
        ) : null}
      </Grup>)}
      {anlasmazliklar.map((a) => (
        <AnlasmazlikKarti key={a.id} kayit={a} yenile={yukle} />
      ))}

      <Grup baslik="Ayarlar">
        <GrupSatiri
          simge="options-outline"
          baslik="Fiyat, süre ve oranlar"
          alt="Supabase panelinde “ayarlar” tablosundan değiştirilir. Hizmet açıp kapatmak için “hizmetler” tablosundaki “aktif” sütunu kullanılır."
        />
      </Grup>
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
      <Text style={stil.altBaslik}>
        {basvuru.ad} {basvuru.soyad}
      </Text>
      <Metin soluk kucuk>
        {basvuru.mahalleler?.ad ?? ''}, +{basvuru.telefon?.replace(/^\+/, '')}
      </Metin>
      <Text style={stil.etiket}>Yüz yüze kontrolde başarılı olduğu işleri işaretle (K37)</Text>
      <View style={stil.cipler}>
        {basvuru.hv_etiketleri.map((e) => {
          const aktif = onayli.includes(e.hizmet_id);
          return (
            <Pressable
              key={e.hizmet_id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: aktif }}
              onPress={() => setOnayli(aktif ? onayli.filter((x) => x !== e.hizmet_id) : [...onayli, e.hizmet_id])}
              style={[stil.cip, aktif && { backgroundColor: renk.anaKoyu, borderColor: renk.anaKoyu }]}
            >
              <Simge ad={aktif ? 'checkbox' : 'square-outline'} boyut={16} renkli={aktif ? '#FFFFFF' : renk.silik} />
              <Text style={[stil.cipYazi, aktif && { color: '#FFFFFF' }]}>{e.hizmetler.ad}</Text>
            </Pressable>
          );
        })}
      </View>
      <Girdi etiket="Yüz yüze görüşme notu" value={not} onChangeText={setNot} multiline placeholder="Tarih, gözlemin, yaptırdığın kontrol" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: bosluk.m, minHeight: 48 }}>
        <Text style={[stil.metin, { flex: 1 }]}>Adli sicil e-Devlet’ten doğrulandı (belge saklanmaz)</Text>
        <Switch accessibilityLabel="Adli sicil doğrulandı" value={sicil} onValueChange={setSicil} trackColor={{ true: renk.ana, false: renk.cizgi }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: bosluk.m, minHeight: 48 }}>
        <Text style={[stil.metin, { flex: 1 }]}>Kurucu HV (ilk 50 kişi)</Text>
        <Switch accessibilityLabel="Kurucu HV" value={kurucu} onValueChange={setKurucu} trackColor={{ true: renk.ana, false: renk.cizgi }} />
      </View>
      <Dugme
        simge="checkmark-circle"
        eksik={!onayli.length ? 'Başarılı olduğu en az bir işi işaretle.' : !not.trim() ? 'Görüşme notunu yaz.' : !sicil ? 'Adli sicil doğrulamasını işaretle.' : null}
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
        Başvuruyu onayla
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Rozet tur="uyari">{kayit.durum === 'itiraz' ? 'İtiraz' : turAdi[kayit.tur]}</Rozet>
        <Metin soluk kucuk>{zaman(kayit.olusturma_at)}</Metin>
      </View>
      <Satir sol={kayit.isler.hizmetler.ad} sag={tl(kayit.isler.musteri_toplam_kd)} />
      {kayit.aciklama ? <Metin>“{kayit.aciklama}”</Metin> : null}
      <Dugme tur="ikincil" simge="open-outline" onPress={() => router.push({ pathname: '/is/[id]', params: { id: kayit.isler.id } })}>
        İşi ve fotoğrafları aç
      </Dugme>
      {sorunMu ? (
        <Secenekler
          etiket="Karar"
          dikey
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
      <Girdi etiket="Danıştığın kişi (K34)" istegeBagli value={danisilan} onChangeText={setDanisilan} />
      <Dugme
        eksik={sorunMu && !sonuc ? 'Önce bir karar seç.' : !gerekce.trim() ? 'Gerekçeyi yaz; iki tarafa da gönderilir.' : null}
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
