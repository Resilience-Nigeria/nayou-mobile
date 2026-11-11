import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Banner, Empty, ErrorView, Loading, Row, showError, timeAgo } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import type { PostComment, PublicConfig } from '../../lib/types';
import { colors, font, radius, space } from '../../theme/theme';

export default function Comments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<PublicConfig>('/config') });
  const max = Number(cfg.data?.['posts.comment_max_length'] ?? 300);
  const on = cfg.data?.['posts.allow_comments'] !== false;

  const q = useInfiniteQuery({
    queryKey: ['comments', id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<PostComment[]>(`/posts/${id}/comments`, { before: pageParam, limit: 30 }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
    refetchInterval: 15_000,
    retry: false,
  });

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setNotice(null);
    try {
      await api.post(`/posts/${id}/comments`, { body });
      setText('');
      q.refetch();
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    } catch (e) {
      if (e instanceof ApiError && ['contact_info_blocked', 'comment_limit_reached', 'comments_disabled'].includes(e.code)) setNotice(e.friendly);
      else showError(e, 'Comment not sent');
    } finally { setBusy(false); }
  }

  function remove(cid: string) {
    Alert.alert('Delete this comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.del(`/posts/${id}/comments/${cid}`); q.refetch(); qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['posts'] }); } catch (e) { showError(e); }
      } },
    ]);
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<Empty icon="chatbubble-outline" title="No comments yet" text="Be the first to say something." />}
          renderItem={({ item: c }) => (
            <Row style={{ gap: 10, alignItems: 'flex-start' }}>
              <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: c.author.id } })}>
                <Avatar url={c.author.photo?.url} name={c.author.display_name} size={36} />
              </Pressable>
              <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 10, gap: 2 }}>
                <Text style={font.h3}>{c.mine ? 'You' : c.author.display_name ?? 'Member'} <Text style={font.small}>· {timeAgo(c.created_at)} ago</Text></Text>
                <Text style={[font.body, { lineHeight: 22 }]}>{c.body}</Text>
              </View>
              {c.can_delete ? <Pressable onPress={() => remove(c.id)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={colors.textMuted} /></Pressable> : null}
            </Row>
          )}
        />
        {notice ? <View style={{ paddingHorizontal: space.lg }}><Banner tone="warn">{notice}</Banner></View> : null}
        {on ? (
          <Row style={{ padding: space.md, alignItems: 'flex-end', gap: 8 }}>
            <TextInput value={text} onChangeText={setText} placeholder="Write a comment" placeholderTextColor="#A5ABA7" multiline maxLength={max}
              style={{ flex: 1, maxHeight: 110, backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.text }} />
            <Pressable onPress={send} disabled={busy || !text.trim()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: busy || !text.trim() ? 0.5 : 1 }}>
              <Ionicons name="send" size={20} color={colors.white} />
            </Pressable>
          </Row>
        ) : <Text style={[font.small, { textAlign: 'center', padding: space.md }]}>Comments are turned off right now.</Text>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
