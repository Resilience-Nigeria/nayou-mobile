import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { api } from '../lib/api';
import type { Wallet } from '../lib/types';
import { colors, radius } from '../theme/theme';
import { CoinAmount } from './Coin';

/** The coins a person has left. Always in the header of the main screens; tap to buy coins or see where they went. */
export function CoinPill() {
  const q = useQuery({ queryKey: ['wallet'], queryFn: () => api.get<Wallet>('/wallet'), refetchInterval: 20_000 });
  const raw = q.data as { coin_balance?: unknown; balance?: unknown } | undefined;
  const num = Number(raw?.coin_balance ?? raw?.balance);
  const n = Number.isFinite(num) ? num : undefined;
  return (
    <Pressable onPress={() => router.push('/wallet')} accessibilityLabel={`${n ?? ''} coins left`} hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 14, backgroundColor: colors.card, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border }}>
      {n === undefined ? <Text style={{ fontWeight: '800', color: colors.text }}>–</Text> : <CoinAmount value={n} size={15} />}
    </Pressable>
  );
}
