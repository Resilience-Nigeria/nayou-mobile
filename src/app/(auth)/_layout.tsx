import { Stack } from 'expo-router';
import { colors } from '../../theme/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg }, title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
