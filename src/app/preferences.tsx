import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Chip, ErrorView, Field, Loading, Row, Screen, showError } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { GENDERS, type Profile, type PublicConfig } from '../lib/types';
import { font, space } from '../theme/theme';

export default function Preferences() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/profile') });
  const config = useQuery({ queryKey: ['config'], queryFn: () => api.get<PublicConfig>('/config') });
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [dist, setDist] = useState<number | null>(null);
  const [who, setWho] = useState<string[]>([]);
  const [err, setErr] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!q.data || ready) return;
    const p = q.data.preferences;
    setMin(p?.min_age?.toString() ?? ''); setMax(p?.max_age?.toString() ?? '');
    setDist(p?.max_distance_km ?? null); setWho(p?.interested_in ?? []); setReady(true);
  }, [q.data]);
  if (q.isLoading || !ready) return q.error ? <ErrorView error={q.error} onRetry={() => q.refetch()} /> : <Loading />;

  const options = (config.data?.['discovery.radius_options_km'] as number[] | undefined) ?? [];
  const anywhere = !!config.data?.['discovery.allow_anywhere'];
  const toggle = (g: string) => setWho((w) => (w.includes(g) ? w.filter((x) => x !== g) : [...w, g]));

  async function save() {
    setBusy(true); setErr({});
    try {
      await api.put('/profile/preferences', { min_age: min ? Number(min) : null, max_age: max ? Number(max) : null, max_distance_km: dist, interested_in: who });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['discover'] });
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setErr(e.errors); else showError(e, 'Could not save');
    } finally { setBusy(false); }
  }

  return (
    <Screen scroll>
      <Text style={font.label}>Show me</Text>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{GENDERS.map(([k, l]) => <Chip key={k} label={l} selected={who.includes(k)} onPress={() => toggle(k)} />)}</Row>
      <Row>
        <Field label="Youngest" value={min} onChangeText={setMin} keyboardType="number-pad" maxLength={2} error={err.min_age?.[0]} />
        <Field label="Oldest" value={max} onChangeText={setMax} keyboardType="number-pad" maxLength={2} error={err.max_age?.[0]} />
      </Row>
      <Text style={font.label}>Distance</Text>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
        {options.map((km) => <Chip key={km} label={`${km} km`} selected={dist === km} onPress={() => setDist(km)} />)}
        {anywhere ? <Chip label="Anywhere" selected={dist === 0} onPress={() => setDist(0)} /> : null}
      </Row>
      {err.max_distance_km?.[0] ? <Text style={font.small}>{err.max_distance_km[0]}</Text> : null}
      <Button title="Save" onPress={save} loading={busy} />
    </Screen>
  );
}
