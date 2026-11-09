import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Empty, ErrorView, Loading, Screen, timeAgo } from '../../components/ui';
import { api } from '../../lib/api';
import type { Notice } from '../../lib/types';
import { colors, font, radius, space } from '../../theme/theme';

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = { matches: 'heart', messages: 'chatbubble', payments: 'card', account: 'shield-checkmark', subscription: 'ribbon' };

export default function Alerts() {
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ['notifications', 'inbox'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<Notice[]>('/notifications', { cursor: pageParam }),
    getNextPageParam: (l) => (l.meta.next_cursor as string | null) ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.data) ?? [];

  async function open(n: Notice) {
    if (!n.read) {
      await api.post('/notifications/read', { ids: [n.id] }).catch(() => {});
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }
    const d = n.data ?? {};
    if (d.conversation_id) router.push({ pathname: '/chat/[id]', params: { id: String(d.conversation_id) } });
    else if (d.payment_id) router.push({ pathname: '/order/[id]', params: { id: String(d.payment_id) } });
    else if (n.category === 'account') router.push('/appeals');
  }

  async function readAll() {
    await api.post('/notifications/read', { all: true }).catch(() => {});
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const unread = (q.data?.pages[0]?.meta.unread as number) ?? 0;

  return (
    <Screen edges={[]} padded={false}>
      {unread > 0 ? <Pressable onPress={readAll} style={{ padding: space.lg, paddingBottom: 0 }}><Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'right' }}>Mark all read</Text></Pressable> : null}
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        onRefresh={() => q.refetch()}
        refreshing={q.isRefetching}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, flexGrow: 1 }}
        ListEmptyComponent={<Empty icon="notifications-outline" title="Nothing yet" text="Matches, messages and account updates will show up here." />}
        renderItem={({ item: n }) => (
          <Pressable onPress={() => open(n)} style={{ flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: n.read ? colors.card : colors.primarySoft }}>
            <Ionicons name={ICON[n.category] ?? 'notifications'} size={22} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={font.h3}>{n.title}{n.count > 1 ? `  ·  ${n.count}` : ''}</Text>
              <Text style={[font.body, { marginTop: 2 }]}>{n.body}</Text>
            </View>
            <Text style={font.small}>{timeAgo(n.created_at)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
