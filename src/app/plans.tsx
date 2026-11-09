import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Text, View } from 'react-native';
import { useState } from 'react';
import { Banner, Body, Button, Card, Empty, ErrorView, H2, Loading, Screen, showError } from '../components/ui';
import { api } from '../lib/api';
import type { Entitlements, Order, PayMethod, Plan, Summary } from '../lib/types';
import { colors, font, space } from '../theme/theme';

const key = () => 'omi-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

function perks(e: Entitlements): string[] {
  return [
    e.likes_per_day === 0 ? 'Unlimited likes' : `${e.likes_per_day} likes a day`,
    e.super_likes_per_day > 0 ? `${e.super_likes_per_day} super likes a day` : null,
    e.message_discount_percent > 0 ? `${e.message_discount_percent}% off every message` : null,
    e.advanced_filters ? 'Advanced filters' : null,
  ].filter(Boolean) as string[];
}

export default function Plans() {
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get<{ plans: Plan[]; methods: PayMethod[] }>('/plans') });
  const mine = useQuery({ queryKey: ['entitlements'], queryFn: () => api.get<Summary>('/entitlements') });
  const [busy, setBusy] = useState<string | null>(null);

  async function buy(p: Plan, method: string) {
    setBusy(p.code);
    try {
      const o = await api.post<Order>('/subscriptions', { plan: p.code, method }, { headers: { 'Idempotency-Key': key() } });
      if (method === 'paystack' && o.checkout_url) await WebBrowser.openBrowserAsync(o.checkout_url);
      router.push({ pathname: '/order/[id]', params: { id: o.id } });
    } catch (e) { showError(e, 'Could not start payment'); } finally { setBusy(null); }
  }
  function choose(p: Plan) {
    const m = plans.data?.methods ?? [];
    if (m.length === 1) return buy(p, m[0].method);
    Alert.alert(p.name, 'How would you like to pay?', [
      ...m.map((x) => ({ text: x.method === 'paystack' ? 'Card / bank / USSD' : 'Bank transfer', onPress: () => buy(p, x.method) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  if (plans.isLoading || mine.isLoading) return <Loading />;
  if (plans.error) return <ErrorView error={plans.error} onRetry={() => plans.refetch()} />;
  const cur = mine.data?.plan;
  return (
    <Screen scroll>
      {cur ? <Banner><Text style={font.body}>You're on <Text style={{ fontWeight: '800' }}>{cur.name}</Text> until {new Date(cur.ends_at).toDateString()}. Buying again adds time after it ends.</Text></Banner> : <Banner>You're on the free plan.</Banner>}
      {plans.data!.plans.length === 0 ? <Empty icon="ribbon-outline" title="No plans yet" text="Premium plans will appear here." /> : null}
      {plans.data!.plans.map((p) => (
        <Card key={p.code} style={{ gap: space.sm }}>
          <H2>{p.name}</H2>
          {p.description ? <Body muted>{p.description}</Body> : null}
          <View style={{ gap: 4 }}>{perks(p.resolved).map((t) => <Text key={t} style={font.body}>✓  {t}</Text>)}</View>
          <Text style={[font.small, { color: colors.textMuted }]}>{p.period_days} days</Text>
          <Button title={p.price_display} onPress={() => choose(p)} loading={busy === p.code} />
        </Card>
      ))}
    </Screen>
  );
}
