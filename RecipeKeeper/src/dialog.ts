import { Alert } from 'react-native';

// ネイティブは実際のAlert.alertダイアログを使う(Web版はdialog.web.tsを参照)。
export function confirmDialog(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function alertDialog(title: string, message: string): void {
  Alert.alert(title, message);
}
