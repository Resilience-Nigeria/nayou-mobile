import * as ImagePicker from 'expo-image-picker';
import { api } from './api';
import { appendFile } from './upload';
import type { MediaCard, PublicConfig } from './types';

export type MediaPurpose = 'message' | 'post';

/** Which kinds an admin currently allows for this place (public config). */
export function mediaAllowed(config: PublicConfig | undefined, purpose: MediaPurpose) {
  const p = purpose === 'post' ? 'posts' : 'messaging';
  const on = purpose === 'post' ? config?.['posts.enabled'] !== false : true;
  return { images: on && config?.[`${p}.allow_images`] !== false, videos: on && config?.[`${p}.allow_videos`] !== false };
}

/** Let the person choose a photo or video, upload it, and return its card (send `id` with the message / post). null = cancelled. */
export async function pickAndUpload(purpose: MediaPurpose, allow: { images: boolean; videos: boolean }): Promise<MediaCard | null> {
  const types: ('images' | 'videos')[] = [...(allow.images ? (['images'] as const) : []), ...(allow.videos ? (['videos'] as const) : [])];
  if (types.length === 0) return null;
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: types, quality: 1, allowsEditing: false });
  if (r.canceled) return null;
  const a = r.assets[0];
  const form = new FormData();
  await appendFile(form, 'file', a, a.type === 'video' ? 'clip.mp4' : 'photo.jpg');
  form.append('purpose', purpose);
  return api.upload<MediaCard>('/media', form);
}
