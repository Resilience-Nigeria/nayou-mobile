import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { PersonCard } from '../../components/PersonCard';
import { Empty, ErrorView, Loading, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import type { HomePerson } from '../../lib/types';
import { space } from '../../theme/theme';

const GAP = space.md;

/** Everyone, wherever they are. */
export default function Home() {
  const { width } = useWindowDimensions();
  const cardW = Math.min((width - space.lg * 2 - GAP) / 2, 260);
  const q = useInfiniteQuery({
    queryKey: ['explore'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.page<HomePerson[]>('/explore', { page: pageParam }),
    getNextPageParam: (last) => (last.meta?.has_more ? Number(last.meta.page) + 1 : undefined),
    refetchInterval: 60_000,
  });
  const people = useMemo(() => {
    const out: HomePerson[] = [];
    for (const p of q.data?.pages ?? []) for (const c of p.data) if (!out.some((o) => o.id === c.id)) out.push(c);
    return out;
  }, [q.data]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;

  return (
    <Screen edges={[]} padded={false}>
      <FlatList
        data={people}
        numColumns={2}
        keyExtractor={(c) => c.id}
        columnWrapperStyle={{ gap: GAP, justifyContent: 'center' }}
        contentContainerStyle={{ padding: space.lg, paddingTop: space.sm, gap: GAP, flexGrow: 1 }}
        onRefresh={() => q.refetch()}
        refreshing={q.isRefetching}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => <PersonCard c={item} width={cardW} sub={item.state} />}
        ListEmptyComponent={<Empty icon="people-outline" title="No one here yet" text="Check back soon." />}
      />
    </Screen>
  );
}
