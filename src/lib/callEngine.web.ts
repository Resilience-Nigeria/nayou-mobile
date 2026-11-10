import type { CallEngine } from './callEngine';

/**
 * Browser voice calls via livekit-client. The package is loaded defensively so the web app still starts even if
 * `npm install` has not been run since it was added (calls then report "not available").
 */
let lk: any = null;
try {
  lk = require('livekit-client');
} catch {
  lk = null;
}

let room: any = null;
let dropped: (() => void) | null = null;
const audioEls: HTMLMediaElement[] = [];

export const engine: CallEngine = {
  available: !!lk && typeof navigator !== 'undefined' && !!navigator.mediaDevices,
  unavailableReason: lk ? 'Your browser cannot use the microphone here.' : 'Voice calls need an app update: run npm install and restart.',

  async connect(url, token) {
    if (!lk) throw new Error(engine.unavailableReason);
    room = new lk.Room();
    room.on(lk.RoomEvent.Disconnected, () => dropped?.());
    room.on(lk.RoomEvent.TrackSubscribed, (track: any) => {
      if (track.kind === lk.Track.Kind.Audio) {
        const el = track.attach();
        el.style.display = 'none';
        document.body.appendChild(el);
        audioEls.push(el);
      }
    });
    await room.connect(url, token);
    await room.localParticipant.setMicrophoneEnabled(true);
  },

  async disconnect() {
    try { await room?.disconnect(); } catch {}
    room = null;
    audioEls.splice(0).forEach((e) => e.remove());
  },

  async setMuted(muted) { await room?.localParticipant.setMicrophoneEnabled(!muted); },
  async setSpeaker() {},
  onDisconnected(cb) { dropped = cb; },
};
