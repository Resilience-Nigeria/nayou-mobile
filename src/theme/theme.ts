// Visual language: the Nayou logo's green and crimson on a warm cream background.
export const colors = {
  primary: '#00843D',
  primaryDark: '#00562A',
  primarySoft: '#E1F3E8',
  accent: '#E80840',
  accentSoft: '#FDE6EC',
  gold: '#C9962B',
  goldSoft: '#FBF1D9',
  bg: '#FBF8F3',
  card: '#FFFFFF',
  text: '#1B1F1D',
  textMuted: '#6B726E',
  border: '#E8E2D8',
  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
  success: '#00843D',
  overlay: 'rgba(0,0,0,0.45)',
  white: '#FFFFFF',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 };

export const font = {
  title: { fontSize: 26, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  small: { fontSize: 13, fontWeight: '400' as const, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted },
};

export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
};
