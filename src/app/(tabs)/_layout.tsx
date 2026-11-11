import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { api } from '../../lib/api';
import type { Profile } from '../../lib/types';
import { CoinPill } from '../../components/CoinPill';
import { colors } from '../../theme/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName, focused: IconName) => ({ color, focused: f, size }: { color: any; focused: boolean; size: number }) =>
  <Ionicons name={f ? focused : name} size={size} color={color} />;

export default function TabsLayout() {
  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get<{ unread: number }>('/notifications/unread-count'),
    refetchInterval: 60_000,
  });
  const chats = useQuery({
    queryKey: ['unread'],
    queryFn: () => api.get<{ unread: number; chats: number }>('/conversations/unread-count'),
    refetchInterval: 5_000,
  });
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/profile'), staleTime: 60_000 });
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<Record<string, unknown>>('/config'), staleTime: 60_000 });
  const exploreOn = cfg.data?.['explore.enabled'] !== false;
  const postsOn = cfg.data?.['posts.enabled'] !== false;
  const n = unread.data?.unread ?? 0;
  const c = chats.data?.chats ?? 0; // conversations waiting for you
  const photoUrl = profile.data?.photos.find((x) => x.is_primary && x.status !== 'rejected' && x.url)?.url ?? profile.data?.photos.find((x) => x.url && x.status !== 'rejected')?.url ?? null;
  // A profile photo is required before using the app (an admin can switch this off).
  if (profile.data && cfg.data && cfg.data['onboarding.require_photo'] !== false && profile.data.photos.length === 0) return <Redirect href="/onboarding-photo" />;
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerRight: () => <CoinPill />, headerTitleStyle: { fontWeight: '800' },
    }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home'), href: exploreOn ? undefined : null }} />
      <Tabs.Screen name="index" options={{ title: 'Nearby', tabBarIcon: icon('compass-outline', 'compass') }} />
      <Tabs.Screen name="posts" options={{ title: 'Posts', tabBarIcon: icon('newspaper-outline', 'newspaper'), href: postsOn ? undefined : null }} />
      <Tabs.Screen name="matches" options={{ title: 'Chats', tabBarIcon: icon('chatbubbles-outline', 'chatbubbles'), tabBarBadge: c > 0 ? (c > 99 ? '99+' : c) : undefined }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: icon('notifications-outline', 'notifications'), tabBarBadge: n > 0 ? (n > 99 ? '99+' : n) : undefined }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: ({ color, focused, size }) => photoUrl
        ? <View style={{ width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, borderWidth: 2, borderColor: focused ? colors.primary : 'transparent', overflow: 'hidden' }}><Image source={{ uri: photoUrl }} style={{ flex: 1 }} contentFit="cover" /></View>
        : <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color as string} /> }} />
    </Tabs>
  );
}
