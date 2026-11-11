import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DateField } from '../../components/DateField';
import { Banner, Body, Button, Chip, Field, H1, Row, Screen, showError } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { API_URL } from '../../lib/config';
import { GENDERS, type PublicConfig, type StateItem } from '../../lib/types';
import { colors, font, space } from '../../theme/theme';

export default function Register() {
  const { signUp } = useAuth();
  const config = useQuery({ queryKey: ['config'], queryFn: () => api.get<PublicConfig>('/config') });
  const states = useQuery({ queryKey: ['states'], queryFn: () => api.get<StateItem[]>('/states') });

  const [f, setF] = useState({ display_name: '', email: '', password: '', phone: '', date_of_birth: '', gender: '', state_code: '' });
  const [terms, setTerms] = useState(false);
  const [pickState, setPickState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string[]>>({});
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const minAge = Number(config.data?.['auth.min_age'] ?? 18);
  const bonus = Number(config.data?.['coins.welcome_bonus'] ?? 0);
  const latestBirth = new Date(new Date().getFullYear() - minAge, new Date().getMonth(), new Date().getDate()); // youngest allowed
  const minPw = Number(config.data?.['auth.password_min_length'] ?? 8);

  async function submit() {
    setBusy(true);
    setErr({});
    try {
      await signUp({
        ...f, email: f.email.trim(), phone: f.phone || null, state_code: f.state_code || null,
        accepted_terms: terms, accepted_privacy: terms,
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setErr(e.errors);
      else showError(e, 'Could not create your account');
    } finally {
      setBusy(false);
    }
  }

  const stateName = states.data?.find((s) => s.code === f.state_code)?.name;

  return (
    <Screen scroll>
      <H1>Create your account</H1>
      {bonus > 0 ? <Banner tone="info">{`You'll get ${bonus} free coins to start chatting.`}</Banner> : null}
      <Field label="First name or nickname" value={f.display_name} onChangeText={set('display_name')} error={err.display_name?.[0]} hint="No phone numbers or social handles in your name." />
      <Field label="Email" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={err.email?.[0]} />
      <Field label="Password" value={f.password} onChangeText={set('password')} secureTextEntry error={err.password?.[0]} hint={`At least ${minPw} characters.`} />
      <Field label="Phone (optional)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={err.phone?.[0]} hint="Never shown to anyone." />
      <DateField label="Date of birth" value={f.date_of_birth} onChange={set('date_of_birth')} maxDate={latestBirth} error={err.date_of_birth?.[0]} hint={`You must be at least ${minAge}.`} />

      <View style={{ gap: 6 }}>
        <Text style={font.label}>I am a</Text>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
          {GENDERS.map(([k, label]) => <Chip key={k} label={label} selected={f.gender === k} onPress={() => set('gender')(k)} />)}
        </Row>
        {err.gender?.[0] ? <Text style={{ color: colors.danger, fontSize: 13 }}>{err.gender[0]}</Text> : null}
      </View>

      {states.error || config.error ? (
        <Banner tone="warn">
          <Text style={font.body}>Could not reach the server{__DEV__ ? ` at ${API_URL}` : ''}. Check your connection.</Text>
          <Pressable onPress={() => { states.refetch(); config.refetch(); }}><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>Try again</Text></Pressable>
        </Banner>
      ) : null}
      <View style={{ gap: 6 }}>
        <Text style={font.label}>State</Text>
        {states.error ? (
          <Banner tone="warn">
            {`Could not load the list of states from ${API_URL}. On a phone, "localhost" is the phone itself: use your computer's Wi-Fi IP address.`}
            <Pressable onPress={() => { states.refetch(); config.refetch(); }}><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>Try again</Text></Pressable>
          </Banner>
        ) : null}
        <Chip label={stateName ?? 'Choose your state'} selected={!!stateName} onPress={() => setPickState((v) => !v)} />
        {pickState ? (
          <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
            {states.data?.map((s) => <Chip key={s.code} label={s.name} selected={s.code === f.state_code} onPress={() => { set('state_code')(s.code); setPickState(false); }} />)}
          </Row>
        ) : null}
      </View>

      <Pressable onPress={() => setTerms((t) => !t)} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
        <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, backgroundColor: terms ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {terms ? <Text style={{ color: colors.white, fontWeight: '800' }}>✓</Text> : null}
        </View>
        <Body style={{ flex: 1 }}>I confirm I am {minAge} or older and accept the Terms of Use and Privacy Policy.</Body>
      </Pressable>
      {err.accepted_terms?.[0] ? <Text style={{ color: colors.danger, fontSize: 13 }}>{err.accepted_terms[0]}</Text> : null}

      <Button title="Create account" onPress={submit} loading={busy} disabled={!terms || !f.email || !f.password || !f.display_name || !f.gender || !f.date_of_birth} />
    </Screen>
  );
}
