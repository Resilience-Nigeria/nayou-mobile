import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CallVideo } from '../../components/CallVideo';
import { Avatar, Button } from '../../components/ui';
import { api } from '../../lib/api';
import { engine, type VideoTracks } from '../../lib/callEngine';
import { durationLabel } from '../../lib/calls';
import type { CallInfo } from '../../lib/types';
import { colors, font, space } from '../../theme/theme';

const ENDED = ['ended', 'declined', 'missed', 'cancelled', 'failed'];
const REASONS: Record<string, string> = {
  declined: 'Call declined', missed: 'No answer', cancelled: 'Call cancelled', insufficient_coins: 'Ended: not enough coins',
  connection_lost: 'Connection lost', max_duration: 'Reached the call time limit', no_answer: 'No answer',
};

function Round({ icon, label, onPress, active, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean; danger?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable onPress={onPress} accessibilityLabel={label} style={{ width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? colors.danger : active ? colors.white : 'rgba(255,255,255,0.18)' }}>
        <Ionicons name={icon} size={30} color={danger ? colors.white : active ? colors.primaryDark : colors.white} />
      </Pressable>
      <Text style={{ color: colors.white, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [tracks, setTracks] = useState<VideoTracks>({ local: null, remote: null });
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const connected = useRef(false);
  const last = useRef<CallInfo | null>(null);

  const q = useQuery({ queryKey: ['call', id], queryFn: () => api.get<CallInfo>(`/calls/${id}`), refetchInterval: 1500, retry: false });
  const call = q.data;
  last.current = call ?? last.current;
  const finished = !!call && ENDED.includes(call.status);

  // Connect once the other side has answered.
  useEffect(() => {
    if (!call || call.status !== 'active' || !call.livekit || connected.current) return;
    connected.current = true;
    engine.onDisconnected(() => setError('The connection dropped.'));
    engine.onTracks(setTracks);
    setSpeaker(call.type === 'video');
    engine.connect(call.livekit.url, call.livekit.token, { video: call.type === 'video' }).catch((e) => setError(e?.message ?? 'Could not connect the call.'));
  }, [call?.status, call?.livekit?.token]);

  // Keep the call alive (and let the server bill the next minute).
  useEffect(() => {
    if (call?.status !== 'active') return;
    const t = setInterval(() => api.post(`/calls/${id}/heartbeat`).catch(() => {}), 15_000);
    return () => clearInterval(t);
  }, [call?.status]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Once it is over, release the microphone.
  useEffect(() => {
    if (finished) {
      engine.disconnect();
      connected.current = false;
      qc.invalidateQueries({ queryKey: ['calls'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    }
  }, [finished]);

  // Leaving the screen hangs up.
  useEffect(() => () => {
    const c = last.current;
    if (c && !ENDED.includes(c.status)) api.post(`/calls/${c.id}/end`).catch(() => {});
    engine.disconnect();
  }, []);

  async function hangUp() {
    try { await api.post(`/calls/${id}/end`); } catch {}
    await q.refetch();
  }

  const video = call?.type === 'video';
  const live = video && call?.status === 'active' && !finished;
  const seconds = call?.answered_at ? Math.max(0, Math.floor((now - new Date(call.answered_at).getTime()) / 1000)) : 0;
  const status = !call ? 'Connecting…'
    : finished ? (call.duration_seconds > 0 ? `Call ended · ${durationLabel(call.duration_seconds)}` : REASONS[call.end_reason ?? ''] ?? REASONS[call.status] ?? 'Call ended')
    : call.status === 'ringing' ? (call.direction === 'outgoing' ? (video ? 'Video calling…' : 'Calling…') : video ? 'Incoming video call' : 'Incoming call')
    : durationLabel(seconds);

  return (
    <View style={{ flex: 1, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 80, paddingHorizontal: space.xl }}>
      <Stack.Screen options={{ headerShown: false }} />
      {live && tracks.remote ? <CallVideo trackRef={tracks.remote} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
      {live && tracks.local && cameraOn ? (
        <View style={{ position: 'absolute', top: 56, right: 16, width: 110, height: 160, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', zIndex: 5 }}>
          <CallVideo trackRef={tracks.local} mirror style={{ flex: 1 }} />
        </View>
      ) : null}
      <View style={{ alignItems: 'center', gap: space.md, zIndex: 2 }}>
        {live && tracks.remote ? null : <Avatar url={call?.user.photo?.url} name={call?.user.display_name} size={140} online={call?.user.online} />}
        <Text style={{ color: colors.white, fontSize: 28, fontWeight: '800' }}>{call?.user.display_name ?? ''}</Text>
        <Text style={{ color: colors.white, opacity: 0.85, fontSize: 18 }}>{status}</Text>
        {call && call.price_per_minute > 0 && call.direction === 'outgoing' && !finished ? <Text style={{ color: colors.white, opacity: 0.7 }}>{call.price_per_second} coins per second</Text> : null}
        {call && call.price_per_minute === 0 && !finished ? <Text style={{ color: colors.white, opacity: 0.7 }}>Free call</Text> : null}
        {finished && call && call.coins_charged > 0 && call.direction === 'outgoing' ? <Text style={{ color: colors.white, opacity: 0.7 }}>{call.coins_charged} coins used</Text> : null}
        {error ? <Text style={{ color: '#FFD6DE', textAlign: 'center' }}>{error}</Text> : null}
      </View>

      {finished ? (
        <Button title="Close" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ alignSelf: 'stretch' }} />
      ) : (
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap', justifyContent: 'center', zIndex: 2 }}>
          {call?.status === 'active' ? <Round icon={muted ? 'mic-off' : 'mic'} label={muted ? 'Unmute' : 'Mute'} active={muted} onPress={() => { setMuted(!muted); engine.setMuted(!muted); }} /> : null}
          <Round icon="call" label={call?.status === 'ringing' && call.direction === 'outgoing' ? 'Cancel' : 'End'} danger onPress={hangUp} />
          {live ? <Round icon={cameraOn ? 'videocam' : 'videocam-off'} label={cameraOn ? 'Camera' : 'Camera off'} active={!cameraOn} onPress={() => { setCameraOn(!cameraOn); engine.setCamera(!cameraOn); }} /> : null}
          {live && engine.canFlipCamera && cameraOn ? <Round icon="camera-reverse" label="Flip" onPress={() => engine.flipCamera()} /> : null}
          {call?.status === 'active' ? <Round icon={speaker ? 'volume-high' : 'volume-medium'} label="Speaker" active={speaker} onPress={() => { setSpeaker(!speaker); engine.setSpeaker(!speaker); }} /> : null}
        </View>
      )}
    </View>
  );
}
