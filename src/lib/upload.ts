import { File as DeviceFile } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

type Picked = { uri: string; fileName?: string | null; mimeType?: string | null; width?: number; height?: number };

const MAX_SIDE = 1600; // enough for a phone-sized profile photo; the server re-encodes and limits again

/**
 * Downscale and re-encode a picked image before sending. Phone photos are often 4-12 MB, which is slow on
 * mobile data and can make a long upload fail halfway; this is typically a few hundred KB.
 * If anything goes wrong the original is sent instead.
 */
export async function shrink(asset: Picked): Promise<Picked> {
  try {
    const long = Math.max(asset.width ?? 0, asset.height ?? 0);
    const actions: ImageManipulator.Action[] = [];
    if (long > MAX_SIDE) actions.push({ resize: (asset.width ?? 0) >= (asset.height ?? 0) ? { width: MAX_SIDE } : { height: MAX_SIDE } });
    const out = await ImageManipulator.manipulateAsync(asset.uri, actions, { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
    return { uri: out.uri, width: out.width, height: out.height, mimeType: 'image/jpeg', fileName: (asset.fileName ?? 'photo').replace(/\.[^.]+$/, '') + '.jpg' };
  } catch {
    return asset;
  }
}

/**
 * Add an image the picker gave us to a FormData.
 * Browsers need a real Blob/File (fetch the picked image); phones need an expo-file-system File.
 * The old `{uri, name, type}` shortcut works in neither with Expo's fetch.
 */
export async function appendFile(form: FormData, field: string, picked: Picked, fallbackName: string): Promise<void> {
  const isVideo = !!picked.mimeType?.startsWith('video');
  const asset = isVideo ? picked : await shrink(picked);   // videos are sent as they are
  const type = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
  const name = asset.fileName ?? fallbackName;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(asset.uri)).blob();
    form.append(field, new File([blob], name, { type: blob.type || type }));
  } else {
    // Expo's fetch (SDK 53+) no longer understands React Native's `{uri, name, type}` shortcut
    // ("Unsupported FormDataPart implementation"). A device File is a real file part it can read and send.
    form.append(field, new DeviceFile(asset.uri) as any);
  }
}
