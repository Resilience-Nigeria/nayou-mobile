import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { colors } from '../theme/theme';

/** Always-visible back control. In a browser the history can be empty (refresh, deep link), so fall back to home. */
export function BackButton() {
  return (
    <Pressable accessibilityLabel="Go back" hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ paddingRight: 12 }}>
      <Ionicons name="chevron-back" size={26} color={colors.text} />
    </Pressable>
  );
}
