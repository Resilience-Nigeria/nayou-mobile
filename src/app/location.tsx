import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Chip, H1, Row, Screen, showError } from '../components/ui';
import { api } from '../lib/api';
import type { StateItem } from '../lib/types';
import { space } from '../theme/theme';

export default function LocationScreen() {
  const qc = useQueryClient();
  const states = useQuery({ queryKey: ['states'], queryFn: () => api.get<StateItem[]>('/states') });
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(false);

  async function done() {
    await qc.invalidateQueries({ queryKey: ['discover'] });
    router.back();
  }

  async function useGps() {
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setPick(true); return; }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await api.put('/location', { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy_m: p.coords.accuracy ?? undefined });
      await done();
    } catch (e) { showError(e, 'Could not set your location'); } finally { setBusy(false); }
  }

  async function useState_(code: string) {
    setBusy(true);
    try { await api.put('/location', { state_code: code }); await done(); } catch (e) { showError(e); } finally { setBusy(false); }
  }

  return (
    <Screen scroll>
      <H1>Your location</H1>
      <Body muted>Other people only see roughly how far away you are, never where you are.</Body>
      <Button title="Use my current location" icon="navigate" onPress={useGps} loading={busy} />
      <Button title="Choose my state instead" variant="secondary" onPress={() => setPick((v) => !v)} />
      {pick ? (
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
          {states.data?.map((s) => <Chip key={s.code} label={s.name} onPress={() => useState_(s.code)} />)}
        </Row>
      ) : null}
    </Screen>
  );
}
