import { Text, View } from 'react-native';
import { tl } from '@/lib/bicim';
import type { FiyatDokumu } from '@/lib/tipler';
import { Ayirici, BilgiSatiri, Kart, renk, Satir, Tutar } from './ui';

const indirimAdi: Record<string, string> = {
  ilk: 'İlk iş indirimi',
  ikinci: 'İkinci iş indirimi',
  kupon: 'Kupon',
};

/** K2: müşteri KDV dahil son fiyatı ve dökümünü görür */
export function FiyatKarti({ fiyat }: { fiyat: FiyatDokumu }) {
  return (
    <Kart stilEk={{ padding: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: renk.soluk }}>Ödeyeceğin</Text>
          <Text style={{ fontSize: 12, lineHeight: 16, color: renk.soluk }}>KDV dahil</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {fiyat.indirim_kd > 0 ? (
            <Text style={{ fontSize: 14, color: renk.silik, textDecorationLine: 'line-through' }}>{tl(fiyat.brut_kd)}</Text>
          ) : null}
          <Tutar boyut={34} renkli={renk.anaKoyu}>
            {tl(fiyat.musteri_toplam_kd)}
          </Tutar>
        </View>
      </View>
      <Ayirici />
      <Satir sol="Hizmet" sag={tl(fiyat.hv_tutari_kh + fiyat.okindo_payi_kh)} />
      {fiyat.yol_kh > 0 ? <Satir sol="Yol" sag={tl(fiyat.yol_kh)} /> : null}
      <Satir sol="KDV" sag={tl(fiyat.kdv)} />
      {fiyat.indirim_kd > 0 && fiyat.indirim_turu ? (
        <Satir sol={indirimAdi[fiyat.indirim_turu]} sag={`−${tl(fiyat.indirim_kd)}`} solRenk={renk.ana} />
      ) : null}
      <View style={{ gap: 8, marginTop: 8 }}>
        <BilgiSatiri simge="lock-closed-outline">
          {fiyat.fiyat_tipi === 'is_basi'
            ? 'İş uzasa da fiyat değişmez. Yalnız senin onayladığın ek iş değiştirir.'
            : 'Süre senin onayın olmadan uzamaz.'}
        </BilgiSatiri>
        <BilgiSatiri simge="cube-outline">Malzeme fiyata dahil değildir.</BilgiSatiri>
        <BilgiSatiri simge="home-outline">Evde olmazsan {tl(fiyat.cikis_ucreti_kd)} çıkış ücreti alınır.</BilgiSatiri>
      </View>
    </Kart>
  );
}
