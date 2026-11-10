import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Text, Vibration, View } from 'react-native';
import { api } from '../lib/api';
import { engine } from '../lib/callEngine';
import type { CallInfo } from '../lib/types';
import { colors, space } from '../theme/theme';
import { Avatar } from './ui';

/** Shows a full-screen "X is calling" prompt on any screen while a call rings. Polls every 3 seconds while the app is open. */
export function IncomingCall() {
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ['incoming-call'],
    queryFn: () => api.get<CallInfo | Record<string, never>>('/calls/incoming'),
    refetchInterval: 3000,
    retry: false,
  });
  const call = q.data && 'id' in q.data ? (q.data as CallInfo) : null;

  useEffect(() => {
    if (!call) return;
    Vibration.vibrate([0, 600, 900], true);
    return () => Vibration.cancel();
  }, [call?.id]);

  async function answer() {
    if (!call || busy) return;
    if (!engine.available) {
      Alert.alert('Calls not available here', engine.unavailableReason);
      return;
    }
    setBusy(true);
    try {
      await api.post(`/calls/${call.id}/accept`);
      q.refetch();
      router.push({ pathname: '/call/[id]', params: { id: call.id } });
    } catch (e: any) {
      Alert.alert('Could not connect', e?.friendly ?? 'The call has ended.');
      q.refetch();
    } finally { setBusy(false); }
  }

  async function refuse() {
    if (!call) return;
    try { await api.post(`/calls/${call.id}/end`); } catch {}
    q.refetch();
  }

  return (
    <Modal visible={!!call} animationType="slide" onRequestClose={refuse}>
      <View style={{ flex: 1, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 100, paddingHorizontal: space.xl }}>
        <View style={{ alignItems: 'center', gap: space.md }}>
          <Avatar url={call?.user.photo?.url} name={call?.user.display_name} size={140} online={call?.user.online} />
          <Text style={{ color: colors.white, fontSize: 28, fontWeight: '800' }}>{call?.user.display_name}</Text>
          <Text style={{ color: colors.white, opacity: 0.85, fontSize: 18 }}>Incoming voice call</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 70 }}>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Pressable onPress={refuse} accessibilityLabel="Decline" style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="call" size={32} color={colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
            <Text style={{ color: colors.white }}>Decline</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Pressable onPress={answer} accessibilityLabel="Accept" style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
              <Ionicons name="call" size={32} color={colors.white} />
            </Pressable>
            <Text style={{ color: colors.white }}>Accept</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
