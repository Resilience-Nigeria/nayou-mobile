import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { Avatar, Empty, ErrorView, ListRow, Loading, Screen, VerifiedBadge, timeAgo } from '../../components/ui';
import { api } from '../../lib/api';
import type { MatchItem } from '../../lib/types';
import { space } from '../../theme/theme';

export default function Matches() {
  const q = useQuery({ queryKey: ['matches'], queryFn: () => api.get<MatchItem[]>('/matches'), refetchInterval: 30_000 });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  return (
    <Screen edges={[]} padded={false}>
      <FlatList
        data={q.data}
        keyExtractor={(m) => m.id}
        onRefresh={() => q.refetch()}
        refreshing={q.isRefetching}
        contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
        ListEmptyComponent={<Empty icon="heart-outline" title="No matches yet" text="When you and someone else like each other, you'll be able to chat here." />}
        renderItem={({ item }) => (
          <ListRow
            title={item.user.display_name ?? 'Member'}
            subtitle={`Matched ${timeAgo(item.matched_at)} ago`}
            left={<Avatar url={item.user.photo?.url} name={item.user.display_name} />}
            right={item.user.verified ? <VerifiedBadge label="Verified" /> : undefined}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.conversation_id } })}
          />
        )}
      />
    </Screen>
  );
}
