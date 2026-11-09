import Constants from 'expo-constants';

const raw: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://10.0.2.2:8000/api/v1';

// Infrastructure only. Business values (costs, limits) always come from the server.
// Forgiving about the usual slip: `.../api` becomes `.../api/v1`, and a trailing slash is dropped.
export const API_URL: string = (() => {
  const u = raw.trim().replace(/\/+$/, '');
  return /\/v\d+$/.test(u) ? u : `${u}/v1`;
})();
