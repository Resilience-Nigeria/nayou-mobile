import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * react-native-web ships Alert.alert as a no-op, so on the web every error, confirmation and menu was silent
 * (buttons looked dead). This gives the web build working dialogs; phones keep the native Alert untouched.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    const act = list.filter((b) => b.style !== 'cancel');
    if (list.length === 0 || (list.length === 1 && list[0].style !== 'cancel')) {
      window.alert(text);
      list[0]?.onPress?.();
    } else if (act.length === 1) {
      if (window.confirm(`${text}\n\n(${act[0].text})`)) act[0].onPress?.();
      else list.find((b) => b.style === 'cancel')?.onPress?.();
    } else if (act.length === 0) {
      window.alert(text);
    } else {
      const choice = window.prompt(`${text}\n\n${act.map((b, i) => `${i + 1}. ${b.text}`).join('\n')}\n\nType a number, or Cancel:`);
      const picked = act[Number.parseInt(choice ?? '', 10) - 1];
      if (picked) picked.onPress?.();
      else list.find((b) => b.style === 'cancel')?.onPress?.();
    }
  };
}
