import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Banner, Body, Button, Card, ErrorView, Field, H1, H2, Loading, Screen, money, showError } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Order } from '../../lib/types';
import { font, space } from '../../theme/theme';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { refreshMe } = useAuth();
  // Ask the server to re-check with the provider; it stops being needed once the order settles.
  const q = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<Order>(`/purchases/${id}`, { refresh: 1 }),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 5000 : false),
  });
  const o = q.data;

  useEffect(() => {
    if (o?.status === 'succeeded') {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['entitlements'] });
      refreshMe().catch(() => {});
    }
  }, [o?.status]);

  const [sender, setSender] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [proof, setProof] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function pickProof() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!r.canceled) setProof(r.assets[0]);
  }

  async function claim() {
    if (!o) return;
    setBusy(true);
    try {
      const f = new FormData();
      f.append('sender_name', sender.trim());
      if (bank.trim()) f.append('sender_bank', bank.trim());
      f.append('amount_minor', String(Math.round(Number(amount.replace(/,/g, '')) * 100)));
      if (proof) f.append('proof', { uri: proof.uri, name: proof.fileName ?? 'proof.jpg', type: proof.mimeType ?? 'image/jpeg' } as any);
      await api.upload(`/purchases/${o.id}/transfer-claim`, f);
      setSent(true);
      q.refetch();
    } catch (e) { showError(e, 'Could not send your transfer details'); } finally { setBusy(false); }
  }

  if (q.isLoading) return <Loading />;
  if (q.error || !o) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;

  const what = o.product === 'subscription' ? (o.plan_name ?? 'Premium plan') : `${o.coins} coins`;
  return (
    <Screen scroll>
      <H1>{what}</H1>
      <Text style={font.h2}>{money(o.amount_minor)}</Text>

      {o.status === 'succeeded' ? <Banner><Text style={font.body}>Payment confirmed. {o.product === 'subscription' ? 'Your plan is active.' : 'Your coins have been added.'}</Text></Banner> : null}
      {o.status === 'pending' && o.method === 'paystack' ? (
        <>
          <Banner tone="warn">Waiting for your payment to be confirmed. This usually takes a few seconds.</Banner>
          {o.checkout_url ? <Button title="Open payment page again" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(o.checkout_url!)} /> : null}
        </>
      ) : null}
      {o.status === 'mismatch' ? <Banner tone="warn">We received a different amount than expected. Our team will review it and be in touch. You do not need to pay again.</Banner> : null}
      {o.status === 'failed' || o.status === 'expired' || o.status === 'rejected' ? <Banner tone="danger">{o.failure_reason ?? 'This payment did not go through. You have not been charged for it.'}</Banner> : null}

      {o.status === 'pending' && o.method === 'manual_transfer' && o.bank_transfer ? (
        <>
          <Card style={{ gap: space.sm }}>
            <H2>Pay by bank transfer</H2>
            <Row2 k="Bank" v={o.bank_transfer.bank_name} />
            <Row2 k="Account name" v={o.bank_transfer.account_name} />
            <Row2 k="Account number" v={o.bank_transfer.account_number} />
            <Row2 k="Amount" v={money(o.amount_minor)} />
            <Row2 k="Narration" v={o.bank_transfer.narration} />
            {o.bank_transfer.instructions ? <Body muted>{o.bank_transfer.instructions}</Body> : null}
          </Card>
          {sent ? <Banner>Thanks. We will confirm your transfer shortly and you will get a notification.</Banner> : (
            <>
              <H2>I have paid</H2>
              <Field label="Name on the sending account" value={sender} onChangeText={setSender} />
              <Field label="Sending bank (optional)" value={bank} onChangeText={setBank} />
              <Field label="Amount you sent (₦)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              <Button title={proof ? 'Receipt attached ✓' : 'Attach receipt (optional)'} variant="secondary" icon="image-outline" onPress={pickProof} />
              <Button title="Send transfer details" onPress={claim} loading={busy} disabled={!sender.trim() || !amount} />
            </>
          )}
        </>
      ) : null}
      <Button title="Done" variant="ghost" onPress={() => router.replace('/coins')} />
    </Screen>
  );
}

function Row2({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Text style={font.small}>{k}</Text>
      <Text style={[font.h3, { flexShrink: 1, textAlign: 'right' }]} selectable>{v}</Text>
    </View>
  );
}
