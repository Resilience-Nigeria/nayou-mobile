import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { PostCard } from '../../components/PostCard';
import { GiftModal } from '../../components/GiftModal';
import { Button, Card, Chip, ErrorView, Loading, Row, VerifiedBadge, showError, timeAgo } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { openChatWith } from '../../lib/openChat';
import { cap, genderLabel, goalLabel, heightLabel, type PersonProfile, type Post, type PublicConfig } from '../../lib/types';
import { colors, font, radius, shadow, space } from '../../theme/theme';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={font.small}>{label}</Text>
    </View>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <Row style={{ gap: 8 }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={font.body}>{text}</Text>
    </Row>
  );
}

export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const q = useQuery({ queryKey: ['person', id], queryFn: () => api.get<PersonProfile>(`/users/${id}/profile`), retry: false, refetchInterval: 20_000 });
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<PublicConfig>('/config') });
  const posts = useInfiniteQuery({
    queryKey: ['posts', id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<Post[]>(`/users/${id}/posts`, { before: pageParam, limit: 10 }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
    enabled: !!q.data,
  });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const p = q.data;
  const photos = p.photos.filter((x) => x.url);
  const h = Math.min(width * 1.25, 520);
  const locked = !!posts.data?.pages[0]?.meta.locked;
  const postItems = posts.data?.pages.flatMap((x) => x.data) ?? [];

  async function toggleFollow() {
    setBusy(true);
    try {
      if (p.you.following) await api.del(`/users/${p.id}/follow`); else await api.post(`/users/${p.id}/follow`);
      await Promise.all([q.refetch(), posts.refetch()]);
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['conversation'] });
    } catch (e) { showError(e); } finally { setBusy(false); }
  }

  async function swipe(action: 'like' | 'pass' | 'super_like') {
    setBusy(true);
    try {
      const r = await api.post<{ matched: boolean; match: { conversation_id: string } | null }>('/swipes', { target_user_id: p.id, action });
      qc.invalidateQueries({ queryKey: ['discover'] });
      qc.invalidateQueries({ queryKey: ['likes'] });
      if (r.matched) {
        qc.invalidateQueries({ queryKey: ['matches'] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
        Alert.alert("It's a match!", `You and ${p.display_name} liked each other.`, [
          { text: 'Later', onPress: () => q.refetch() },
          { text: 'Say hello', onPress: () => router.replace({ pathname: '/chat/[id]', params: { id: r.match!.conversation_id } }) },
        ]);
      } else if (action === 'pass') {
        router.back();
      } else {
        await q.refetch();
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'daily_limit_reached') {
        Alert.alert('Daily limit reached', e.friendly, [{ text: 'Not now', style: 'cancel' }, { text: 'See plans', onPress: () => router.push('/plans') }]);
      } else showError(e, 'Could not record that');
    } finally { setBusy(false); }
  }

  function superLike() {
    Alert.alert(`Super like ${p.display_name}?`, 'A Super like tells them you are really interested. It counts as a like, and you get a limited number each day.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Super like', onPress: () => swipe('super_like') },
    ]);
  }

  const presence = p.online ? 'Online now' : p.last_active_at ? `Active ${timeAgo(p.last_active_at)} ago` : null;
  const where = [p.state, p.distance_label].filter(Boolean).join(' · ');
  const here = p.current_location ? [p.current_location.city, p.current_location.region].filter(Boolean).join(', ') : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: space.xl }}>
      <Stack.Screen options={{ title: p.display_name ?? 'Profile' }} />
      {photos.length ? (
        <View>
          <FlatList
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            data={photos} keyExtractor={(x) => x.id}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <Image source={{ uri: item.url! }} style={{ width, height: h }} contentFit="cover" />}
          />
          {photos.length > 1 ? (
            <Row style={{ position: 'absolute', bottom: 12, alignSelf: 'center', gap: 6 }}>
              {photos.map((x, i) => <View key={x.id} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.white : 'rgba(255,255,255,0.5)' }} />)}
            </Row>
          ) : null}
          {photos.length > 1 ? <Text style={{ position: 'absolute', top: 12, right: 12, color: colors.white, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' }}>{page + 1}/{photos.length}</Text> : null}
        </View>
      ) : (
        <View style={{ height: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border }}><Ionicons name="person" size={90} color={colors.textMuted} /></View>
      )}

      <View style={{ padding: space.lg, gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Row style={{ gap: 8 }}>
              <Text style={font.title}>{p.display_name}{p.age ? `, ${p.age}` : ''}</Text>
              {p.online ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E' }} /> : null}
            </Row>
            {presence ? <Text style={[font.small, p.online && { color: '#16A34A', fontWeight: '700' }]}>{presence}</Text> : null}
          </View>
          {p.verified ? <VerifiedBadge /> : null}
        </Row>

        <Card>
          <Row>
            <Stat value={p.stats.likes} label="Likes" />
            <Stat value={p.stats.followers} label="Followers" />
            <Stat value={p.stats.following} label="Following" />
            {!p.is_me ? <Stat value={p.stats.messages_with_you} label="Messages with you" /> : null}
          </Row>
        </Card>

        {!p.is_me && !p.you.swipe ? (
          <Card>
            <Row style={{ justifyContent: 'space-around', alignItems: 'flex-start' }}>
              {[
                { icon: 'close', color: colors.textMuted, label: 'Pass', onPress: () => swipe('pass') },
                { icon: 'star', color: colors.gold, label: 'Super like', onPress: superLike },
                { icon: 'heart', color: colors.accent, label: 'Like', onPress: () => swipe('like') },
              ].map((b) => (
                <View key={b.label} style={{ alignItems: 'center', gap: 4 }}>
                  <Pressable accessibilityLabel={b.label} onPress={b.onPress} disabled={busy} style={[{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }, shadow.card]}>
                    <Ionicons name={b.icon as any} size={28} color={b.color} />
                  </Pressable>
                  <Text style={font.small}>{b.label}</Text>
                </View>
              ))}
            </Row>
          </Card>
        ) : null}
        {!p.is_me && p.you.swipe && p.you.swipe !== 'pass' ? <Text style={[font.small, { color: colors.accent }]}>{p.you.swipe === 'super_like' ? '★ You super liked this person' : '♥ You liked this person'}</Text> : null}

        {!p.is_me ? (
          <Row style={{ gap: space.sm }}>
            <Button title={p.you.following ? 'Following' : p.you.follows_you ? 'Follow back' : 'Follow'} variant={p.you.following ? 'secondary' : 'primary'} onPress={toggleFollow} loading={busy} style={{ flex: 1 }} />
            <Button title="Message" variant="secondary" onPress={() => openChatWith(p.id)} style={{ flex: 1 }} />
          </Row>
        ) : null}
        {!p.is_me ? <Button title="Gift coins" variant="secondary" icon="gift-outline" onPress={() => setGiftOpen(true)} /> : null}
        {!p.is_me ? <GiftModal visible={giftOpen} onClose={() => setGiftOpen(false)} recipientId={p.id} name={p.display_name} /> : null}
        {!p.is_me && p.you.mutual ? <Text style={[font.small, { color: colors.primary }]}>You follow each other, so messages are free.</Text> : null}

        <View style={{ gap: 10 }}>
          {genderLabel(p.gender) ? <Fact icon="person-outline" text={`${genderLabel(p.gender)}${p.age ? `, ${p.age} years old` : ''}`} /> : null}
          {goalLabel(p.relationship_goal) ? <Fact icon="heart-outline" text={`Looking for: ${goalLabel(p.relationship_goal)}`} /> : null}
          {heightLabel(p.height_cm) ? <Fact icon="resize-outline" text={`Height: ${heightLabel(p.height_cm)}`} /> : null}
          {here ? <Fact icon="navigate-outline" text={`Currently in ${here}`} /> : null}
          {where ? <Fact icon="location-outline" text={where} /> : null}
        </View>

        {p.personality_traits.length ? (
          <View style={{ gap: 8 }}>
            <Text style={font.label}>Personality</Text>
            <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{p.personality_traits.map((t) => <Chip key={t} label={cap(t)} selected />)}</Row>
          </View>
        ) : null}

        {p.bio ? <View style={{ gap: 6 }}><Text style={font.label}>About</Text><Text style={[font.body, { lineHeight: 24 }]}>{p.bio}</Text></View> : null}

        <View style={{ gap: 8 }}>
          <Text style={font.label}>Posts{postItems.length ? ` (${postItems.length}${posts.hasNextPage ? '+' : ''})` : ''}</Text>
          {locked ? (
            <Card><Text style={font.small}>Follow {p.display_name} to see their posts.</Text></Card>
          ) : postItems.length === 0 ? (
            <Text style={font.small}>No posts yet.</Text>
          ) : postItems.map((x) => <PostCard key={x.id} post={x} config={cfg.data} />)}
          {!locked && posts.hasNextPage ? <Button title="Show more" variant="ghost" onPress={() => posts.fetchNextPage()} /> : null}
        </View>

        {!p.is_me ? (
          <Pressable onPress={() => router.push({ pathname: '/report', params: { id: p.id, name: p.display_name ?? '' } })} style={{ alignSelf: 'center', padding: 8 }}>
            <Text style={{ color: colors.textMuted }}>Report this profile</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
