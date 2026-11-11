import type { StyleProp, ViewStyle } from 'react-native';

/** Draws one camera feed. Metro picks CallVideo.native.tsx on phones and CallVideo.web.tsx in the browser; this is the fallback. */
export function CallVideo(_props: { trackRef: any; mirror?: boolean; style?: StyleProp<ViewStyle> }) {
  return null;
}
