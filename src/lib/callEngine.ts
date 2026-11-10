/**
 * Audio engine for voice calls. This default file is only the shape plus a "not available" fallback;
 * Metro picks callEngine.native.ts on phones and callEngine.web.ts in the browser.
 */
export type CallEngine = {
  available: boolean;
  unavailableReason?: string;
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  setSpeaker(on: boolean): Promise<void>;
  onDisconnected(cb: () => void): void;
};

export const engine: CallEngine = {
  available: false,
  unavailableReason: 'Voice calls are not supported here.',
  async connect() { throw new Error('Voice calls are not supported here.'); },
  async disconnect() {},
  async setMuted() {},
  async setSpeaker() {},
  onDisconnected() {},
};
