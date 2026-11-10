import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Avatar, Button, Card, Empty, ErrorView, Loading, Row, Screen, showError, timeAgo } from '../components/ui';
import { ApiError, api } from '../lib/api';
import type { Post } from '../lib/types';
import { colors, font, radius, space } from '../theme/theme';

export default function Feed() {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const q = useInfiniteQuery({
    queryKey: ['feed'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<Post[]>('/feed', { before: pageParam, limit: 20 }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
    refetchInterval: 20_000,
  });

  async function publish() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await api.post('/posts', { body });
      setText('');
      qc.invalidateQueries({ queryKey: ['feed'] });
    } catch (e) {
      if (e instanceof ApiError && ['contact_info_blocked', 'post_limit_reached'].includes(e.code)) Alert.alert('Not posted', e.friendly);
      else showError(e, 'Could not post');
    } finally { setBusy(false); }
  }

  function remove(id: string) {
    Alert.alert('Delete this post?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.del(`/posts/${id}`); qc.invalidateQueries({ queryKey: ['feed'] }); } catch (e) { showError(e); } } },
    ]);
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Screen edges={[]} padded={false}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        onRefresh={() => q.refetch()}
        refreshing={q.isRefetching}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
        ListHeaderComponent={
          <Card style={{ gap: space.sm }}>
            <TextInput value={text} onChangeText={setText} placeholder="Share something with your followers" placeholderTextColor="#A5ABA7" multiline maxLength={500}
              style={{ minHeight: 70, backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, fontSize: 16, color: colors.text, textAlignVertical: 'top' }} />
            <Button title="Post" onPress={publish} loading={busy} disabled={!text.trim()} />
          </Card>
        }
        ListEmptyComponent={<Empty icon="newspaper-outline" title="Nothing here yet" text="Follow people from their profile to see their posts here. Only your followers see what you post." />}
        renderItem={({ item }) => (
          <Card style={{ gap: 8 }}>
            <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: item.author.id } })}>
              <Row style={{ gap: 10 }}>
                <Avatar url={item.author.photo?.url} name={item.author.display_name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={font.h3}>{item.mine ? 'You' : item.author.display_name}</Text>
                  <Text style={font.small}>{timeAgo(item.created_at)} ago</Text>
                </View>
                {item.mine ? <Pressable onPress={() => remove(item.id)} hitSlop={10}><Text style={{ color: colors.textMuted }}>Delete</Text></Pressable> : null}
              </Row>
            </Pressable>
            <Text style={[font.body, { lineHeight: 24 }]}>{item.body}</Text>
          </Card>
        )}
      />
    </Screen>
  );
}
