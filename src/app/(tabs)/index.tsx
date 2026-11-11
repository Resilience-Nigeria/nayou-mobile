import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { PersonCard } from '../../components/PersonCard';
import { Button, Chip, Empty, ErrorView, Loading, Row, Screen } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { type Card, type DiscoveryMeta } from '../../lib/types';
import { colors, space } from '../../theme/theme';

const SORTS: [string, string][] = [['distance', 'Nearest'], ['best', 'Best match']];
const GAP = space.md;

export default function Discover() {
  const { width } = useWindowDimensions();
  const [sort, setSort] = useState('distance');
  const [radius_, setRadius] = useState<number | undefined>();
  const cardW = Math.min((width - space.lg * 2 - GAP) / 2, 260);

  const q = useInfiniteQuery({
    queryKey: ['discover', sort, radius_],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<Card[]>('/nearby', { sort, radius: radius_, cursor: pageParam }),
    getNextPageParam: (last) => ((last.meta as DiscoveryMeta).has_more ? (last.meta as DiscoveryMeta).next_cursor ?? undefined : undefined),
    retry: false,
    refetchInterval: 30_000, // keeps online dots fresh
  });

  const cards = useMemo(() => {
    const out: Card[] = [];
    for (const p of q.data?.pages ?? []) for (const c of p.data) if (!out.some((o) => o.id === c.id)) out.push(c);
    return out;
  }, [q.data]);
  const meta = q.data?.pages[q.data.pages.length - 1]?.meta as DiscoveryMeta | undefined;

  if (q.isLoading) return <Loading />;
  if (q.error instanceof ApiError && q.error.code === 'location_required') {
    return (
      <Screen>
        <Empty icon="location-outline" title="Where are you?" text="We use your location only to show people near you. Others only ever see a distance." action={<Button title="Set my location" onPress={() => router.push('/location')} />} />
      </Screen>
    );
  }
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;

  return (
    <Screen edges={[]} padded={false}>
      <Row style={{ gap: space.sm, padding: space.lg, paddingBottom: space.sm }}>
        {SORTS.map(([k, l]) => <Chip key={k} label={l} selected={sort === k} onPress={() => setSort(k)} />)}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push('/location')} hitSlop={10}><Ionicons name="location-outline" size={22} color={colors.primary} /></Pressable>
      </Row>
      <FlatList
        key={`cols-2-${sort}`}
        data={cards}
        numColumns={2}
        keyExtractor={(c) => c.id}
        columnWrapperStyle={{ gap: GAP, justifyContent: 'center' }}
        contentContainerStyle={{ padding: space.lg, paddingTop: space.sm, gap: GAP, flexGrow: 1 }}
        onRefresh={() => q.refetch()}
        refreshing={q.isRefetching}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => <PersonCard c={item} width={cardW} sub={item.distance.label} />}
        ListEmptyComponent={
          <Empty
            icon="people-outline"
            title="No one new nearby"
            text={meta?.expand_suggestion?.message ?? 'No one new nearby right now. Check back soon.'}
            action={meta?.expand_suggestion?.radius ? <Button title="Widen my search" onPress={() => setRadius(Number(meta.expand_suggestion!.radius))} /> : <Button title="Refresh" variant="secondary" onPress={() => q.refetch()} />}
          />
        }
      />
    </Screen>
  );
}
