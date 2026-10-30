import { Text, View } from 'react-native';
import { tl } from '@/lib/bicim';
import type { FiyatDokumu } from '@/lib/tipler';
import { Kart, Metin, renk, Satir } from './ui';

const indirimAdi: Record<string, string> = {
  ilk: 'İlk iş indirimi',
  ikinci: 'İkinci iş indirimi',
  kupon: 'Kupon',
};

/** K2: müşteri KDV dahil son fiyatı ve dökümünü görür */
export function FiyatKarti({ fiyat }: { fiyat: FiyatDokumu }) {
  return (
    <Kart>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Metin kalin>Toplam (KDV dahil)</Metin>
        <View style={{ alignItems: 'flex-end' }}>
          {fiyat.indirim_kd > 0 ? (
            <Text style={{ fontSize: 13, color: renk.soluk, textDecorationLine: 'line-through' }}>{tl(fiyat.brut_kd)}</Text>
          ) : null}
          <Metin kalin renkli={renk.ana}>
            {tl(fiyat.musteri_toplam_kd)}
          </Metin>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: renk.cizgi, marginVertical: 4 }} />
      <Satir sol="Hizmet" sag={tl(fiyat.hv_tutari_kh + fiyat.okindo_payi_kh)} />
      {fiyat.yol_kh > 0 ? <Satir sol="Yol" sag={tl(fiyat.yol_kh)} /> : null}
      <Satir sol="KDV" sag={tl(fiyat.kdv)} />
      {fiyat.indirim_kd > 0 && fiyat.indirim_turu ? (
        <Satir sol={indirimAdi[fiyat.indirim_turu]} sag={`−${tl(fiyat.indirim_kd)}`} />
      ) : null}
      <Metin soluk kucuk>
        {fiyat.fiyat_tipi === 'is_basi'
          ? 'İş uzasa da fiyat değişmez. Fiyatı yalnız senin onayladığın ek iş değiştirir. Malzeme dahil değildir.'
          : 'Süre senin onayın olmadan uzamaz. Malzeme dahil değildir.'}
      </Metin>
      <Metin soluk kucuk>Evde olmazsan {tl(fiyat.cikis_ucreti_kd)} çıkış ücreti alınır.</Metin>
    </Kart>
  );
}
