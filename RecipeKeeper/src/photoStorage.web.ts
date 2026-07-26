import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { generateId } from './id';
import { supabase } from './web/supabaseClient';

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.7;
const BUCKET = 'recipe-photos';

// 新規レシピの写真はレシピ保存前(recipe idが未確定)に添付されるため、
// ネイティブ版と同じく「ユーザー単位のフラットな置き場」にする(recipe idごとの階層化はしない)。
async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('ログインが必要です。');
  return userId;
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function saveCompressedPhoto(
  uri: string,
  width: number,
  height: number
): Promise<string> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const context = ImageManipulator.manipulate(uri).resize({
    width: targetWidth,
    height: targetHeight,
  });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  const blob = await fetch(result.uri).then((r) => r.blob());
  const userId = await currentUserId();
  const path = `${userId}/${generateId()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(`写真のアップロードに失敗しました: ${error.message}`);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * 既存の写真を新しい独立したオブジェクトとして複製する。
 * 調理記録の写真をレシピのサムネにも使う際、同じオブジェクトを2箇所から参照すると
 * 片方を削除したときにもう片方も巻き添えで消えてしまうため、必ず複製してから使う。
 */
export async function duplicatePhoto(url: string): Promise<string> {
  const path = storagePathFromPublicUrl(url);
  if (!path) throw new Error('写真の複製に失敗しました。');
  const userId = await currentUserId();
  const newPath = `${userId}/${generateId()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).copy(path, newPath);
  if (error) throw new Error(`写真の複製に失敗しました: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl;
}

export async function deletePhoto(url: string): Promise<void> {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // 既に存在しない場合などは無視してよい(ネイティブ版のdeletePhotoと同じ方針)
  }
}
