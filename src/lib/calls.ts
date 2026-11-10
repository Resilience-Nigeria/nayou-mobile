import { Alert } from 'react-native';
import { router } from 'expo-router';
import { showError } from '../components/ui';
import { ApiError, api } from './api';
import { engine } from './callEngine';
import type { CallInfo } from './types';

/** Ring someone from a conversation and open the call screen. */
export async function startCall(conversationId: string): Promise<void> {
  if (!engine.available) {
    Alert.alert('Calls not available here', engine.unavailableReason ?? 'Voice calls are not available on this device.');
    return;
  }
  try {
    const call = await api.post<CallInfo>('/calls', { conversation_id: conversationId });
    router.push({ pathname: '/call/[id]', params: { id: call.id } });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'insufficient_coins') {
      Alert.alert('Not enough coins', e.friendly, [{ text: 'Not now', style: 'cancel' }, { text: 'Buy coins', onPress: () => router.push('/coins') }]);
    } else showError(e, 'Could not start the call');
  }
}

export function durationLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
