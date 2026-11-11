import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { CallEngine, VideoTracks } from './callEngine';

/**
 * LiveKit over WebRTC. It needs native code, so it only works in a development / production build of Nayou,
 * NOT in Expo Go. The requires are guarded so Expo Go still starts and just reports "not available".
 */
let rn: any = null;
let lk: any = null;
let reason: string | undefined;
try {
  if (!NativeModules.WebRTCModule) throw new Error('missing native module');
  rn = require('@livekit/react-native');
  lk = require('livekit-client');
  rn.registerGlobals();
} catch {
  rn = null;
  lk = null;
  reason = 'Calls need the Nayou app build. They do not work in Expo Go.';
}

let room: any = null;
let dropped: (() => void) | null = null;
let quiet = false; // true while we deliberately tear a room down to retry
let tracksCb: ((t: VideoTracks) => void) | null = null;
let facingFront = true;

function ref(participant: any): any | null {
  const pub = participant?.getTrackPublication?.(lk.Track.Source.Camera);
  return pub && pub.track && !pub.isMuted ? { participant, publication: pub, source: lk.Track.Source.Camera } : null;
}

function emit() {
  if (!room || !tracksCb) return;
  const remote = [...room.remoteParticipants.values()][0];
  tracksCb({ local: ref(room.localParticipant), remote: ref(remote) });
}

async function ask(perm: string, message: string) {
  if (Platform.OS !== 'android') return;
  const r = await PermissionsAndroid.request(perm as any);
  if (r !== PermissionsAndroid.RESULTS.GRANTED) throw new Error(message);
}

async function join(url: string, token: string, opts: { video?: boolean } | undefined, relay: boolean): Promise<void> {
  if (!rn || !lk) throw new Error(reason);
  await ask(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, 'Allow the microphone to make calls.');
  if (opts?.video) await ask(PermissionsAndroid.PERMISSIONS.CAMERA, 'Allow the camera to make video calls.');
  await rn.AudioSession.startAudioSession();
  room = new lk.Room({ adaptiveStream: false, dynacast: false });
  room.on(lk.RoomEvent.Disconnected, () => { if (!quiet) dropped?.(); });
  for (const ev of [lk.RoomEvent.TrackSubscribed, lk.RoomEvent.TrackUnsubscribed, lk.RoomEvent.TrackMuted, lk.RoomEvent.TrackUnmuted,
    lk.RoomEvent.LocalTrackPublished, lk.RoomEvent.LocalTrackUnpublished, lk.RoomEvent.ParticipantConnected, lk.RoomEvent.ParticipantDisconnected]) {
    room.on(ev, emit);
  }
  await room.connect(url, token, relay ? { rtcConfig: { iceTransportPolicy: 'relay' }, peerConnectionTimeout: 15000 } : { peerConnectionTimeout: 8000 });
  await room.localParticipant.setMicrophoneEnabled(true);
  if (opts?.video) {
    facingFront = true;
    await room.localParticipant.setCameraEnabled(true, { facingMode: 'user' });
  }
  await engine.setSpeaker(!!opts?.video); // video calls default to the loudspeaker, voice calls to the earpiece
  emit();
}

export const engine: CallEngine = {
  available: !!(rn && lk),
  unavailableReason: reason,
  canFlipCamera: true,

  async connect(url, token, opts) {
    try {
      await join(url, token, opts, false);
    } catch (e: any) {
      // Media could not reach LiveKit directly (UDP blocked by a VPN/firewall/Wi-Fi). Retry once through the relay (TURN over TLS).
      if (!/engine not connected|timeout|ICE|peer ?connection/i.test(String(e?.message ?? e))) throw e;
      quiet = true;
      try { await room?.disconnect(); } catch {}
      room = null;
      quiet = false;
      try {
        await join(url, token, opts, true);
      } catch (e2: any) {
        throw new Error('Could not set up the call media. Check that you are not on a VPN or a network that blocks calls, then try again.');
      }
    }
  },

  async disconnect() {
    try { await room?.disconnect(); } catch {}
    room = null;
    tracksCb?.({ local: null, remote: null });
    try { await rn?.AudioSession.stopAudioSession(); } catch {}
  },

  async setMuted(muted) {
    await room?.localParticipant.setMicrophoneEnabled(!muted);
  },

  async setSpeaker(on) {
    try {
      const outs: string[] = await rn.AudioSession.getAudioOutputs();
      const pick = on ? outs.find((o) => /speaker/i.test(o)) : outs.find((o) => /earpiece|default/i.test(o));
      if (pick) await rn.AudioSession.selectAudioOutput(pick);
    } catch {}
  },

  async setCamera(on) {
    await room?.localParticipant.setCameraEnabled(on, on ? { facingMode: facingFront ? 'user' : 'environment' } : undefined);
    emit();
  },

  async flipCamera() {
    const pub = room?.localParticipant.getTrackPublication(lk.Track.Source.Camera);
    if (!pub?.track) return;
    facingFront = !facingFront;
    try { await pub.track.restartTrack({ facingMode: facingFront ? 'user' : 'environment' }); } catch { facingFront = !facingFront; }
    emit();
  },

  onDisconnected(cb) { dropped = cb; },
  onTracks(cb) { tracksCb = cb; },
};
