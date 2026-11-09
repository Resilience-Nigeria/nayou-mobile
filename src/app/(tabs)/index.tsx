import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Banner, Button, Chip, Empty, ErrorView, Loading, Row, Screen, VerifiedBadge, showError } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { goalLabel, type Card, type DiscoveryMeta } from '../../lib/types';
import { colors, font, radius, shadow, space } from '../../theme/theme';

type SwipeResult = { action: string; matched: boolean; match: { id: string; conversation_id: string } | null };
const SORTS: [string, string][] = [['distance', 'Nearest'], ['active', 'Active'], ['new', 'New']];

export default function Discover() {
  const qc = useQueryClient();
  const [sort, setSort] = useState('distance');
  const [radius_, setRadius] = useState<number | undefined>();
  const [index, setIndex] = useState(0);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const [matched, setMatched] = useState<{ card: Card; match: SwipeResult['match'] } | null>(null);
  const [busy, setBusy] = useState(false);
  const seen = useRef(new Set<string>());

  const q = useInfiniteQuery({
    queryKey: ['discover', sort, radius_],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<Card[]>('/nearby', { sort, radius: radius_, cursor: pageParam }),
    getNextPageParam: (last) => ((last.meta as DiscoveryMeta).has_more ? (last.meta as DiscoveryMeta).next_cursor ?? undefined : undefined),
    retry: false,
  });

  useEffect(() => { setIndex(0); seen.current.clear(); }, [sort, radius_]);

  const cards = useMemo(() => {
    const out: Card[] = [];
    for (const p of q.data?.pages ?? []) for (const c of p.data) if (!out.some((o) => o.id === c.id)) out.push(c);
    return out;
  }, [q.data]);
  const meta = q.data?.pages[q.data.pages.length - 1]?.meta as DiscoveryMeta | undefined;
  const current = cards[index];

  useEffect(() => {
    if (cards.length - index <= 3 && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
  }, [index, cards.length, q.hasNextPage, q.isFetchingNextPage]);

  if (q.isLoading) return <Loading />;
  if (q.error instanceof ApiError && q.error.code === 'location_required') {
    return (
      <Screen>
        <Empty icon="location-outline" title="Where are you?" text="We use your location only to show people near you. Others only ever see a distance." action={<Button title="Set my location" onPress={() => router.push('/location')} />} />
      </Screen>
    );
  }
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;

  async function swipe(action: 'like' | 'pass' | 'super_like') {
    if (!current || busy) return;
    setBusy(true);
    try {
      const r = await api.post<SwipeResult>('/swipes', { target_user_id: current.id, action });
      setLimitMsg(null);
      setIndex((i) => i + 1);
      if (r.matched) {
        setMatched({ card: current, match: r.match });
        qc.invalidateQueries({ queryKey: ['matches'] });
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'daily_limit_reached') setLimitMsg(e.friendly);
      else showError(e, 'Could not record that');
    } finally {
      setBusy(false);
    }
  }

  function report() {
    if (!current) return;
    router.push({ pathname: '/report', params: { id: current.id, name: current.display_name } });
  }

  return (
    <Screen edges={[]}>
      <Row style={{ gap: space.sm }}>
        {SORTS.map(([k, l]) => <Chip key={k} label={l} selected={sort === k} onPress={() => setSort(k)} />)}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push('/location')} hitSlop={10}><Ionicons name="location-outline" size={22} color={colors.primary} /></Pressable>
      </Row>

      {limitMsg ? (
        <Banner tone="warn">
          <Text style={font.body}>{limitMsg}</Text>
          <Pressable onPress={() => router.push('/plans')}><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>See plans →</Text></Pressable>
        </Banner>
      ) : null}

      {current ? (
        <View style={{ flex: 1, gap: space.lg }}>
          <View style={[{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.border }, shadow.card]}>
            {current.photo?.url ? <Image source={{ uri: current.photo.url }} style={{ flex: 1 }} contentFit="cover" transition={150} /> : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person" size={96} color={colors.textMuted} /></View>
            )}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, gap: 6, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.white, fontSize: 26, fontWeight: '800' }}>{current.display_name}, {current.age}</Text>
                {current.verified ? <VerifiedBadge /> : null}
              </Row>
              <Text style={{ color: colors.white, opacity: 0.9 }}>
                {[current.distance.label, current.state, goalLabel(current.relationship_goal)].filter(Boolean).join(' · ')}
              </Text>
              {current.bio ? <Text style={{ color: colors.white }} numberOfLines={3}>{current.bio}</Text> : null}
              {current.reasons.length ? <Text style={{ color: colors.white, opacity: 0.8, fontSize: 13 }}>{current.reasons.join(' · ')}</Text> : null}
            </View>
            <Pressable onPress={report} hitSlop={12} style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 18, padding: 8 }}>
              <Ionicons name="flag-outline" size={18} color={colors.white} />
            </Pressable>
          </View>
          <Row style={{ justifyContent: 'center', gap: space.xl }}>
            <RoundBtn icon="close" color={colors.textMuted} onPress={() => swipe('pass')} disabled={busy} label="Pass" />
            <RoundBtn icon="star" color={colors.gold} onPress={() => swipe('super_like')} disabled={busy} label="Super like" small />
            <RoundBtn icon="heart" color={colors.accent} onPress={() => swipe('like')} disabled={busy} label="Like" />
          </Row>
        </View>
      ) : (
        <Empty
          icon="people-outline"
          title="You're all caught up"
          text={meta?.expand_suggestion?.message ?? 'No one new nearby right now. Check back soon.'}
          action={meta?.expand_suggestion?.radius ? <Button title="Widen my search" onPress={() => setRadius(Number(meta.expand_suggestion!.radius))} /> : <Button title="Refresh" variant="secondary" onPress={() => { setIndex(0); q.refetch(); }} />}
        />
      )}

      <Modal visible={!!matched} transparent animationType="fade" onRequestClose={() => setMatched(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.md }}>
            <Ionicons name="heart" size={48} color={colors.accent} />
            <Text style={font.title}>It's a match!</Text>
            <Text style={[font.body, { textAlign: 'center' }]}>You and {matched?.card.display_name} liked each other.</Text>
            <Button title="Say hello" onPress={() => { const m = matched; setMatched(null); if (m?.match) router.push({ pathname: '/chat/[id]', params: { id: m.match.conversation_id } }); }} style={{ alignSelf: 'stretch' }} />
            <Button title="Keep browsing" variant="ghost" onPress={() => setMatched(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function RoundBtn({ icon, color, onPress, disabled, label, small }: { icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void; disabled?: boolean; label: string; small?: boolean }) {
  const s = small ? 56 : 72;
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} disabled={disabled} style={[{ width: s, height: s, borderRadius: s / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }, shadow.card]}>
      <Ionicons name={icon} size={small ? 26 : 34} color={color} />
    </Pressable>
  );
}
