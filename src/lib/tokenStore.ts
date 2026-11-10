import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'nayou.token';
let memory: string | null = null;

// expo-secure-store has no web implementation, so the browser build keeps the token in sessionStorage
// (cleared when the tab closes). Phones use the system keychain / keystore.
const web = Platform.OS === 'web';
const webStore = {
  get: () => { try { return window.sessionStorage.getItem(KEY); } catch { return null; } },
  set: (v: string) => { try { window.sessionStorage.setItem(KEY, v); } catch { /* private mode */ } },
  del: () => { try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export async function loadToken(): Promise<string | null> {
  memory = web ? webStore.get() : await SecureStore.getItemAsync(KEY);
  return memory;
}
export function getToken(): string | null {
  return memory;
}
export async function saveToken(token: string): Promise<void> {
  memory = token;
  if (web) webStore.set(token); else await SecureStore.setItemAsync(KEY, token);
}
export async function clearToken(): Promise<void> {
  memory = null;
  if (web) webStore.del(); else await SecureStore.deleteItemAsync(KEY);
}
