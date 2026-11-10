import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Avatar, Button, Card, ErrorView, ListRow, Loading, Row, Screen, VerifiedBadge, showError } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { appendFile } from '../../lib/upload';
import type { Photo, Profile } from '../../lib/types';
import { colors, font, space } from '../../theme/theme';

export default function Me() {
  const { signOut, me } = useAuth();
  const q = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/profile') });
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Tap the picture to replace it: the new photo is checked like any other, then becomes the main one.
  async function changeAvatar() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: true, aspect: [3, 4] });
    if (r.canceled) return;
    setUploading(true);
    try {
      const f = new FormData();
      await appendFile(f, 'photo', r.assets[0], 'photo.jpg');
      f.append('make_primary', '1');
      const photo = await api.upload<Photo>('/photos', f);
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['photos'] });
      Alert.alert(photo.status === 'approved' ? 'Profile photo updated' : 'Photo sent for review', photo.status === 'approved' ? undefined : 'It becomes your profile picture as soon as it is approved. Your current one stays until then.');
    } catch (e) { showError(e, 'Could not upload your photo'); } finally { setUploading(false); }
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  const p = q.data!;
  const primary = p.photos.find((x) => x.is_primary && x.status !== 'rejected') ?? p.photos.find((x) => x.status === 'approved');
  const go = (path: any) => () => router.push(path);

  return (
    <Screen scroll edges={[]} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Card>
        <Row>
          <Pressable onPress={changeAvatar} disabled={uploading} accessibilityLabel="Change profile photo">
            <Avatar url={primary?.url} name={p.profile.display_name} size={72} />
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
              {uploading ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="camera" size={13} color={colors.white} />}
            </View>
          </Pressable>
          <Text style={[font.h2, { flex: 1 }]}>{p.profile.display_name}</Text>
          {p.verification.selfie_verified ? <VerifiedBadge /> : null}
        </Row>
        <Text style={[font.small, { marginTop: space.sm }]}>{me?.email}</Text>
      </Card>
      <ListRow title="Edit profile" subtitle="Name, about you, height, personality, what you're looking for" onPress={go('/profile-edit')} />
      <ListRow title="Posts" subtitle="Share updates with your followers and see who you follow" onPress={go('/feed')} />
      <ListRow title="See my public profile" subtitle="How others see you" onPress={() => router.push({ pathname: '/person/[id]', params: { id: me?.id ?? '' } })} />
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
