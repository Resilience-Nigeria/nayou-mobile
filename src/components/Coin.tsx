import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View, type TextStyle } from 'react-native';
import { colors } from '../theme/theme';

export const COIN_GOLD = '#E9A800';

/** The Nayou coin symbol. */
export function Coin({ size = 16, color = COIN_GOLD }: { size?: number; color?: string }) {
  return <MaterialCommunityIcons name="alpha-c-circle" size={size} color={color} accessibilityLabel="coins" />;
}

/** An amount of coins with the coin symbol in front, e.g. [C] 1,250. */
export function CoinAmount({ value, size = 16, style, sign, iconColor }: { value: number | string; size?: number; style?: TextStyle; sign?: boolean; iconColor?: string }) {
  const n = Number(value);
  const text = Number.isFinite(n) ? `${sign && n > 0 ? '+' : ''}${n.toLocaleString('en-US')}` : String(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.max(3, size / 5) }}>
      <Coin size={Math.round(size * 1.15)} color={iconColor} />
      <Text style={[{ fontSize: size, fontWeight: '800', color: colors.text }, style]}>{text}</Text>
    </View>
  );
}
