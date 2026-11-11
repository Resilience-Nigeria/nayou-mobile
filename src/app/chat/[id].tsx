import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaView } from '../../components/MediaView';
import { mediaAllowed, pickAndUpload } from '../../lib/media';
import { GiftModal } from '../../components/GiftModal';
import { Avatar, Banner, ErrorView, Loading, Row, showError } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { startCall } from '../../lib/calls';
import type { ChatStatus, ConversationInfo, Message, PublicConfig, Wallet } from '../../lib/types';
import { colors, font, radius, space } from '../../theme/theme';

function TypingDots() {
  const [n, setN] = useState(1);
  useEffect(() => { const t = setInterval(() => setN((x) => (x % 3) + 1), 400); return () => clearInterval(t); }, []);
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3].map((i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted, opacity: i <= n ? 1 : 0.3 }} />)}
    </View>
  );
}

const EMOJIS = ['😀','😂','🥰','😍','😘','😊','😉','😎','🤗','😅','🥲','😢','😭','😡','🤔','🙄','😴','🤭','👍','👏','🙏','💪','🔥','✨','🎉','❤️','💕','💖','💚','💔','🌹','🍾','🍕','☕','🎶','🌍','🇳🇬','😋','🤝','🙌'];

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef<{ body: string; key: string } | null>(null);

  const info = useQuery({ queryKey: ['conversation', id], queryFn: () => api.get<ConversationInfo>(`/conversations/${id}`), refetchInterval: 15_000 });
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: () => api.get<Wallet>('/wallet') });
  const other = info.data;
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<PublicConfig>('/config') });
  const allow = mediaAllowed(cfg.data, 'message');
  const [attaching, setAttaching] = useState(false);

  const msgs = useInfiniteQuery({
    queryKey: ['messages', id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.page<Message[]>(`/conversations/${id}/messages`, { before: pageParam, limit: 30 }),
    getNextPageParam: (last) => (last.meta.next_before as string | undefined) ?? undefined,
    refetchInterval: 2000, // polling until realtime (websockets) is set up
    retry: false,
  });

  const status = useQuery({
    queryKey: ['chat-status', id],
    queryFn: () => api.get<ChatStatus>(`/conversations/${id}/status`),
    refetchInterval: 1500,
    retry: false,
  });
  const typing = !!status.data?.typing;
  const lastPing = useRef(0);

  // The keyboard covers the composer on edge-to-edge Android (and sometimes iOS): lift it by the keyboard height.
  const insets = useSafeAreaInsets();
  const [kb, setKb] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const ios = Platform.OS === 'ios';
    const a = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => { setKb(e.endCoordinates.height); setEmojiOpen(false); });
    const b = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => { a.remove(); b.remove(); };
  }, []);

  const items = useMemo(() => msgs.data?.pages.flatMap((p) => p.data) ?? [], [msgs.data]);

  // Tell the other person we're typing (at most every 2.5s), and mark their messages as read.
  function onType(v: string) {
    setText(v);
    const now = Date.now();
    if (v.trim() && now - lastPing.current > 2500) {
      lastPing.current = now;
      api.post(`/conversations/${id}/typing`).catch(() => {});
    }
  }

  const newestId = items[0]?.id;
  const newestIsTheirs = items[0] ? !items[0].mine : false;
  useEffect(() => {
    if (!id || msgs.isLoading) return;
    if (items.length === 0 || newestIsTheirs) {
      api.post(`/conversations/${id}/read`).then(() => {
        qc.invalidateQueries({ queryKey: ['conversations'] });
        qc.invalidateQueries({ queryKey: ['unread'] });
      }).catch(() => {});
    }
  }, [id, newestId, newestIsTheirs, msgs.isLoading]);

  async function attach() {
    if (attaching || sending) return;
    setAttaching(true);
    setNotice(null);
    try {
      const m = await pickAndUpload('message', allow);
      if (!m) return;
      await api.post(`/conversations/${id}/messages`, { client_message_id: uuid(), media_id: m.id });
      qc.invalidateQueries({ queryKey: ['messages', id] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'insufficient_coins') {
        Alert.alert('Not enough coins', e.friendly, [{ text: 'Not now', style: 'cancel' }, { text: 'Buy coins', onPress: () => router.push('/coins') }]);
      } else if (e instanceof ApiError && ['messaging_restricted', 'conversation_closed', 'awaiting_reply', 'direct_messages_disabled', 'media_not_allowed', 'media_disabled'].includes(e.code)) {
        setNotice(e.friendly);
      } else showError(e, 'Could not send');
    } finally { setAttaching(false); }
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    // Reuse the key when retrying the same text, so a retry can never charge twice.
    if (!pending.current || pending.current.body !== body) pending.current = { body, key: uuid() };
    setSending(true);
    setNotice(null);
    try {
      await api.post(`/conversations/${id}/messages`, { client_message_id: pending.current.key, body });
      pending.current = null;
      setText('');
      lastPing.current = 0;
      qc.invalidateQueries({ queryKey: ['messages', id] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'insufficient_coins') {
        Alert.alert('Not enough coins', e.friendly, [{ text: 'Not now', style: 'cancel' }, { text: 'Buy coins', onPress: () => router.push('/coins') }]);
      } else if (e instanceof ApiError && ['contact_info_blocked', 'messaging_restricted', 'conversation_closed', 'awaiting_reply', 'direct_messages_disabled'].includes(e.code)) {
        setNotice(e.friendly);
      } else {
        showError(e, 'Message not sent');
      }
    } finally {
      setSending(false);
    }
  }

  function menu() {
    if (!other) return;
    Alert.alert(other.user.display_name ?? 'Options', undefined, [
      { text: 'Gift coins', onPress: () => setGiftOpen(true) },
      { text: 'Report', onPress: () => router.push({ pathname: '/report', params: { id: other.user.id, name: other.user.display_name ?? '' } }) },
      {
        text: 'Block', style: 'destructive',
        onPress: () => Alert.alert('Block this person?', 'You will no longer see each other and the chat closes.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: async () => {
            try { await api.post(`/users/${other.user.id}/block`); qc.invalidateQueries({ queryKey: ['matches'] }); qc.invalidateQueries({ queryKey: ['conversations'] }); qc.invalidateQueries({ queryKey: ['likes'] }); router.back(); } catch (e) { showError(e); }
          } },
        ]),
      },
      ...(other.match_id ? [{ text: 'Unmatch', style: 'destructive' as const, onPress: async () => {
        try { await api.del(`/matches/${other.match_id}`); qc.invalidateQueries({ queryKey: ['matches'] }); qc.invalidateQueries({ queryKey: ['conversations'] }); router.back(); } catch (e) { showError(e); }
      } }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (msgs.isLoading || info.isLoading) return <Loading />;
  if (msgs.error) return <ErrorView error={msgs.error} onRetry={() => msgs.refetch()} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {other ? <GiftModal visible={giftOpen} onClose={() => setGiftOpen(false)} recipientId={other.user.id} name={other.user.display_name} /> : null}
      <Stack.Screen options={{
        headerTitle: () => other ? (
          <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: other.user.id } })} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar url={other.user.photo?.url} name={other.user.display_name} size={36} online={other.user.online} />
            <View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{other.user.display_name ?? 'Member'}</Text>
              <Text style={{ fontSize: 12, color: typing || other.user.online ? colors.primary : colors.textMuted }}>{typing ? 'typing…' : other.user.online ? 'Online' : 'Tap to view profile'}</Text>
            </View>
          </Pressable>
        ) : null,
        headerRight: () => other ? (
          <Row style={{ gap: 18 }}>
            {!other.closed ? <Pressable onPress={() => startCall(String(id), 'video')} hitSlop={10} accessibilityLabel="Video call"><Ionicons name="videocam-outline" size={25} color={colors.primary} /></Pressable> : null}
            {!other.closed ? <Pressable onPress={() => startCall(String(id))} hitSlop={10} accessibilityLabel="Voice call"><Ionicons name="call-outline" size={23} color={colors.primary} /></Pressable> : null}
            <Pressable onPress={menu} hitSlop={10}><Ionicons name="ellipsis-horizontal" size={22} color={colors.text} /></Pressable>
          </Row>
        ) : null }} />
      <View style={{ flex: 1, paddingBottom: Math.max(0, kb - insets.bottom) }}>
        <FlatList
          inverted
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          ListHeaderComponent={typing ? <TypingDots /> : undefined}
          onEndReached={() => msgs.hasNextPage && !msgs.isFetchingNextPage && msgs.fetchNextPage()}
          ListEmptyComponent={<Text style={[font.small, { textAlign: 'center', transform: [{ scaleY: -1 }], padding: space.xl }]}>Say hello! You don't need to match first. Each message costs {wallet.data?.message_cost ?? '…'} coin(s), paid by the sender, unless you follow each other.</Text>}
          renderItem={({ item }) => (
            <View style={{ alignSelf: item.mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: item.mine ? colors.primary : colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 }}>
              {item.media ? <MediaView media={item.media} width={220} /> : null}
              {item.body ? <Text style={{ color: item.mine ? colors.white : colors.text, fontSize: 16, lineHeight: 22, marginTop: item.media ? 6 : 0 }}>{item.body}</Text> : null}
            </View>
          )}
        />
        {notice ? <View style={{ paddingHorizontal: space.lg }}><Banner tone="warn">{notice}</Banner></View> : null}
        {emojiOpen ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.md, paddingTop: space.sm, gap: 4, backgroundColor: colors.card }}>
            {EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => onType(text + e)} style={{ width: '12%', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 26 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Row style={{ padding: space.md, alignItems: 'flex-end' }}>
          <Pressable onPress={() => { Keyboard.dismiss(); setEmojiOpen((v) => !v); }} hitSlop={8} style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={emojiOpen ? 'keypad-outline' : 'happy-outline'} size={26} color={colors.primary} />
          </Pressable>
          {allow.images || allow.videos ? (
            <Pressable onPress={attach} disabled={attaching} hitSlop={8} style={{ width: 40, height: 48, alignItems: 'center', justifyContent: 'center', opacity: attaching ? 0.4 : 1 }}>
              <Ionicons name="attach" size={26} color={colors.primary} />
            </Pressable>
          ) : null}
          <TextInput
            onFocus={() => setEmojiOpen(false)}
            value={text}
            onChangeText={onType}
            placeholder="Write a message"
            placeholderTextColor="#A5ABA7"
            multiline
            maxLength={2000}
            style={{ flex: 1, maxHeight: 120, backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.text }}
          />
          <Pressable onPress={send} disabled={sending || !text.trim()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: sending || !text.trim() ? 0.5 : 1 }}>
            <Ionicons name="send" size={20} color={colors.white} />
          </Pressable>
        </Row>
        <Text style={[font.small, { textAlign: 'center', paddingBottom: 4 }]}>{other?.free_messages ? 'Free messaging: you follow each other' : wallet.data ? `${wallet.data.coin_balance} coins · ${wallet.data.message_cost} per message` : ' '}</Text>
      </View>
    </SafeAreaView>
  );
}
