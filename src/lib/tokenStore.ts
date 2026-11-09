import * as SecureStore from 'expo-secure-store';

const KEY = 'omiara.token';
let memory: string | null = null;

export async function loadToken(): Promise<string | null> {
  memory = await SecureStore.getItemAsync(KEY);
  return memory;
}
export function getToken(): string | null {
  return memory;
}
export async function saveToken(token: string): Promise<void> {
  memory = token;
  await SecureStore.setItemAsync(KEY, token);
}
export async function clearToken(): Promise<void> {
  memory = null;
  await SecureStore.deleteItemAsync(KEY);
}
