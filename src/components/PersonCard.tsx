import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { genderLabel, type CardPhoto } from '../lib/types';
import { colors, radius, shadow, space } from '../theme/theme';
import { Row, VerifiedBadge } from './ui';

type C = { id: string; display_name: string | null; age: number; gender: string; photo: CardPhoto; verified: boolean; online?: boolean };

function Presence({ online }: { online?: boolean }) {
  return (
    <Row style={{ gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: online ? '#22C55E' : '#9CA3AF', borderWidth: 1, borderColor: colors.white }} />
      <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>{online ? 'Online' : 'Offline'}</Text>
    </Row>
  );
}

export function PersonCard({ c, width, sub }: { c: C; width: number; sub?: string | null }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: c.id } })} style={[{ width, height: width * 1.35, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.border }, shadow.card]}>
      {c.photo?.url ? (
        <Image source={{ uri: c.photo.url }} style={{ flex: 1 }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person" size={64} color={colors.textMuted} /></View>
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.sm, gap: 3, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.white, fontSize: 17, fontWeight: '800', flexShrink: 1 }} numberOfLines={1}>{c.display_name}, {c.age}</Text>
          {c.verified ? <VerifiedBadge /> : null}
        </Row>
        <Text style={{ color: colors.white, opacity: 0.9, fontSize: 12 }} numberOfLines={1}>{[genderLabel(c.gender), sub].filter(Boolean).join(' · ')}</Text>
        <Presence online={c.online} />
      </View>
    </Pressable>
  );
}

