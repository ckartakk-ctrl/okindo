import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { hataKaydet } from './hataTakibi';
import { supabase } from './supabase';

let sonJeton: string | null = null;

// Uygulama açıkken gelen bildirim de üstte görünür
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Telefonu push bildirim için kaydeder. İzin verilmezse, emülatördeyse ya da EAS proje numarası yoksa
 * sessizce vazgeçer; bildirimler yine uygulama içinde görünür.
 */
export async function pushKaydet(): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    const projeNo = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projeNo) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('varsayilan', {
        name: 'okindo',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const jeton = (await Notifications.getExpoPushTokenAsync({ projectId: projeNo })).data;
    const { error } = await supabase.rpc('push_jetonu_kaydet', { p_jeton: jeton, p_platform: Platform.OS });
    if (error) throw error;
    sonJeton = jeton;
  } catch (e) {
    hataKaydet(e, { yer: 'pushKaydet' });
  }
}

/** Çıkışta bu telefona artık bildirim gitmesin */
export async function pushSil(): Promise<void> {
  if (!sonJeton) return;
  try {
    await supabase.rpc('push_jetonu_sil', { p_jeton: sonJeton });
  } catch {
    // çıkış yine de yapılır
  }
  sonJeton = null;
}

/** Bildirime dokununca ilgili iş açılır. Dinleyiciyi kaldıran fonksiyonu döndürür. */
export function bildirimDokunusunuDinle(): () => void {
  const ac = (yanit: Notifications.NotificationResponse | null) => {
    const isId = yanit?.notification.request.content.data?.is_id;
    if (typeof isId === 'string' && isId) router.push(`/is/${isId}`);
    else if (yanit) router.push('/bildirimler');
  };
  Notifications.getLastNotificationResponseAsync().then(ac).catch(() => undefined);
  const abonelik = Notifications.addNotificationResponseReceivedListener(ac);
  return () => abonelik.remove();
}
