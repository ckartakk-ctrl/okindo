// Tasarım dili: renkler, boşluklar, yazı boyutları ve ortak stiller
import { StyleSheet } from 'react-native';
import { baslikAilesi } from '@/lib/yazitipi';

/* ------------------------------------------------------------------ */
/*  Tasarım dili (VectorLab UX kurallarına göre)                       */
/*  - Yazı ağırlıkları: 400 / 500 / 600. 600'ün üstü yok.              */
/*  - Boyutlar: gövde 16, ikincil 14, meta 12. 12'nin altı yok.        */
/*  - Boşluklar: 4'ün katları (küçük), 8'in katları (büyük).           */
/*  - %60 zemin, %30 beyaz yüzey, %10 yeşil vurgu.                     */
/*  - Tek imza: sarı "OK" damgası (güven işareti).                     */
/* ------------------------------------------------------------------ */

export const renk = {
  zemin: '#EEF2F1',
  kart: '#FFFFFF',
  metin: '#11302B',
  soluk: '#566B66',
  silik: '#7F918D',
  cizgi: '#DCE4E2',
  ana: '#13806F',
  anaKoyu: '#0D5C50',
  anaAcik: '#E1F1EC',
  damga: '#F5C842',
  damgaAcik: '#FCF3D6',
  uyari: '#9A4A08',
  uyariAcik: '#FCEFDC',
  hata: '#B42318',
  hataAcik: '#FCE9E7',
};

/** Başlık yazı tipi (Bricolage Grotesque 600). Yüklenmezse sistem yazısı kullanılır. */
export const yazi = { baslik: baslikAilesi, kalin: baslikAilesi, yari: baslikAilesi };

export const bosluk = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export const boyut = { govde: 16, ikincil: 14, meta: 12 };

export const stil = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: renk.zemin },
  icerik: { padding: bosluk.l, gap: bosluk.l },
  ustBlok: {
    backgroundColor: renk.anaKoyu,
    paddingHorizontal: bosluk.l,
    paddingBottom: bosluk.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: bosluk.m,
  },
  altCubuk: {
    backgroundColor: renk.kart,
    borderTopWidth: 1,
    borderTopColor: renk.cizgi,
    paddingHorizontal: bosluk.l,
    paddingTop: bosluk.m,
    gap: bosluk.s,
  },
  baslik: { fontFamily: yazi.baslik, fontWeight: '600', fontSize: 28, lineHeight: 32, color: renk.metin, letterSpacing: -0.4 },
  altBaslik: { fontFamily: yazi.baslik, fontWeight: '600', fontSize: 20, lineHeight: 24, color: renk.metin },
  grupBaslik: { fontSize: boyut.ikincil, lineHeight: 20, fontWeight: '600', color: renk.soluk },
  metin: { fontSize: boyut.govde, color: renk.metin, lineHeight: 24 },
  ikincil: { fontSize: boyut.ikincil, lineHeight: 20 },
  meta: { fontSize: boyut.meta, lineHeight: 16 },
  etiket: { fontSize: boyut.ikincil, lineHeight: 20, fontWeight: '600', color: renk.metin },
  kart: {
    backgroundColor: renk.kart,
    borderRadius: 16,
    padding: bosluk.l,
    borderWidth: 1,
    borderColor: renk.cizgi,
    gap: bosluk.s,
  },
  grup: { backgroundColor: renk.kart, borderRadius: 16, borderWidth: 1, borderColor: renk.cizgi, overflow: 'hidden' },
  grupSatiri: { flexDirection: 'row', alignItems: 'center', gap: bosluk.m, paddingHorizontal: bosluk.l, paddingVertical: bosluk.m, minHeight: 56 },
  ayirici: { height: 1, backgroundColor: renk.cizgi, marginLeft: bosluk.l },
  vurguCizgisi: { position: 'absolute', left: 0, top: bosluk.m, bottom: bosluk.m, width: 4, borderRadius: 2, backgroundColor: renk.ana },
  simgeKutusu: { width: 40, height: 40, borderRadius: 12, backgroundColor: renk.anaAcik, alignItems: 'center', justifyContent: 'center' },
  dugme: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: bosluk.l },
  dugmeYazi: { fontSize: boyut.govde, fontWeight: '600' },
  girdi: {
    backgroundColor: renk.kart,
    borderWidth: 1,
    borderColor: '#C9D5D2',
    borderRadius: 12,
    paddingHorizontal: bosluk.l,
    paddingVertical: bosluk.m,
    minHeight: 48,
    fontSize: boyut.govde,
    color: renk.metin,
  },
  cipler: { flexDirection: 'row', flexWrap: 'wrap', gap: bosluk.s },
  cip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.xs,
    paddingHorizontal: bosluk.l,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: renk.cizgi,
    backgroundColor: renk.kart,
  },
  cipYazi: { fontSize: boyut.ikincil, color: renk.metin, fontWeight: '500' },
  radyo: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: renk.silik, alignItems: 'center', justifyContent: 'center' },
  radyoIc: { width: 12, height: 12, borderRadius: 6, backgroundColor: renk.ana },
  satir: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: bosluk.xs, gap: bosluk.m },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.xs,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: bosluk.s,
    paddingVertical: bosluk.xs,
  },
  sekmeZemin: { backgroundColor: renk.kart, borderBottomWidth: 1, borderBottomColor: renk.cizgi },
  sekme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: bosluk.s,
    paddingHorizontal: bosluk.m,
    minHeight: 48,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sekmeSayi: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: bosluk.xs, backgroundColor: renk.ana, alignItems: 'center', justifyContent: 'center' },
});
