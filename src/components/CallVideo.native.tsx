import type { StyleProp, ViewStyle } from 'react-native';

let VideoTrack: any = null;
try {
  VideoTrack = require('@livekit/react-native').VideoTrack;
} catch {
  VideoTrack = null;
}

export function CallVideo({ trackRef, mirror, style }: { trackRef: any; mirror?: boolean; style?: StyleProp<ViewStyle> }) {
  if (!VideoTrack || !trackRef) return null;
  return <VideoTrack trackRef={trackRef} mirror={mirror} objectFit="cover" style={style} />;
}
