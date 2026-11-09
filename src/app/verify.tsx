import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Banner, Body, Button, Card, ErrorView, H2, Loading, Screen, VerifiedBadge, showError } from '../components/ui';
import { api } from '../lib/api';
import type { VerificationStatus } from '../lib/types';

export default function Verify() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['verification'], queryFn: () => api.get<VerificationStatus>('/verification/status') });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function begin() {
    setBusy(true);
    try {
      const s = q.data?.session ?? (await api.post<{ session_id: string; instruction: string }>('/verification/selfie/session'));
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { showError(new Error('Camera access is needed for the selfie.'), 'Camera off'); return; }
      const r = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, quality: 0.85, allowsEditing: false });
      if (r.canceled) return;
      const a = r.assets[0];
      const f = new FormData();
      f.append('selfie', { uri: a.uri, name: 'selfie.jpg', type: a.mimeType ?? 'image/jpeg' } as any);
      await api.upload(`/verification/selfie/${s.session_id}`, f);
      setSent(true);
      qc.invalidateQueries({ queryKey: ['verification'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) { showError(e, 'Could not submit your selfie'); } finally { setBusy(false); }
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const v = q.data!;
  return (
    <Screen scroll>
      {v.selfie_verified ? <Card style={{ alignItems: 'flex-start', gap: 8 }}><VerifiedBadge label={v.badge_label} /><Body>You're verified. People can see your badge.</Body></Card> : null}
      {!v.enabled ? <Banner>Verification isn't available right now.</Banner> : !v.selfie_verified ? (
        <>
          <H2>Prove it's you</H2>
          <Body>You'll get a short instruction, like a pose. Take a selfie that matches it and we'll compare it with your profile photos.</Body>
          {v.last_attempt?.status === 'rejected' || v.last_attempt?.status === 'failed' ? <Banner tone="warn">{v.last_attempt.failure_reason ?? 'Your last attempt didn\'t pass. Try again in good light.'}</Banner> : null}
          {v.last_attempt?.status === 'pending' || sent ? <Banner>Your selfie is being reviewed. You'll get a notification.</Banner> : null}
          {v.session ? <Banner><Body>{v.session.instruction}</Body></Banner> : null}
          <Body muted>{v.attempts_left_today} attempts left today.</Body>
          <Button title="Take selfie" icon="camera" onPress={begin} loading={busy} disabled={v.attempts_left_today < 1 || v.last_attempt?.status === 'pending'} />
        </>
      ) : null}
    </Screen>
  );
}
