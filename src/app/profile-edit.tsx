import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, Text } from 'react-native';
import { Body, Button, Chip, ErrorView, Field, Loading, Row, Screen, showError } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { GENDERS, GOALS, type Profile, type PublicConfig, type StateItem } from '../lib/types';
import { colors, font, space } from '../theme/theme';

export default function ProfileEdit() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/profile') });
  const states = useQuery({ queryKey: ['states'], queryFn: () => api.get<StateItem[]>('/states') });
  const config = useQuery({ queryKey: ['config'], queryFn: () => api.get<PublicConfig>('/config') });
  const [f, setF] = useState<any>(null);
  const [err, setErr] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [pickState, setPickState] = useState(false);

  useEffect(() => { if (q.data && !f) setF({ ...q.data.profile }); }, [q.data]);
  if (q.isLoading || !f) return q.error ? <ErrorView error={q.error} onRetry={() => q.refetch()} /> : <Loading />;
  const set = (k: string) => (v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const bioMax = Number(config.data?.['profile.bio_max_length'] ?? 500);

  async function save() {
    setBusy(true); setErr({});
    try {
      await api.put('/profile', { display_name: f.display_name, bio: f.bio || null, gender: f.gender, relationship_goal: f.relationship_goal, state_code: f.state_code, is_discoverable: f.is_discoverable });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['discover'] });
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setErr(e.errors); else showError(e, 'Could not save');
    } finally { setBusy(false); }
  }

  return (
    <Screen scroll>
      <Field label="Name" value={f.display_name} onChangeText={set('display_name')} error={err.display_name?.[0]} />
      <Field label="About you" value={f.bio ?? ''} onChangeText={set('bio')} multiline maxLength={bioMax} error={err.bio?.[0]} hint={`Up to ${bioMax} characters. Phone numbers and social handles aren't allowed.`} />
      <Text style={font.label}>I am a</Text>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{GENDERS.map(([k, l]) => <Chip key={k} label={l} selected={f.gender === k} onPress={() => set('gender')(k)} />)}</Row>
      <Text style={font.label}>Looking for</Text>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{GOALS.map(([k, l]) => <Chip key={k} label={l} selected={f.relationship_goal === k} onPress={() => set('relationship_goal')(f.relationship_goal === k ? null : k)} />)}</Row>
      <Text style={font.label}>State</Text>
      <Chip label={states.data?.find((s) => s.code === f.state_code)?.name ?? 'Choose'} selected={!!f.state_code} onPress={() => setPickState((v) => !v)} />
      {pickState ? <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{states.data?.map((s) => <Chip key={s.code} label={s.name} selected={s.code === f.state_code} onPress={() => { set('state_code')(s.code); setPickState(false); }} />)}</Row> : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <Body style={{ flex: 1 }}>Show me to other people</Body>
        <Switch value={!!f.is_discoverable} onValueChange={set('is_discoverable')} trackColor={{ true: colors.primary }} />
      </Row>
      <Button title="Save" onPress={save} loading={busy} />
    </Screen>
  );
}
