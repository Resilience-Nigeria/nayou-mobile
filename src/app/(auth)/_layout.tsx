import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { BackButton } from '../../components/BackButton';
import { colors } from '../../theme/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.text, ...(Platform.OS === 'web' ? { headerLeft: () => <BackButton /> } : {}), contentStyle: { backgroundColor: colors.bg }, title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
