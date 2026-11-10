import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../lib/api';
import { colors, font, radius, shadow, space } from '../theme/theme';

export function Screen({ children, scroll = false, padded = true, onRefresh, refreshing = false, edges }: {
  children: ReactNode; scroll?: boolean; padded?: boolean; onRefresh?: () => void; refreshing?: boolean; edges?: ('top' | 'bottom')[];
}) {
  const inner = { padding: padded ? space.lg : 0, gap: space.lg };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges ?? ['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={inner}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={font.title}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  return <Text style={font.h2}>{children}</Text>;
}
export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<any> }) {
  return <Text style={[muted ? font.small : font.body, { lineHeight: 21 }, style]}>{children}</Text>;
}

type BtnProps = { title: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'; loading?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle> };
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }: BtnProps) {
  const bg = { primary: colors.primary, accent: colors.accent, secondary: colors.primarySoft, ghost: 'transparent', danger: colors.dangerSoft }[variant];
  const fg = { primary: colors.white, accent: colors.white, secondary: colors.primaryDark, ghost: colors.primary, danger: colors.danger }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, error, hint, ...rest }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const [focus, setFocus] = useState(false);
  const [shown, setShown] = useState(false);
  const secret = !!rest.secureTextEntry;
  return (
    <View style={{ gap: 6 }}>
      <Text style={font.label}>{label}</Text>
      <View>
        <TextInput
          placeholderTextColor="#A5ABA7"
          // Passwords are never auto-capitalised or autocorrected.
          {...(secret ? { autoCapitalize: 'none' as const, autoCorrect: false, spellCheck: false } : {})}
          {...rest}
          secureTextEntry={secret && !shown}
          onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          style={[styles.input, { borderColor: error ? colors.danger : focus ? colors.primary : colors.border }, rest.multiline && { minHeight: 96, textAlignVertical: 'top' }, secret && { paddingRight: 48 }]}
        />
        {secret ? (
          <Pressable accessibilityLabel={shown ? 'Hide password' : 'Show password'} hitSlop={10} onPress={() => setShown((v) => !v)} style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
            <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : hint ? <Text style={font.small}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: selected ? colors.white : colors.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Avatar({ url, name, size = 52, online }: { url?: string | null; name?: string | null; size?: number; online?: boolean }) {
  const face = url ? (
    <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }} contentFit="cover" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: size / 2.6 }}>{(name ?? '?').slice(0, 1).toUpperCase()}</Text>
    </View>
  );
  if (!online) return face;
  const d = Math.max(10, Math.round(size * 0.26));
  return (
    <View>
      {face}
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: d, height: d, borderRadius: d / 2, backgroundColor: '#22C55E', borderWidth: 2, borderColor: colors.white }} />
    </View>
  );
}

export function VerifiedBadge({ label = 'Photo verified' }: { label?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
      <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Loading() {
  return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof ApiError ? error.friendly : 'Something went wrong.';
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
      <Text style={[font.body, { textAlign: 'center' }]}>{msg}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function Empty({ icon = 'sparkles-outline', title, text, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={44} color={colors.primary} />
      <Text style={font.h2}>{title}</Text>
      {text ? <Text style={[font.small, { textAlign: 'center', maxWidth: 280, lineHeight: 19 }]}>{text}</Text> : null}
      {action}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]}>{children}</View>;
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger'; children: ReactNode }) {
  const bg = { info: colors.primarySoft, warn: colors.goldSoft, danger: colors.dangerSoft }[tone];
  return <View style={{ backgroundColor: bg, borderRadius: radius.md, padding: space.md }}>{typeof children === 'string' ? <Text style={font.body}>{children}</Text> : children}</View>;
}

export function ListRow({ title, subtitle, left, right, onPress, unread }: { title: string; subtitle?: string; left?: ReactNode; right?: ReactNode; onPress?: () => void; unread?: number }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.7 }]}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={font.h3}>{title}</Text>
        {subtitle ? <Text style={[font.small, { marginTop: 2 }, !!unread && { color: colors.text, fontWeight: '700' }]} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
    </Pressable>
  );
}

/** Show a failed request. Field errors already read well; network errors say so. */
export function showError(e: unknown, title = 'Could not do that') {
  Alert.alert(title, e instanceof ApiError ? e.friendly : 'Something went wrong. Please try again.');
}

export const money = (minor: number) => '₦' + (minor / 100).toLocaleString('en-NG', { minimumFractionDigits: minor % 100 === 0 ? 0 : 2 });

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso.includes('T') || iso.endsWith('Z') ? iso : iso.replace(' ', 'T') + 'Z').getTime()) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', gap: 8, minHeight: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  input: { backgroundColor: colors.card, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.text },
  chip: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, ...shadow.card },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md },
});
