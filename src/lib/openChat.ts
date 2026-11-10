import { router } from 'expo-router';
import { showError } from '../components/ui';
import { api } from './api';

/** Start (or reopen) a conversation with someone and go to it. Opening is free; sending costs coins. */
export async function openChatWith(userId: string): Promise<void> {
  try {
    const r = await api.post<{ conversation_id: string }>('/conversations', { user_id: userId });
    router.push({ pathname: '/chat/[id]', params: { id: r.conversation_id } });
  } catch (e) {
    showError(e, 'Could not open chat');
  }
}
