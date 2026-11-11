import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Banner, Button, Card, ErrorView, H2, ListRow, Loading, Row, Screen, money, showError, timeAgo } from '../components/ui';
import { api } from '../lib/api';
import type { Order, Package, PayMethod, Wallet, WalletTx } from '../lib/types';
import { colors, font, space } from '../theme/theme';

const key = () => 'omi-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const METHOD_LABEL: Record<string, string> = { paystack: 'Card / bank / USSD (Paystack)', manual_transfer: 'Bank transfer' };

const TX_LABELS: Record<string, string> = {
  gift_sent: 'Gift sent', gift_received: 'Gift received', message_debit: 'Message', call_debit: 'Call', signup_bonus: 'Welcome bonus', admin_credit: 'Credited by Nayou', call_refund: 'Call refund',
};

export default function Coins() {
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: () => api.get<Wallet>('/wallet') });
  const pk = useQuery({ queryKey: ['packages'], queryFn: () => api.get<{ packages: Package[]; methods: PayMethod[] }>('/packages') });
  const [busy, setBusy] = useState<string | null>(null);

  async function buy(p: Package, method: string) {
    setBusy(p.code);
    try {
      const order = await api.post<Order>('/purchases', { package: p.code, method }, { headers: { 'Idempotency-Key': key() } });
      if (method === 'paystack' && order.checkout_url) await WebBrowser.openBrowserAsync(order.checkout_url);
      router.push({ pathname: '/order/[id]', params: { id: order.id } });
    } catch (e) { showError(e, 'Could not start payment'); } finally { setBusy(null); }
  }

  function choose(p: Package) {
    const methods = pk.data?.methods ?? [];
    if (methods.length === 1) return buy(p, methods[0].method);
    Alert.alert(`Buy ${p.coins} coins`, 'How would you like to pay?', [
      ...methods.map((m) => ({ text: METHOD_LABEL[m.method] ?? m.method, onPress: () => buy(p, m.method) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  if (wallet.isLoading || pk.isLoading) return <Loading />;
  if (wallet.error || pk.error) return <ErrorView error={wallet.error ?? pk.error} onRetry={() => { wallet.refetch(); pk.refetch(); }} />;

  return (
    <Screen scroll edges={[]} onRefresh={() => { wallet.refetch(); pk.refetch(); }} refreshing={wallet.isRefetching}>
      <Card style={{ backgroundColor: colors.primary, alignItems: 'center', gap: 4 }}>
        <Text style={{ color: colors.white, opacity: 0.85 }}>Your balance</Text>
        <Text style={{ color: colors.white, fontSize: 44, fontWeight: '800' }}>{wallet.data!.coin_balance}</Text>
        <Text style={{ color: colors.white, opacity: 0.85 }}>coins · {wallet.data!.message_cost} per message sent</Text>
      </Card>
      <Banner>Receiving messages is always free. Only the person who sends pays.</Banner>
      <H2>Buy coins</H2>
      {pk.data!.packages.map((p) => (
        <Card key={p.code}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Text style={font.h2}>{p.label ?? `${p.coins} coins`}</Text>
              <Text style={font.small}>{p.coins} coins</Text>
            </View>
            <Button title={p.price_display ?? money(p.price_minor)} onPress={() => choose(p)} loading={busy === p.code} />
          </Row>
        </Card>
      ))}
      <Button title="See premium plans" variant="secondary" icon="ribbon" onPress={() => router.push('/plans')} />
      <Button title="See where my coins went" variant="secondary" icon="time" onPress={() => router.push('/coin-history')} />
    </Screen>
  );
}
