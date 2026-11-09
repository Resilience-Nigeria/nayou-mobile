import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Banner, Body, Button, Card, Empty, ErrorView, Field, H2, Loading, Screen, showError, timeAgo } from '../components/ui';
import { api } from '../lib/api';
import type { Appealable } from '../lib/types';
import { font, space } from '../theme/theme';

const label = (a: string) => a.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function Appeals() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['appeals'], queryFn: () => api.get<Appealable[]>('/appeals') });
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(id: string) {
    setBusy(true);
    try {
      await api.post('/appeals', { moderation_action_id: id, message: msg });
      setOpen(null); setMsg('');
      Alert.alert('Appeal sent', 'A different reviewer will look at it.');
      qc.invalidateQueries({ queryKey: ['appeals'] });
    } catch (e) { showError(e, 'Could not send appeal'); } finally { setBusy(false); }
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data!.length) return <Screen><Empty icon="shield-checkmark-outline" title="Nothing to appeal" text="If we ever act on your account or photos, you can ask for a second look here." /></Screen>;
  return (
    <Screen scroll>
      {q.data!.map((a) => (
        <Card key={a.action_id} style={{ gap: space.sm }}>
          <H2>{label(a.action)}</H2>
          <Text style={font.small}>{timeAgo(a.created_at)} ago</Text>
          <Body>{a.reason}</Body>
          {a.appeal_status ? <Banner>{`Appeal status: ${a.appeal_status}`}</Banner> : open === a.action_id ? (
            <>
              <Field label="Why was this a mistake?" value={msg} onChangeText={setMsg} multiline maxLength={2000} />
              <Button title="Send appeal" onPress={() => send(a.action_id)} loading={busy} disabled={!msg.trim()} />
            </>
          ) : <Button title="Appeal this decision" variant="secondary" onPress={() => setOpen(a.action_id)} />}
        </Card>
      ))}
    </Screen>
  );
}
