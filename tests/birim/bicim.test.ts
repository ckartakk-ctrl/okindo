import { bitmisDurumlar, durumMetni, gunAdi, saatMetni, tl, zaman } from '@/lib/bicim';

describe('tl', () => {
  it('tam sayıyı kuruşsuz yazar', () => expect(tl(480)).toBe('480 TL'));
  it('kuruşu virgülle yazar', () => expect(tl(197.65)).toBe('197,65 TL'));
  it('binlik ayıracı nokta', () => expect(tl(1250)).toBe('1.250 TL'));
  it('veritabanından gelen metin tutarı', () => expect(tl('988.24')).toBe('988,24 TL'));
  it('boş tutar 0 TL', () => {
    expect(tl(null)).toBe('0 TL');
    expect(tl(undefined)).toBe('0 TL');
  });
});

describe('saatMetni', () => {
  it('boşsa boş metin', () => expect(saatMetni(null)).toBe(''));
  it('tam saat', () => expect(saatMetni(2)).toBe('2 saat'));
  it('buçuklu saat', () => expect(saatMetni(3.5)).toBe('3 saat 30 dk'));
});

describe('zaman ve gunAdi', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 29, 9, 0)); // 29 Ekim 2026 Perşembe
  });
  afterAll(() => jest.useRealTimers());

  it('bugün', () => expect(zaman(new Date(2026, 9, 29, 14, 5).toISOString())).toBe('Bugün 14:05'));
  it('yarın', () => expect(zaman(new Date(2026, 9, 30, 10, 0).toISOString())).toBe('Yarın 10:00'));
  it('daha ileri tarih', () => expect(zaman(new Date(2026, 9, 31, 8, 30).toISOString())).toBe('Cumartesi 31 Ekim 08:30'));
  it('kısa gün adı', () => {
    expect(gunAdi(new Date(2026, 9, 29))).toBe('Bugün');
    expect(gunAdi(new Date(2026, 9, 30))).toBe('Yarın');
    expect(gunAdi(new Date(2026, 10, 2))).toBe('Pzt 2');
  });
});

describe('durum metinleri', () => {
  it('her bitmiş durumun bir metni var', () => {
    for (const d of bitmisDurumlar) expect(durumMetni[d]).toBeTruthy();
  });
});
