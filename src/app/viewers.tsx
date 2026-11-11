import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Avatar, Banner, Card, ErrorView, H2, ListRow, Loading, Row, Screen, VerifiedBadge, timeAgo } from '../components/ui';
import { api } from '../lib/api';
import type { ProfileViews } from '../lib/types';
import { colors, font, space } from '../theme/theme';

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={{ flex: 1, alignItems: 'center', gap: 2 }}><Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>{value.toLocaleString('en-US')}</Text><Text style={font.small}>{label}</Text></View>;
}

export default function Viewers() {
  const q = useQuery({ queryKey: ['profile-views'], queryFn: () => api.get<ProfileViews>('/profile/views'), refetchInterval: 30_000 });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const v = q.data!;
  if (!v.enabled) return <Screen><Banner tone="warn">Profile views are turned off right now.</Banner></Screen>;

  return (
    <Screen scroll edges={[]} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Card><Row><Stat label="Today" value={v.today} /><Stat label="Last 7 days" value={v.last_7_days} /><Stat label="All time" value={v.total} /></Row></Card>
      <Text style={font.small}>{v.unique_people.toLocaleString('en-US')} different people have viewed your profile. Each person counts once a day.</Text>
      {v.show_viewers ? (
        <>
          <H2>Recent viewers</H2>
          {v.viewers.length ? v.viewers.map((p) => (
            <ListRow key={p.id} title={p.display_name ?? 'Member'} subtitle={`${timeAgo(p.viewed_at)} ago`} left={<Avatar url={p.photo?.url} name={p.display_name} size={44} />}
              right={p.verified ? <VerifiedBadge /> : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id } })} />
          )) : <Text style={font.small}>No one yet. Add more photos and post to get noticed.</Text>}
        </>
      ) : null}
    </Screen>
  );
}
