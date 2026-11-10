import { Image } from 'expo-image';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme/theme';

/** The logo on white while the app wakes up. Matches the native splash so the hand-off is invisible. */
export function BrandSplash({ onReady }: { onReady?: () => void }) {
  return (
    <View onLayout={onReady} style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <Image source={require('../../assets/images/splash-icon.png')} style={{ width: 240, height: 240 }} contentFit="contain" />
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
