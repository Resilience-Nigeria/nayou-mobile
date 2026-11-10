import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { CallEngine } from './callEngine';

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
  reason = 'Voice calls need the Nayou app build. They do not work in Expo Go.';
}

let room: any = null;
let dropped: (() => void) | null = null;

export const engine: CallEngine = {
  available: !!(rn && lk),
  unavailableReason: reason,

  async connect(url, token) {
    if (!rn || !lk) throw new Error(reason);
    if (Platform.OS === 'android') {
      const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (r !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Allow the microphone to make calls.');
    }
    await rn.AudioSession.startAudioSession();
    room = new lk.Room({ adaptiveStream: false, dynacast: false });
    room.on(lk.RoomEvent.Disconnected, () => dropped?.());
    await room.connect(url, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    await this.setSpeaker(false);
  },

  async disconnect() {
    try { await room?.disconnect(); } catch {}
    room = null;
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

  onDisconnected(cb) { dropped = cb; },
};
