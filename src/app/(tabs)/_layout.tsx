import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { api } from '../../lib/api';
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
  const n = unread.data?.unread ?? 0;
  const c = chats.data?.chats ?? 0; // conversations waiting for you
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTitleStyle: { fontWeight: '800' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: icon('compass-outline', 'compass') }} />
      <Tabs.Screen name="matches" options={{ title: 'Chats', tabBarIcon: icon('chatbubbles-outline', 'chatbubbles'), tabBarBadge: c > 0 ? (c > 99 ? '99+' : c) : undefined }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: icon('notifications-outline', 'notifications'), tabBarBadge: n > 0 ? (n > 99 ? '99+' : n) : undefined }} />
      <Tabs.Screen name="coins" options={{ title: 'Coins', tabBarIcon: icon('wallet-outline', 'wallet') }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
