import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { Coin, CoinAmount } from '../components/Coin';
import { Banner, Body, Button, Card, ErrorView, H2, ListRow, Loading, Row, Screen, timeAgo } from '../components/ui';
import { api } from '../lib/api';
import type { ReferralSummary } from '../lib/types';
import { colors, font, space } from '../theme/theme';

export default function Invite() {
  const q = useQuery({ queryKey: ['referrals'], queryFn: () => api.get<ReferralSummary>('/referrals') });
  const [copied, setCopied] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data!;

  const message = `Join me on Nayou! When you sign up, enter my username @${r.username} in the "Invited by" box.`;
  async function copy() { await Clipboard.setStringAsync(r.username); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  return (
    <Screen scroll edges={[]} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      {!r.enabled ? <Banner tone="warn">Invite rewards are paused right now.</Banner> : null}
      <Card style={{ gap: space.sm, alignItems: 'center' }}>
        <Body muted>Your username</Body>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>@{r.username}</Text>
        <Row style={{ gap: 6 }}><Body>Earn</Body><CoinAmount value={r.reward_coins} size={18} /><Body>when a friend signs up with it.</Body></Row>
        {r.invitee_bonus_coins > 0 ? <Row style={{ gap: 6 }}><Body muted>They get</Body><CoinAmount value={r.invitee_bonus_coins} size={14} /><Body muted>extra too.</Body></Row> : null}
      </Card>
      <Button title="Share invite" icon="share-social" onPress={() => Share.share({ message })} />
      <Button title={copied ? 'Copied' : 'Copy my username'} icon="copy" variant="secondary" onPress={copy} />
      <Row style={{ justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center' }}><Text style={font.small}>Friends joined</Text><Text style={font.h2}>{r.total_invited}</Text></View>
        <View style={{ alignItems: 'center' }}><Text style={font.small}>Coins earned</Text><CoinAmount value={r.coins_earned} size={20} /></View>
      </Row>
      <H2>Recent invites</H2>
      {r.recent.length ? r.recent.map((x, i) => (
        <ListRow key={i} title={x.display_name ?? 'New member'} subtitle={`${timeAgo(x.created_at)} ago`} right={x.coins > 0 ? <CoinAmount value={x.coins} sign size={15} style={{ color: colors.primary }} /> : <Text style={font.small}>No reward</Text>} />
      )) : <Text style={font.small}>No one yet. Share your username to get started.</Text>}
    </Screen>
  );
}
