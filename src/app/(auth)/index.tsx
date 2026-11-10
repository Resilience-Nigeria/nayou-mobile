import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { Button, Screen } from '../../components/ui';
import { APP_NAME } from '../../lib/brand';
import { colors, space } from '../../theme/theme';

export default function Welcome() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.lg }}>
        <Image source={require('../../../assets/images/splash-icon.png')} style={{ width: 260, height: 260 }} contentFit="contain" accessibilityLabel={APP_NAME} />
      </View>
      <View style={{ gap: space.md }}>
        <Link href="/register" asChild><Button title="Create account" /></Link>
        <Link href="/login" asChild><Button title="I already have an account" variant="secondary" /></Link>
        <Link href="/sanction-appeal" style={{ textAlign: 'center', color: colors.textMuted, marginTop: space.sm }}>Account suspended? Appeal here</Link>
      </View>
    </Screen>
  );
}
