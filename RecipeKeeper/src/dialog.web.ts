// react-native-webのAlert.alertは `static alert() {}` という完全なno-opで何も表示されないため、
// Web版はブラウザ標準のconfirm/alertを使う(confirmLabelは指定できないがボタンの意味自体は伝わる)。
export function confirmDialog(title: string, message: string, _confirmLabel: string): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n${message}`));
}

export function alertDialog(title: string, message: string): void {
  window.alert(`${title}\n${message}`);
}
