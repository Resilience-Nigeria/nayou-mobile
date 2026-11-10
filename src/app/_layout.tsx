import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { BackButton } from '../components/BackButton';
import { BrandSplash } from '../components/BrandSplash';
import { IncomingCall } from '../components/IncomingCall';
import { AuthProvider, useAuth } from '../lib/auth';
import { registerPush, routeForNotification } from '../lib/push';
import { colors } from '../theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } },
});

function PushBootstrap() {
  const { status } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (status !== 'signedIn') return;
    registerPush().catch((e) => console.warn('push registration failed', e));
    const received = Notifications.addNotificationReceivedListener(() => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
    });
    const tapped = Notifications.addNotificationResponseReceivedListener((r) => {
      routeForNotification(r.notification.request.content.data as Record<string, any>);
    });
    return () => {
      received.remove();
      tapped.remove();
    };
  }, [status, qc]);

  return null;
}

function Gate() {
  const { status } = useAuth();
  const [minShown, setMinShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMinShown(true), 1200); return () => clearTimeout(t); }, []);
  // Show the logo for at least a moment so it never just flashes, and until we know who is signed in.
  if (status === 'loading' || !minShown) return <BrandSplash onReady={() => SplashScreen.hideAsync().catch(() => {})} />;
  const inApp = status === 'signedIn';
  return (
    <>
      <PushBootstrap />
      {inApp ? <IncomingCall /> : null}
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.text, ...(Platform.OS === 'web' ? { headerLeft: () => <BackButton /> } : {}), contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ title: '' }} />
          <Stack.Screen name="person/[id]" options={{ title: 'Profile' }} />
          <Stack.Screen name="call/[id]" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="feed" options={{ title: 'Posts' }} />
          <Stack.Screen name="plans" options={{ title: 'Plans' }} />
          <Stack.Screen name="order/[id]" options={{ title: 'Your order' }} />
          <Stack.Screen name="profile-edit" options={{ title: 'Edit profile' }} />
          <Stack.Screen name="photos" options={{ title: 'Your photos' }} />
          <Stack.Screen name="verify" options={{ title: 'Photo verification' }} />
          <Stack.Screen name="notification-settings" options={{ title: 'Notifications' }} />
          <Stack.Screen name="appeals" options={{ title: 'Appeals' }} />
          <Stack.Screen name="preferences" options={{ title: 'Who you see' }} />
          <Stack.Screen name="location" options={{ title: 'Your location' }} />
        </Stack.Protected>
        <Stack.Protected guard={!inApp}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
