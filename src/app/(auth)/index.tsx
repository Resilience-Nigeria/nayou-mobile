import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Screen } from '../../components/ui';
import { APP_NAME, TAGLINE } from '../../lib/brand';
import { colors, font, radius, space } from '../../theme/theme';

export default function Welcome() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.lg }}>
        <View style={{ width: 96, height: 96, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="heart" size={48} color={colors.white} />
        </View>
        <Text style={[font.title, { fontSize: 40 }]}>{APP_NAME}</Text>
        <Text style={[font.body, { color: colors.textMuted, textAlign: 'center', fontSize: 17 }]}>{TAGLINE}</Text>
      </View>
      <View style={{ gap: space.md }}>
        <Link href="/register" asChild><Button title="Create account" /></Link>
        <Link href="/login" asChild><Button title="I already have an account" variant="secondary" /></Link>
        <Link href="/sanction-appeal" style={{ textAlign: 'center', color: colors.textMuted, marginTop: space.sm }}>Account suspended? Appeal here</Link>
      </View>
    </Screen>
  );
}
