import { useState } from 'react';
import { Button, Field, H1, Screen, showError } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string[]>>({});

  async function submit() {
    setBusy(true);
    setErr({});
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setErr(e.errors);
      else showError(e, 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <H1>Welcome back</H1>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={err.email?.[0]} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" error={err.password?.[0]} />
      <Button title="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />
    </Screen>
  );
}
