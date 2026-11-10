import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, Text } from 'react-native';
import { Body, Button, Chip, ErrorView, Field, Loading, Row, Screen, showError } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { GENDERS, GOALS, cap, type Profile, type PublicConfig, type StateItem } from '../lib/types';
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
  const traitOptions = ((config.data?.['profile.personality_traits'] as string[] | undefined) ?? []);
  const maxTraits = Number(config.data?.['profile.max_traits'] ?? 5);
  const traits: string[] = f.personality_traits ?? [];
  const toggleTrait = (t: string) => set('personality_traits')(traits.includes(t) ? traits.filter((x) => x !== t) : traits.length < maxTraits ? [...traits, t] : traits);
  const bioMax = Number(config.data?.['profile.bio_max_length'] ?? 500);

  async function save() {
    setBusy(true); setErr({});
    try {
      await api.put('/profile', { display_name: f.display_name, bio: f.bio || null, gender: f.gender, relationship_goal: f.relationship_goal, state_code: f.state_code, is_discoverable: f.is_discoverable, show_online: f.show_online, show_current_location: f.show_current_location, height_cm: f.height_cm ? Number(f.height_cm) : null, personality_traits: f.personality_traits ?? [] });
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
      <Field label="Height (cm)" value={f.height_cm ? String(f.height_cm) : ''} onChangeText={(v: string) => set('height_cm')(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={3} error={err.height_cm?.[0]} hint="For example 175" />
      <Text style={font.label}>My personality (pick up to {maxTraits})</Text>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{traitOptions.map((t) => <Chip key={t} label={cap(t)} selected={traits.includes(t)} onPress={() => toggleTrait(t)} />)}</Row>
      {err.personality_traits?.[0] ? <Text style={{ color: colors.danger }}>{err.personality_traits[0]}</Text> : null}
      <Text style={font.label}>State</Text>
      <Chip label={states.data?.find((s) => s.code === f.state_code)?.name ?? 'Choose'} selected={!!f.state_code} onPress={() => setPickState((v) => !v)} />
      {pickState ? <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{states.data?.map((s) => <Chip key={s.code} label={s.name} selected={s.code === f.state_code} onPress={() => { set('state_code')(s.code); setPickState(false); }} />)}</Row> : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <Body style={{ flex: 1 }}>Show me to other people</Body>
        <Switch value={!!f.is_discoverable} onValueChange={set('is_discoverable')} trackColor={{ true: colors.primary }} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Body style={{ flex: 1 }}>Show when I'm online</Body>
        <Switch value={f.show_online !== false} onValueChange={set('show_online')} trackColor={{ true: colors.primary }} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Body style={{ flex: 1 }}>Show the city I'm in now</Body>
        <Switch value={f.show_current_location !== false} onValueChange={set('show_current_location')} trackColor={{ true: colors.primary }} />
      </Row>
      <Button title="Save" onPress={save} loading={busy} />
    </Screen>
  );
}
