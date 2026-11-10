import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from './api';

let registeredToken: string | null = null;

// Show banners while the app is open; the in-app badge comes from the inbox query.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Ask permission, get the Expo token, tell the server. Safe to call on every sign-in. */
export async function registerPush(): Promise<void> {
  if (!Device.isDevice) return; // simulators cannot receive pushes
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Nayou', importance: Notifications.AndroidImportance.DEFAULT });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
  if (!projectId) {
    console.warn('Push disabled: set extra.eas.projectId in app.json (run `eas init`).');
    return;
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.post('/devices', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
  registeredToken = token;
}

export async function unregisterPush(): Promise<void> {
  if (registeredToken) {
    await api.del('/devices', { token: registeredToken });
    registeredToken = null;
  }
}

/** Where a tapped notification should go. Pushes carry ids only, never message text. */
export function routeForNotification(data: Record<string, any> | undefined): void {
  if (!data) return;
  if (data.conversation_id) router.push({ pathname: '/chat/[id]', params: { id: String(data.conversation_id) } });
  else if (data.payment_id) router.push({ pathname: '/order/[id]', params: { id: String(data.payment_id) } });
  else router.push('/alerts');
}
