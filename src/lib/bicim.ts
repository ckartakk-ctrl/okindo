import type { IsDurumu } from './tipler';

const paraBicimi = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 480 → "480 TL", 197.65 → "197,65 TL" */
export function tl(tutar: number | string | null | undefined): string {
  const n = Number(tutar ?? 0);
  return `${paraBicimi.format(n)} TL`;
}

const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function iki(n: number) {
  return n.toString().padStart(2, '0');
}

/** "Yarın 10:00", "Cuma 31 Ekim 14:00" */
export function zaman(iso: string): string {
  const t = new Date(iso);
  const bugun = new Date();
  const yarin = new Date();
  yarin.setDate(bugun.getDate() + 1);
  const saat = `${iki(t.getHours())}:${iki(t.getMinutes())}`;
  if (t.toDateString() === bugun.toDateString()) return `Bugün ${saat}`;
  if (t.toDateString() === yarin.toDateString()) return `Yarın ${saat}`;
  return `${gunler[t.getDay()]} ${t.getDate()} ${aylar[t.getMonth()]} ${saat}`;
}

export function gunAdi(t: Date): string {
  const bugun = new Date();
  const yarin = new Date();
  yarin.setDate(bugun.getDate() + 1);
  if (t.toDateString() === bugun.toDateString()) return 'Bugün';
  if (t.toDateString() === yarin.toDateString()) return 'Yarın';
  return `${gunler[t.getDay()].slice(0, 3)} ${t.getDate()}`;
}

export const durumMetni: Record<IsDurumu, string> = {
  odeme_bekliyor: 'Ödeme bekleniyor',
  acik: 'Kişi aranıyor',
  kabul: 'Kabul edildi',
  yolda: 'Yolda',
  adreste: 'Kapıda',
  basladi: 'İş sürüyor',
  bitti: 'Onayın bekleniyor',
  onaylandi: 'Tamamlandı',
  sorun: 'İnceleniyor',
  iptal: 'İptal',
  gelmedi: 'Gelmedi',
  evde_yok: 'Evde yoktun',
  yapilamadi: 'Yapılamadı',
};

export const hvDurumMetni: Partial<Record<IsDurumu, string>> = {
  bitti: 'Müşteri onayı bekleniyor',
  evde_yok: 'Müşteri evde yoktu',
};

export const bitmisDurumlar: IsDurumu[] = ['onaylandi', 'iptal', 'gelmedi', 'evde_yok', 'yapilamadi'];

export function saatMetni(saat: number | null): string {
  if (!saat) return '';
  const tam = Math.floor(saat);
  return saat % 1 === 0 ? `${tam} saat` : `${tam} saat 30 dk`;
}
