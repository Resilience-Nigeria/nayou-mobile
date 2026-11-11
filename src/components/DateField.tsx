import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme/theme';

type Props = { label: string; value: string; onChange: (iso: string) => void; maxDate?: Date; minDate?: Date; error?: string; hint?: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** A calendar to pick a date (no typing). Phones use this one; the web build uses the browser's own date input. */
export function DateField({ label, value, onChange, maxDate = new Date(), minDate = new Date(1920, 0, 1), error, hint }: Props) {
  const [open, setOpen] = useState(false);
  const start = value ? new Date(value + 'T00:00:00') : new Date(maxDate);
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const [years, setYears] = useState(false);

  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const disabled = (d: number) => { const t = new Date(view.y, view.m, d); return t > maxDate || t < minDate; };
  const move = (delta: number) => setView((v) => { const n = new Date(v.y, v.m + delta, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  const yearList = Array.from({ length: maxDate.getFullYear() - minDate.getFullYear() + 1 }, (_, i) => maxDate.getFullYear() - i);
  const shown = value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <View style={{ gap: 6 }}>
      <Text style={font.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: error ? colors.danger : colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: colors.card }}>
        <Text style={{ fontSize: 16, color: shown ? colors.text : '#A5ABA7' }}>{shown || 'Choose a date'}</Text>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </Pressable>
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : hint ? <Text style={font.small}>{hint}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: space.lg }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderRadius: radius.lg, padding: space.md, gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable onPress={() => move(-1)} hitSlop={10}><Ionicons name="chevron-back" size={24} color={colors.text} /></Pressable>
              <Pressable onPress={() => setYears((v) => !v)} hitSlop={8}><Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{MONTHS[view.m]} {view.y} ▾</Text></Pressable>
              <Pressable onPress={() => move(1)} hitSlop={10}><Ionicons name="chevron-forward" size={24} color={colors.text} /></Pressable>
            </View>
            {years ? (
              <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {yearList.map((y) => (
                  <Pressable key={y} onPress={() => { setView((v) => ({ ...v, y })); setYears(false); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: y === view.y ? colors.primary : colors.card }}>
                    <Text style={{ color: y === view.y ? colors.white : colors.text, fontWeight: '600' }}>{y}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <>
                <View style={{ flexDirection: 'row' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontWeight: '700' }}>{d}</Text>)}</View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {cells.map((d, i) => {
                    const sel = d && value === iso(view.y, view.m, d);
                    return (
                      <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                        {d ? (
                          <Pressable disabled={disabled(d)} onPress={() => { onChange(iso(view.y, view.m, d)); setOpen(false); }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: sel ? colors.primary : 'transparent', opacity: disabled(d) ? 0.25 : 1 }}>
                            <Text style={{ color: sel ? colors.white : colors.text, fontWeight: sel ? '800' : '500' }}>{d}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
