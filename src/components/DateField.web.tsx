import { createElement } from 'react';
import { Text, View } from 'react-native';
import { colors, font, radius } from '../theme/theme';

type Props = { label: string; value: string; onChange: (iso: string) => void; maxDate?: Date; minDate?: Date; error?: string; hint?: string };
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Browser build: the browser's own calendar. */
export function DateField({ label, value, onChange, maxDate = new Date(), minDate = new Date(1920, 0, 1), error, hint }: Props) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={font.label}>{label}</Text>
      {createElement('input', {
        type: 'date', value, min: fmt(minDate), max: fmt(maxDate),
        onChange: (e: any) => onChange(e.target.value),
        style: { padding: 14, fontSize: 16, borderRadius: radius.md, border: `1px solid ${error ? colors.danger : colors.border}`, backgroundColor: colors.card, color: colors.text, fontFamily: 'inherit' },
      })}
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : hint ? <Text style={font.small}>{hint}</Text> : null}
    </View>
  );
}
