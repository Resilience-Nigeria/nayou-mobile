import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Card, Chip, Empty, ErrorView, Loading, Row, Screen, timeAgo } from '../components/ui';
import { CoinAmount } from '../components/Coin';
import { api } from '../lib/api';
import type { WalletSummary, WalletTx } from '../lib/types';
import { colors, font, space } from '../theme/theme';

type Kind = { label: string; icon: keyof typeof Ionicons.glyphMap };
const KINDS: Record<string, Kind> = {
  message_debit: { label: 'Message', icon: 'chatbubble-outline' },
  call_debit: { label: 'Call', icon: 'call-outline' },
  call_refund: { label: 'Call refund', icon: 'refresh-outline' },
  gift_sent: { label: 'Gift sent', icon: 'gift-outline' },
  gift_received: { label: 'Gift received', icon: 'gift' },
  purchase: { label: 'Coins bought', icon: 'cart-outline' },
  signup_bonus: { label: 'Welcome bonus', icon: 'sparkles-outline' },
  admin_credit: { label: 'Added by Nayou', icon: 'add-circle-outline' },
};
const FILTERS: [string, string][] = [['all', 'All'], ['spent', 'Spent'], ['received', 'Received']];

export default function CoinHistory() {
  const [filter, setFilter] = useState('all');
  const q = useInfiniteQuery({
    queryKey: ['wallet', 'history', filter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.page<WalletTx[]>('/wallet/transactions', { filter, page: pageParam }),
    getNextPageParam: (last) => (last.meta?.has_more ? Number(last.meta.page) + 1 : undefined),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;

  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const summary = q.data?.pages[0]?.meta?.summary as WalletSummary | undefined;
  const topSpend = Object.entries(summary?.spent_by_type ?? {}).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0);

  return (
    <Screen edges={[]} padded={false}>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        onRefresh={() => q.refetch()}
        refreshing={q.isRefetching}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            {summary ? (
              <Card style={{ gap: space.sm }}>
                <Row style={{ justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}><Text style={font.small}>Spent</Text><CoinAmount value={summary.spent} size={20} style={{ color: colors.danger }} /></View>
                  <View style={{ alignItems: 'center' }}><Text style={font.small}>Received</Text><CoinAmount value={summary.received} size={20} style={{ color: colors.primary }} /></View>
                </Row>
                {topSpend.length ? (
                  <Text style={font.small}>
                    Spent on: {topSpend.map(([k, v]) => `${(KINDS[k]?.label ?? k).toLowerCase()} ${v.toLocaleString()}`).join(' · ')}
                  </Text>
                ) : null}
              </Card>
            ) : null}
            <Row style={{ gap: space.sm }}>{FILTERS.map(([k, l]) => <Chip key={k} label={l} selected={filter === k} onPress={() => setFilter(k)} />)}</Row>
          </View>
        }
        ListEmptyComponent={<Empty icon="wallet-outline" title="No activity yet" text="Messages, calls, gifts and purchases will show here." />}
        renderItem={({ item: t }) => {
          const k = KINDS[t.type] ?? { label: t.type.replace(/_/g, ' '), icon: 'ellipse-outline' as const };
          const who = t.with?.display_name;
          const sub = [who ? (t.coins < 0 ? `to ${who}` : `from ${who}`) : null, t.detail, `${timeAgo(t.created_at)} ago`].filter(Boolean).join(' · ');
          return (
            <Pressable disabled={!t.with} onPress={() => t.with && router.push({ pathname: '/person/[id]', params: { id: t.with.id } })}>
              <Card>
                <Row style={{ gap: space.md }}>
                  <Ionicons name={k.icon} size={22} color={t.coins < 0 ? colors.danger : colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={font.h3}>{k.label}</Text>
                    <Text style={font.small} numberOfLines={2}>{sub}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <CoinAmount value={t.coins} sign size={16} style={{ color: t.coins < 0 ? colors.danger : colors.primary }} />
                    <Text style={font.small}>bal {t.balance.toLocaleString('en-US')}</Text>
                  </View>
                </Row>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
