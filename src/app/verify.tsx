import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Banner, Body, Button, Card, ErrorView, H2, Loading, Screen, VerifiedBadge, showError } from '../components/ui';
import { appendFile } from '../lib/upload';
import { api } from '../lib/api';
import type { VerificationStatus } from '../lib/types';

export default function Verify() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['verification'], queryFn: () => api.get<VerificationStatus>('/verification/status') });
  const [busy, setBusy] = useState(false);
  const [first, setFirst] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);

  async function shoot(cameraType = ImagePicker.CameraType.front) {
    const r = await ImagePicker.launchCameraAsync({ cameraType, quality: 0.85, allowsEditing: false, mediaTypes: ['images'] });   // camera only: no gallery
    return r.canceled ? null : r.assets[0];
  }

  // Step 1 takes the first photo (relaxed face); step 2 takes the pose photo and sends both.
  async function firstPhoto() {
    setBusy(true);
    try {
      if (!q.data?.session) await api.post('/verification/selfie/session');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { showError(new Error('Camera access is needed for the selfie.'), 'Camera off'); return; }
      const a = await shoot();
      if (a) setFirst(a);
      await q.refetch();
    } catch (e) { showError(e, 'Could not start verification'); } finally { setBusy(false); }
  }

  async function secondPhoto() {
    const s = q.data?.session;
    if (!s || !first) return;
    setBusy(true);
    try {
      const second = await shoot();
      if (!second) return;
      const f = new FormData();
      await appendFile(f, 'neutral', first, 'neutral.jpg');
      await appendFile(f, 'selfie', second, 'selfie.jpg');
      const res = await api.upload<{ status: string; message: string }>(`/verification/selfie/${s.session_id}`, f);
      setResult(res);
      setFirst(null);
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
          <Body>You'll take two quick photos with your camera: one looking at the camera, then one doing a short instruction (like a smile). We check it's really you and match it to your profile photos. Photos from your gallery can't be used.</Body>
          {v.last_attempt?.status === 'rejected' || v.last_attempt?.status === 'failed' ? <Banner tone="warn">{v.last_attempt.failure_reason ?? 'Your last attempt didn\'t pass. Try again in good light.'}</Banner> : null}
          {result?.status === 'rejected' ? <Banner tone="warn">{result.message}</Banner> : null}
          {result?.status === 'approved' ? <Banner>{result.message}</Banner> : null}
          {v.last_attempt?.status === 'submitted' || result?.status === 'submitted' ? <Banner>Your selfie is being reviewed. You'll get a notification.</Banner> : null}
          {first && v.session ? <Banner><Body>Photo 1 done. Now: {v.session.instruction}.</Body></Banner> : null}
          <Body muted>{v.attempts_left_today} attempts left today.</Body>
          {first
            ? <Button title="Take photo 2" icon="camera" onPress={secondPhoto} loading={busy} />
            : <Button title="Take photo 1" icon="camera" onPress={firstPhoto} loading={busy} disabled={v.attempts_left_today < 1 && !v.session || v.last_attempt?.status === 'submitted' || result?.status === 'submitted'} />}
        </>
      ) : null}
    </Screen>
  );
}
