// İş ekranı: Fotoğraflar sekmesi
import { View } from 'react-native';
import { FotoGalerisi } from '@/components/FotoGalerisi';
import { bosluk, Bos, Dugme } from '@/components/ui';
import { fotoCekVeYukle } from '@/lib/foto';
import type { Veri, Eylem } from './ortak';

export function Fotograflar({ veri, hvyim, eylem }: { veri: Veri; hvyim: boolean; eylem: Eylem }) {
  const { is } = veri;
  const fotoVar = (tur: string) => veri.fotolar.some((f) => f.tur === tur);
  const fotoCek = async (tur: string) => {
    const yol = await fotoCekVeYukle(is.id, tur);
    if (yol) await eylem('foto_kaydet', { p_is: is.id, p_tur: tur, p_yol: yol });
  };
  return (
    <>
      {veri.fotolar.length ? (
        <FotoGalerisi fotolar={veri.fotolar} />
      ) : (
        <Bos
          simge="images-outline"
          baslik="Henüz fotoğraf yok"
          metin={hvyim ? 'Başlangıç ve bitiş fotoğrafı, bir anlaşmazlıkta seni korur.' : 'Gelen kişinin çektiği başlangıç ve bitiş fotoğrafları burada görünür.'}
          eylem={
            hvyim && is.durum === 'basladi' ? (
              <Dugme simge="camera-outline" onPress={() => fotoCek(fotoVar('baslangic') ? 'bitis' : 'baslangic')}>
                {fotoVar('baslangic') ? 'Bitiş fotoğrafı ekle' : 'Başlangıç fotoğrafı ekle'}
              </Dugme>
            ) : undefined
          }
        />
      )}
      {hvyim && is.durum === 'basladi' && veri.fotolar.length ? (
        <View style={{ flexDirection: 'row', gap: bosluk.s }}>
          <View style={{ flex: 1 }}>
            <Dugme kucuk tur="ikincil" simge={fotoVar('baslangic') ? 'checkmark' : 'camera-outline'} onPress={() => fotoCek('baslangic')}>
              Başlangıç
            </Dugme>
          </View>
          <View style={{ flex: 1 }}>
            <Dugme kucuk tur="ikincil" simge={fotoVar('bitis') ? 'checkmark' : 'camera-outline'} onPress={() => fotoCek('bitis')}>
              Bitiş
            </Dugme>
          </View>
        </View>
      ) : null}
    </>
  );
}
