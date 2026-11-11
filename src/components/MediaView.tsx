import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import type { MediaCard } from '../lib/types';
import { colors, radius } from '../theme/theme';

/** A photo (tap to enlarge) or a video (with its own play controls). `width` is the display width. */
export function MediaView({ media, width }: { media: MediaCard; width: number }) {
  const ratio = media.width && media.height ? Math.min(Math.max(media.height / media.width, 0.5), 1.6) : 0.75;
  const box = { width, height: Math.round(width * ratio), borderRadius: radius.md, overflow: 'hidden' as const, backgroundColor: colors.border };
  if (!media.url) return <View style={[box, { alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="image-outline" size={28} color={colors.textMuted} /></View>;
  return media.kind === 'video' ? <Video url={media.url} box={box} /> : <Photo url={media.url} box={box} />;
}

function Photo({ url, box }: { url: string; box: object }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={box}>
        <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="cover" transition={120} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' }}>
          <Image source={{ uri: url }} style={{ width: '100%', height: '85%' }} contentFit="contain" />
          <Ionicons name="close" size={30} color="#fff" style={{ position: 'absolute', top: 50, right: 20 }} />
        </Pressable>
      </Modal>
    </>
  );
}

function Video({ url, box }: { url: string; box: object }) {
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  return (
    <View style={box}>
      <VideoView player={player} style={{ flex: 1 }} nativeControls contentFit="contain" />
    </View>
  );
}
