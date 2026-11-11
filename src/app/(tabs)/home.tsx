import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { PersonCard } from '../../components/PersonCard';
import { Empty, ErrorView, Loading, Row, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import type { HomePerson } from '../../lib/types';
import { colors, font, radius, space } from '../../theme/theme';

const GAP = space.md;

/** Everyone, wherever they are. */
export default function Home() {
  const { width } = useWindowDimensions();
  const cardW = Math.min((width - space.lg * 2 - GAP) / 2, 260);
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: () => api.get<{ balance: number }>('/wallet') });
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
      <Row style={{ justifyContent: 'space-between', padding: space.lg, paddingBottom: space.sm }}>
        <Text style={font.h2}>Everyone</Text>
        <Pressable onPress={() => router.push('/(tabs)/coins')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.pill ?? 999, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="wallet-outline" size={16} color={colors.primary} />
          <Text style={{ fontWeight: '800', color: colors.text }}>{wallet.data ? Number(wallet.data.balance).toLocaleString() : '–'}</Text>
        </Pressable>
      </Row>
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
