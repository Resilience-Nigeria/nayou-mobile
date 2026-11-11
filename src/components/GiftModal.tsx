import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../lib/api';
import type { GiftRules } from '../lib/types';
import { colors, font, radius, space } from '../theme/theme';
import { Button, Chip, Row, showError } from './ui';

/**
 * Gift coins to someone. Every number here (presets, limits, the balance you must keep) comes from the server
 * (GET /wallet/gifts/rules, set by an admin); the server repeats the same check before moving any coins.
 */
export function GiftModal({ visible, onClose, recipientId, name }: { visible: boolean; onClose: () => void; recipientId: string; name?: string | null }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const requestId = useRef('');
  const rules = useQuery({ queryKey: ['gift-rules'], queryFn: () => api.get<GiftRules>('/wallet/gifts/rules'), enabled: visible });

  useEffect(() => {
    if (visible) {
      setAmount('');
      requestId.current = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; // one id per attempt: a retry cannot double-send
      rules.refetch();
    }
  }, [visible]);

  const r = rules.data;
  const n = Number.parseInt(amount, 10);
  const valid = Number.isFinite(n) && !!r && n >= r.min_amount && n <= r.max_giftable;
  const receives = r && valid ? n - Math.floor((n * r.fee_percent) / 100) : 0;

  let hint = '';
  if (r) {
    if (!r.enabled) hint = 'Gifting is switched off right now.';
    else if (r.max_giftable < r.min_amount) hint = r.balance < r.min_balance_to_gift
      ? `You need at least ${r.min_balance_to_gift} coins to gift.`
      : `You must keep at least ${r.min_balance_after_gift} coins after gifting. Your balance is ${r.balance}.`;
    else if (Number.isFinite(n) && n > r.max_giftable) hint = `The most you can gift now is ${r.max_giftable} coins.`;
    else if (Number.isFinite(n) && n < r.min_amount) hint = `The smallest gift is ${r.min_amount} coins.`;
  }

  async function send() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await api.post('/wallet/gifts', { recipient_id: recipientId, amount: n, request_id: requestId.current });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['gift-rules'] });
      onClose();
      Alert.alert('Gift sent', `${name ?? 'They'} received ${receives} coins.`);
    } catch (e) {
      showError(e, 'Could not send the gift');
      rules.refetch();
    } finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={font.h2}>Gift coins{name ? ` to ${name}` : ''}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          </Row>
          <Text style={font.small}>Your balance: {r?.balance ?? '…'} coins{r ? ` · keep at least ${r.min_balance_after_gift} after gifting` : ''}</Text>

          <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
            {(r?.presets ?? []).map((p) => <Chip key={p} label={`${p}`} selected={n === p} onPress={() => setAmount(String(p))} />)}
          </Row>
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder={r ? `Amount (${r.min_amount}–${r.max_giftable || r.max_amount})` : 'Amount'}
            placeholderTextColor={colors.textMuted}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: colors.text, backgroundColor: colors.card }}
          />
          {hint ? <Text style={[font.small, { color: colors.danger }]}>{hint}</Text> : null}
          {r && r.fee_percent > 0 && valid ? <Text style={font.small}>{name ?? 'They'} will receive {receives} coins ({r.fee_percent}% fee).</Text> : null}
          {r && r.remaining_today !== null ? <Text style={font.small}>You can still gift {r.remaining_today} coins today.</Text> : null}
          <Button title={valid ? `Send ${n} coins` : 'Send gift'} onPress={send} disabled={!valid} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
