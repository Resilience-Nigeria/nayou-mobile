import { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export function CallVideo({ trackRef, mirror, style }: { trackRef: any; mirror?: boolean; style?: StyleProp<ViewStyle> }) {
  const host = useRef<any>(null);
  useEffect(() => {
    const track = trackRef?.track;
    const node: HTMLElement | null = host.current as any;
    if (!track || !node) return;
    const el: HTMLVideoElement = track.attach();
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = 'cover';
    el.style.transform = mirror ? 'scaleX(-1)' : 'none';
    node.appendChild(el);
    return () => { try { track.detach(el); } catch {} el.remove(); };
  }, [trackRef?.track, mirror]);
  return <View ref={host} style={style} />;
}
