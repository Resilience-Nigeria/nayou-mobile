import Constants from 'expo-constants';

// Infrastructure only. Business values (costs, limits) always come from the server.
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://10.0.2.2:8000/api/v1';
