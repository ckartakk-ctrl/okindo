import * as Sentry from '@sentry/react-native';

/**
 * Hata takibi (Sentry). EXPO_PUBLIC_SENTRY_DSN boşsa hiçbir şey gönderilmez.
 * DSN, Sentry'de proje açınca verilen adrestir; gizli değildir (uygulamanın içine gömülür).
 */
const dsn = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
export const hataTakibiAcik = dsn.length > 0;

Sentry.init({
  dsn: hataTakibiAcik ? dsn : undefined,
  enabled: hataTakibiAcik,
  environment: __DEV__ ? 'gelistirme' : 'canli',
  // Telefon numarası, adres gibi kişisel veriler gönderilmez (KVKK)
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

/** Giriş yapan kişiyi yalnız kimlik numarasıyla işaretler (ad ve telefon gönderilmez) */
export function hataTakibiKullanici(id: string | null) {
  Sentry.setUser(id ? { id } : null);
}

/** Yakalanan ama kullanıcıya sade mesajla gösterilen hataları da kaydeder */
export function hataKaydet(hata: unknown, baglam?: Record<string, unknown>) {
  if (!hataTakibiAcik) return;
  Sentry.captureException(hata, baglam ? { extra: baglam } : undefined);
}

export const hataTakibiSar = Sentry.wrap;
