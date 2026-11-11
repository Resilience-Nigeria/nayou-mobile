import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Avatar, Chip, Empty, ErrorView, ListRow, Loading, Row, Screen, VerifiedBadge, timeAgo } from '../../components/ui';
import { api } from '../../lib/api';
import { openChatWith } from '../../lib/openChat';
import { durationLabel, startCall } from '../../lib/calls';
import type { CallInfo, ConversationItem, LikeItem, MatchItem } from '../../lib/types';
import { colors, font, space } from '../../theme/theme';

type Tab = 'chats' | 'calls' | 'matches' | 'liked';
const TABS: [Tab, string][] = [['chats', 'Chats'], ['calls', 'Calls'], ['matches', 'Matches'], ['liked', 'Liked']];

const CALL_COLORS = { outgoing: '#2563EB', incoming: '#16A34A', missed: '#DC2626', unanswered: '#F59E0B' };

/** Phone with an arrow: outgoing (blue), incoming (green), missed (red), your call that was not answered (amber). */
function CallIcon({ c }: { c: { direction: string; status: string; type: string } }) {
  const answered = c.status === 'ended';
  const kind = answered ? c.direction : c.direction === 'incoming' ? 'missed' : 'unanswered';
  const name = kind === 'incoming' ? 'phone-incoming' : kind === 'missed' ? 'phone-missed' : 'phone-outgoing';
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <MaterialCommunityIcons name={name} size={24} color={CALL_COLORS[kind as keyof typeof CALL_COLORS]} />
      {c.type === 'video' ? <Ionicons name="videocam" size={12} color={colors.textMuted} /> : null}
    </View>
  );
}

export default function Chats() {
  const [tab, setTab] = useState<Tab>('chats');
  return (
    <Screen edges={[]} padded={false}>
      <Row style={{ gap: space.sm, padding: space.lg, paddingBottom: space.sm }}>
        {TABS.map(([k, l]) => <Chip key={k} label={l} selected={tab === k} onPress={() => setTab(k)} />)}
      </Row>
      {tab === 'chats' ? <ChatList /> : tab === 'calls' ? <CallList /> : tab === 'matches' ? <MatchList /> : <LikedList />}
    </Screen>
  );
}

function Face({ user, size }: { user: { id: string; display_name: string | null; photo: any; online?: boolean }; size?: number }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: user.id } })} hitSlop={6}>
      <Avatar url={user.photo?.url} name={user.display_name} online={user.online} size={size} />
    </Pressable>
  );
}

const listStyle = { padding: space.lg, gap: space.md, flexGrow: 1 } as const;

function ChatList() {
  const q = useInfiniteQuery({
    queryKey: ['conversations'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<ConversationItem[]>('/conversations', { before: pageParam, limit: 30 }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
    refetchInterval: 4_000,
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      contentContainerStyle={listStyle}
      ListEmptyComponent={<Empty icon="chatbubbles-outline" title="No chats yet" text="Tap the message button on anyone in Discover to start a conversation." />}
      renderItem={({ item }) => (
        <ListRow
          title={item.user.display_name ?? 'Member'}
          subtitle={item.closed ? 'Conversation closed' : item.last_message ? `${item.last_message.mine ? 'You: ' : ''}${item.last_message.body}` : 'New match. Say hello!'}
          unread={item.unread}
          left={<Face user={item.user} />}
          right={<View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={[font.small, item.unread > 0 && { color: colors.primary, fontWeight: '700' }]}>{timeAgo(item.activity_at)}</Text>
            {item.unread > 0 ? (
              <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.white, fontSize: 12, fontWeight: '800' }}>{item.unread > 99 ? '99+' : item.unread}</Text>
              </View>
            ) : null}
            {item.matched ? <Ionicons name="heart" size={14} color={colors.accent} /> : null}
          </View>}
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

function MatchList() {
  const q = useQuery({ queryKey: ['matches'], queryFn: () => api.get<MatchItem[]>('/matches'), refetchInterval: 30_000 });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  return (
    <FlatList
      data={q.data}
      keyExtractor={(m) => m.id}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
      contentContainerStyle={listStyle}
      ListEmptyComponent={<Empty icon="heart-outline" title="No matches yet" text="When you and someone else like each other, they show up here." />}
      renderItem={({ item }) => (
        <ListRow
          title={item.user.display_name ?? 'Member'}
          subtitle={`Matched ${timeAgo(item.matched_at)} ago`}
          left={<Face user={item.user} />}
          right={item.user.verified ? <VerifiedBadge label="Verified" /> : undefined}
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.conversation_id } })}
        />
      )}
    />
  );
}

function LikedList() {
  const q = useInfiniteQuery({
    queryKey: ['likes'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<LikeItem[]>('/likes', { before: pageParam, limit: 30 }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <FlatList
      data={items}
      keyExtractor={(l) => l.id}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      contentContainerStyle={listStyle}
      ListEmptyComponent={<Empty icon="heart-outline" title="No likes yet" text="People you like or super like appear here. Tap one to send a message." />}
      renderItem={({ item }) => (
        <ListRow
          title={item.user.display_name ?? 'Member'}
          subtitle={`${item.action === 'super_like' ? 'Super liked' : 'Liked'} ${timeAgo(item.liked_at)} ago${item.matched ? ' · It\'s a match' : ' · Waiting for them'}`}
          left={<Face user={item.user} />}
          right={<Row style={{ gap: 8 }}>
            {item.action === 'super_like' ? <Ionicons name="star" size={16} color={colors.gold} /> : null}
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
          </Row>}
          onPress={() => item.conversation_id ? router.push({ pathname: '/chat/[id]', params: { id: item.conversation_id } }) : openChatWith(item.user.id)}
        />
      )}
    />
  );
}

function CallList() {
  const q = useInfiniteQuery({
    queryKey: ['calls'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<CallInfo[]>('/calls', { before: pageParam, limit: 30 }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const label = (c: CallInfo) => {
    if (c.status === 'ended' && c.duration_seconds > 0) return `${c.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} · ${durationLabel(c.duration_seconds)}`;
    if (c.status === 'missed') return c.direction === 'incoming' ? 'Missed call' : 'No answer';
    if (c.status === 'declined') return c.direction === 'incoming' ? 'You declined' : 'Declined';
    return c.status === 'cancelled' ? 'Cancelled' : c.status === 'failed' ? 'Could not connect' : c.status === 'ringing' || c.status === 'active' ? 'In progress' : 'Ended';
  };
  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      contentContainerStyle={listStyle}
      ListEmptyComponent={<Empty icon="call-outline" title="No calls yet" text="Open a chat and tap the phone or camera icon to start a call." />}
      renderItem={({ item }) => (
        <ListRow
          title={item.user.display_name ?? 'Member'}
          subtitle={`${item.type === 'video' ? 'Video · ' : ''}${label(item)} · ${timeAgo(item.created_at)} ago`}
          left={<Face user={item.user} />}
          right={<CallIcon c={item} />}
          onPress={() => startCall(item.conversation_id, item.type)}
        />
      )}
    />
  );
}
