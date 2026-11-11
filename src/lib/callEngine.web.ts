import type { CallEngine, VideoTracks } from './callEngine';

/**
 * Browser calls via livekit-client. The package is loaded defensively so the web app still starts even if
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
let quiet = false; // true while we deliberately tear a room down to retry
let tracksCb: ((t: VideoTracks) => void) | null = null;
let facingFront = true;
const audioEls: HTMLMediaElement[] = [];

function ref(participant: any): any | null {
  const pub = participant?.getTrackPublication?.(lk.Track.Source.Camera);
  return pub && pub.track && !pub.isMuted ? { participant, publication: pub, track: pub.track } : null;
}

function emit() {
  if (!room || !tracksCb) return;
  const remote = [...room.remoteParticipants.values()][0];
  tracksCb({ local: ref(room.localParticipant), remote: ref(remote) });
}

async function join(url: string, token: string, opts: { video?: boolean } | undefined, relay: boolean): Promise<void> {
  if (!lk) throw new Error(engine.unavailableReason);
  room = new lk.Room();
  room.on(lk.RoomEvent.Disconnected, () => { if (!quiet) dropped?.(); });
  room.on(lk.RoomEvent.TrackSubscribed, (track: any) => {
    if (track.kind === lk.Track.Kind.Audio) {
      const el = track.attach();
      el.style.display = 'none';
      document.body.appendChild(el);
      audioEls.push(el);
    }
    emit();
  });
  for (const ev of [lk.RoomEvent.TrackUnsubscribed, lk.RoomEvent.TrackMuted, lk.RoomEvent.TrackUnmuted,
    lk.RoomEvent.LocalTrackPublished, lk.RoomEvent.LocalTrackUnpublished, lk.RoomEvent.ParticipantConnected, lk.RoomEvent.ParticipantDisconnected]) {
    room.on(ev, emit);
  }
  await room.connect(url, token, relay ? { rtcConfig: { iceTransportPolicy: 'relay' }, peerConnectionTimeout: 15000 } : { peerConnectionTimeout: 8000 });
  await room.localParticipant.setMicrophoneEnabled(true);
  if (opts?.video) await room.localParticipant.setCameraEnabled(true);
  emit();
}

export const engine: CallEngine = {
  available: !!lk && typeof navigator !== 'undefined' && !!navigator.mediaDevices,
  unavailableReason: lk ? 'Your browser cannot use the microphone or camera here.' : 'Calls need an app update: run npm install and restart.',
  canFlipCamera: false,

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
    audioEls.splice(0).forEach((e) => e.remove());
  },

  async setMuted(muted) { await room?.localParticipant.setMicrophoneEnabled(!muted); },
  async setSpeaker() {},
  async setCamera(on) { await room?.localParticipant.setCameraEnabled(on); emit(); },
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
