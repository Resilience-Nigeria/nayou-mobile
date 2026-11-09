import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Text } from 'react-native';
import { Avatar, Button, Card, ErrorView, ListRow, Loading, Row, Screen, VerifiedBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Profile } from '../../lib/types';
import { font, space } from '../../theme/theme';

export default function Me() {
  const { signOut, me } = useAuth();
  const q = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/profile') });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const p = q.data!;
  const primary = p.photos.find((x) => x.is_primary && x.status !== 'rejected') ?? p.photos.find((x) => x.status === 'approved');
  const go = (path: any) => () => router.push(path);

  return (
    <Screen scroll edges={[]} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Card>
        <Row>
          <Avatar url={primary?.url} name={p.profile.display_name} size={72} />
          <Text style={[font.h2, { flex: 1 }]}>{p.profile.display_name}</Text>
          {p.verification.selfie_verified ? <VerifiedBadge /> : null}
        </Row>
        <Text style={[font.small, { marginTop: space.sm }]}>{me?.email}</Text>
      </Card>
      <ListRow title="Edit profile" subtitle="Name, about you, what you're looking for" onPress={go('/profile-edit')} />
      <ListRow title="Photos" subtitle={`${p.photos.length} uploaded`} onPress={go('/photos')} />
      <ListRow title="Get verified" subtitle={p.verification.selfie_verified ? 'You have the verified badge' : 'Take a quick selfie to earn a badge'} onPress={go('/verify')} />
      <ListRow title="Who you see" subtitle="Age range and distance" onPress={go('/preferences')} />
      <ListRow title="Location" onPress={go('/location')} />
      <ListRow title="Premium plans" onPress={go('/plans')} />
      <ListRow title="Notifications" onPress={go('/notification-settings')} />
      <ListRow title="Appeals" subtitle="Ask for a second look at a decision" onPress={go('/appeals')} />
      <Button title="Sign out" variant="danger" onPress={() => Alert.alert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => signOut() }])} />
    </Screen>
  );
}
