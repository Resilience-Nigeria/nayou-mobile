import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Banner, Body, Button, ErrorView, Loading, Screen, showError } from '../components/ui';
import { appendFile } from '../lib/upload';
import { api } from '../lib/api';
import type { Photo } from '../lib/types';
import { colors, font, radius, space } from '../theme/theme';

const STATUS: Record<string, string> = { pending: 'In review', approved: 'Live', rejected: 'Not approved' };

export default function Photos() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['photos'], queryFn: () => api.get<Photo[]>('/photos') });
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['photos'] }); qc.invalidateQueries({ queryKey: ['profile'] }); };

  async function add() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [3, 4] });
    if (r.canceled) return;
    const a = r.assets[0];
    setBusy(true);
    try {
      const f = new FormData();
      await appendFile(f, 'photo', a, 'photo.jpg');
      await api.upload('/photos', f);
      refresh();
    } catch (e) { showError(e, 'Could not upload photo'); } finally { setBusy(false); }
  }

  function options(p: Photo) {
    Alert.alert('Photo', undefined, [
      ...(!p.is_primary && p.status === 'approved' ? [{ text: 'Make main photo', onPress: async () => { try { await api.patch(`/photos/${p.id}`, { is_primary: true }); refresh(); } catch (e) { showError(e); } } }] : []),
      { text: 'Delete', style: 'destructive' as const, onPress: async () => { try { await api.del(`/photos/${p.id}`); refresh(); } catch (e) { showError(e); } } },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorView error={q.error} onRetry={() => q.refetch()} />;
  return (
    <Screen scroll>
      <Body muted>Clear photos of your face work best. Your photos show up straight away. If one is reported, our team may review or remove it.</Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {q.data!.map((p) => (
          <Pressable key={p.id} onPress={() => options(p)} style={{ width: '47%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.border }}>
            {p.url ? <Image source={{ uri: p.url }} style={{ flex: 1 }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="image-outline" size={32} color={colors.textMuted} /></View>}
            <View style={{ position: 'absolute', left: 6, bottom: 6, right: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ backgroundColor: p.status === 'rejected' ? colors.danger : 'rgba(0,0,0,0.6)', color: colors.white, fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' }}>{p.is_primary ? 'Main · ' : ''}{STATUS[p.status ?? 'approved']}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {q.data!.some((p) => p.status === 'rejected') ? <Banner tone="warn"><Text style={font.body}>Some photos weren't approved. Tap one to remove it, or appeal from Me → Appeals.</Text></Banner> : null}
      <Button title="Add a photo" icon="add" onPress={add} loading={busy} />
    </Screen>
  );
}
