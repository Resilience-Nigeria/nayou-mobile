import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Field, H1, Screen, showError } from '../../components/ui';
import { api } from '../../lib/api';

/** Suspended and banned people cannot sign in, so they appeal with email + password. */
export default function SanctionAppeal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.post('/appeals/sanction', { email: email.trim(), password, message }, { auth: false });
      Alert.alert('Appeal sent', 'A different reviewer will look at your case. You will be told the outcome.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      showError(e, 'Could not send your appeal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <H1>Appeal a suspension</H1>
      <Banner>Enter your account details, then tell us why you think the decision was a mistake.</Banner>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Field label="Your message" value={message} onChangeText={setMessage} multiline maxLength={2000} />
      <Button title="Send appeal" onPress={submit} loading={busy} disabled={!email || !password || !message.trim()} />
    </Screen>
  );
}
