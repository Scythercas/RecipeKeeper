import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { generateId } from './id';

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.7;

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/**
 * ライブラリ/カメラで取得した画像をリサイズ・JPEG圧縮し、永続ディレクトリにコピーして
 * 保存後のURIを返す(Swift版 PhotoAttachEditor.compress と同じ方針)。
 */
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

  const sourceFile = new File(result.uri);
  const destFile = new File(photosDir(), `${generateId()}.jpg`);
  await sourceFile.copy(destFile);
  return destFile.uri;
}

/**
 * 既存の写真ファイルを新しい独立したファイルとして複製する。
 * 調理記録の写真をレシピのサムネにも使う際、同じファイルを2箇所から参照すると
 * 片方を削除したときにもう片方も巻き添えで消えてしまうため、必ず複製してから使う。
 */
export async function duplicatePhoto(uri: string): Promise<string> {
  const sourceFile = new File(uri);
  const destFile = new File(photosDir(), `${generateId()}.jpg`);
  await sourceFile.copy(destFile);
  return destFile.uri;
}

/** レシピ削除時などに、参照が切れた写真ファイルを掃除する */
export function deletePhoto(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // 既に存在しない場合などは無視してよい
  }
}
