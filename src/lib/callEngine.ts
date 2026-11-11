/**
 * Audio/video engine for calls. This default file is only the shape plus a "not available" fallback;
 * Metro picks callEngine.native.ts on phones and callEngine.web.ts in the browser.
 */
/** Opaque handles to the two camera feeds; CallVideo knows how to draw one on each platform. */
export type VideoTracks = { local: any | null; remote: any | null };

export type CallEngine = {
  available: boolean;
  unavailableReason?: string;
  canFlipCamera: boolean;
  connect(url: string, token: string, opts?: { video?: boolean }): Promise<void>;
  disconnect(): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  setSpeaker(on: boolean): Promise<void>;
  setCamera(on: boolean): Promise<void>;
  flipCamera(): Promise<void>;
  onDisconnected(cb: () => void): void;
  onTracks(cb: (t: VideoTracks) => void): void;
};

export const engine: CallEngine = {
  available: false,
  unavailableReason: 'Calls are not supported here.',
  canFlipCamera: false,
  async connect() { throw new Error('Calls are not supported here.'); },
  async disconnect() {},
  async setMuted() {},
  async setSpeaker() {},
  async setCamera() {},
  async flipCamera() {},
  onDisconnected() {},
  onTracks() {},
};
