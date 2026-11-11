import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, useWindowDimensions, Pressable, Text, TextInput, View } from 'react-native';
import { Avatar, Button, Card, Empty, ErrorView, Loading, Row, Screen, showError, timeAgo } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { MediaView } from '../../components/MediaView';
import { mediaAllowed, pickAndUpload } from '../../lib/media';
import { Chip } from '../../components/ui';
import type { MediaCard, Post, PublicConfig } from '../../lib/types';
import { colors, font, radius, space } from '../../theme/theme';

export default function Posts() {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<'everyone' | 'following'>('everyone');
  const [media, setMedia] = useState<MediaCard | null>(null);
  const { width } = useWindowDimensions();
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<PublicConfig>('/config') });
  const allow = mediaAllowed(cfg.data, 'post');
  const q = useInfiniteQuery({
    queryKey: ['feed', scope],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<Post[]>('/feed', { before: pageParam, limit: 20, scope }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
    refetchInterval: 20_000,
  });

  async function publish() {
    const body = text.trim();
    if ((!body && !media) || busy) return;
    setBusy(true);
    try {
      await api.post('/posts', { body, media_id: media?.id });
      setText(''); setMedia(null);
      qc.invalidateQueries({ queryKey: ['feed'] });
    } catch (e) {
      if (e instanceof ApiError && ['contact_info_blocked', 'post_limit_reached', 'posts_disabled', 'media_disabled'].includes(e.code)) Alert.alert('Not posted', e.friendly);
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
          <View style={{ gap: space.md }}>
          <Row style={{ gap: space.sm }}>{(['everyone', 'following'] as const).map((k) => <Chip key={k} label={k === 'everyone' ? 'Everyone' : 'Following'} selected={scope === k} onPress={() => setScope(k)} />)}</Row>
          <Card style={{ gap: space.sm }}>
            <TextInput value={text} onChangeText={setText} placeholder="Share anything…" placeholderTextColor="#A5ABA7" multiline maxLength={500}
              style={{ minHeight: 70, backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, fontSize: 16, color: colors.text, textAlignVertical: 'top' }} />
            {media ? <View><MediaView media={media} width={Math.min(width - space.lg * 4, 320)} /><Pressable onPress={() => setMedia(null)} hitSlop={8}><Text style={{ color: colors.textMuted, marginTop: 4 }}>Remove attachment</Text></Pressable></View> : null}
            <Row style={{ gap: space.sm }}>
              {allow.images || allow.videos ? (
                <Pressable hitSlop={8} onPress={async () => { try { const m = await pickAndUpload('post', allow); if (m) setMedia(m); } catch (e) { showError(e, 'Could not upload'); } }}>
                  <Ionicons name="image-outline" size={26} color={colors.primary} />
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}><Button title="Post" onPress={publish} loading={busy} disabled={!text.trim() && !media} /></View>
            </Row>
          </Card>
          </View>
        }
        ListEmptyComponent={<Empty icon="newspaper-outline" title="Nothing here yet" text={scope === 'following' ? 'Follow people from their profile to see their posts here.' : 'Be the first to post.'} />}
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
            {item.body ? <Text style={[font.body, { lineHeight: 24 }]}>{item.body}</Text> : null}
            {item.media ? <MediaView media={item.media} width={Math.min(width - space.lg * 4, 400)} /> : null}
          </Card>
        )}
      />
    </Screen>
  );
}
