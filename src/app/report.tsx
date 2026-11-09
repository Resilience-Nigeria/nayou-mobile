import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Body, Button, Chip, Field, H1, Row, Screen, showError } from '../components/ui';
import { api } from '../lib/api';
import { space } from '../theme/theme';

const pretty = (r: string) => r.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function Report() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const reasons = useQuery({ queryKey: ['report-reasons'], queryFn: () => api.get<string[]>('/reports/reasons') });
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.post('/reports', { reported_user_id: id, reason, details: details.trim() || undefined });
      Alert.alert('Thank you', 'Our team will review your report. The person is not told who reported them.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) { showError(e, 'Could not send report'); } finally { setBusy(false); }
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Report' }} />
      <H1>Report {name || 'this person'}</H1>
      <Body muted>What is the problem?</Body>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
        {(reasons.data ?? []).map((r) => <Chip key={r} label={pretty(r)} selected={reason === r} onPress={() => setReason(r)} />)}
      </Row>
      <Field label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
      <Button title="Send report" onPress={submit} loading={busy} disabled={!reason} />
    </Screen>
  );
}
