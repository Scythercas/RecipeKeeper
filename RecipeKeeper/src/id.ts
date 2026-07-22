// 外部UUIDライブラリを増やさないための簡易ID生成(衝突可能性は無視できるレベル)
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
