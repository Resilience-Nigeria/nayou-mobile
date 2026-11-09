import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from 'react-native';
import { Body, ErrorView, ListRow, Loading, Screen, showError } from '../components/ui';
import { api } from '../lib/api';
import type { NoticePref } from '../lib/types';
import { colors } from '../theme/theme';

export default function NotificationSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notification-prefs'], queryFn: () => api.get<NoticePref[]>('/notification-preferences') });
  async function toggle(p: NoticePref, on: boolean) {
    try {
      qc.setQueryData<NoticePref[]>(['notification-prefs'], (old) => old?.map((x) => (x.category === p.category ? { ...x, push_enabled: on } : x)));
      await api.put('/notification-preferences', { preferences: { [p.category]: on } });
    } catch (e) { showError(e); qc.invalidateQueries({ queryKey: ['notification-prefs'] }); }
  }
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  return (
    <Screen scroll>
      <Body muted>Choose which updates reach your lock screen. Everything always appears in your Alerts inbox. Account and payment updates can't be turned off.</Body>
      {q.data!.map((p) => (
        <ListRow key={p.category} title={p.label} subtitle={p.mandatory ? 'Always on' : undefined}
          right={<Switch value={p.push_enabled} disabled={p.mandatory} onValueChange={(v) => toggle(p, v)} trackColor={{ true: colors.primary }} />} />
      ))}
    </Screen>
  );
}
