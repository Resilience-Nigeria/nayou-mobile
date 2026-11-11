import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Banner, Body, Button, H1, Screen, showError } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { appendFile } from '../lib/upload';
import type { Photo } from '../lib/types';
import { colors, radius } from '../theme/theme';

/** Shown to everyone who has no profile photo yet. They cannot use the app until they add one. */
export default function OnboardingPhoto() {
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const [picked, setPicked] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useQuery({ queryKey: ['profile'], queryFn: () => api.get('/profile') });

  async function choose(camera: boolean) {
    setMsg(null);
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setMsg('Camera access is needed to take a photo. You can choose one from your gallery instead.'); return; }
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [3, 4] };
    const r = camera ? await ImagePicker.launchCameraAsync({ ...opts, cameraType: ImagePicker.CameraType.front }) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled) setPicked(r.assets[0]);
  }

  async function save() {
    if (!picked) return;
    setBusy(true); setMsg(null);
    try {
      const f = new FormData();
      await appendFile(f, 'photo', picked, 'photo.jpg');
      f.append('make_primary', '1');
      await api.upload<Photo>('/photos', f);
      await qc.invalidateQueries({ queryKey: ['profile'] });
      await qc.invalidateQueries({ queryKey: ['photos'] });
      router.replace('/(tabs)/home');
    } catch (e) {
      showError(e, 'Could not upload your photo');
    } finally { setBusy(false); }
  }

  return (
    <Screen scroll>
      <H1>Add your profile photo</H1>
      <Body muted>People connect with real faces. Choose a clear photo of you: face visible, good light, just you. You need a photo to continue. Photos that show phone numbers are not accepted.</Body>
      <Pressable onPress={() => choose(false)} style={{ alignSelf: 'center', width: 220, aspectRatio: 3 / 4, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        {picked ? <Image source={{ uri: picked.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <View style={{ alignItems: 'center' }}><Ionicons name="person-circle-outline" size={90} color={colors.textMuted} /><Body muted>Tap to choose</Body></View>}
      </Pressable>
      {msg ? <Banner tone="warn">{msg}</Banner> : null}
      <Button title="Take a photo" icon="camera" variant="secondary" onPress={() => choose(true)} />
      <Button title="Choose from gallery" icon="images" variant="secondary" onPress={() => choose(false)} />
      <Button title="Continue" onPress={save} loading={busy} disabled={!picked} />
      <Pressable onPress={() => signOut()} style={{ alignSelf: 'center', padding: 8 }}><Body muted>Sign out</Body></Pressable>
    </Screen>
  );
}
