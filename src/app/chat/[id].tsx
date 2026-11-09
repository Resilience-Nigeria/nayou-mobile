import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, ErrorView, Loading, Row, showError } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import type { MatchItem, Message, Wallet } from '../../lib/types';
import { colors, font, radius, space } from '../../theme/theme';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef<{ body: string; key: string } | null>(null);

  const matches = useQuery({ queryKey: ['matches'], queryFn: () => api.get<MatchItem[]>('/matches') });
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: () => api.get<Wallet>('/wallet') });
  const other = matches.data?.find((m) => m.conversation_id === id);

  const msgs = useInfiniteQuery({
    queryKey: ['messages', id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<Message[]>(`/conversations/${id}/messages`, { before: pageParam, limit: 30 }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
    refetchInterval: 5000, // no realtime yet: poll
    retry: false,
  });

  const items = useMemo(() => msgs.data?.pages.flatMap((p) => p.data) ?? [], [msgs.data]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    // Reuse the key when retrying the same text, so a retry can never charge twice.
    if (!pending.current || pending.current.body !== body) pending.current = { body, key: uuid() };
    setSending(true);
    setNotice(null);
    try {
      await api.post(`/conversations/${id}/messages`, { client_message_id: pending.current.key, body });
      pending.current = null;
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', id] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'insufficient_coins') {
        Alert.alert('Not enough coins', e.friendly, [{ text: 'Not now', style: 'cancel' }, { text: 'Buy coins', onPress: () => router.push('/coins') }]);
      } else if (e instanceof ApiError && ['contact_info_blocked', 'messaging_restricted', 'conversation_closed'].includes(e.code)) {
        setNotice(e.friendly);
      } else {
        showError(e, 'Message not sent');
      }
    } finally {
      setSending(false);
    }
  }

  function menu() {
    if (!other) return;
    Alert.alert(other.user.display_name ?? 'Options', undefined, [
      { text: 'Report', onPress: () => router.push({ pathname: '/report', params: { id: other.user.id, name: other.user.display_name ?? '' } }) },
      {
        text: 'Block', style: 'destructive',
        onPress: () => Alert.alert('Block this person?', 'You will no longer see each other and the chat closes.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: async () => {
            try { await api.post(`/users/${other.user.id}/block`); qc.invalidateQueries({ queryKey: ['matches'] }); router.back(); } catch (e) { showError(e); }
          } },
        ]),
      },
      { text: 'Unmatch', style: 'destructive', onPress: async () => {
        try { await api.del(`/matches/${other.id}`); qc.invalidateQueries({ queryKey: ['matches'] }); router.back(); } catch (e) { showError(e); }
      } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (msgs.isLoading) return <Loading />;
  if (msgs.error) return <ErrorView error={msgs.error} onRetry={() => msgs.refetch()} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title: other?.user.display_name ?? 'Chat', headerRight: () => other ? <Pressable onPress={menu} hitSlop={10}><Ionicons name="ellipsis-horizontal" size={22} color={colors.text} /></Pressable> : null }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          inverted
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          onEndReached={() => msgs.hasNextPage && !msgs.isFetchingNextPage && msgs.fetchNextPage()}
          ListEmptyComponent={<Text style={[font.small, { textAlign: 'center', transform: [{ scaleY: -1 }], padding: space.xl }]}>Say hello. Each message costs {wallet.data?.message_cost ?? '…'} coin(s).</Text>}
          renderItem={({ item }) => (
            <View style={{ alignSelf: item.mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: item.mine ? colors.primary : colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: item.mine ? colors.white : colors.text, fontSize: 16, lineHeight: 22 }}>{item.body}</Text>
            </View>
          )}
        />
        {notice ? <View style={{ paddingHorizontal: space.lg }}><Banner tone="warn">{notice}</Banner></View> : null}
        <Row style={{ padding: space.md, alignItems: 'flex-end' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a message"
            placeholderTextColor="#A5ABA7"
            multiline
            maxLength={2000}
            style={{ flex: 1, maxHeight: 120, backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.text }}
          />
          <Pressable onPress={send} disabled={sending || !text.trim()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: sending || !text.trim() ? 0.5 : 1 }}>
            <Ionicons name="send" size={20} color={colors.white} />
          </Pressable>
        </Row>
        <Text style={[font.small, { textAlign: 'center', paddingBottom: 4 }]}>{wallet.data ? `${wallet.data.coin_balance} coins · ${wallet.data.message_cost} per message` : ' '}</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
